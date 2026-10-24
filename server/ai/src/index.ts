import { claudeInterpreter } from './claude';
import { handle } from './handler';
import { kvLimiter, memoryLimiter } from './limiter';
import type { Env } from './types';

const fallbackLimiter = memoryLimiter();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env, {
      interpret: claudeInterpreter(env),
      limiter: env.RATE_KV ? kvLimiter(env.RATE_KV) : fallbackLimiter,
      // Workers Logs keep this: token counts and estimated cost per request, never the message text.
      log: (event) => console.log(JSON.stringify(event)),
    });
  },
};
