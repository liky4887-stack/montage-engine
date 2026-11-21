import { Router, Request, Response } from 'express';
import * as http from 'http';

const UPSTREAM_HOST = '127.0.0.1';
const UPSTREAM_PORT = parseInt(process.env.BRIDGE_UPSTREAM_PORT || '8787', 10);

const router = Router();

router.options('/bridge/*', (_req: Request, res: Response) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', '*');
  res.sendStatus(204);
});

router.all('/bridge/*', (req: Request, res: Response) => {
  const stripped = req.originalUrl.replace(/^\/bridge/, '') || '/';

  const headers: http.OutgoingHttpHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (k === 'host' || k === 'connection') continue;
    headers[k] = v as any;
  }
  headers['host'] = `${UPSTREAM_HOST}:${UPSTREAM_PORT}`;

  const proxyReq = http.request(
    { host: UPSTREAM_HOST, port: UPSTREAM_PORT, method: req.method, path: stripped, headers },
    (proxyRes) => {
      res.status(proxyRes.statusCode || 502);
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (v !== undefined && k.toLowerCase() !== 'access-control-allow-origin') {
          res.setHeader(k, v as any);
        }
      }
      res.setHeader('access-control-allow-origin', '*');
      if (res.socket) res.socket.setNoDelay(true);
      res.flushHeaders();
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('[Bridge Proxy Error]', err.message);
    if (!res.headersSent) {
      res.status(502).json({ ok: false, error: 'bridge_upstream_error', detail: err.message });
    } else {
      res.end();
    }
  });

  // CRITICAL FIX: Check if this is a file upload (multipart) or a JSON request
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  if (isMultipart) {
    // Stream the file directly to the engine without buffering
    req.pipe(proxyReq);
  } else {
    // Handle standard JSON requests normally
    let bodyBuffer: Buffer | undefined = undefined;
    if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
    } else if (req.body && typeof req.body === 'object') {
      bodyBuffer = Buffer.from(JSON.stringify(req.body));
    }
    if (bodyBuffer && bodyBuffer.length) {
      headers['content-length'] = String(bodyBuffer.length);
      headers['content-type'] = 'application/json';
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  }
});

export default router;
