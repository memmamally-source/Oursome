import { AI_DRAFT } from '../define';
import type { ConnectionGroup } from '../schema';

type G = Omit<ConnectionGroup, 'kind' | 'review' | 'version' | 'difficulty'> & { difficulty?: ConnectionGroup['difficulty'] };

const g = (x: G): ConnectionGroup => ({
  kind: 'group',
  review: AI_DRAFT,
  version: 1,
  difficulty: x.difficulty ?? ((x.tier + 1) as ConnectionGroup['difficulty']),
  ...x,
});

/**
 * Connections category bank. A puzzle picks four groups and, for each, four members that are NOT
 * members of any other chosen group, so every displayed term has exactly one valid home.
 * Membership lists must be complete for the terms they contain (see MEDICAL_QA.md).
 */
export const CONNECTION_GROUPS: ConnectionGroup[] = [
  g({
    id: 'grp:beta-blockers',
    label: 'β-blockers',
    tier: 1,
    conceptIds: ['class3-qt'],
    members: ['Metoprolol', 'Atenolol', 'Propranolol', 'Carvedilol', 'Nadolol', 'Labetalol', 'Sotalol'],
    explanation: 'All block β-adrenergic receptors ("-olol"). Sotalol also has class III K⁺-channel activity; carvedilol and labetalol also block α1.',
  }),
  g({
    id: 'grp:lysosomal',
    label: 'Lysosomal storage disorders',
    tier: 2,
    conceptIds: ['gaucher', 'tay-sachs', 'fabry'],
    members: ['Gaucher', 'Fabry', 'Tay-Sachs', 'Krabbe', 'Niemann–Pick', 'Hurler'],
    explanation: 'Each is a lysosomal enzyme deficiency: glucocerebrosidase (Gaucher), α-galactosidase A (Fabry), hexosaminidase A (Tay-Sachs), galactocerebrosidase (Krabbe), sphingomyelinase (Niemann–Pick), α-L-iduronidase (Hurler).',
  }),
  g({
    id: 'grp:x-linked',
    label: 'X-linked recessive disorders',
    tier: 3,
    conceptIds: ['x-linked-recessive', 'g6pd', 'bruton', 'fabry'],
    members: ['G6PD deficiency', 'Haemophilia A', 'Duchenne', 'Fabry', 'Bruton agammaglobulinaemia', 'Lesch–Nyhan', 'OTC deficiency'],
    explanation: 'All are X-linked recessive: mostly males affected, carrier mothers, no male-to-male transmission.',
  }),
  g({
    id: 'grp:type2',
    label: 'Type II hypersensitivity',
    tier: 3,
    conceptIds: ['hypersensitivity'],
    members: ['Goodpasture', 'Graves disease', 'Myasthenia gravis', 'Pemphigus vulgaris', 'Acute rheumatic fever', 'Autoimmune haemolytic anaemia'],
    explanation: 'Antibodies bind fixed cell-surface or matrix antigens: type IV collagen, TSH receptor, ACh receptor, desmoglein 3, cross-reacting M protein, red cell antigens.',
  }),
  g({
    id: 'grp:type3',
    label: 'Type III (immune complex) hypersensitivity',
    tier: 3,
    conceptIds: ['hypersensitivity', 'psgn'],
    members: ['Serum sickness', 'Arthus reaction', 'Post-streptococcal GN', 'Lupus nephritis', 'Polyarteritis nodosa'],
    explanation: 'Circulating antigen–antibody complexes deposit in vessels or glomeruli and activate complement.',
  }),
  g({
    id: 'grp:type4',
    label: 'Type IV (T-cell) hypersensitivity',
    tier: 3,
    conceptIds: ['hypersensitivity'],
    members: ['Contact dermatitis', 'Tuberculin skin test', 'Graft-versus-host disease', 'Multiple sclerosis'],
    explanation: 'Delayed reactions mediated by sensitised T cells, without antibody.',
  }),
  g({
    id: 'grp:cell-wall',
    label: 'Cell wall synthesis inhibitors',
    tier: 1,
    conceptIds: ['beta-lactams'],
    members: ['Penicillin G', 'Vancomycin', 'Cefazolin', 'Meropenem', 'Bacitracin', 'Fosfomycin'],
    explanation: 'All block peptidoglycan synthesis: β-lactams bind PBPs, vancomycin binds D-Ala-D-Ala, bacitracin blocks carrier recycling, fosfomycin blocks MurA.',
  }),
  g({
    id: 'grp:30s',
    label: '30S ribosomal inhibitors',
    tier: 2,
    conceptIds: ['beta-lactams'],
    members: ['Gentamicin', 'Tobramycin', 'Streptomycin', 'Doxycycline', 'Tetracycline'],
    explanation: 'Aminoglycosides and tetracyclines bind the 30S subunit (aminoglycosides cause misreading; tetracyclines block aminoacyl-tRNA binding).',
  }),
  g({
    id: 'grp:50s',
    label: '50S ribosomal inhibitors',
    tier: 2,
    conceptIds: ['beta-lactams'],
    members: ['Azithromycin', 'Erythromycin', 'Clindamycin', 'Linezolid', 'Chloramphenicol'],
    explanation: 'Macrolides, lincosamides, oxazolidinones and chloramphenicol act on the 50S subunit.',
  }),
  g({
    id: 'grp:trinucleotide',
    label: 'Trinucleotide repeat disorders',
    tier: 2,
    conceptIds: ['huntington'],
    members: ['Huntington disease', 'Fragile X syndrome', 'Myotonic dystrophy', 'Friedreich ataxia'],
    explanation: 'CAG (Huntington), CGG (fragile X), CTG (myotonic dystrophy), GAA (Friedreich ataxia).',
  }),
  g({
    id: 'grp:vitk',
    label: 'Vitamin K–dependent proteins',
    tier: 2,
    conceptIds: ['warfarin'],
    members: ['Factor II', 'Factor VII', 'Factor IX', 'Factor X', 'Protein C', 'Protein S'],
    explanation: 'All need γ-carboxylation using reduced vitamin K, so warfarin lowers them.',
  }),
  g({
    id: 'grp:hagma',
    label: 'Causes of high anion gap acidosis',
    tier: 3,
    conceptIds: ['anion-gap'],
    members: ['Methanol', 'Ethylene glycol', 'Diabetic ketoacidosis', 'Uraemia', 'Lactic acidosis', 'Salicylate poisoning'],
    explanation: 'Each adds an unmeasured acid anion (formate, glycolate/oxalate, ketoacids, retained organic acids, lactate, salicylate and organic acids).',
  }),
  g({
    id: 'grp:encapsulated',
    label: 'Encapsulated bacteria',
    tier: 2,
    conceptIds: ['strep-pneumoniae'],
    members: ['Streptococcus pneumoniae', 'Haemophilus influenzae b', 'Neisseria meningitidis', 'Klebsiella pneumoniae', 'Group B streptococcus'],
    explanation: 'Polysaccharide capsules resist phagocytosis; asplenic patients are at particular risk.',
  }),
  g({
    id: 'grp:antidotes',
    label: 'Antidotes',
    tier: 1,
    conceptIds: ['organophosphate', 'acetaminophen', 'heparin'],
    members: ['Naloxone', 'Flumazenil', 'Pralidoxime', 'N-acetylcysteine', 'Fomepizole', 'Protamine'],
    explanation: 'Opioids, benzodiazepines, organophosphates, acetaminophen, toxic alcohols and heparin respectively.',
  }),
  g({
    id: 'grp:nephrotic',
    label: 'Nephrotic syndromes',
    tier: 2,
    conceptIds: ['minimal-change'],
    members: ['Minimal change disease', 'Membranous nephropathy', 'FSGS', 'Renal amyloidosis', 'Diabetic nephropathy'],
    explanation: 'All present mainly with heavy proteinuria, hypoalbuminaemia and oedema.',
  }),
  g({
    id: 'grp:nephritic',
    label: 'Nephritic syndromes',
    tier: 2,
    conceptIds: ['psgn'],
    members: ['Post-streptococcal GN', 'IgA nephropathy', 'Alport syndrome', 'Goodpasture', 'Granulomatosis with polyangiitis'],
    explanation: 'All present mainly with haematuria, red cell casts, hypertension and reduced GFR.',
  }),
  g({
    id: 'grp:tpp',
    label: 'Thiamine-dependent enzymes',
    tier: 4,
    conceptIds: ['thiamine'],
    members: ['Pyruvate dehydrogenase', 'α-Ketoglutarate dehydrogenase', 'Transketolase', 'Branched-chain α-keto acid dehydrogenase'],
    explanation: 'Thiamine pyrophosphate is the cofactor for all four.',
  }),
  g({
    id: 'grp:adp-ribosylating',
    label: 'ADP-ribosylating toxins',
    tier: 4,
    conceptIds: ['pseudomonas', 'staph-aureus'],
    members: ['Diphtheria toxin', 'Pseudomonas exotoxin A', 'Cholera toxin', 'Pertussis toxin', 'E. coli heat-labile toxin'],
    explanation: 'Each transfers ADP-ribose to a host protein: EF-2 (diphtheria, exotoxin A), Gs (cholera, heat-labile), Gi (pertussis).',
  }),
  g({
    id: 'grp:catalase-pos',
    label: 'Catalase-positive organisms',
    tier: 4,
    conceptIds: ['staph-aureus'],
    members: ['Staphylococcus aureus', 'Nocardia', 'Aspergillus', 'Candida', 'Serratia', 'Burkholderia cepacia'],
    explanation: 'Classic catalase-positive organisms that cause recurrent infections in chronic granulomatous disease, because they destroy their own H₂O₂.',
  }),
];
