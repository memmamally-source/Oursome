import { company, type Company } from '../config/company.ts';
import { apps, type App } from '../data/apps.ts';

export interface Gap {
  area: string;
  item: string;
  why: string;
  /** Must be fixed before the site goes public (it shows a visible placeholder). */
  blocksPublish: boolean;
  /** Must be fixed before using the site for Apple organisation enrolment. */
  blocksApple: boolean;
}


/** Everything still to be supplied or verified before the site is published. Pure: pass data in to test it. */
export function readinessGaps(c: Company = company, list: App[] = apps, siteUrl = ''): Gap[] {
  const gaps: Gap[] = [];
  const need = (ok: unknown, item: string, why: string, blocksPublish = true) => {
    if (!ok) gaps.push({ area: 'Company', item, why, blocksPublish, blocksApple: true });
  };
  need(c.registrationNumber, 'CIPC registration number (config: registrationNumber)', 'Identifies the legal entity; Apple checks it against D-U-N-S.');
  need(c.address, 'Business address (config: address)', 'Must match the D-U-N-S record Apple uses.');
  need(c.emails.general, 'General business email on the company domain (config: emails.general)', 'Apple expects a domain email that matches the website domain.');
  need(c.emails.support, 'Support email (config: emails.support)', 'Shown in the Support Centre and used when an app has no own mailbox.');
  need(c.emails.privacy, 'Privacy email (config: emails.privacy)', 'Required contact for privacy and data-deletion requests.');
  need(c.informationOfficer, 'POPIA Information Officer name (config: informationOfficer)', 'POPIA requires the Information Officer to be identifiable.', false);
  if (!siteUrl || /localhost|127\.0\.0\.1|\.invalid/.test(siteUrl)) {
    gaps.push({ area: 'Domain', item: 'Custom domain (SITE_URL at build time)', why: 'Apple needs a public website on the organisation’s own domain.', blocksPublish: false, blocksApple: true });
  }
  if (!c.nameAmendmentComplete) {
    gaps.push({ area: 'Company', item: 'CIPC name amendment to Karoo Fox (Pty) Ltd', why: 'Apple enrols the legal entity name; until then the site correctly shows EM Medical Group (Pty) Ltd.', blocksPublish: false, blocksApple: true });
  }
  for (const app of list) {
    for (const r of app.releases) {
      if (r.status === 'available' && !r.url) {
        gaps.push({ area: app.name, item: `${r.platform === 'ios' ? 'App Store' : r.platform === 'android' ? 'Google Play' : 'Web'} listing URL`, why: 'Shown as available without a link until the URL is added to apps.ts.', blocksPublish: false, blocksApple: false });
      }
      if (r.status === 'unconfirmed') {
        gaps.push({ area: app.name, item: `${r.platform} release status`, why: 'Hidden from the site until confirmed in apps.ts.', blocksPublish: false, blocksApple: false });
      }
    }
    if (!app.supportEmail && !c.emails.support) {
      gaps.push({ area: app.name, item: 'Support email', why: 'No app mailbox and no company support email.', blocksPublish: true, blocksApple: false });
    }
  }
  return gaps;
}

/** Placeholders that are visible on pages (drives the preview banner and noindex). */
export function hasVisiblePlaceholders(c: Company = company): boolean {
  return !c.registrationNumber || !c.address || !c.emails.general || !c.emails.support || !c.emails.privacy;
}
