/**
 * Company identity: the single place for legal names, contact details and
 * registration facts. Anything set to `null` is NOT yet verified and is
 * rendered as a visible "to be supplied" placeholder; `npm run readiness`
 * lists every gap. Fill these in only with verified facts.
 */
export interface Company {
  brand: string;
  currentLegalName: string;
  futureLegalName: string;
  nameAmendmentComplete: boolean;
  nameReservation: { name: string; reference: string; validUntil: string };
  registrationNumber: string | null;
  address: string[] | null;
  country: string;
  emails: { general: string | null; support: string | null; privacy: string | null };
  phone: string | null;
  informationOfficer: string | null;
  founder: { name: string; show: boolean };
  since: number;
}

export const company: Company = {
  /** Public-facing brand. */
  brand: 'Karoo Fox',

  /** The company's current registered name with the CIPC. */
  currentLegalName: 'EM Medical Group (Pty) Ltd',

  /** The intended registered name once the CIPC name amendment is complete. */
  futureLegalName: 'Karoo Fox (Pty) Ltd',

  /**
   * Set to true ONLY after the CIPC has confirmed the amendment of the
   * registered name to Karoo Fox (Pty) Ltd. This switches every legal-entity
   * statement on the site to the new name.
   */
  nameAmendmentComplete: false,

  /** Name reservation (approved by the CIPC; valid until 18 May 2027). */
  nameReservation: { name: 'KAROO FOX', reference: '9471244619', validUntil: '2027-05-18' },

  /** CIPC company registration number, e.g. "2015/123456/07". */
  registrationNumber: null,

  /** Registered or business address, one line per array entry. */
  address: null,

  country: 'South Africa',

  /** Domain-based addresses, e.g. hello@karoofox.com. Must be monitored mailboxes. */
  emails: {
    general: null,
    support: null,
    privacy: null,
  },

  /** Optional public phone number in international format, e.g. "+27 12 345 6789". */
  phone: null,

  /** POPIA Information Officer (by law the head of the company unless delegated). */
  informationOfficer: null,

  /** Founder shown on the About page. Set `show` to false to omit. */
  founder: { name: 'Muhammad Emmamally', show: false }, // set show: true once the owner approves naming the founder publicly

  /** Year the Karoo Fox brand was established (copyright line). */
  since: 2026,
};

/** The legal name that currently applies. */
export function legalName(c: Pick<Company, 'nameAmendmentComplete' | 'futureLegalName' | 'currentLegalName'> = company): string {
  return c.nameAmendmentComplete ? c.futureLegalName : c.currentLegalName;
}

/** One-sentence statement of who operates Karoo Fox, accurate to the amendment status. */
export function entityStatement(c: Pick<Company, 'nameAmendmentComplete' | 'futureLegalName' | 'currentLegalName' | 'brand'> = company): string {
  if (c.nameAmendmentComplete) {
    return `${c.brand} is operated by ${c.futureLegalName} (formerly ${c.currentLegalName}), a private company registered in South Africa.`;
  }
  return `${c.brand} is a brand of ${c.currentLegalName}, a private company registered in South Africa. The company intends to change its registered name to ${c.futureLegalName}.`;
}
