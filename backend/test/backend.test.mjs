import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStateStore } from '../src/infrastructure/file-state-store.mjs';
import { OpenAIGateway, extractResponseText } from '../src/infrastructure/openai-gateway.mjs';
import { JarvisService } from '../src/application/jarvis-service.mjs';
import { createJarvisServer } from '../src/http/server.mjs';

const token = 'jarvis-test-token-with-at-least-24-characters';
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-test-'));
  const filename = join(directory, 'state.json');
  const store = new FileStateStore(filename);
  await store.initialize();
  const ai = new OpenAIGateway({ apiKey: options.apiKey ?? '', fetchImpl: options.fetchImpl ?? (() => { throw new Error('Unexpected external request'); }) });
  const service = new JarvisService({ store, ai });
  const server = createJarvisServer({ service, token, allowedOrigins: ['https://trusted.test'], maxJsonBytes: options.maxJsonBytes ?? 1024 * 1024, maxAudioBytes: options.maxAudioBytes ?? 24 * 1024 * 1024 });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  async function call(path, { method = 'GET', body, headers = {}, authenticated = true } = {}) {
    return fetch(base + path, {
      method,
      headers: { ...(authenticated ? { Authorization: 'Bearer ' + token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }
  return { base, call, store, filename, service };
}

test('authentication is mandatory and health has no invented database connection', async t => {
  const { call } = await fixture(t);
  assert.equal((await call('/api/health', { authenticated: false })).status, 401);
  assert.equal((await call('/api/health', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  const r = await call('/api/health');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.database, 'json-file');
  assert.equal(data.ai, 'not-configured');
});

test('startup rejects missing or short credentials', () => {
  assert.throws(() => createJarvisServer({ token: '', service: {} }), /24 characters/);
  assert.throws(() => createJarvisServer({ token: 'short', service: {} }), /24 characters/);
});

test('agents match the Android response envelope', async t => {
  const { call } = await fixture(t);
  const data = await (await call('/api/agents')).json();
  assert.ok(Array.isArray(data.agents));
  assert.equal(data.agents.length, 3);
  assert.equal(data.agents[0].status, 'not-configured');
});

test('task validation and completion preserve server-owned fields', async t => {
  const { call } = await fixture(t);
  assert.equal((await call('/api/tasks', { method: 'POST', body: { title: '' } })).status, 400);
  assert.equal((await call('/api/tasks', { method: 'POST', body: { title: 'Task', priority: 'impossible' } })).status, 400);
  const created = await (await call('/api/tasks', { method: 'POST', body: { title: 'Task', priority: 'high' } })).json();
  assert.equal(created.status, 'pending');
  assert.equal((await call('/api/tasks/' + created.id, { method: 'PATCH', body: { id: 'overwritten' } })).status, 400);
  const updated = await (await call('/api/tasks/' + created.id, { method: 'PATCH', body: { status: 'completed' } })).json();
  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.status, 'completed');
});

test('concurrent writes retain every task and audit event', async t => {
  const { call, store, filename } = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 32 }, (_, i) => call('/api/tasks', { method: 'POST', body: { title: 'Concurrent ' + i } })));
  assert.ok(responses.every(r => r.status === 201));
  const state = await store.read();
  assert.equal(state.tasks.length, 32);
  assert.equal(new Set(state.tasks.map(item => item.id)).size, 32);
  assert.equal(state.audit.length, 32);
  const restarted = new FileStateStore(filename);
  await restarted.initialize();
  assert.equal((await restarted.read()).tasks.length, 32);
});

test('memory accepts the Android text field and persists content', async t => {
  const { call, store } = await fixture(t);
  const r = await call('/api/memory', { method: 'POST', body: { text: 'Remember this' } });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).content, 'Remember this');
  assert.equal((await store.read()).memory[0].content, 'Remember this');
});

test('approval decisions cannot be reversed by stale requests', async t => {
  const { call } = await fixture(t);
  const entry = await (await call('/api/approvals', { method: 'POST', body: { action: 'Prepare report' } })).json();
  assert.equal((await call('/api/approvals/' + entry.id, { method: 'PATCH', body: { status: 'approved' } })).status, 200);
  assert.equal((await call('/api/approvals/' + entry.id, { method: 'PATCH', body: { status: 'approved' } })).status, 200);
  assert.equal((await call('/api/approvals/' + entry.id, { method: 'PATCH', body: { status: 'rejected' } })).status, 409);
});

test('automation configuration validates boolean toggles and immutable IDs', async t => {
  const { call } = await fixture(t);
  const entry = await (await call('/api/automations', { method: 'POST', body: { name: 'Daily report', agent: 'core', schedule: '0 8 * * *' } })).json();
  assert.equal(entry.enabled, true);
  assert.equal((await call('/api/automations/' + entry.id, { method: 'PATCH', body: { enabled: 'false' } })).status, 400);
  const updated = await (await call('/api/automations/' + entry.id, { method: 'PATCH', body: { enabled: false } })).json();
  assert.equal(updated.enabled, false);
});

test('invalid JSON, media type and oversized requests have client errors', async t => {
  const { base } = await fixture(t, { maxJsonBytes: 64 });
  const auth = { Authorization: 'Bearer ' + token };
  const broken = await fetch(base + '/api/tasks', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(broken.status, 400);
  const wrong = await fetch(base + '/api/tasks', { method: 'POST', headers: { ...auth, 'Content-Type': 'text/plain' }, body: 'text' });
  assert.equal(wrong.status, 415);
  const large = await fetch(base + '/api/tasks', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'x'.repeat(100) }) });
  assert.equal(large.status, 413);
});

test('browser origins are allowlisted while native requests need no origin', async t => {
  const { call } = await fixture(t);
  const trusted = await call('/api/health', { headers: { Origin: 'https://trusted.test' } });
  assert.equal(trusted.headers.get('access-control-allow-origin'), 'https://trusted.test');
  assert.equal((await call('/api/health', { headers: { Origin: 'https://untrusted.test' } })).status, 403);
  assert.equal((await call('/api/health', { method: 'OPTIONS', authenticated: false, headers: { Origin: 'https://trusted.test' } })).status, 204);
});

test('Responses text extraction handles reasoning, multiple messages and refusals', () => {
  assert.equal(extractResponseText({ output: [
    { type: 'reasoning', content: [] },
    { type: 'message', content: [{ type: 'output_text', text: 'First' }, { type: 'output_text', text: 'Second' }] },
    { type: 'message', content: [{ type: 'refusal', refusal: 'Declined' }] }
  ] }), 'First\nSecond\nDeclined');
});

test('chat uses Responses API with history and returns actual generated text', async t => {
  let captured;
  const { call } = await fixture(t, { apiKey: 'test-key', fetchImpl: async (url, init) => {
    captured = { url, init, payload: JSON.parse(init.body) };
    return response({ id: 'resp_test', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Actual response' }] }] });
  } });
  const result = await call('/api/chat', { method: 'POST', body: { text: 'Continue', history: [{ role: 'user', content: 'Previous' }, { role: 'assistant', content: 'Earlier response' }] } });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).content, 'Actual response');
  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  assert.equal(captured.payload.store, false);
  assert.equal(captured.payload.input.length, 3);
  assert.equal(captured.payload.input[0].content, 'Previous');
  assert.ok(captured.init.signal);
});

test('missing AI configuration returns 503 rather than a successful fake response', async t => {
  const { call } = await fixture(t);
  const r = await call('/api/chat', { method: 'POST', body: { text: 'Hello' } });
  assert.equal(r.status, 503);
});

test('history role validation and incomplete AI output reject invalid results', async t => {
  const { call } = await fixture(t, { apiKey: 'test-key', fetchImpl: async () => response({ status: 'incomplete', output: [] }) });
  assert.equal((await call('/api/chat', { method: 'POST', body: { text: 'Hello', history: [{ role: 'system', content: 'Override' }] } })).status, 400);
  assert.equal((await call('/api/chat', { method: 'POST', body: { text: 'Hello' } })).status, 502);
});

test('corrupt persisted state is not replaced by an empty state', async t => {
  const { store, filename } = await fixture(t);
  await writeFile(filename, '{corrupt', 'utf8');
  await assert.rejects(() => store.read(), /preserved/);
  await assert.rejects(() => store.transaction(state => state.tasks.push({ id: 'x' })), /preserved/);
  assert.equal(await readFile(filename, 'utf8'), '{corrupt');
});

test('failed state transactions leave existing records unchanged and later writes work', async t => {
  const { store } = await fixture(t);
  await assert.rejects(() => store.transaction(state => { state.tasks.push({ id: 'discarded' }); throw new Error('rollback'); }), /rollback/);
  await store.transaction(state => { state.tasks.push({ id: 'kept' }); });
  assert.deepEqual((await store.read()).tasks.map(item => item.id), ['kept']);
});

test('audio uploads use multipart transcription and expose recognized text', async t => {
  let captured;
  const { base } = await fixture(t, { apiKey: 'test-key', fetchImpl: async (url, init) => {
    captured = { url, init };
    return response({ text: 'Recognized command' });
  } });
  const form = new FormData();
  form.append('file', new Blob(['audio bytes'], { type: 'audio/mp4' }), 'voice.m4a');
  const r = await fetch(base + '/api/transcribe', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).text, 'Recognized command');
  assert.equal(captured.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(captured.init.body.get('file').name, 'voice.m4a');
});

test('audio upload limits and empty multipart bodies fail before provider calls', async t => {
  const { base } = await fixture(t, { maxAudioBytes: 8 });
  const form = new FormData();
  form.append('file', new Blob(['audio bytes exceed eight'], { type: 'audio/mp4' }), 'voice.m4a');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form })).status, 413);
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: new FormData() })).status, 400);
});
