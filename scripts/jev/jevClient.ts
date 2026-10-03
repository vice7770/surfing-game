/**
 * Jev (TypeSafe's System One model) over its HTTP API: one state, a map of typed
 * questions, typed answers back (docs.typesafe.ai/api). No text is generated, so
 * output tokens are free and the latency is mostly the network's round trip.
 *
 * The key is read from TYPESAFE_API_KEY, or from ~/.config/typesafe/api_key; it
 * never lives in the repository.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
/** $0.042 per million input tokens; output tokens are free (docs.typesafe.ai/models). */
export const PRICE_PER_INPUT_TOKEN = 0.042 / 1_000_000;
export const KEY_FILE = join(homedir(), '.config', 'typesafe', 'api_key');

import type { Answer, Decider, Questions, Verdict } from '../../src/dev/jev/answers';

export type { Decider, Verdict } from '../../src/dev/jev/answers';

export function readJevKey(): string {
  const env = process.env.TYPESAFE_API_KEY?.trim();
  if (env) return env;
  if (existsSync(KEY_FILE)) {
    const key = readFileSync(KEY_FILE, 'utf8').trim();
    if (key) return key;
  }
  throw new Error(`No Jev key: set TYPESAFE_API_KEY, or put the key in ${KEY_FILE} (chmod 600)`);
}

export interface JevClientOptions {
  key?: string;
  model?: string;
  /** Per attempt, ms. */
  timeoutMs?: number;
  /** Retries after a 429, a 529, a 5xx or a dropped connection, with exponential backoff. */
  retries?: number;
  fetch?: typeof fetch;
}

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504, 529]);

export class JevClient implements Decider {
  readonly model: string;
  calls = 0;
  failures = 0;
  inputTokens = 0;
  private readonly key: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetcher: typeof fetch;

  constructor(options: JevClientOptions = {}) {
    this.key = options.key ?? readJevKey();
    this.model = options.model ?? 'jev-latest';
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.retries = options.retries ?? 2;
    this.fetcher = options.fetch ?? fetch;
  }

  get spentUsd(): number {
    return this.inputTokens * PRICE_PER_INPUT_TOKEN;
  }

  async decide(state: unknown, questions: Questions): Promise<Verdict> {
    const body = JSON.stringify({ model: this.model, state, questions });
    const started = performance.now();
    let error = '';
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetcher(JEV_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json' },
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (response.ok) {
          const out = await response.json() as { model?: string; answers: Record<string, Answer>; usage?: { input_tokens?: number } };
          const tokens = out.usage?.input_tokens ?? 0;
          this.calls += 1;
          this.inputTokens += tokens;
          return { answers: out.answers ?? {}, latencyMs: performance.now() - started, inputTokens: tokens, costUsd: tokens * PRICE_PER_INPUT_TOKEN, model: out.model };
        }
        error = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
        if (!RETRY_STATUSES.has(response.status)) break;
        const after = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 100 * 2 ** attempt);
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
        await sleep(100 * 2 ** attempt);
      }
    }
    this.calls += 1;
    this.failures += 1;
    return { answers: {}, latencyMs: performance.now() - started, inputTokens: 0, costUsd: 0, error };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
