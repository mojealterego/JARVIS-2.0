import { resolve } from 'node:path';
import { FileStateStore } from './src/infrastructure/file-state-store.mjs';
import { OpenAIGateway } from './src/infrastructure/openai-gateway.mjs';
import { JarvisService } from './src/application/jarvis-service.mjs';
import { createJarvisServer } from './src/http/server.mjs';

const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const store = new FileStateStore(process.env.JARVIS_STATE_FILE || resolve('jarvis-state.json'));
await store.initialize();
const ai = new OpenAIGateway({
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-6-astra',
  fastModel: process.env.OPENAI_MODEL_FAST || process.env.OPENAI_MODEL || 'gpt-6-astra',
  complexModel: process.env.OPENAI_MODEL_COMPLEX || process.env.OPENAI_MODEL || 'gpt-6-astra',
  transcriptionModel: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'
});
const service = new JarvisService({ store, ai });
const server = createJarvisServer({
  service, token: process.env.JARVIS_API_TOKEN || '',
  allowedOrigins: (process.env.JARVIS_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
});
server.listen(port, process.env.HOST || '0.0.0.0', () => console.log('JARVIS backend listening on port ' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.close(error => { if (error) { console.error(error.message); process.exitCode = 1; } });
  server.closeIdleConnections();
});
