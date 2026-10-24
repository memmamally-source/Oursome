import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { SYSTEM_PROMPT, userTurn } from './prompt';
import { InterpretationSchema } from './schema';
import type { Env, Interpreter } from './types';

export const DEFAULT_MODEL = 'claude-opus-5-5';

/** Models that accept server-side refusal fallbacks (`fallbacks: "default"`) on the Claude API. */
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);
const EFFORTS = new Set(['low', 'medium', 'high']);

/**
 * Claude via the official SDK with structured outputs: the response must
 * match `InterpretationSchema`. The stable system prompt carries a cache
 * breakpoint; per-request data follows it in the user turn.
 */
export function claudeInterpreter(env: Env): Interpreter {
  if (!env.ANTHROPIC_API_KEY) return async () => ({ ok: false, reason: 'not_configured' });
  // Short timeout and one retry: the app falls back to Basic mode rather than keep someone waiting.
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 10_000, maxRetries: 1 });
  const model = env.AI_MODEL || DEFAULT_MODEL;
  const effort = (EFFORTS.has(env.AI_EFFORT ?? '') ? env.AI_EFFORT : 'low') as 'low' | 'medium' | 'high';
  const fallback = FALLBACK_MODELS.has(model);

  return async (req) => {
    try {
      const response = await client.beta.messages.parse({
        model,
        max_tokens: 8000,
        // On a safety decline, the API re-runs the request on Anthropic's recommended fallback model.
        betas: fallback ? ['server-side-fallback-2026-07-01'] : [],
        fallbacks: fallback ? 'default' : undefined,
        output_config: { effort, format: betaZodOutputFormat(InterpretationSchema) },
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userTurn(req.message, req.context, req.history) }],
      });
      const usage = response.usage;
      if (response.stop_reason === 'refusal') return { ok: false, reason: 'refused', model: response.model, usage };
      if (!response.parsed_output) return { ok: false, reason: 'invalid_output', model: response.model, usage };
      return { ok: true, interpretation: response.parsed_output, model: response.model, usage };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: 'busy' };
      if (error instanceof Anthropic.APIError) return { ok: false, reason: 'upstream' };
      // Structured output that failed schema validation surfaces as a parse error.
      return { ok: false, reason: 'invalid_output' };
    }
  };
}
