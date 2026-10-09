import { readFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(process.argv[2], 'utf8'));
for (const build of Array.isArray(source) ? source : [source]) {
  console.log(JSON.stringify({
    id: build.id, status: build.status, platform: build.platform,
    profile: build.buildProfile, createdAt: build.createdAt,
    sourceCommit: build.gitCommitHash, version: build.appVersion,
    error: build.error
  }));
  if (!build.id) process.exitCode = 1;
  const phases = [];
  for (const url of (build.logFiles ?? []).slice(-3)) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;
      for (const line of (await response.text()).split('\n')) {
        try {
          const event = JSON.parse(line);
          if (event.phase) phases.push({ phase: event.phase, time: event.time });
        } catch { /* Log text is intentionally not printed. */ }
      }
    } catch { console.log('A phase log is temporarily unavailable.'); }
  }
  const latest = phases.sort((a,b) => String(a.time).localeCompare(String(b.time))).at(-1);
  if (latest) console.log(JSON.stringify({ latestPhase: latest.phase, phaseTime: latest.time }));
}
