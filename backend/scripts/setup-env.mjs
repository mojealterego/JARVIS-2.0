import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../.env', import.meta.url);
try {
  await readFile(file);
  console.log('Existing .env preserved. Configure OPENAI_API_KEY there, then run npm start.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  const content = template.replace(/^JARVIS_API_TOKEN=$/m, 'JARVIS_API_TOKEN=' + randomBytes(32).toString('hex'));
  await writeFile(file, content, { mode: 0o600, flag: 'wx' });
  console.log('Created backend/.env with a generated API token. Configure OPENAI_API_KEY and enter the API token in Android settings.');
}
