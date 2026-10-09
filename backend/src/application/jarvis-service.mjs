import { randomUUID } from 'node:crypto';
import { AppError } from '../domain/errors.mjs';
import { history, object, onlyFields, option, text } from '../domain/validation.mjs';

const now = () => new Date().toISOString();
const priorities = ['low', 'medium', 'high', 'critical'];
const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

export class JarvisService {
  constructor({ store, ai }) { this.store = store; this.ai = ai; }
  async #change(event, operation) {
    return this.store.transaction(state => {
      const result = operation(state);
      state.audit.push({ event, itemId: result.id, createdAt: now() });
      state.audit = state.audit.slice(-2000);
      return result;
    });
  }
  async handle(method, path, data = {}) {
    if (method === 'GET' && path === '/api/health') return { status: 200, payload: {
      status: 'ok', service: 'JARVIS 2.0 backend', version: '2.1.0', database: 'json-file',
      ai: this.ai.configured ? 'configured' : 'not-configured', scheduler: 'configuration-only'
    } };
    if (method === 'GET' && path === '/api/agents') return { status: 200, payload: { agents: [
      { id: 'core', name: 'JARVIS Core', status: this.ai.configured ? 'configured' : 'not-configured' },
      { id: 'research', name: 'Research conversation', status: this.ai.configured ? 'configured' : 'not-configured' },
      { id: 'automation', name: 'Automation configuration', status: 'configuration-only' }
    ] } };
    if (method === 'GET' && path === '/api/integrations') return { status: 200, payload: {
      openai: this.ai.configured, postgres: false, telegram: false, google: false
    } };
    const match = /^\/api\/(tasks|memory|approvals|automations|audit)(?:\/([^/]+))?$/.exec(path);
    if (method === 'GET' && match && !match[2]) {
      const state = await this.store.read();
      return { status: 200, payload: match[1] === 'audit' ? state.audit.slice(-200).reverse() : state[match[1]] };
    }
    if (method === 'POST' && path === '/api/chat') {
      object(data);
      const value = text(data.message ?? data.text, 'message', 16000);
      const previous = history(data.history);
      const reply = await this.ai.chat(value, previous);
      const item = { id: randomUUID(), role: 'assistant', content: reply.content, model: reply.model, createdAt: now() };
      await this.store.transaction(state => {
        state.audit.push({ event: 'chat', itemId: item.id, responseId: reply.responseId, createdAt: item.createdAt });
        state.audit = state.audit.slice(-2000);
      });
      return { status: 200, payload: item };
    }
    if (method === 'POST' && match && !match[2] && match[1] !== 'audit') {
      object(data);
      const collection = match[1];
      let attributes;
      if (collection === 'tasks') attributes = { title: text(data.title, 'title', 300), priority: option(data.priority ?? 'medium', priorities, 'priority'), status: 'pending' };
      if (collection === 'memory') attributes = { content: text(data.content ?? data.text, 'content', 16000) };
      if (collection === 'approvals') attributes = { action: text(data.action, 'action'), status: 'pending' };
      if (collection === 'automations') attributes = { name: text(data.name, 'name', 300), agent: option(data.agent ?? 'core', ['core', 'research', 'automation'], 'agent'), schedule: text(data.schedule, 'schedule', 300), enabled: true };
      const item = { id: randomUUID(), ...attributes, createdAt: now() };
      const saved = await this.#change(collection + '.created', state => { state[collection].push(item); return item; });
      return { status: 201, payload: saved };
    }
    if (method === 'PATCH' && match && match[2] && ['tasks', 'approvals', 'automations'].includes(match[1])) {
      object(data);
      const collection = match[1];
      let patch = {};
      if (collection === 'tasks') {
        onlyFields(data, ['title', 'priority', 'status']);
        if (data.title !== undefined) patch.title = text(data.title, 'title', 300);
        if (data.priority !== undefined) patch.priority = option(data.priority, priorities, 'priority');
        if (data.status !== undefined) patch.status = option(data.status, taskStatuses, 'task status');
      }
      if (collection === 'approvals') {
        onlyFields(data, ['status']);
        patch.status = option(data.status, ['approved', 'rejected'], 'approval status');
      }
      if (collection === 'automations') {
        onlyFields(data, ['name', 'agent', 'schedule', 'enabled']);
        if (data.name !== undefined) patch.name = text(data.name, 'name', 300);
        if (data.agent !== undefined) patch.agent = option(data.agent, ['core', 'research', 'automation'], 'agent');
        if (data.schedule !== undefined) patch.schedule = text(data.schedule, 'schedule', 300);
        if (data.enabled !== undefined) {
          if (typeof data.enabled !== 'boolean') throw new AppError(400, 'enabled must be a boolean');
          patch.enabled = data.enabled;
        }
      }
      const id = decodeURIComponent(match[2]);
      const item = await this.#change(collection + '.updated', state => {
        const entry = state[collection].find(value => value.id === id);
        if (!entry) throw new AppError(404, 'not_found');
        if (collection === 'approvals' && entry.status !== 'pending' && entry.status !== patch.status) throw new AppError(409, 'approval already decided');
        Object.assign(entry, patch, { updatedAt: now() });
        return entry;
      });
      return { status: 200, payload: item };
    }
    throw new AppError(404, 'not_found');
  }
}
