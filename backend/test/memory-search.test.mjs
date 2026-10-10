import test from 'node:test';
import assert from 'node:assert/strict';
import { JarvisService } from '../src/application/jarvis-service.mjs';

function fixture() {
  let state = { tasks: [], memory: [], approvals: [], automations: [], audit: [] };
  const store = {
    read: async () => structuredClone(state),
    transaction: async fn => {
      const draft = structuredClone(state);
      const result = await fn(draft);
      state = draft;
      return result;
    }
  };
  return new JarvisService({ store, ai: { configured: false } });
}
test('memory search returns ranked bounded results and supports deletion', async () => {
  const service = fixture();
  const a = (await service.handle('POST', '/api/memory', { content: 'Projekt JARVIS pamięta kontekst' })).payload;
  await service.handle('POST', '/api/memory', { content: 'Projekt THOR' });
  const found = await service.handle('POST', '/api/memory/search', { query: 'projekt JARVIS', limit: 1 });
  assert.equal(found.payload.results.length, 1);
  assert.equal(found.payload.results[0].id, a.id);
  assert.equal(found.payload.results[0].relevance, 2);
  assert.equal((await service.handle('DELETE', '/api/memory/' + a.id)).status, 204);
  assert.equal((await service.handle('POST', '/api/memory/search', { query: 'JARVIS' })).payload.total, 0);
  assert.ok((await service.handle('GET', '/api/audit')).payload.some(e => e.event === 'memory.deleted'));
});
test('memory search validates limits and missing deletion', async () => {
  const service = fixture();
  await assert.rejects(service.handle('POST', '/api/memory/search', { query: 'test', limit: 999 }), { status: 400 });
  await assert.rejects(service.handle('DELETE', '/api/memory/missing'), { status: 404 });
});

test('memory search tokenizes whitespace and ranks complete term matches', async () => {
  const service = fixture();
  const first = (await service.handle('POST', '/api/memory', { content: 'JARVIS planuje zadania' })).payload;
  await service.handle('POST', '/api/memory', { content: 'JARVIS pamięta' });
  const found = await service.handle('POST', '/api/memory/search', { query: 'JARVIS    zadania', limit: 2 });
  assert.equal(found.payload.results.length, 2);
  assert.equal(found.payload.results[0].id, first.id);
  assert.equal(found.payload.results[0].relevance, 2);
  assert.equal(found.payload.results[1].relevance, 1);
});

test('memory deletion does not affect other entries and is not repeatable', async () => {
  const service = fixture();
  const first = (await service.handle('POST', '/api/memory', { content: 'Usuń tę informację' })).payload;
  const retained = (await service.handle('POST', '/api/memory', { content: 'Zachowaj tę informację' })).payload;
  await service.handle('DELETE', '/api/memory/' + first.id);
  const items = (await service.handle('GET', '/api/memory')).payload;
  assert.deepEqual(items.map(item => item.id), [retained.id]);
  await assert.rejects(service.handle('DELETE', '/api/memory/' + first.id), { status: 404 });
});
