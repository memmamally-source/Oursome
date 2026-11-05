import type { DisciplineId, SystemId, Topic } from './schema';

/**
 * Blueprint ranges are percentages of Step 1 items. They are used ONLY to weight syllabus coverage
 * and recommendations, never to predict scores. `verified` stays false until checked line by line
 * against the official outline on usmle.org (see STEP1_BLUEPRINT.md — usmle.org was not reachable
 * from the development sandbox, so the discipline ranges come from a search summary of that page).
 */
export interface Weighted {
  title: string;
  short: string;
  range: [number, number] | null;
}

export const BLUEPRINT_VERIFIED = false;

export const DISCIPLINES: Record<DisciplineId, Weighted> = {
  pathology: { title: 'Pathology', short: 'Path', range: [45, 55] },
  physiology: { title: 'Physiology', short: 'Phys', range: [30, 40] },
  pharmacology: { title: 'Pharmacology', short: 'Pharm', range: [10, 20] },
  biochemistry: { title: 'Biochemistry', short: 'Biochem', range: [5, 15] },
  nutrition: { title: 'Nutrition', short: 'Nutr', range: null }, // reported with biochemistry
  microbiology: { title: 'Microbiology', short: 'Micro', range: [10, 20] },
  immunology: { title: 'Immunology', short: 'Immuno', range: [5, 15] },
  anatomy: { title: 'Anatomy', short: 'Anat', range: [10, 20] }, // reported with embryology
  embryology: { title: 'Embryology', short: 'Embryo', range: null },
  histology: { title: 'Histology', short: 'Histo', range: [5, 15] }, // with cell biology
  'cell-biology': { title: 'Cell & molecular biology', short: 'Cell', range: null },
  behavioral: { title: 'Behavioural science', short: 'Behav', range: [10, 15] },
  genetics: { title: 'Genetics', short: 'Genetics', range: [5, 10] },
  biostatistics: { title: 'Biostatistics & epidemiology', short: 'Biostats', range: null },
  ethics: { title: 'Ethics & communication', short: 'Ethics', range: null },
};

/** Organ-system groups follow the shape of the official outline; ranges unverified (see above). */
export const SYSTEMS: Record<SystemId, Weighted> = {
  general: { title: 'General principles', short: 'General', range: null },
  'blood-immune': { title: 'Blood, lymphoreticular & immune', short: 'Heme/Immune', range: null },
  'nervous-behavioral': { title: 'Nervous system, special senses & behavioural health', short: 'Neuro/Psych', range: null },
  'musculoskeletal-skin': { title: 'Musculoskeletal, skin & subcutaneous', short: 'MSK/Skin', range: null },
  cardiovascular: { title: 'Cardiovascular', short: 'Cardio', range: null },
  respiratory: { title: 'Respiratory', short: 'Resp', range: null },
  renal: { title: 'Renal & urinary', short: 'Renal', range: null },
  gastrointestinal: { title: 'Gastrointestinal', short: 'GI', range: null },
  reproductive: { title: 'Reproductive', short: 'Repro', range: null },
  endocrine: { title: 'Endocrine', short: 'Endo', range: null },
  multisystem: { title: 'Multisystem processes', short: 'Multisystem', range: null },
  'biostats-epi': { title: 'Biostatistics, epidemiology & population health', short: 'Biostats', range: null },
  'social-sciences': { title: 'Social sciences: ethics, communication, safety', short: 'Social', range: null },
};

/** Level-3 topics. Concepts point at one of these. Add freely; ids are permanent once used. */
export const TOPICS: Topic[] = [
  // Cardiovascular
  { id: 'cv-antiarrhythmics', title: 'Antiarrhythmics', system: 'cardiovascular', discipline: 'pharmacology' },
  { id: 'cv-antihypertensives', title: 'Antihypertensives & heart failure drugs', system: 'cardiovascular', discipline: 'pharmacology' },
  { id: 'cv-physiology', title: 'Cardiac physiology', system: 'cardiovascular', discipline: 'physiology' },
  { id: 'cv-pathology', title: 'Cardiovascular pathology', system: 'cardiovascular', discipline: 'pathology' },
  // Renal
  { id: 'renal-glomerular', title: 'Glomerular diseases', system: 'renal', discipline: 'pathology' },
  { id: 'renal-acid-base', title: 'Acid–base physiology', system: 'renal', discipline: 'physiology' },
  { id: 'renal-diuretics', title: 'Diuretics', system: 'renal', discipline: 'pharmacology' },
  { id: 'renal-raas', title: 'Renin–angiotensin–aldosterone system', system: 'renal', discipline: 'physiology' },
  // Respiratory
  { id: 'resp-physiology', title: 'Respiratory physiology', system: 'respiratory', discipline: 'physiology' },
  { id: 'resp-pathology', title: 'Respiratory pathology', system: 'respiratory', discipline: 'pathology' },
  // Blood & immune
  { id: 'heme-anemias', title: 'Anaemias & haemolysis', system: 'blood-immune', discipline: 'pathology' },
  { id: 'heme-coagulation', title: 'Coagulation & anticoagulants', system: 'blood-immune', discipline: 'pharmacology' },
  { id: 'immuno-hypersensitivity', title: 'Hypersensitivity reactions', system: 'blood-immune', discipline: 'immunology' },
  { id: 'immuno-immunodeficiency', title: 'Immunodeficiencies', system: 'blood-immune', discipline: 'immunology' },
  // Biochemistry / genetics
  { id: 'biochem-metabolism', title: 'Metabolic pathways', system: 'general', discipline: 'biochemistry' },
  { id: 'biochem-inborn-errors', title: 'Inborn errors of metabolism', system: 'general', discipline: 'biochemistry' },
  { id: 'biochem-lysosomal', title: 'Lysosomal storage disorders', system: 'general', discipline: 'biochemistry' },
  { id: 'biochem-vitamins', title: 'Vitamins & nutrition', system: 'gastrointestinal', discipline: 'nutrition' },
  { id: 'genetics-inheritance', title: 'Inheritance patterns', system: 'general', discipline: 'genetics' },
  { id: 'genetics-trinucleotide', title: 'Trinucleotide repeat disorders', system: 'nervous-behavioral', discipline: 'genetics' },
  // Microbiology
  { id: 'micro-gram-positive', title: 'Gram-positive bacteria', system: 'general', discipline: 'microbiology' },
  { id: 'micro-gram-negative', title: 'Gram-negative bacteria', system: 'general', discipline: 'microbiology' },
  { id: 'micro-antibiotics', title: 'Antibiotic mechanisms', system: 'general', discipline: 'pharmacology' },
  { id: 'micro-viruses', title: 'Viruses', system: 'general', discipline: 'microbiology' },
  // Pharmacology – autonomic, general
  { id: 'pharm-autonomic', title: 'Autonomic pharmacology', system: 'general', discipline: 'pharmacology' },
  { id: 'pharm-toxicology', title: 'Toxicology & antidotes', system: 'multisystem', discipline: 'pharmacology' },
  // Endocrine
  { id: 'endo-thyroid', title: 'Thyroid', system: 'endocrine', discipline: 'physiology' },
  { id: 'endo-adrenal', title: 'Adrenal & steroid synthesis', system: 'endocrine', discipline: 'biochemistry' },
  { id: 'endo-diabetes', title: 'Diabetes & its drugs', system: 'endocrine', discipline: 'pharmacology' },
  // Neuro / GI / MSK
  { id: 'neuro-pathology', title: 'Neuropathology', system: 'nervous-behavioral', discipline: 'pathology' },
  { id: 'gi-pathology', title: 'GI & hepatobiliary pathology', system: 'gastrointestinal', discipline: 'pathology' },
  { id: 'msk-pathology', title: 'Musculoskeletal & connective tissue', system: 'musculoskeletal-skin', discipline: 'pathology' },
  // Biostatistics
  { id: 'biostats-tests', title: 'Diagnostic test statistics', system: 'biostats-epi', discipline: 'biostatistics' },
  { id: 'biostats-risk', title: 'Measures of risk & NNT', system: 'biostats-epi', discipline: 'biostatistics' },
  { id: 'biostats-studies', title: 'Study design & bias', system: 'biostats-epi', discipline: 'biostatistics' },
];

const topicIndex = new Map(TOPICS.map((t) => [t.id, t]));

export function getTopic(id: string): Topic | undefined {
  return topicIndex.get(id);
}
