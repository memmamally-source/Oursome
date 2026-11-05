/**
 * Shared teaching components: answer feedback ("every incorrect answer teaches something"),
 * Teach Me This mini lessons, the question card used by quiz-style games, and error reporting.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { content } from '@/content';
import type { Concept, McqItem, TrueFalseItem } from '@/content/schema';
import { getSource } from '@/content/sources';
import { DISCIPLINES, SYSTEMS } from '@/content/taxonomy';
import { useProgress } from '@/state/progress';
import { Icon } from './Icon';
import { Sheet } from './ui';

type QItem = McqItem | TrueFalseItem;

export function expectedText(item: QItem): string {
  return item.kind === 'mcq' ? item.options.find((o) => o.id === item.answerId)!.text : item.isTrue ? 'True' : 'False';
}

export function promptText(item: QItem): string {
  return item.kind === 'mcq' ? item.stem : item.statement;
}

/** Multiple-choice or true/false question. Keyboard: 1–5 / A–E, or T / F. */
export function QuestionCard({ item, onAnswer, answered }: { item: QItem; onAnswer: (correct: boolean, response: string, choiceId: string) => void; answered: string | null }) {
  const choices = useMemo(
    () => (item.kind === 'mcq' ? item.options.map((o) => ({ id: o.id, text: o.text })) : [{ id: 'true', text: 'Fact' }, { id: 'false', text: 'Fiction' }]),
    [item],
  );
  const correctId = item.kind === 'mcq' ? item.answerId : item.isTrue ? 'true' : 'false';
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      let idx: number;
      if (item.kind === 'tf') idx = k === 't' || k === '1' ? 0 : k === 'f' || k === '2' ? 1 : -1;
      else idx = /^[1-9]$/.test(k) ? Number(k) - 1 : /^[a-e]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
      const c = choices[idx];
      if (c) onAnswer(c.id === correctId, c.text, c.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, choices, correctId, item.kind, onAnswer]);

  return (
    <div className="stack">
      <p style={{ fontSize: '1.05rem', fontWeight: 500 }}>{promptText(item)}</p>
      <div className={item.kind === 'tf' ? 'grid-2' : 'stack-sm'}>
        {choices.map((c, i) => {
          const state = answered ? (c.id === correctId ? ' is-correct' : c.id === answered ? ' is-wrong' : '') : '';
          return (
            <button
              key={c.id}
              className={`option${state}`}
              disabled={!!answered}
              aria-pressed={answered === c.id}
              onClick={() => onAnswer(c.id === correctId, c.text, c.id)}
              style={item.kind === 'tf' ? { justifyContent: 'center', fontWeight: 700 } : undefined}
            >
              {item.kind === 'mcq' && <span className="key">{String.fromCharCode(65 + i)}</span>}
              <span style={{ flex: item.kind === 'mcq' ? 1 : undefined }}>{c.text}</span>
              {answered && c.id === correctId && <Icon name="check" size={20} title="Correct answer" />}
              {answered && c.id === answered && c.id !== correctId && <Icon name="x" size={20} title="Your answer" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface FeedbackProps {
  correct: boolean;
  item: QItem;
  chosenId: string | null;
  onTeach?: () => void;
}

/** Feedback after an answer: correct answer, mini explanation, why the choice was wrong, mechanism, takeaway. */
export function AnswerFeedback({ correct, item, chosenId, onTeach }: FeedbackProps) {
  const concept = content.concept(item.conceptIds[0]!);
  const [detail, setDetail] = useState(false);
  const openExplanation = useProgress((s) => s.openExplanation);
  const chosen = item.kind === 'mcq' ? item.options.find((o) => o.id === chosenId) : null;
  const why = item.kind === 'mcq' ? chosen?.whyWrong : item.correction;
  const mechanism = item.kind === 'mcq' ? item.mechanism : concept?.mechanism;
  const takeaway = item.kind === 'mcq' ? item.takeaway : concept?.takeaway;
  return (
    <section className={`feedback fade-in ${correct ? 'feedback-ok' : 'feedback-bad'}`} aria-live="polite">
      <h3>
        <Icon name={correct ? 'check' : 'x'} size={20} />
        {correct ? 'Correct' : 'Not quite'}
      </h3>
      {!correct && (
        <div className="section">
          <div className="section-title">Correct answer</div>
          <p style={{ fontWeight: 700 }}>{expectedText(item)}</p>
        </div>
      )}
      <div className="section">
        <div className="section-title">Why</div>
        <p>{item.mini}</p>
      </div>
      {!correct && why && (
        <div className="section">
          <div className="section-title">{item.kind === 'tf' ? 'The accurate statement' : 'Why your answer was wrong'}</div>
          <p>{why}</p>
        </div>
      )}
      {!correct && mechanism && (
        <div className="section">
          <div className="section-title">Mechanism</div>
          <p>{mechanism}</p>
        </div>
      )}
      {takeaway && (
        <div className="section">
          <div className="section-title">Step 1 takeaway</div>
          <p className="takeaway">{takeaway}</p>
        </div>
      )}
      {detail && concept && (
        <div className="section stack-sm">
          <div className="section-title">Detailed explanation</div>
          {concept.detailed.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      <div className="row-wrap" style={{ marginTop: 12 }}>
        {concept && !detail && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDetail(true);
              openExplanation(concept.id, 'detailed', item.id);
            }}
          >
            Detailed explanation
          </button>
        )}
        {onTeach && (
          <button className="btn btn-dark btn-sm" onClick={onTeach}>
            <Icon name="bulb" size={16} /> Teach me this
          </button>
        )}
        <ReportButton itemId={item.id} conceptId={concept?.id} />
      </div>
    </section>
  );
}

export function ReportButton({ itemId, conceptId }: { itemId?: string; conceptId?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const report = useProgress((s) => s.report);
  return (
    <>
      <button className="btn btn-text btn-sm" onClick={() => setOpen(true)}>
        <Icon name="flag" size={16} /> Report an error
      </button>
      {open && (
        <Sheet title="Report a content error" onClose={() => setOpen(false)}>
          {sent ? (
            <div className="stack">
              <p>Thank you. Your report is saved on this device with the item reference and will be sent to medical reviewers once cloud sync is turned on.</p>
              <button className="btn btn-primary" onClick={() => setOpen(false)}>Done</button>
            </div>
          ) : (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                report({ itemId, conceptId, text: text.trim() });
                setSent(true);
              }}
            >
              <label className="field">
                What looks wrong?
                <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. the answer key, an explanation, a lab value" />
              </label>
              <p className="tiny muted">Reference: {itemId ?? conceptId}</p>
              <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
                Save report
              </button>
            </form>
          )}
        </Sheet>
      )}
    </>
  );
}

/** Teach Me This: quick and detailed explanation, associations, misconception, related concepts and a follow-up question. */
export function LessonBody({ concept, excludeItemId, compact }: { concept: Concept; excludeItemId?: string; compact?: boolean }) {
  const [depth, setDepth] = useState<'quick' | 'detailed'>('quick');
  const { openExplanation, toggleSaved, savedConcepts, answer } = useProgress();
  const saved = savedConcepts.includes(concept.id);
  const followUp = useMemo(() => {
    const options: QItem[] = [...content.itemsOf('mcq', { conceptIds: [concept.id] }), ...content.itemsOf('tf', { conceptIds: [concept.id] })];
    return options.find((o) => o.id !== excludeItemId) ?? null;
  }, [concept.id, excludeItemId]);
  const [fa, setFa] = useState<{ id: string; correct: boolean } | null>(null);

  useEffect(() => {
    openExplanation(concept.id, 'lesson');
  }, [concept.id, openExplanation]);

  return (
    <div className="stack">
      <div className="row-wrap">
        <span className="badge badge-red">{DISCIPLINES[concept.discipline].title}</span>
        <span className="badge">{SYSTEMS[concept.system].title}</span>
        <span className="badge">{content.topicTitle(concept.topic)}</span>
      </div>
      <div role="tablist" aria-label="Explanation depth" className="row-wrap">
        {(['quick', 'detailed'] as const).map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={depth === d}
            aria-checked={depth === d}
            className="chip"
            onClick={() => {
              setDepth(d);
              if (d === 'detailed') openExplanation(concept.id, 'detailed');
            }}
          >
            {d === 'quick' ? 'Quick (20 s)' : 'Detailed'}
          </button>
        ))}
      </div>
      {depth === 'quick' ? (
        <p style={{ fontSize: '1.05rem' }}>{concept.quick}</p>
      ) : (
        <div className="stack-sm">
          {concept.detailed.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      <div>
        <div className="eyebrow">Mechanism</div>
        <p>{concept.mechanism}</p>
      </div>
      <div>
        <div className="eyebrow">Key facts and associations</div>
        <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
          {(compact ? concept.facts.slice(0, 4) : concept.facts).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <div className="card card-tight" style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
        <div className="eyebrow" style={{ color: 'var(--warn)' }}>Common misconception</div>
        <p>{concept.misconception}</p>
      </div>
      <p className="takeaway">{concept.takeaway}</p>
      {concept.related.length > 0 && (
        <div>
          <div className="eyebrow">Related concepts</div>
          <div className="row-wrap" style={{ marginTop: 6 }}>
            {concept.related.map((r) => {
              const rc = content.concept(r);
              return rc ? (
                <Link key={r} to={`/learn/${r}`} className="chip">
                  {rc.title}
                </Link>
              ) : null;
            })}
          </div>
        </div>
      )}
      {followUp && (
        <div className="card stack">
          <div className="eyebrow">Check your understanding</div>
          <QuestionCard
            item={followUp}
            answered={fa?.id ?? null}
            onAnswer={(correct, response, id) => {
              if (fa) return;
              setFa({ id, correct });
              answer({ gameId: 'review', item: followUp, correct, prompt: promptText(followUp), response, expected: expectedText(followUp) });
            }}
          />
          {fa && <AnswerFeedback correct={fa.correct} item={followUp} chosenId={fa.id} />}
        </div>
      )}
      {concept.citations.length > 0 && (
        <div className="tiny muted">
          References:{' '}
          {concept.citations.map((c) => {
            const s = getSource(c.sourceId);
            return s ? (
              <span key={c.sourceId}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                {c.locator ? ` (${c.locator})` : ''}.{' '}
              </span>
            ) : null;
          })}
        </div>
      )}
      <div className="row-wrap">
        <button className="btn btn-ghost btn-sm" onClick={() => toggleSaved(concept.id)} aria-pressed={saved}>
          <Icon name="bookmark" size={16} /> {saved ? 'Saved' : 'Save concept'}
        </button>
        <Link className="btn btn-ghost btn-sm" to={`/play/survival?concept=${concept.id}`}>
          Practise this
        </Link>
        <ReportButton conceptId={concept.id} />
      </div>
    </div>
  );
}

export function TeachSheet({ conceptId, excludeItemId, onClose }: { conceptId: string; excludeItemId?: string; onClose: () => void }) {
  const concept = content.concept(conceptId);
  if (!concept) return null;
  return (
    <Sheet title={concept.title} onClose={onClose}>
      <LessonBody concept={concept} excludeItemId={excludeItemId} compact />
    </Sheet>
  );
}
