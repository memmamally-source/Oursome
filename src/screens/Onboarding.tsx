import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Brand } from '@/config/brand';
import { PACKAGES, type PackageId } from '@/config/packages';
import { BrandMark, Icon } from '@/components/Icon';
import { DISCIPLINES } from '@/content/taxonomy';
import type { DisciplineId } from '@/content/schema';
import type { PlayStyle, PrepStage } from '@/engine/progress';
import { useProgress } from '@/state/progress';

const GOALS = [5, 10, 15, 30, 60];
const WEAK_OPTIONS: DisciplineId[] = ['pathology', 'physiology', 'pharmacology', 'biochemistry', 'microbiology', 'immunology', 'genetics', 'anatomy', 'biostatistics', 'behavioral'];

export function Onboarding() {
  const nav = useNavigate();
  const setProfile = useProgress((s) => s.setProfile);
  const [step, setStep] = useState<'package' | 'details'>('package');
  const [pkg, setPkg] = useState<PackageId>('step1');
  const [examDate, setExamDate] = useState('');
  const [stage, setStage] = useState<PrepStage | undefined>();
  const [weak, setWeak] = useState<string[]>([]);
  const [goal, setGoal] = useState(15);
  const [custom, setCustom] = useState('');
  const [style, setStyle] = useState<PlayStyle>('both');

  const finish = (withDetails: boolean) => {
    const g = custom ? Math.max(1, Math.min(600, Number(custom) || 15)) : goal;
    setProfile({
      packageId: pkg,
      onboarded: true,
      ...(withDetails ? { examDate: examDate || undefined, stage, weakSubjects: weak, dailyGoalMin: g, style } : {}),
    });
    nav('/', { replace: true });
  };

  return (
    <main className="main" style={{ maxWidth: 640, paddingBottom: 48 }}>
      <div className="brand" style={{ marginBottom: 32 }}>
        <BrandMark /> {Brand.name}
      </div>
      {step === 'package' ? (
        <div className="stack-lg fade-in">
          <div className="stack-sm">
            <span className="eyebrow">Welcome</span>
            <h1>Choose your package</h1>
            <p className="muted">{Brand.description}</p>
          </div>
          <div className="stack" role="radiogroup" aria-label="Exam package">
            {PACKAGES.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={pkg === p.id}
                disabled={!p.available}
                onClick={() => setPkg(p.id)}
                className="card card-link"
                style={{
                  textAlign: 'left',
                  cursor: p.available ? 'pointer' : 'not-allowed',
                  borderColor: pkg === p.id ? 'var(--red)' : undefined,
                  boxShadow: pkg === p.id ? 'inset 0 0 0 1px var(--red)' : undefined,
                  opacity: p.available ? 1 : 0.6,
                }}
              >
                <div className="row between">
                  <div className="stack-sm" style={{ gap: 2 }}>
                    <h2>{p.title}</h2>
                    <span className="muted">{p.strap}</span>
                  </div>
                  {p.available ? (
                    pkg === p.id && <Icon name="check" size={24} className="red" />
                  ) : (
                    <span className="badge">Coming soon</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setStep('details')}>
            Continue with Step 1
          </button>
          <p className="tiny muted" style={{ textAlign: 'center' }}>
            You can play as a guest. Progress is saved on this device; accounts with sync across devices come later.
          </p>
        </div>
      ) : (
        <div className="stack-lg fade-in">
          <div className="stack-sm">
            <span className="eyebrow">Optional · 30 seconds</span>
            <h1>Tailor your plan</h1>
            <p className="muted">Everything here can be changed later in Profile.</p>
          </div>
          <label className="field">
            When are you taking Step 1?
            <input className="input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </label>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>Where are you in your preparation?</legend>
            <div className="row-wrap">
              {(['beginning', 'midway', 'revising'] as const).map((s) => (
                <button key={s} className="chip" aria-pressed={stage === s} onClick={() => setStage(stage === s ? undefined : s)}>
                  {s === 'beginning' ? 'Just starting' : s === 'midway' ? 'Midway' : 'Final revision'}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>Which subjects feel weakest?</legend>
            <div className="row-wrap">
              {WEAK_OPTIONS.map((d) => (
                <button key={d} className="chip" aria-pressed={weak.includes(d)} onClick={() => setWeak(weak.includes(d) ? weak.filter((x) => x !== d) : [...weak, d])}>
                  {DISCIPLINES[d].title}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>Daily study goal</legend>
            <div className="row-wrap">
              {GOALS.map((g) => (
                <button
                  key={g}
                  className="chip"
                  aria-pressed={!custom && goal === g}
                  onClick={() => {
                    setGoal(g);
                    setCustom('');
                  }}
                >
                  {g} min
                </button>
              ))}
              <input className="input" style={{ width: 110, minHeight: 36 }} inputMode="numeric" placeholder="Custom" aria-label="Custom goal in minutes" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} />
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>How do you like to study?</legend>
            <div className="row-wrap">
              {(['casual', 'focused', 'both'] as const).map((s) => (
                <button key={s} className="chip" aria-pressed={style === s} onClick={() => setStyle(s)}>
                  {s === 'casual' ? 'Casual games' : s === 'focused' ? 'Focused revision' : 'Both'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="stack-sm">
            <button className="btn btn-primary btn-block" onClick={() => finish(true)}>
              Start playing
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => finish(false)}>
              Skip for now
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
