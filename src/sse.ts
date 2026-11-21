import type { FastifyReply } from 'fastify';

type Listener = (event: string, data: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(jobId: string, reply: FastifyReply): () => void {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const listener: Listener = (event, data) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  if (!listeners.has(jobId)) listeners.set(jobId, new Set());
  listeners.get(jobId)!.add(listener);
  return () => {
    listeners.get(jobId)?.delete(listener);
    if (listeners.get(jobId)?.size === 0) listeners.delete(jobId);
  };
}

export function emit(jobId: string, event: string, data: unknown): void {
  for (const listener of listeners.get(jobId) ?? []) listener(event, data);
}
