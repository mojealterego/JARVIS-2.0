import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const token = randomBytes(32).toString('hex');
let container;
try {
  container = execFileSync('docker', ['run', '--rm', '-d', '-p', '127.0.0.1::8787', '-e', 'JARVIS_API_TOKEN', 'jarvis-backend:ci'], {
    env: { ...process.env, JARVIS_API_TOKEN: token }, encoding: 'utf8'
  }).trim();
  const port = execFileSync('docker', ['port', container, '8787/tcp'], { encoding: 'utf8' }).trim();
  const base = 'http://' + port;
  let health;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      health = await fetch(base + '/api/health', { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(2000) });
      if (health.ok) break;
    } catch { health = undefined; }
    await setTimeout(250);
  }
  assert.ok(health?.ok, 'Container did not start successfully.');
  assert.equal((await health.json()).status, 'ok');
  assert.equal((await fetch(base + '/api/health')).status, 401);
  const task = await fetch(base + '/api/tasks', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Container smoke task' })
  });
  assert.equal(task.status, 201);
  const list = await fetch(base + '/api/tasks', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await list.json()).length, 1);
  console.log('Container smoke passed: startup, authentication and persistent task operations.');
} finally {
  if (container) execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
}
