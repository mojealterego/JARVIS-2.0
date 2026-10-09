import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyState, validateState } from '../domain/validation.mjs';

export class FileStateStore {
  #tail = Promise.resolve();
  constructor(filename) { this.filename = resolve(filename); }
  async #read() {
    try { return validateState(JSON.parse(await readFile(this.filename, 'utf8'))); }
    catch (error) {
      if (error.code === 'ENOENT') return emptyState();
      throw new Error('State could not be read; the existing file was preserved.', { cause: error });
    }
  }
  async initialize() {
    await mkdir(dirname(this.filename), { recursive: true });
    await this.#read();
  }
  async read() {
    await this.#tail;
    return this.#read();
  }
  transaction(change) {
    const operation = this.#tail.then(async () => {
      const state = await this.#read();
      const result = await change(state);
      validateState(state);
      const temporary = this.filename + '.' + randomUUID() + '.tmp';
      try {
        await writeFile(temporary, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        await rename(temporary, this.filename);
      } finally { await rm(temporary, { force: true }); }
      return structuredClone(result);
    });
    this.#tail = operation.then(() => undefined, () => undefined);
    return operation;
  }
}
