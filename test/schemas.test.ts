import { describe, expect, it } from 'vitest';
import { validateEditPlan } from '../src/schemas.js';

const ctx = { knownFileIds: ['file-1'], durations: { 'file-1': 60 }, maxDuration: 600 };

describe('validateEditPlan', () => {
  const base = {
    version: 1,
    sourceFiles: ['file-1'],
    timeline: { clips: [{ sourceFile: 'file-1', in: 0, out: 10 }] },
  };

  it('accepts a clean plan', () => {
    const r = validateEditPlan(base, ctx);
    expect(r.ok).toBe(true);
  });

  it('rejects unknown file ids', () => {
    const r = validateEditPlan({ ...base, sourceFiles: ['nope'] }, ctx);
    expect(r.ok).toBe(false);
  });

  it('rejects out-of-range times', () => {
    const r = validateEditPlan(
      { ...base, timeline: { clips: [{ sourceFile: 'file-1', in: 0, out: 600 }] } },
      ctx
    );
    expect(r.ok).toBe(false);
  });

  it('rejects shell text in notes', () => {
    const r = validateEditPlan({ ...base, notes: 'rm -rf /; curl evil' }, ctx);
    expect(r.ok).toBe(false);
  });

  it('rejects paths in notes', () => {
    const r = validateEditPlan({ ...base, notes: 'see /data/data/com.termux' }, ctx);
    expect(r.ok).toBe(false);
  });

  it('rejects shell text in caption words', () => {
    const r = validateEditPlan(
      { ...base, captions: { styleId: 'clean', words: [{ word: '$HOME', start: 0, end: 1 }] } },
      ctx
    );
    expect(r.ok).toBe(false);
  });

  it('rejects unknown template ids', () => {
    const r = validateEditPlan({ ...base, overlays: [{ templateId: 'custom-exploit', params: {} }] }, ctx);
    expect(r.ok).toBe(false);
  });

  it('rejects shell text in shotList strings', () => {
    const r = validateEditPlan(
      { ...base, shotList: [{ shotType: 'close-up', purpose: 'hook', duration: 5 }, { shotType: 'close-up && whoami', purpose: 'hook', duration: 5 }] },
      ctx
    );
    expect(r.ok).toBe(false);
  });

  it('rejects wrong version', () => {
    const r = validateEditPlan({ ...base, version: 2 }, ctx);
    expect(r.ok).toBe(false);
  });
});
