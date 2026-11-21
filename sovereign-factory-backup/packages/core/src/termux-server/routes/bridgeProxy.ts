import { Router, Request, Response } from 'express';
import * as http from 'http';

const UPSTREAM_HOST = '127.0.0.1';
const UPSTREAM_PORT = parseInt(process.env.BRIDGE_UPSTREAM_PORT || '8787', 10);
const router = Router();

router.all('/bridge/*', (req: Request, res: Response) => {
  const stripped = req.originalUrl.replace(/^\/bridge/, '') || '/';
  
  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['connection'];

  // Check the header directly instead of relying on req.body
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  const proxyReq = http.request(
    { host: UPSTREAM_HOST, port: UPSTREAM_PORT, method: req.method, path: stripped, headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('[Bridge Proxy Error]', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'bridge_upstream_error' });
  });

  // 1. If it's a file upload, pipe the raw stream
  if (isMultipart) {
    req.pipe(proxyReq);
  } 
  // 2. Otherwise handle it as JSON
  else {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
      headers['content-length'] = Buffer.byteLength(bodyData).toString();
      proxyReq.write(bodyData);
    }
    proxyReq.end();
  }
});

export default router;
