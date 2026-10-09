import Busboy from 'busboy';
import { AppError } from '../domain/errors.mjs';

export function parseUpload(request, maximum = 24 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let parser;
    try { parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: maximum, fields: 0, parts: 2 } }); }
    catch { request.resume(); reject(new AppError(400, 'invalid multipart upload')); return; }
    let upload;
    let failure;
    parser.on('file', (name, file, info) => {
      const chunks = [];
      const supported = /^audio\//.test(info.mimeType) || ['video/mp4', 'application/octet-stream'].includes(info.mimeType);
      if (name !== 'file' || !supported) failure = new AppError(400, 'a supported audio file is required');
      file.on('data', chunk => chunks.push(chunk));
      file.on('limit', () => { failure = new AppError(413, 'audio upload exceeds the size limit'); });
      file.on('error', reject);
      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        upload = { buffer, filename: (info.filename || 'voice.m4a').split(/[\\/]/).pop(), mime: info.mimeType };
      });
    });
    for (const event of ['filesLimit', 'fieldsLimit', 'partsLimit']) parser.on(event, () => { failure = new AppError(400, 'upload must contain exactly one audio file'); });
    parser.on('error', () => reject(new AppError(400, 'invalid multipart upload')));
    request.on('aborted', () => reject(new AppError(400, 'upload aborted')));
    parser.on('finish', () => {
      if (failure) reject(failure);
      else if (!upload?.buffer.length) reject(new AppError(400, 'audio file is empty'));
      else resolve(upload);
    });
    request.pipe(parser);
  });
}
