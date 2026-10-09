import { readFile } from 'node:fs/promises';

let source;
try { source = JSON.parse(await readFile(process.argv[2], 'utf8')); }
catch { console.log('EAS did not produce structured build metadata.'); process.exit(0); }
for (const build of Array.isArray(source) ? source : [source]) {
  console.log(JSON.stringify({ id: build.id, status: build.status, error: build.error, message: build.message, buildProfile: build.buildProfile }));
  if (build.status !== 'ERRORED') continue;
  for (const url of (build.logFiles ?? []).filter(value => typeof value === 'string')) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) continue;
      const content = await response.text();
      const lines = content.split('\n').filter(line => /error|failed|exception|not found|unsupported|incompatible/i.test(line));
      console.log(lines.slice(-25).join('\n').slice(0,6000));
    } catch { console.log('EAS remote log could not be read.'); }
  }
}
