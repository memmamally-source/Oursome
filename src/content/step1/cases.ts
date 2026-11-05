import { AI_DRAFT } from '../define';
import type { CaseItem } from '../schema';

type C = Omit<CaseItem, 'kind' | 'review' | 'version'>;
const c = (x: C): CaseItem => ({ kind: 'case', review: AI_DRAFT, version: 1, ...x });

/**
 * Mystery Patient cases. Original scenarios; laboratory values are illustrative and internally
 * consistent. Each final question targets a mechanism, as Step 1 does.
 */
export const CASES: CaseItem[] = [
  c({
    id: 'case:g6pd-dapsone',
    title: 'The new prescription',
    conceptIds: ['g6pd'],
    difficulty: 3,
    stages: [
      { label: 'Presentation', text: 'A 27-year-old man presents with fatigue, dark urine and yellow eyes for two days.' },
      { label: 'History', text: 'Five days ago he started dapsone for a skin condition. He had a similar episode as a teenager during a febrile illness. A maternal uncle had "blood problems".' },
      { label: 'Examination', text: 'Pulse 108/min. Pale with scleral icterus. Mild splenomegaly. No lymphadenopathy.' },
      { label: 'Laboratory', text: 'Hb 8.4 g/dL (baseline 14.6), reticulocytes 9%, unconjugated bilirubin raised, LDH raised, haptoglobin low. Direct antiglobulin test negative. Urine dipstick positive for blood with no red cells on microscopy.' },
      { label: 'Imaging & tests', text: 'Peripheral smear: red cells with semicircular "bites" missing; a supravital stain shows small inclusions attached to the membrane.' },
      { label: 'Further clue', text: 'A G6PD activity assay sent today is reported as low-normal.' },
    ],
    question: 'Which process in his red cells has failed?',
    options: [
      { id: 'a', text: 'Regeneration of reduced glutathione by NADPH', whyWrong: undefined },
      { id: 'b', text: 'ATP generation by pyruvate kinase', whyWrong: 'PK deficiency causes chronic haemolysis without oxidant triggers, bite cells or Heinz bodies.' },
      { id: 'c', text: 'Anchoring of the membrane to spectrin', whyWrong: 'Cytoskeletal defects cause spherocytes and a chronic course.' },
      { id: 'd', text: 'Complement regulation by GPI-anchored proteins', whyWrong: 'PNH causes complement-mediated intravascular haemolysis; it is not drug-triggered and the smear lacks bite cells.' },
      { id: 'e', text: 'IgG-mediated opsonisation of red cells', whyWrong: 'The direct antiglobulin test is negative, arguing against immune haemolysis.' },
    ],
    answerId: 'a',
    explanation:
      'Dapsone is an oxidant. A Coombs-negative haemolysis with bite cells and Heinz bodies in a man with an affected maternal uncle (X-linked) is G6PD deficiency. The low-normal assay during an acute episode is expected: the oldest, most deficient cells have already lysed, so the test should be repeated in a few months.',
    mechanism: 'G6PD → NADPH → glutathione reductase keeps glutathione reduced → peroxide neutralised. Without it, haemoglobin oxidises (Heinz bodies) and splenic macrophages bite them out.',
    takeaway: 'Oxidant drug + bite cells + Heinz bodies + Coombs-negative = G6PD deficiency; levels can be falsely normal acutely.',
    differentials: [
      { name: 'Hereditary spherocytosis', why: 'Chronic, autosomal dominant, spherocytes with high MCHC; no oxidant trigger.' },
      { name: 'Warm autoimmune haemolytic anaemia', why: 'Direct antiglobulin test would be positive.' },
      { name: 'Paroxysmal nocturnal haemoglobinuria', why: 'CD55/CD59 loss; often thrombosis and cytopenias; flow cytometry diagnostic.' },
    ],
  }),
  c({
    id: 'case:organophosphate',
    title: 'Found in the orchard',
    conceptIds: ['organophosphate'],
    difficulty: 3,
    stages: [
      { label: 'Presentation', text: 'A 45-year-old orchard worker is brought in drowsy, wheezing and drooling.' },
      { label: 'History', text: 'He was spraying crops all morning without gloves. He vomited twice and had diarrhoea en route.' },
      { label: 'Examination', text: 'Pulse 46/min, BP 92/58 mmHg, RR 28/min, SpO₂ 88%. Pinpoint pupils. Copious oral and bronchial secretions, diffuse wheeze, sweating. Twitching of the thigh muscles; weak grip.' },
      { label: 'Laboratory', text: 'Glucose normal. Red cell cholinesterase activity markedly reduced.' },
      { label: 'Further clue', text: 'After atropine, his secretions dry and heart rate rises, but he still cannot lift his head from the bed.' },
    ],
    question: 'Which mechanism explains the persistent weakness, and what will reverse it?',
    options: [
      { id: 'a', text: 'Excess acetylcholine at nicotinic receptors; pralidoxime regenerates acetylcholinesterase' },
      { id: 'b', text: 'Excess acetylcholine at muscarinic receptors; more atropine', whyWrong: 'Muscarinic effects have already responded; skeletal muscle uses nicotinic receptors, which atropine does not block.' },
      { id: 'c', text: 'Blocked presynaptic acetylcholine release; antitoxin', whyWrong: 'This is botulism: dilated pupils, dry mouth and descending paralysis.' },
      { id: 'd', text: 'Antibodies against acetylcholine receptors; neostigmine', whyWrong: 'Myasthenia gravis is chronic; neostigmine would worsen cholinergic excess here.' },
      { id: 'e', text: 'Opioid receptor agonism; naloxone', whyWrong: 'Opioids cause miosis but not bronchorrhoea, sweating or fasciculations.' },
    ],
    answerId: 'a',
    explanation:
      'Organophosphates phosphorylate acetylcholinesterase. Atropine treats the muscarinic features (secretions, bronchospasm, bradycardia), but neuromuscular weakness is nicotinic. Pralidoxime reactivates the enzyme if given before the phosphate bond "ages".',
    mechanism: 'Irreversible AChE inhibition → ACh accumulates at muscarinic and nicotinic synapses → depolarising block at the neuromuscular junction.',
    takeaway: 'Organophosphates: atropine for muscarinic effects + pralidoxime for nicotinic (give early).',
    differentials: [
      { name: 'Opioid toxicity', why: 'Miosis and respiratory depression but dry, without fasciculations or bronchorrhoea.' },
      { name: 'Botulism', why: 'Descending paralysis with dilated pupils and dry mouth.' },
      { name: 'Carbamate poisoning', why: 'Similar picture but the enzyme inhibition is reversible and does not age.' },
    ],
  }),
  c({
    id: 'case:otc',
    title: 'The sleepy newborn',
    conceptIds: ['otc-deficiency'],
    difficulty: 4,
    stages: [
      { label: 'Presentation', text: 'A 3-day-old boy is feeding poorly, vomiting and increasingly sleepy.' },
      { label: 'History', text: 'Term delivery, uneventful. Breastfeeding started on day 1. His mother’s brother died in infancy of an "unknown metabolic illness".' },
      { label: 'Examination', text: 'Lethargic, hypotonic, RR 64/min with no increased work of breathing. No hepatomegaly. Fontanelle full.' },
      { label: 'Laboratory', text: 'Blood gas: pH 7.50, PaCO₂ 28 mmHg (respiratory alkalosis). Plasma ammonia 620 µmol/L (very high). Glucose normal. BUN low. Full blood count normal.' },
      { label: 'Further clue', text: 'Urinary orotic acid is markedly raised. Plasma citrulline is low.' },
    ],
    question: 'Which enzyme is deficient?',
    options: [
      { id: 'a', text: 'Ornithine transcarbamylase' },
      { id: 'b', text: 'Carbamoyl phosphate synthetase I', whyWrong: 'CPS I deficiency also lowers citrulline but orotic acid is NOT raised, because carbamoyl phosphate is not produced.' },
      { id: 'c', text: 'UMP synthase', whyWrong: 'Hereditary orotic aciduria causes megaloblastic anaemia without hyperammonaemia.' },
      { id: 'd', text: 'Argininosuccinate synthetase', whyWrong: 'Citrullinaemia causes very HIGH citrulline.' },
      { id: 'e', text: 'Pyruvate carboxylase', whyWrong: 'Causes lactic acidosis and hypoglycaemia, not isolated hyperammonaemia with orotic aciduria.' },
    ],
    answerId: 'a',
    explanation:
      'Hyperammonaemia with respiratory alkalosis in a newborn after protein feeding points to a urea cycle disorder. High orotic acid with low citrulline places the block at OTC: carbamoyl phosphate cannot enter the cycle and spills into pyrimidine synthesis. The affected maternal uncle fits X-linked inheritance.',
    mechanism: 'OTC: carbamoyl phosphate + ornithine → citrulline. Blocked → ↑NH₃, ↓citrulline, carbamoyl phosphate → orotic acid.',
    takeaway: 'Hyperammonaemia + ↑orotic acid + no megaloblastic anaemia = OTC deficiency (X-linked).',
    differentials: [
      { name: 'Neonatal sepsis', why: 'Common and must be treated, but would not explain ammonia this high with orotic aciduria.' },
      { name: 'CPS I deficiency', why: 'Hyperammonaemia with low citrulline but normal orotic acid.' },
      { name: 'Organic acidaemia', why: 'Hyperammonaemia with a high anion gap metabolic acidosis, not alkalosis.' },
    ],
  }),
  c({
    id: 'case:cah',
    title: 'The vomiting infant',
    conceptIds: ['cah-21'],
    difficulty: 3,
    stages: [
      { label: 'Presentation', text: 'A 12-day-old infant is brought in with vomiting, poor feeding and weight loss.' },
      { label: 'History', text: 'Born at term. At birth, the genitalia were noted to be atypical and further tests were planned.' },
      { label: 'Examination', text: 'Dehydrated, HR 182/min, BP low for age. Clitoromegaly with partially fused labioscrotal folds; no palpable gonads. Increased skin pigmentation of the genital area.' },
      { label: 'Laboratory', text: 'Na⁺ 124 mmol/L, K⁺ 7.0 mmol/L, glucose 2.8 mmol/L. Plasma renin activity high. Karyotype 46,XX.' },
      { label: 'Further clue', text: 'Serum 17-hydroxyprogesterone is markedly raised; ACTH is high.' },
    ],
    question: 'Which enzyme deficiency explains every finding?',
    options: [
      { id: 'a', text: '21-hydroxylase' },
      { id: 'b', text: '11β-hydroxylase', whyWrong: 'Also virilises, but 11-deoxycorticosterone accumulates and causes hypertension, not salt wasting.' },
      { id: 'c', text: '17α-hydroxylase', whyWrong: 'Causes hypertension and lack of sex steroids, so a 46,XX infant would not be virilised.' },
      { id: 'd', text: 'Aldosterone synthase', whyWrong: 'Isolated aldosterone deficiency causes salt wasting but no virilisation or cortisol deficiency.' },
      { id: 'e', text: '5α-reductase', whyWrong: 'Affects 46,XY development and does not cause adrenal crisis.' },
    ],
    answerId: 'a',
    explanation:
      'A virilised 46,XX infant with salt wasting (low Na⁺, high K⁺, high renin), hypoglycaemia and raised 17-OH progesterone has 21-hydroxylase deficiency. Both cortisol and aldosterone need 21-hydroxylation; the precursors are diverted to androgens and ACTH rises, causing hyperpigmentation.',
    mechanism: '21-hydroxylase block → ↓aldosterone (salt wasting), ↓cortisol (↑ACTH, hypoglycaemia), precursors → androgens (virilisation).',
    takeaway: 'Virilisation + salt wasting + ↑17-OHP = 21-hydroxylase deficiency.',
    differentials: [
      { name: '11β-hydroxylase deficiency', why: 'Virilisation with hypertension and hypokalaemia.' },
      { name: 'Pyloric stenosis', why: 'Vomiting with hypochloraemic hypokalaemic alkalosis, normal genitalia.' },
    ],
  }),
  c({
    id: 'case:xla',
    title: 'Third pneumonia this year',
    conceptIds: ['bruton'],
    difficulty: 3,
    stages: [
      { label: 'Presentation', text: 'A 14-month-old boy has fever and cough; chest X-ray shows right lower lobe consolidation.' },
      { label: 'History', text: 'Two previous pneumonias and recurrent otitis media since 7 months of age. Well in the first half-year. His mother’s brother died of meningitis as a child.' },
      { label: 'Examination', text: 'Tonsils barely visible. No palpable cervical lymph nodes despite infection.' },
      { label: 'Laboratory', text: 'Sputum culture: Streptococcus pneumoniae. Neutrophils raised. IgG, IgA and IgM all markedly low.' },
      { label: 'Imaging & tests', text: 'Flow cytometry: CD3⁺ T cells normal; CD19⁺ B cells < 1%.' },
    ],
    question: 'What is the underlying defect?',
    options: [
      { id: 'a', text: 'Failed pre-B-cell receptor signalling due to a tyrosine kinase mutation' },
      { id: 'b', text: 'Absent CD40 ligand on activated T cells', whyWrong: 'Hyper-IgM syndrome: B cells present, IgM normal or high.' },
      { id: 'c', text: 'Failure of B-cell differentiation into plasma cells in adulthood', whyWrong: 'CVID presents later, with B cells present.' },
      { id: 'd', text: 'Defective NADPH oxidase in phagocytes', whyWrong: 'CGD: catalase-positive infections, normal immunoglobulins.' },
      { id: 'e', text: 'Absent thymus from third/fourth pharyngeal pouch failure', whyWrong: 'DiGeorge: low T cells, hypocalcaemia, cardiac defects.' },
    ],
    answerId: 'a',
    explanation:
      'Recurrent encapsulated bacterial infections from about 6 months, absent tonsils and lymph nodes, panhypogammaglobulinaemia and absent B cells in a boy with an affected maternal relative is X-linked (Bruton) agammaglobulinaemia. BTK mutation stops B cells maturing beyond the pre-B stage.',
    mechanism: 'BTK relays pre-BCR signals → without it no mature B cells → no plasma cells → no antibodies; infections start as maternal IgG wanes.',
    takeaway: 'XLA: BTK, absent B cells and all immunoglobulins, infections after 6 months, give IVIG, avoid live vaccines.',
    differentials: [
      { name: 'Transient hypogammaglobulinaemia of infancy', why: 'B cells are present and levels recover.' },
      { name: 'Severe combined immunodeficiency', why: 'T cells would also be absent, with infections from early infancy.' },
    ],
  }),
];
