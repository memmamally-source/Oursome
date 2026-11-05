/** Exam packages. Content, taxonomy and daily puzzles are keyed by package id, so Step 2 CK and Step 3 slot in later. */
export type PackageId = 'step1' | 'step2ck' | 'step3';

export interface ExamPackage {
  id: PackageId;
  title: string;
  strap: string;
  available: boolean;
}

export const PACKAGES: readonly ExamPackage[] = [
  { id: 'step1', title: 'USMLE Step 1', strap: 'Master the foundations.', available: true },
  { id: 'step2ck', title: 'USMLE Step 2 CK', strap: 'Think like a clinician.', available: false },
  { id: 'step3', title: 'USMLE Step 3', strap: 'Manage the patient.', available: false },
];

export function getPackage(id: PackageId): ExamPackage {
  return PACKAGES.find((p) => p.id === id) ?? PACKAGES[0]!;
}
