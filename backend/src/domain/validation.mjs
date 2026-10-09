import { AppError } from './errors.mjs';

export const collections = ['tasks', 'memory', 'approvals', 'automations', 'audit'];
export function emptyState() {
  return Object.fromEntries(collections.map(name => [name, []]));
}
export function validateState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid state object.');
  for (const name of collections) if (!Array.isArray(value[name])) throw new Error('Invalid state collection: ' + name);
  return value;
}
export function text(value, name, maximum = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) throw new AppError(400, name + ' must be a non-empty string of at most ' + maximum + ' characters');
  return value.trim();
}
export function option(value, allowed, name) {
  if (!allowed.includes(value)) throw new AppError(400, 'invalid ' + name);
  return value;
}
export function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError(400, 'JSON body must be an object');
  return value;
}
export function onlyFields(value, allowed) {
  if (!Object.keys(value).length || Object.keys(value).some(name => !allowed.includes(name))) throw new AppError(400, 'invalid update fields');
}
export function history(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 24) throw new AppError(400, 'history must contain at most 24 messages');
  return value.map(item => {
    object(item);
    return { role: option(item.role, ['user', 'assistant'], 'history role'), content: text(item.content, 'history content', 16000) };
  }).slice(-12);
}
