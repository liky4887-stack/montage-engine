import { Router, Request, Response } from 'express';
import * as http from 'http';

const UPSTREAM_HOST = '127.0.0.1';
const UPSTREAM_PORT = parseInt(process.env.BRIDGE_UPSTREAM_PORT || '8787', 10);
const router = Router();

// 1. Use a keep-alive agent to prevent the socket from closing prematurely
const agent = new http.Agent({ keepAlive: true, maxSockets: 5 });

router.all('/bridge/*', (req: Request, res: Response) => {
  const stripped = req.originalUrl.replace(/^\/bridge/, '') || '/';
  
  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['connection'];

  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  const proxyReq = http.request(
    { host: UPSTREAM_HOST, port: UPSTREAM_PORT, method: req.method, path: stripped, headers, agent },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  // 2. Handle errors on BOTH the incoming request and the proxy request
  req.on('error', (err) => {
    console.error('[Bridge Proxy Req Error]', err.message);
    proxyReq.destroy();
    if (!res.headersSent) res.status(500).json({ error: 'client_request_error' });
  });

  proxyReq.on('error', (err) => {
    console.error('[Bridge Proxy Error]', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'bridge_upstream_error' });
  });

  if (isMultipart) {
    // 3. Let pipe() handle the end of the stream automatically
    req.pipe(proxyReq);
  } else {
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
