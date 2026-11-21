import { z } from 'zod';

// Characters and shapes that suggest shell text or filesystem paths.
// The AI may only produce timings, ids and prose, never commands or paths.
const SHELL_CHARS = /[;&|`$<>\\]/;
const PATH_LIKE = /(^|[\s"'(])((\/|\.\/|\.\.|~\/)|[A-Za-z]:\\)/;

function cleanString(max: number) {
  return z
    .string()
    .max(max)
    .refine((s) => !SHELL_CHARS.test(s), 'shell text is not allowed')
    .refine((s) => !PATH_LIKE.test(s), 'filesystem paths are not allowed');
}

export const editPlanSchema = z.object({
  version: z.literal(1),
  sourceFiles: z.array(z.string().max(64)).min(1).max(10),
  timeline: z
    .object({
      clips: z
        .array(
          z.object({
            sourceFile: z.string().max(64),
            in: z.number().min(0),
            out: z.number().min(0),
            track: z.number().int().min(0).max(3).default(0),
            transition: z.enum(['cut', 'fade', 'dissolve']).default('cut'),
          })
        )
        .max(100)
        .refine((clips) => clips.every((c) => c.out > c.in), 'clip out must be after clip in'),
    })
    .default({ clips: [] }),
  captions: z
    .object({
      styleId: z.enum(['clean', 'bold', 'karaoke']),
      words: z
        .array(z.object({ word: cleanString(40), start: z.number().min(0), end: z.number().min(0) }))
        .max(5000)
        .default([]),
    })
    .default({ styleId: 'clean', words: [] }),
  reframe: z
    .object({
      aspect: z.enum(['9:16', '1:1', '16:9']),
      focus: z
        .array(z.object({ start: z.number().min(0), end: z.number().min(0), x: z.number().min(0).max(1), y: z.number().min(0).max(1) }))
        .max(100)
        .default([]),
    })
    .default({ aspect: '9:16', focus: [] }),
  audio: z
    .object({
      normaliseLufs: z.number().min(-40).max(0).default(-16),
      duck: z.boolean().default(false),
      musicTrackId: z.string().max(64).nullable().default(null),
    })
    .default({ normaliseLufs: -16, duck: false, musicTrackId: null }),
  overlays: z
    .array(
      z.object({
        templateId: z.enum(['lower-third-simple', 'title-fade']),
        params: z.record(z.string(), cleanString(200)).default({}),
      })
    )
    .max(10)
    .default([]),
  shotList: z
    .array(
      z.object({
        shotType: cleanString(40),
        purpose: cleanString(200),
        duration: z.number().min(0).max(600),
      })
    )
    .max(50)
    .default([]),
  notes: cleanString(2000).default(''),
});

export type EditPlan = z.infer<typeof editPlanSchema>;

export type PlanContext = {
  knownFileIds: string[];
  durations: Record<string, number>;
  maxDuration: number;
};

// Ranges are banned because in/out times must land inside real media.
const BANNED_RANGE_KEYS = new Set(['in', 'out', 'start', 'end', 'duration']);

export function validateEditPlan(raw: unknown, ctx: PlanContext): { ok: true; plan: EditPlan } | { ok: false; errors: string[] } {
  const parsed = editPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const plan = parsed.data;
  const errors: string[] = [];

  for (const id of plan.sourceFiles) {
    if (!ctx.knownFileIds.includes(id)) errors.push(`unknown source file id: ${id}`);
  }
  for (const clip of plan.timeline.clips) {
    if (!ctx.knownFileIds.includes(clip.sourceFile)) errors.push(`unknown clip source: ${clip.sourceFile}`);
    const dur = ctx.durations[clip.sourceFile];
    if (dur !== undefined) {
      if (clip.in < 0 || clip.out > dur + 0.05) errors.push(`clip ${clip.in}-${clip.out} exceeds duration ${dur}`);
    }
    if (clip.out - clip.in > ctx.maxDuration) errors.push(`clip longer than ${ctx.maxDuration}s`);
  }
  for (const word of plan.captions.words) {
    if (word.end <= word.start) errors.push(`caption word "${word.word}" has bad timing`);
  }
  for (const shot of plan.shotList) {
    for (const [key, value] of Object.entries(shot)) {
      if (BANNED_RANGE_KEYS.has(key) && typeof value === 'string' && (SHELL_CHARS.test(value) || PATH_LIKE.test(value))) {
        errors.push(`shotList.${key} contains forbidden text`);
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, plan };
}
