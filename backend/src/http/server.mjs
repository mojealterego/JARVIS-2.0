import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../domain/errors.mjs';
import { parseUpload } from '../infrastructure/uploads.mjs';

function readJson(request, maximum) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let failed = false;
    request.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maximum) {
        if (!failed) reject(new AppError(413, 'JSON body exceeds the size limit'));
        failed = true; chunks.length = 0; return;
      }
      if (!failed) chunks.push(chunk);
    });
    request.on('aborted', () => reject(new AppError(400, 'request aborted')));
    request.on('error', () => reject(new AppError(400, 'request stream failed')));
    request.on('end', () => {
      if (failed) return;
      try { resolve(bytes ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new AppError(400, 'invalid JSON')); }
    });
  });
}
function digest(value) { return createHash('sha256').update(value).digest(); }

export function createJarvisServer({ service, token, allowedOrigins = [], maxJsonBytes = 1024 * 1024, maxAudioBytes = 24 * 1024 * 1024, logger = console }) {
  if (typeof token !== 'string' || token.trim().length < 24) throw new Error('JARVIS_API_TOKEN must contain at least 24 characters.');
  const expected = digest('Bearer ' + token);
  const server = http.createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, payload) => {
      if (response.destroyed || response.writableEnded) return;
      response.statusCode = status;
      response.end(status === 204 ? undefined : JSON.stringify(payload));
    };
    try {
      const origin = request.headers.origin;
      if (origin) {
        if (!allowedOrigins.includes(origin)) throw new AppError(403, 'origin is not allowed');
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      }
      if (request.method === 'OPTIONS') return send(204);
      if (!timingSafeEqual(expected, digest(request.headers.authorization ?? ''))) {
        request.resume();
        return send(401, { error: 'unauthorized' });
      }
      let path;
      try { path = new URL(request.url ?? '/', 'http://localhost').pathname; decodeURIComponent(path); }
      catch { throw new AppError(400, 'invalid URL'); }
      if (request.method === 'POST' && path === '/api/transcribe') {
        const upload = await parseUpload(request, maxAudioBytes);
        return send(200, { text: await service.ai.transcribe(upload) });
      }
      let data = {};
      if (['POST', 'PATCH'].includes(request.method)) {
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) {
          request.resume(); throw new AppError(415, 'application/json is required');
        }
        data = await readJson(request, maxJsonBytes);
      }
      const result = await service.handle(request.method ?? 'GET', path, data);
      send(result.status, result.payload);
    } catch (error) {
      if (!(error instanceof AppError)) logger.error('JARVIS request failed:', error.message);
      send(error instanceof AppError ? error.status : 500, { error: error instanceof AppError ? error.message : 'internal_error' });
    }
  });
  server.requestTimeout = 95000;
  server.headersTimeout = 15000;
  server.keepAliveTimeout = 5000;
  return server;
}
