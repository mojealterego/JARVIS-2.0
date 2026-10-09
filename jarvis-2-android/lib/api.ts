import { normalizeApiUrl } from './url';
export { normalizeApiUrl } from './url';
import * as SecureStore from 'expo-secure-store';

const API_URL_KEY = 'jarvis_api_url';
const API_TOKEN_KEY = 'jarvis_api_token';
const DEFAULT_API_URL = 'http://10.0.2.2:8787';
const TIMEOUT_MS = 90000;

export type Health = { status: string; service?: string; version?: string; database?: string; ai?: string };
export type Message = { role: 'user' | 'assistant'; content: string };
export type ChatReply = Message & { id: string; model: string | null; createdAt: string };
export type Agent = { id: string; name: string; status: string; model?: string };
export type Task = { id: string; title: string; priority: string; status: string; createdAt: string };
export type MemoryEntry = { id: string; content: string; createdAt: string };
export type Approval = { id: string; action: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string };
export type Automation = { id: string; name: string; agent: string; schedule: string; enabled: boolean; createdAt: string };


export async function getApiUrl(): Promise<string> {
  return (await SecureStore.getItemAsync(API_URL_KEY)) || DEFAULT_API_URL;
}
export async function setApiUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(API_URL_KEY, normalizeApiUrl(url));
}
export async function hasApiToken(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(API_TOKEN_KEY));
}
export async function setApiToken(token: string): Promise<void> {
  const value = token.trim();
  if (value) await SecureStore.setItemAsync(API_TOKEN_KEY, value);
  else await SecureStore.deleteItemAsync(API_TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = normalizeApiUrl(await getApiUrl());
  const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', 'Bearer ' + token);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(base + path, { ...init, headers, signal: controller.signal });
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new Error('Serwer zwrócił niepoprawną odpowiedź (HTTP ' + response.status + ').'); }
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : '';
      throw new Error('API ' + response.status + (detail ? ': ' + detail : ''));
    }
    return payload as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Przekroczono czas oczekiwania na serwer.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export const api = {
  health: () => request<Health>('/api/health'),
  agents: () => request<{ agents: Agent[] }>('/api/agents'),
  tasks: () => request<Task[]>('/api/tasks'),
  approvals: () => request<Approval[]>('/api/approvals'),
  memory: () => request<MemoryEntry[]>('/api/memory'),
  automations: () => request<Automation[]>('/api/automations'),
  chat: (text: string, history: Message[] = []) =>
    request<ChatReply>('/api/chat', { method: 'POST', body: JSON.stringify({ text, history }) }),
  createTask: (title: string, priority = 'medium') =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify({ title, priority }) }),
  updateTask: (id: string, status: string) =>
    request<Task>('/api/tasks/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status }) }),
  remember: (text: string) =>
    request<MemoryEntry>('/api/memory', { method: 'POST', body: JSON.stringify({ text }) }),
  createAutomation: (name: string, agent: string, schedule: string) =>
    request<Automation>('/api/automations', { method: 'POST', body: JSON.stringify({ name, agent, schedule }) }),
  updateAutomation: (id: string, patch: { enabled: boolean }) =>
    request<Automation>('/api/automations/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) }),
  decideApproval: (id: string, status: 'approved' | 'rejected') =>
    request<Approval>('/api/approvals/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export async function transcribe(uri: string): Promise<{ text: string }> {
  const form = new FormData();
  form.append('file', { uri, name: 'voice.m4a', type: 'audio/mp4' } as unknown as Blob);
  return request<{ text: string }>('/api/transcribe', { method: 'POST', body: form });
}
