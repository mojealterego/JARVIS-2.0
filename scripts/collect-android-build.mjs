import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('artifacts');
await mkdir(directory, { recursive: true });
const local = process.argv[2] === '--local';
let metadata;
if (local) {
  metadata = { source: 'GitHub Actions local Gradle', signing: 'Expo generated debug keystore; internal testing only', commit: process.env.GITHUB_SHA ?? null };
} else {
  const source = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const build = Array.isArray(source) ? source[0] : source;
  const url = build?.artifacts?.applicationArchiveUrl ?? build?.artifacts?.buildUrl;
  if (build?.status !== 'FINISHED' || typeof url !== 'string' || !url.startsWith('https://')) throw new Error('EAS has no completed Android artifact.');
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error('APK download failed: HTTP ' + response.status);
  await writeFile(resolve(directory, 'JARVIS-2.0-preview.apk'), Buffer.from(await response.arrayBuffer()));
  metadata = { source: 'EAS Build', buildId: build.id, commit: process.env.GITHUB_SHA ?? null, version: build.appVersion, signing: 'EAS managed Android credentials' };
}
const names = ['JARVIS-2.0-preview.apk'];
if (local) names.push('JARVIS-2.0-preview.aab');
const checksums = [];
for (const name of names) {
  const bytes = await readFile(resolve(directory, name));
  if (bytes.length < 1024 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Invalid Android archive: ' + name);
  checksums.push(createHash('sha256').update(bytes).digest('hex') + '  ' + name);
}
await writeFile(resolve(directory, 'SHA256SUMS.txt'), checksums.join('\n') + '\n');
await writeFile(resolve(directory, 'build-info.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify(metadata));
