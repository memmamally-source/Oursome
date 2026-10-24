import type { Interpretation, InterpretRequest } from './schema';

export type Env = {
  /** Secret: set with `wrangler secret put ANTHROPIC_API_KEY`. Never committed. */
  ANTHROPIC_API_KEY?: string;
  /** Claude model ID. The owner chooses; see README for costs. */
  AI_MODEL?: string;
  /** low | medium | high — thinking depth. Lower is faster and cheaper. */
  AI_EFFORT?: string;
  /** Comma-separated browser origins allowed to call the service. */
  ALLOWED_ORIGINS?: string;
  PER_DEVICE_PER_MINUTE?: string;
  PER_DEVICE_PER_DAY?: string;
  /** Hard ceiling on Claude calls per UTC day across everyone: the cost cap. */
  GLOBAL_PER_DAY?: string;
  /** Optional KV namespace so limits survive across Worker instances. */
  RATE_KV?: KVLike;
};

export type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export type InterpretResult =
  | { ok: true; interpretation: Interpretation; model: string; usage: Usage }
  | { ok: false; reason: 'refused' | 'invalid_output' | 'busy' | 'upstream' | 'not_configured'; model?: string; usage?: Usage };

/** Calls the model. Injected so the handler can be tested without the network. */
export type Interpreter = (req: InterpretRequest) => Promise<InterpretResult>;

export type Limiter = {
  /** Counts one hit; returns false when the key is over its limit for the window. */
  hit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
};

export type LogEvent = Record<string, string | number | boolean | null | undefined>;
