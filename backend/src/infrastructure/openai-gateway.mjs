import { AppError } from '../domain/errors.mjs';

export function extractResponseText(data) {
  const parts = [];
  for (const item of data?.output ?? []) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part.type === 'output_text' && typeof part.text === 'string') parts.push(part.text);
      else if (part.type === 'refusal' && typeof part.refusal === 'string') parts.push(part.refusal);
    }
  }
  return parts.join('\n').trim() || (typeof data?.output_text === 'string' ? data.output_text.trim() : '');
}

export class OpenAIGateway {
  constructor({ apiKey, model = 'gpt-6-astra', fastModel = model, complexModel = model, transcriptionModel = 'gpt-4o-mini-transcribe', fetchImpl = fetch, timeoutMs = 60000 }) {
    Object.assign(this, { apiKey, model, fastModel, complexModel, transcriptionModel, fetchImpl, timeoutMs });
  }
  get configured() { return Boolean(this.apiKey); }
  chooseModel(value) {
    if (/(research|analy[sz]e|compare|architecture|code|deep|plan|strategy|analiz|porówn|architektur|kod|strateg)/i.test(value) || value.length > 900) return this.complexModel;
    return value.length < 100 ? this.fastModel : this.model;
  }
  async #send(path, body, json = true) {
    if (!this.configured) throw new AppError(503, 'OPENAI_API_KEY is not configured on the backend');
    let response;
    try {
      response = await this.fetchImpl('https://api.openai.com/v1/' + path, {
        method: 'POST', headers: { Authorization: 'Bearer ' + this.apiKey, ...(json ? { 'Content-Type': 'application/json' } : {}) },
        body: json ? JSON.stringify(body) : body, signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      throw new AppError(error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : 502, 'AI provider request failed');
    }
    let data;
    try { data = await response.json(); } catch { throw new AppError(502, 'AI provider returned invalid JSON'); }
    if (!response.ok) throw new AppError(response.status === 429 ? 503 : 502, 'AI provider rejected the request (HTTP ' + response.status + ')');
    return data;
  }
  async chat(value, previous) {
    const model = this.chooseModel(value);
    const data = await this.#send('responses', {
      model, store: false, max_output_tokens: 2400,
      instructions: 'You are JARVIS 2.0, a precise personal AI assistant. Reply in the language used by the user. Be concise and explicit about uncertainty. You are a conversational assistant; do not claim to have executed tasks, reminders, integrations or external actions. The application manages tasks and memory through separate API operations.',
      input: [...previous, { role: 'user', content: value }]
    });
    if (data.status === 'failed' || data.status === 'incomplete') throw new AppError(502, 'AI provider did not complete the response');
    const content = extractResponseText(data);
    if (!content) throw new AppError(502, 'AI provider returned no text');
    return { content, model, responseId: data.id ?? null };
  }
  async transcribe({ buffer, filename, mime }) {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mime }), filename);
    form.append('model', this.transcriptionModel);
    form.append('response_format', 'json');
    const data = await this.#send('audio/transcriptions', form, false);
    if (typeof data.text !== 'string') throw new AppError(502, 'AI provider returned no transcription');
    return data.text;
  }
}
