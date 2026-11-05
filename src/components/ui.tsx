import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { content } from '@/content';
import { STATUS_LABEL, type MasteryStatus } from '@/engine/mastery';
import { Icon } from './Icon';

export function PageHeader({ title, eyebrow, back, actions, children }: { title: string; eyebrow?: string; back?: string | true; actions?: ReactNode; children?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="stack-sm" style={{ marginBottom: 20 }}>
      {back && (
        <div>
          {back === true ? (
            <button className="btn btn-text" style={{ paddingLeft: 0 }} onClick={() => nav(-1)}>
              <Icon name="back" size={18} /> Back
            </button>
          ) : (
            <Link className="btn btn-text" style={{ paddingLeft: 0 }} to={back}>
              <Icon name="back" size={18} /> Back
            </Link>
          )}
        </div>
      )}
      <div className="row between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="stack-sm" style={{ gap: 4 }}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
        </div>
        {actions}
      </div>
      {children}
    </header>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card card-tight stack-sm" style={{ gap: 2 }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="tiny muted">{sub}</span>}
    </div>
  );
}

export function Bar({ value, label, dark }: { value: number; label: string; dark?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`bar${dark ? ' bar-dark' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS_CLASS: Record<MasteryStatus, string> = {
  strong: 'badge-ok',
  improving: 'badge-ok',
  developing: '',
  needs_revision: 'badge-bad',
  insufficient: 'badge-warn',
  not_studied: '',
};

export function StatusBadge({ status }: { status: MasteryStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function pct(x: number | null | undefined): string {
  return x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Shown on every screen with medical content while it is unreviewed. */
export function PreviewBanner() {
  if (!content.isPreview) return null;
  return (
    <p className="banner" role="note">
      Reviewer preview: this medical content is an AI-drafted original awaiting medical review. Don’t rely on it for patient care.
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty card">{children}</div>;
}
