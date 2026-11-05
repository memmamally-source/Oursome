import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { PageHeader, Sheet } from '@/components/ui';
import { PACKAGES } from '@/config/packages';
import { PLANS } from '@/config/plans';
import { DISCIPLINES } from '@/content/taxonomy';
import { dateKey } from '@/engine/random';
import { formatDuration } from '@/engine/studyTime';
import { cloudConfigured } from '@/lib/firebaseConfig';
import { exportProgress, useProgress } from '@/state/progress';
import { useTimeSummary } from '@/state/derived';

const RESOURCES = ['UWorld', 'AMBOSS', 'First Aid', 'Pathoma', 'Sketchy', 'Boards & Beyond', 'Anki', 'NBME / practice exam', 'Lectures', 'Other'];
const GOALS = [5, 10, 15, 30, 60];

export function Profile() {
  const profile = useProgress((s) => s.profile);
  const external = useProgress((s) => s.external);
  const { setProfile, addExternal, removeExternal, resetAll } = useProgress();
  const time = useTimeSummary();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ resource: 'UWorld', minutes: '', subject: '', date: dateKey(), notes: '' });

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `steps-ahead-study-data-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <PageHeader title="Profile" eyebrow="Settings and study log" />

      <section className="card stack-sm">
        <div className="row between">
          <div>
            <h2>Guest</h2>
            <p className="small muted">Progress is saved on this device.</p>
          </div>
          <Icon name="profile" size={28} />
        </div>
        <p className="small muted">
          {cloudConfigured
            ? 'Cloud accounts are configured for this build but sign-in is not switched on yet.'
            : 'Accounts with sync across devices arrive once the Steps Ahead cloud project is connected. Until then, export your data to keep a copy.'}
        </p>
      </section>

      <section className="card stack">
        <h2>Study settings</h2>
        <label className="field">
          Package
          <select className="input" value={profile.packageId} onChange={(e) => setProfile({ packageId: e.target.value as typeof profile.packageId })}>
            {PACKAGES.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.available}>
                {p.title}
                {p.available ? '' : ' (coming soon)'}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Exam date
          <input className="input" type="date" value={profile.examDate ?? ''} onChange={(e) => setProfile({ examDate: e.target.value || undefined })} />
        </label>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>Daily goal</legend>
          <div className="row-wrap">
            {GOALS.map((g) => (
              <button key={g} className="chip" aria-pressed={profile.dailyGoalMin === g} onClick={() => setProfile({ dailyGoalMin: g })}>
                {g} min
              </button>
            ))}
            <input
              className="input"
              style={{ width: 120, minHeight: 36 }}
              inputMode="numeric"
              aria-label="Custom daily goal in minutes"
              placeholder="Custom"
              defaultValue={GOALS.includes(profile.dailyGoalMin) ? '' : profile.dailyGoalMin}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (n >= 1 && n <= 600) setProfile({ dailyGoalMin: Math.round(n) });
              }}
            />
          </div>
        </fieldset>
      </section>

      <section className="card stack">
        <h2>Appearance and accessibility</h2>
        <div className="row-wrap" role="radiogroup" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} className="chip" role="radio" aria-checked={profile.theme === t} onClick={() => setProfile({ theme: t })}>
              {t === 'system' ? 'Match device' : t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
        <label className="row">
          <input type="checkbox" checked={profile.reduceMotion} onChange={(e) => setProfile({ reduceMotion: e.target.checked })} />
          Reduce motion (also follows your device setting)
        </label>
        <label className="row">
          <input type="checkbox" checked={profile.leaderboardOptIn} onChange={(e) => setProfile({ leaderboardOptIn: e.target.checked })} />
          Show me on public leaderboards when they launch (off by default)
        </label>
      </section>

      <section className="card stack">
        <div>
          <h2>Log study elsewhere</h2>
          <p className="small muted">
            Kept separate from time tracked in {''}the app. This week: {formatDuration(time.externalWeek)} logged, {formatDuration(time.week)} in-app, {formatDuration(time.week + time.externalWeek)} combined.
          </p>
        </div>
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const minutes = Number(form.minutes);
            if (!(minutes > 0 && minutes <= 960)) return;
            addExternal({ resource: form.resource, minutes, subject: form.subject || undefined, date: form.date, notes: form.notes.trim() || undefined });
            setForm({ ...form, minutes: '', notes: '' });
          }}
        >
          <div className="grid-2">
            <label className="field">
              Resource
              <select className="input" value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })}>
                {RESOURCES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Minutes
              <input className="input" inputMode="numeric" required value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value.replace(/\D/g, '') })} />
            </label>
            <label className="field">
              Subject (optional)
              <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                <option value="">Mixed</option>
                {Object.entries(DISCIPLINES).map(([k, d]) => (
                  <option key={k} value={k}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Date
              <input className="input" type="date" max={dateKey()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
          </div>
          <label className="field">
            Notes (optional)
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!Number(form.minutes)}>
            <Icon name="plus" size={18} /> Add to log
          </button>
        </form>
        {external.length > 0 && (
          <ul className="list">
            {[...external]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 20)
              .map((e) => (
                <li key={e.id} className="row between">
                  <div>
                    <strong>{e.resource}</strong> · {e.minutes} min
                    <div className="tiny muted">
                      {e.date}
                      {e.subject ? ` · ${DISCIPLINES[e.subject as keyof typeof DISCIPLINES]?.title ?? e.subject}` : ''}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </div>
                  </div>
                  <button className="btn btn-text btn-sm" aria-label={`Delete ${e.resource} entry`} onClick={() => removeExternal(e.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="card stack-sm">
        <h2>Plans</h2>
        <p className="small muted">Everything is free while the app is in development. Explanations will always stay free.</p>
        {PLANS.map((p) => (
          <div key={p.id}>
            <strong>{p.title}</strong>
            <ul className="small" style={{ margin: '4px 0 8px', paddingLeft: 20 }}>
              {p.includes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card stack-sm">
        <h2>Your data</h2>
        <div className="row-wrap">
          <Link to="/progress" className="btn btn-ghost">
            <Icon name="chart" size={18} /> View dashboard
          </Link>
          <button className="btn btn-ghost" onClick={download}>
            <Icon name="download" size={18} /> Export study history
          </button>
          <Link to="/about" className="btn btn-ghost">
            Content & sources
          </Link>
          <button className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={18} /> Delete all data
          </button>
        </div>
      </section>

      {confirmDelete && (
        <Sheet title="Delete all data?" onClose={() => setConfirmDelete(false)}>
          <div className="stack">
            <p>This permanently erases your study time, answers, mistakes, review schedule, external log and settings from this device. It cannot be undone.</p>
            <div className="row-wrap">
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetAll();
                  setConfirmDelete(false);
                }}
              >
                Delete everything
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
