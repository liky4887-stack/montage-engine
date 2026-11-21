import fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import fs from 'fs';
import path from 'path';

const app = fastify({ logger: true, bodyLimit: 1024 * 1024 * 1024 });
await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 1024 } }); // 1GB limit
await app.register(cors, { origin: '*' });

// --- ROUTES ---
app.get('/health', async () => ({ ok: true }));

app.post('/pair', async (req, reply) => {
  // Bypass all checks completely for local dev
  return reply.send({ 
    accessToken: 'dev-token-123456', 
    refreshToken: 'dev-refresh-123456' 
  });
});

app.get('/capabilities', async () => ({ ok: true, capabilities: [] }));

app.post('/uploads', async (req, reply) => {
  try {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const buffer = await data.toBuffer();
    const fileId = 'file-' + Date.now();
    
    const uploadDir = path.join(process.cwd(), 'media', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileId + '.mp4');
    fs.writeFileSync(filePath, buffer);

    req.log.info({ fileId, size: buffer.length }, 'File uploaded successfully');
    return reply.send({ id: fileId, file_id: fileId, status: 'uploaded' });
  } catch (err: any) {
    req.log.error(err);
    return reply.status(500).send({ error: err.message });
  }
});

// Startup
const start = async () => {
  try {
    await app.listen({ port: 8787, host: '0.0.0.0' });
    console.log('====================================');
    console.log('ClipForge engine on http://0.0.0.0:8787');
    console.log('PAIRING CODE: 123456');
    console.log('====================================');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
