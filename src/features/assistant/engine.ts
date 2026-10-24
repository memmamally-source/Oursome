import { interpretBasic } from './basic';
import type { AssistantContext } from './context';
import type { Interpretation } from './interpretation';
import { answerQuery, type Answer } from './query';
import { interpretRemote, RemoteError, type HistoryTurn, type RemoteFailure } from './remote';
import { resolveInterpretation, type Resolution } from './resolve';

export type EngineResult = {
  source: 'ai' | 'basic';
  /** Why the AI wasn't used, when it wasn't. */
  fallback?: RemoteFailure;
  interpretation: Interpretation;
  resolution: Resolution;
  answer?: Answer;
};

export type Interpreter = (text: string, ctx: AssistantContext, history: HistoryTurn[]) => Promise<Interpretation>;

/**
 * Interpret a message and turn it into proposals or an answer.
 * The AI is tried first; any failure falls back to Basic mode, so one failed
 * request never breaks the app. Nothing is saved here.
 */
export async function processMessage(
  text: string,
  ctx: AssistantContext,
  history: HistoryTurn[],
  remote: Interpreter = interpretRemote,
): Promise<EngineResult> {
  let interpretation: Interpretation;
  let source: EngineResult['source'] = 'ai';
  let fallback: RemoteFailure | undefined;
  try {
    interpretation = await remote(text, ctx, history);
  } catch (e) {
    source = 'basic';
    fallback = e instanceof RemoteError ? e.reason : 'unavailable';
    interpretation = interpretBasic(text, ctx);
  }
  const resolution = resolveInterpretation(interpretation, ctx);
  const answer = resolution.query ? answerQuery(resolution.query, ctx) : undefined;
  return { source, fallback, interpretation, resolution, answer };
}
