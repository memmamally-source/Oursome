import { defineConcepts } from '../define';

/** Original, AI-drafted content awaiting medical review. Not copied or paraphrased from any question bank. */
export const cardioRenal = defineConcepts([
  {
    id: 'acei-bradykinin',
    title: 'ACE inhibitors and bradykinin',
    discipline: 'pharmacology',
    alsoDisciplines: ['physiology'],
    system: 'cardiovascular',
    alsoSystems: ['renal'],
    topic: 'cv-antihypertensives',
    difficulty: 2,
    objectives: [
      'Explain why ACE inhibitors cause cough and angioedema',
      'Contrast ACE inhibitors with angiotensin II receptor blockers',
    ],
    facts: [
      'ACE (kininase II) converts angiotensin I to angiotensin II and also degrades bradykinin.',
      'ACE inhibitors lower angiotensin II and aldosterone and raise bradykinin.',
      'Dry cough and angioedema are linked to bradykinin accumulation.',
      'ARBs block the AT1 receptor and do not directly inhibit bradykinin breakdown.',
      'ACE inhibitors are contraindicated in pregnancy and in hereditary angioedema (C1-esterase inhibitor deficiency).',
    ],
    mechanism:
      'Angiotensin-converting enzyme has two jobs: it activates angiotensin I and it inactivates bradykinin. Blocking it therefore lowers angiotensin II but lets bradykinin accumulate, causing vasodilation, cough and, rarely, angioedema.',
    associations: ['Dry cough', 'Angioedema', 'Hyperkalaemia', 'Rise in creatinine with bilateral renal artery stenosis', 'Teratogenicity'],
    misconception: 'The cough is not caused by falling angiotensin II; switching to an ARB usually stops it because ARBs leave bradykinin metabolism alone.',
    quick:
      'ACE breaks down bradykinin. Inhibit ACE and bradykinin builds up, causing a dry cough and sometimes angioedema. ARBs block AT1 receptors instead, so cough is uncommon.',
    detailed: [
      'Angiotensin-converting enzyme is a membrane-bound peptidase, abundant on pulmonary endothelium. It removes a dipeptide from angiotensin I to form angiotensin II, and it removes dipeptides from bradykinin, inactivating it. The same enzyme is therefore called kininase II.',
      'ACE inhibitors (the "-prils") reduce angiotensin II, so arteriolar tone and aldosterone fall: blood pressure drops and potassium rises. Bradykinin persists, which adds to vasodilation but also sensitises airway sensory nerves (cough) and increases vascular permeability (angioedema).',
      'Angiotensin II receptor blockers (the "-sartans") act downstream at the AT1 receptor. They give similar haemodynamic and renal effects without directly preventing bradykinin breakdown, so they are the usual switch for ACE-inhibitor cough.',
    ],
    takeaway: 'ACE inhibitors ↑ bradykinin → cough and angioedema. ARBs block AT1 and do not directly raise bradykinin.',
    related: ['raas-cascade', 'loop-diuretics'],
    citations: [{ sourceId: 'openstax-ap', locator: 'Ch. 25, Regulation of renal blood flow' }],
    mcq: [
      {
        stem: 'A 58-year-old man develops a persistent dry cough three weeks after starting lisinopril for hypertension. Accumulation of which substance best explains his symptom?',
        options: [
          ['a', 'Angiotensin II', 'ACE inhibitors reduce angiotensin II formation; its level falls, so it cannot explain a new side effect.'],
          ['b', 'Bradykinin'],
          ['c', 'Aldosterone', 'Aldosterone secretion falls with ACE inhibition because angiotensin II drives it.'],
          ['d', 'Histamine', 'Histamine mediates IgE-type reactions; the ACE-inhibitor cough is a kinin effect, not mast-cell degranulation.'],
          ['e', 'Renin', 'Renin rises (loss of negative feedback) but it is an enzyme without direct airway effects.'],
        ],
        answer: 'b',
        mini: 'ACE normally degrades bradykinin. Inhibiting ACE lets bradykinin accumulate, which can cause a persistent dry cough.',
      },
      {
        stem: 'A patient with ACE-inhibitor cough is switched to a drug that keeps the renal-protective effect without the cough. Where does the new drug act?',
        options: [
          ['a', 'AT1 receptor', undefined],
          ['b', 'Renin enzyme', 'Aliskiren inhibits renin, but it is not the standard switch and is not combined with ACE inhibitors or ARBs.'],
          ['c', 'Mineralocorticoid receptor', 'Spironolactone blocks aldosterone, not the main angiotensin II effects.'],
          ['d', 'Neprilysin', 'Neprilysin inhibition raises natriuretic peptides and bradykinin, so it could worsen kinin effects.'],
        ],
        answer: 'a',
        mini: 'ARBs (losartan, valsartan) block the AT1 receptor, so angiotensin II effects fall without blocking bradykinin breakdown.',
        difficulty: 2,
      },
    ],
    tf: [
      { statement: 'ARBs cause cough as often as ACE inhibitors because both lower angiotensin II.', isTrue: false, correction: 'ARBs rarely cause cough; the cough is a bradykinin effect of ACE inhibition.' },
      { statement: 'ACE inhibitors can cause hyperkalaemia.', isTrue: true, correction: 'Lower angiotensin II → less aldosterone → less K⁺ secretion.' },
    ],
    clues: [
      { answer: 'BRADYKININ', clue: 'Peptide that builds up when ACE is inhibited, causing dry cough' },
    ],
  },
  {
    id: 'class3-qt',
    title: 'Class III antiarrhythmics and QT prolongation',
    discipline: 'pharmacology',
    system: 'cardiovascular',
    topic: 'cv-antiarrhythmics',
    difficulty: 3,
    objectives: [
      'Identify the channel blocked by class III antiarrhythmics',
      'Link delayed repolarisation to QT prolongation and torsades de pointes',
    ],
    facts: [
      'Class III drugs block potassium channels (mainly IKr) and prolong phase 3 repolarisation.',
      'Examples: amiodarone, sotalol, dofetilide, ibutilide, dronedarone.',
      'Longer action potential → longer effective refractory period and QT interval.',
      'Prolonged QT predisposes to early afterdepolarisations and torsades de pointes.',
      'Amiodarone also has class I, II and IV actions; its toxicities include pulmonary fibrosis, thyroid dysfunction, hepatotoxicity and corneal deposits.',
      'Torsades is treated with intravenous magnesium sulfate.',
    ],
    mechanism:
      'Blocking outward K⁺ current delays phase 3 repolarisation of the ventricular action potential. The refractory period lengthens (antiarrhythmic) but so does the QT interval, and early afterdepolarisations can trigger torsades de pointes.',
    associations: ['QT prolongation', 'Torsades de pointes', 'Magnesium sulfate', 'Amiodarone: pulmonary fibrosis, hypo/hyperthyroidism, blue-grey skin'],
    misconception: 'Amiodarone prolongs QT yet has a relatively low torsades rate; sotalol and dofetilide carry a higher risk, which is why they are started with monitoring.',
    quick:
      'Class III drugs block K⁺ channels, slowing repolarisation. Refractoriness and QT both lengthen, so torsades de pointes is the key risk (treat with IV magnesium).',
    detailed: [
      'Phase 3 of the ventricular action potential is driven by outward potassium currents, especially the rapid delayed rectifier (IKr, encoded by hERG/KCNH2). Class III drugs inhibit these currents, so the cell stays depolarised longer.',
      'A longer action potential means a longer effective refractory period, which interrupts re-entrant circuits. On the ECG, the same change appears as a longer QT interval.',
      'If repolarisation is delayed enough, L-type calcium channels can reactivate during phase 2–3 and produce early afterdepolarisations. These can trigger polymorphic ventricular tachycardia with a twisting axis: torsades de pointes. Hypokalaemia and hypomagnesaemia increase the risk.',
    ],
    takeaway: 'Class III = K⁺ channel blockade → ↑ AP duration, ↑ ERP, ↑ QT → torsades risk.',
    related: ['cardiac-ap', 'class1c-flecainide'],
    citations: [{ sourceId: 'ncbi-bookshelf', locator: 'StatPearls: Antiarrhythmic medications (cite only)' }],
    mcq: [
      {
        stem: 'A patient started on dofetilide for atrial fibrillation develops a polymorphic ventricular tachycardia with a twisting QRS axis. Blockade of which current most directly underlies this complication?',
        options: [
          ['a', 'Fast inward Na⁺ current (phase 0)', 'Phase 0 Na⁺ block (class I) widens QRS; dofetilide has no meaningful Na⁺ channel effect.'],
          ['b', 'Rapid delayed rectifier K⁺ current (IKr)'],
          ['c', 'L-type Ca²⁺ current in nodal tissue', 'Ca²⁺ block (class IV) slows AV conduction and does not prolong QT.'],
          ['d', 'Funny current (If) in the SA node', 'If blockers such as ivabradine slow heart rate without prolonging QT.'],
          ['e', 'β1-adrenergic signalling', 'β-blockade (class II) slows nodal conduction; it does not cause torsades.'],
        ],
        answer: 'b',
        mini: 'Dofetilide blocks IKr, delaying repolarisation. QT lengthens and early afterdepolarisations can trigger torsades de pointes.',
        difficulty: 3,
      },
      {
        stem: 'A 66-year-old on long-term therapy for recurrent ventricular tachycardia develops progressive dyspnoea with reticular opacities on chest imaging and a raised TSH. Which drug is most likely responsible?',
        options: [
          ['a', 'Amiodarone'],
          ['b', 'Metoprolol', 'β-blockers can worsen bronchospasm but do not cause pulmonary fibrosis or thyroid dysfunction.'],
          ['c', 'Verapamil', 'Verapamil causes constipation and bradycardia, not fibrosis.'],
          ['d', 'Digoxin', 'Digoxin toxicity gives arrhythmias, GI upset and visual change, not lung fibrosis.'],
          ['e', 'Lidocaine', 'Lidocaine is used acutely and causes neurological toxicity.'],
        ],
        answer: 'a',
        mini: 'Amiodarone is iodine-rich and lipophilic: pulmonary fibrosis and hypo- or hyperthyroidism are classic toxicities. Check lung, thyroid and liver function.',
        difficulty: 2,
      },
    ],
    tf: [
      { statement: 'Class III antiarrhythmics shorten the effective refractory period.', isTrue: false, correction: 'They lengthen action potential duration and the effective refractory period.' },
      { statement: 'Intravenous magnesium sulfate is used to treat torsades de pointes.', isTrue: true, correction: 'Magnesium suppresses early afterdepolarisations even when serum Mg²⁺ is normal.' },
    ],
    clues: [
      { answer: 'AMIODARONE', clue: 'Iodine-rich class III antiarrhythmic linked to pulmonary fibrosis' },
      { answer: 'TORSADES', clue: '___ de pointes: polymorphic VT seen with a long QT' },
      { answer: 'SOTALOL', clue: 'Beta-blocker with class III potassium-channel activity' },
    ],
  },
  {
    id: 'class1c-flecainide',
    title: 'Class IC antiarrhythmics',
    discipline: 'pharmacology',
    system: 'cardiovascular',
    topic: 'cv-antiarrhythmics',
    difficulty: 3,
    objectives: ['Describe class IC sodium-channel blockade', 'State why class IC drugs are avoided after myocardial infarction'],
    facts: [
      'Class IC drugs (flecainide, propafenone) strongly block Na⁺ channels and dissociate slowly.',
      'They markedly slow phase 0 conduction and widen the QRS, with little effect on action potential duration.',
      'Effects are greater at faster heart rates (use dependence).',
      'They are proarrhythmic in structural heart disease or after MI and are contraindicated there.',
    ],
    mechanism:
      'Slowly dissociating Na⁺ channel blockade reduces the upstroke velocity (phase 0) of fast-response tissue, slowing conduction. In scarred myocardium, the slowed conduction can create re-entry rather than abolish it.',
    associations: ['QRS widening', 'Use dependence', 'Contraindicated after MI', 'Rhythm control in structurally normal hearts'],
    misconception: 'Class IC drugs do not lengthen the action potential much; the QT change is mainly from a wider QRS.',
    quick:
      'IC = strongest Na⁺ channel block, slow off-rate. Phase 0 slows, QRS widens, APD barely changes. Proarrhythmic in scarred hearts, so avoid after MI.',
    detailed: [
      'Class I drugs block voltage-gated Na⁺ channels. They are sub-classified by how quickly they release the channel: IB (lidocaine) fastest, IA intermediate, IC slowest. Slow release means block accumulates beat to beat, especially at fast rates.',
      'Because conduction slows markedly, a re-entrant circuit through scarred myocardium can find excitable tissue again, sustaining ventricular tachycardia. Trial data in post-infarction patients showed higher mortality, so structural heart disease is a contraindication.',
    ],
    takeaway: 'Class IC: ↓↓ phase 0, ↑ QRS, no APD change; contraindicated after MI or in structural heart disease.',
    related: ['class3-qt', 'cardiac-ap'],
    mcq: [
      {
        stem: 'A drug strongly slows phase 0 depolarisation of ventricular myocytes, widens the QRS at faster heart rates and leaves action potential duration nearly unchanged. Why should it be avoided in a patient with a prior myocardial infarction?',
        options: [
          ['a', 'It increases the risk of re-entrant ventricular arrhythmias in scarred myocardium'],
          ['b', 'It causes severe sinus bradycardia by blocking the funny current', 'Funny-current block is ivabradine, not a Na⁺-channel effect.'],
          ['c', 'It produces drug-induced lupus', 'Drug-induced lupus is classically procainamide (class IA).'],
          ['d', 'It causes pulmonary fibrosis', 'Pulmonary fibrosis is an amiodarone toxicity.'],
          ['e', 'It is negatively chronotropic through β1 blockade', 'This describes class II drugs.'],
        ],
        answer: 'a',
        mini: 'Class IC drugs slow conduction so much that circuits through infarct scar can re-enter. They raised mortality in post-MI patients.',
        difficulty: 4,
      },
    ],
    tf: [
      { statement: 'Lidocaine dissociates from sodium channels more slowly than flecainide.', isTrue: false, correction: 'Lidocaine (IB) dissociates fastest; flecainide (IC) slowest.' },
    ],
    clues: [{ answer: 'FLECAINIDE', clue: 'Class IC antiarrhythmic avoided after myocardial infarction' }],
  },
  {
    id: 'digoxin',
    title: 'Digoxin: mechanism and toxicity',
    discipline: 'pharmacology',
    system: 'cardiovascular',
    topic: 'cv-antihypertensives',
    difficulty: 3,
    objectives: ['Explain how Na⁺/K⁺-ATPase inhibition increases contractility', 'Recognise digoxin toxicity and its modifiers'],
    facts: [
      'Digoxin inhibits the Na⁺/K⁺-ATPase.',
      'Higher intracellular Na⁺ reduces Na⁺/Ca²⁺ exchanger activity, so intracellular Ca²⁺ rises and contractility increases.',
      'It also increases vagal tone, slowing AV nodal conduction.',
      'Hypokalaemia increases toxicity, because digoxin and K⁺ compete for the same binding site on the pump.',
      'Toxicity: nausea, vomiting, blurred or yellow vision, arrhythmias (e.g. atrial tachycardia with block, bidirectional VT).',
      'Acute toxicity causes hyperkalaemia; the antidote is digoxin-specific antibody fragments (Fab).',
    ],
    mechanism:
      'Blocking Na⁺/K⁺-ATPase raises intracellular Na⁺. The Na⁺/Ca²⁺ exchanger then extrudes less Ca²⁺, so more Ca²⁺ is stored in the sarcoplasmic reticulum and released each beat, increasing contractility.',
    associations: ['Yellow-green vision', 'Hypokalaemia potentiates toxicity', 'Hyperkalaemia in acute overdose', 'Renal clearance', 'Digoxin immune Fab'],
    misconception: 'Low potassium makes digoxin toxicity more likely, but acute poisoning itself causes high potassium because the pump is blocked everywhere.',
    quick:
      'Digoxin blocks Na⁺/K⁺-ATPase → ↑ intracellular Na⁺ → less Ca²⁺ exported → ↑ contractility. Hypokalaemia worsens toxicity; acute overdose causes hyperkalaemia; antidote is Fab.',
    detailed: [
      'Inhibiting the pump in cardiomyocytes reduces the Na⁺ gradient that powers the Na⁺/Ca²⁺ exchanger, so intracellular Ca²⁺ increases and the heart contracts more forcefully. Digoxin also enhances parasympathetic tone, which is why it is used for rate control in atrial fibrillation.',
      'Digoxin binds the pump at a site where K⁺ also binds. When K⁺ is low, digoxin binds more, so hypokalaemia (often from loop or thiazide diuretics) predisposes to toxicity. Renal impairment and drugs like verapamil, amiodarone and quinidine raise digoxin levels.',
    ],
    takeaway: 'Digoxin: Na⁺/K⁺-ATPase block → ↑ Ca²⁺ → ↑ inotropy; ↑ vagal tone. Hypokalaemia → toxicity; overdose → hyperkalaemia; treat with Fab.',
    related: ['loop-diuretics', 'frank-starling'],
    mcq: [
      {
        stem: 'An 80-year-old taking digoxin and furosemide presents with nausea and yellow-tinged vision. Her serum potassium is 2.9 mmol/L. Why does the potassium level matter?',
        options: [
          ['a', 'Low K⁺ increases digoxin binding to the Na⁺/K⁺-ATPase'],
          ['b', 'Low K⁺ increases renal clearance of digoxin', 'Hypokalaemia does not speed digoxin clearance; renal function does.'],
          ['c', 'Low K⁺ blocks the Na⁺/Ca²⁺ exchanger directly', 'The exchanger is affected indirectly via the Na⁺ gradient, not by K⁺.'],
          ['d', 'Low K⁺ reduces vagal tone', 'Hypokalaemia does not explain toxicity through vagal tone.'],
        ],
        answer: 'a',
        mini: 'Digoxin and K⁺ compete for the pump. With less K⁺, digoxin binds more, so toxicity occurs at normal drug levels.',
        difficulty: 3,
      },
    ],
    tf: [
      { statement: 'Acute digoxin overdose typically causes hypokalaemia.', isTrue: false, correction: 'Acute overdose blocks the pump in all cells, so K⁺ stays outside: hyperkalaemia.' },
    ],
    clues: [{ answer: 'DIGOXIN', clue: 'Cardiac glycoside that inhibits the sodium–potassium pump' }],
  },
  {
    id: 'frank-starling',
    title: 'Frank–Starling mechanism',
    discipline: 'physiology',
    system: 'cardiovascular',
    topic: 'cv-physiology',
    difficulty: 2,
    objectives: ['Relate preload to stroke volume', 'Distinguish preload, afterload and contractility'],
    facts: [
      'Increasing end-diastolic volume (preload) stretches sarcomeres towards optimal overlap, increasing stroke volume.',
      'The mechanism matches right and left ventricular output beat to beat.',
      'Positive inotropes shift the Frank–Starling curve up; heart failure shifts it down.',
      'Venodilators (e.g. nitrates) reduce preload and move along the curve to the left.',
    ],
    mechanism:
      'Greater diastolic filling stretches myocytes, increasing myofilament sensitivity to Ca²⁺ and improving actin–myosin overlap, so the next contraction is stronger.',
    associations: ['Preload = end-diastolic volume', 'Inotropy shifts the curve', 'Matching of ventricular outputs'],
    misconception: 'Moving along the curve (changing preload) is not a change in contractility; contractility shifts the whole curve.',
    quick:
      'More filling → more stretch → stronger contraction. Preload moves you along the curve; inotropes and failing hearts shift the curve itself.',
    detailed: [
      'The Frank–Starling relationship plots stroke volume (or cardiac output) against end-diastolic volume or pressure. Within the physiological range, stretch increases force through length-dependent activation: increased Ca²⁺ sensitivity of troponin and better cross-bridge geometry.',
      'Sympathetic stimulation and digoxin are positive inotropes and shift the curve upward. Systolic heart failure shifts it downward, so a higher preload is needed for the same stroke volume, which leads to congestion.',
    ],
    takeaway: '↑ preload → ↑ SV (along the curve). ↑ contractility → curve shifts up.',
    related: ['digoxin', 'cardiac-ap'],
    tf: [
      { statement: 'Increasing preload shifts the Frank–Starling curve upward.', isTrue: false, correction: 'Increasing preload moves along the same curve; inotropes shift it upward.' },
    ],
    clues: [{ answer: 'PRELOAD', clue: 'End-diastolic stretch on the x-axis of the Frank–Starling curve' }],
    mcq: [
      {
        stem: 'A healthy volunteer receives a rapid 1 L saline infusion. Stroke volume rises while myocardial contractility is unchanged. Which best describes the change?',
        options: [
          ['a', 'Movement along the Frank–Starling curve from increased preload'],
          ['b', 'Upward shift of the curve from increased contractility', 'Saline adds volume; it is not an inotrope.'],
          ['c', 'Decreased afterload from vasodilation', 'Volume loading does not primarily reduce afterload.'],
          ['d', 'Downward shift of the curve from reduced compliance', 'A healthy heart is not becoming stiffer here.'],
        ],
        answer: 'a',
        mini: 'Saline raises end-diastolic volume (preload). The heart moves up the same Frank–Starling curve; contractility is unchanged.',
        difficulty: 2,
      },
    ],
  },
  {
    id: 'cardiac-ap',
    title: 'Ventricular vs nodal action potentials',
    discipline: 'physiology',
    system: 'cardiovascular',
    topic: 'cv-physiology',
    difficulty: 3,
    objectives: ['Assign ion currents to each phase of the ventricular action potential', 'Contrast nodal and ventricular depolarisation'],
    facts: [
      'Ventricular phase 0: fast Na⁺ influx. Phase 1: transient K⁺ efflux. Phase 2 plateau: Ca²⁺ influx balanced by K⁺ efflux. Phase 3: K⁺ efflux. Phase 4: resting potential maintained by K⁺ (IK1).',
      'Nodal (SA/AV) phase 0 is due to L-type Ca²⁺ influx, so it is slower.',
      'Nodal phase 4 has spontaneous depolarisation from the funny current (If, HCN channels), setting automaticity.',
      'Sympathetic stimulation increases the slope of nodal phase 4; vagal stimulation decreases it.',
    ],
    mechanism:
      'Different channel sets produce different shapes: fast Na⁺ channels give ventricular cells a rapid upstroke for fast conduction, while nodal cells rely on Ca²⁺ for depolarisation and If for pacemaking.',
    associations: ['Class I drugs act on phase 0 (ventricular)', 'Class IV drugs act on nodal phase 0', 'Ivabradine blocks If'],
    misconception: 'SA node depolarisation is not driven by fast Na⁺ channels; those are largely inactivated at the nodal resting potential.',
    quick:
      'Ventricles: Na⁺ upstroke, Ca²⁺ plateau, K⁺ repolarisation. Nodes: Ca²⁺ upstroke and a funny-current (If) slope in phase 4 that sets heart rate.',
    detailed: [
      'In ventricular myocytes the resting potential is about −90 mV. Fast Na⁺ channels open at threshold to give phase 0; the plateau (phase 2) reflects L-type Ca²⁺ entry that triggers Ca²⁺-induced Ca²⁺ release for contraction; delayed rectifier K⁺ currents repolarise in phase 3.',
      'Nodal cells sit at a less negative potential, so fast Na⁺ channels are inactivated. Their upstroke uses L-type Ca²⁺ channels, which is why calcium channel blockers slow AV conduction. Phase 4 drifts upward through HCN channels (If), the basis of automaticity.',
    ],
    takeaway: 'Ventricle: 0 = Na⁺, 2 = Ca²⁺ plateau, 3 = K⁺. Node: 0 = Ca²⁺, 4 = If.',
    related: ['class3-qt', 'class1c-flecainide'],
    tf: [
      { statement: 'Phase 0 of the SA node action potential is caused mainly by L-type calcium influx.', isTrue: true, correction: 'Correct: nodal upstroke is Ca²⁺-dependent, unlike ventricular myocytes.' },
      { statement: 'The plateau of the ventricular action potential is mainly due to sodium influx.', isTrue: false, correction: 'The plateau (phase 2) is L-type Ca²⁺ influx balanced by K⁺ efflux.' },
    ],
    clues: [{ answer: 'PLATEAU', clue: 'Phase 2 of the ventricular action potential, maintained by calcium influx' }],
  },
  {
    id: 'minimal-change',
    title: 'Minimal change disease',
    discipline: 'pathology',
    system: 'renal',
    topic: 'renal-glomerular',
    difficulty: 2,
    objectives: ['Recognise the commonest cause of nephrotic syndrome in children', 'Describe its microscopic findings'],
    facts: [
      'Most common cause of nephrotic syndrome in children.',
      'Light microscopy is normal; electron microscopy shows effacement of podocyte foot processes.',
      'Immunofluorescence is negative (no immune complexes).',
      'Loss of glomerular negative charge causes selective albuminuria.',
      'Usually responds well to corticosteroids. Can follow infection or immunisation, and is associated with NSAIDs and Hodgkin lymphoma.',
    ],
    mechanism:
      'A circulating factor, thought to be T-cell derived, injures podocytes. Their foot processes efface and the filtration barrier loses charge selectivity, so albumin leaks out while larger proteins are largely retained.',
    associations: ['Nephrotic syndrome', 'Children', 'Selective proteinuria', 'Steroid-responsive', 'Hodgkin lymphoma'],
    misconception: 'Foot-process effacement is seen in all heavy-proteinuria states; in minimal change disease it is the only abnormality, with normal light microscopy and negative immunofluorescence.',
    quick:
      'Child with nephrotic syndrome, normal light microscopy, foot-process effacement on EM, no immune deposits, and an excellent steroid response: minimal change disease.',
    detailed: [
      'Nephrotic syndrome means heavy proteinuria (> 3.5 g/day in adults), hypoalbuminaemia, oedema and hyperlipidaemia, with a tendency to thrombosis and infection.',
      'In minimal change disease the podocyte is the target. Effacement and loss of the anionic charge on the barrier allow albumin, a small negatively charged protein, to pass: a selective proteinuria. Because no immune complexes are deposited, immunofluorescence is negative and complement levels are normal.',
    ],
    takeaway: 'Minimal change: normal LM, effaced foot processes on EM, negative IF, steroid-responsive; commonest nephrotic syndrome in children.',
    related: ['psgn'],
    mcq: [
      {
        stem: 'A 4-year-old boy has periorbital oedema two weeks after an upper respiratory infection. Urine shows 4+ protein without red cells. Light microscopy of a renal biopsy is normal. What would electron microscopy most likely show?',
        options: [
          ['a', 'Effacement of podocyte foot processes'],
          ['b', 'Subepithelial "humps"', 'Humps are immune-complex deposits of post-streptococcal glomerulonephritis, a nephritic disease with haematuria.'],
          ['c', '"Spike and dome" subepithelial deposits', 'Spike and dome is membranous nephropathy, mostly in adults, with positive immunofluorescence.'],
          ['d', 'Splitting of the glomerular basement membrane', 'Basket-weave GBM splitting is Alport syndrome (type IV collagen).'],
          ['e', 'Mesangial IgA deposits', 'IgA nephropathy causes haematuria; deposits are mesangial.'],
        ],
        answer: 'a',
        mini: 'A child with nephrotic syndrome and normal light microscopy has minimal change disease; EM shows foot-process effacement only.',
      },
    ],
    tf: [
      { statement: 'Immunofluorescence in minimal change disease shows granular IgG and C3.', isTrue: false, correction: 'Immunofluorescence is negative in minimal change disease.' },
    ],
    clues: [{ answer: 'PODOCYTE', clue: 'Glomerular cell whose foot processes efface in minimal change disease' }],
  },
  {
    id: 'psgn',
    title: 'Post-streptococcal glomerulonephritis',
    discipline: 'pathology',
    alsoDisciplines: ['immunology'],
    system: 'renal',
    topic: 'renal-glomerular',
    difficulty: 2,
    objectives: ['Recognise nephritic syndrome after streptococcal infection', 'Relate immune complexes to low complement'],
    facts: [
      'Occurs about 1–3 weeks after group A streptococcal pharyngitis or 2–6 weeks after skin infection.',
      'Nephritic syndrome: haematuria (cola-coloured urine), red cell casts, hypertension, oedema, oliguria.',
      'Type III hypersensitivity: immune complexes deposit in the glomerulus.',
      'Light microscopy: enlarged, hypercellular glomeruli. EM: subepithelial immune-complex humps. IF: granular ("lumpy-bumpy") IgG, IgM, C3.',
      'Serum C3 is low; ASO or anti-DNase B titres are raised.',
      'Children usually recover; adults more often have persistent disease.',
    ],
    mechanism:
      'Antibodies against nephritogenic streptococcal antigens form immune complexes that deposit in the glomerulus, activate complement (consuming C3) and recruit neutrophils, causing inflammation and haematuria.',
    associations: ['Low C3', 'Subepithelial humps', 'Type III hypersensitivity', 'Recent pharyngitis or impetigo'],
    misconception: 'PSGN follows the infection by weeks; haematuria during or within days of a sore throat points to IgA nephropathy.',
    quick:
      'Cola urine and hypertension 2 weeks after strep throat, low C3, subepithelial humps on EM: post-streptococcal GN, a type III hypersensitivity.',
    detailed: [
      'Nephritic syndromes are driven by glomerular inflammation, which damages capillaries and lets red cells through. The result is haematuria with red cell casts, a reduced GFR with salt and water retention, hypertension and modest proteinuria.',
      'In PSGN, immune complexes lodge on the epithelial side of the basement membrane. Complement activation consumes C3, so serum C3 is low and recovers over about 6–8 weeks.',
    ],
    takeaway: 'PSGN = nephritic, weeks after GAS infection, low C3, subepithelial humps, type III hypersensitivity.',
    related: ['minimal-change', 'hypersensitivity'],
    mcq: [
      {
        stem: 'An 8-year-old girl has dark urine and periorbital swelling three weeks after impetigo. Blood pressure is raised and urinalysis shows red cell casts. Which laboratory finding is most expected?',
        options: [
          ['a', 'Low serum C3'],
          ['b', 'Positive anti-GBM antibody', 'Anti-GBM disease gives linear IF and often lung haemorrhage; it does not follow skin infection.'],
          ['c', 'Positive c-ANCA (PR3)', 'PR3-ANCA suggests granulomatosis with polyangiitis.'],
          ['d', 'Selective albuminuria > 3.5 g/day', 'Heavy selective proteinuria is nephrotic, not nephritic.'],
          ['e', 'Raised serum IgA with normal complement', 'IgA nephropathy presents within days of infection, with normal C3.'],
        ],
        answer: 'a',
        mini: 'Immune complexes in PSGN activate complement, so C3 is consumed. A nephritic picture weeks after impetigo is classic.',
      },
    ],
    tf: [
      { statement: 'IgA nephropathy typically presents within days of an upper respiratory infection.', isTrue: true, correction: 'Correct: this "synpharyngitic" timing distinguishes it from PSGN.' },
    ],
    clues: [{ answer: 'HUMPS', clue: 'Subepithelial deposits on electron microscopy in post-streptococcal GN' }],
  },
  {
    id: 'raas-cascade',
    title: 'Renin–angiotensin–aldosterone system',
    discipline: 'physiology',
    system: 'renal',
    alsoSystems: ['cardiovascular', 'endocrine'],
    topic: 'renal-raas',
    difficulty: 2,
    objectives: ['Order the steps of the RAAS', 'Name the triggers for renin release and the effects of angiotensin II'],
    facts: [
      'Renin is released by juxtaglomerular cells in response to low renal perfusion, β1 sympathetic stimulation and low NaCl at the macula densa.',
      'Renin cleaves angiotensinogen (from the liver) to angiotensin I.',
      'ACE, mainly on pulmonary endothelium, converts angiotensin I to angiotensin II.',
      'Angiotensin II: AT1-mediated vasoconstriction, aldosterone release, efferent arteriolar constriction (preserves GFR), increased proximal Na⁺ reabsorption, ADH release and thirst.',
      'Aldosterone acts on principal cells to increase Na⁺ reabsorption and K⁺ secretion.',
    ],
    mechanism:
      'A fall in effective circulating volume triggers renin release; the cascade generates angiotensin II, which raises blood pressure directly and through aldosterone-driven sodium retention.',
    associations: ['ACE inhibitors and ARBs', 'Primary vs secondary hyperaldosteronism', 'Renal artery stenosis'],
    misconception: 'Renin is an enzyme from the kidney, not a hormone acting on receptors; angiotensin II is the main effector.',
    quick:
      'Low perfusion → JG cells release renin → angiotensinogen → Ang I → (ACE, lungs) → Ang II → vasoconstriction, aldosterone, thirst, ADH.',
    detailed: [
      'The juxtaglomerular apparatus senses perfusion pressure (afferent arteriole baroreceptor), distal NaCl delivery (macula densa) and sympathetic tone (β1). Each low-volume signal releases renin.',
      'Angiotensin II constricts the efferent arteriole more than the afferent, which supports GFR when perfusion falls. That is why ACE inhibitors can drop GFR sharply in bilateral renal artery stenosis.',
    ],
    takeaway: 'Renin (JG cells) → Ang I → ACE (lung) → Ang II → AT1 effects + aldosterone.',
    related: ['acei-bradykinin', 'loop-diuretics'],
    clues: [
      { answer: 'RENIN', clue: 'Enzyme from juxtaglomerular cells that starts the RAAS' },
      { answer: 'ALDOSTERONE', clue: 'Zona glomerulosa hormone that increases sodium reabsorption and potassium secretion' },
    ],
    tf: [
      { statement: 'Angiotensin II preferentially constricts the efferent arteriole.', isTrue: true, correction: 'Correct: this maintains GFR when renal perfusion falls.' },
    ],
  },
  {
    id: 'loop-diuretics',
    title: 'Loop diuretics',
    discipline: 'pharmacology',
    system: 'renal',
    topic: 'renal-diuretics',
    difficulty: 2,
    objectives: ['Identify the transporter and segment targeted by loop diuretics', 'Predict their electrolyte effects'],
    facts: [
      'Furosemide, bumetanide, torsemide (sulfonamides) and ethacrynic acid (non-sulfonamide) inhibit NKCC2 in the thick ascending limb.',
      'This abolishes the lumen-positive potential that drives paracellular Mg²⁺ and Ca²⁺ reabsorption.',
      'Electrolyte effects: hypokalaemia, metabolic alkalosis, hypomagnesaemia and increased urinary calcium.',
      'Adverse effects: ototoxicity, hypovolaemia, hyperuricaemia, sulfa allergy.',
      'Used for oedema (heart failure, nephrotic syndrome) and hypercalcaemia (after volume repletion).',
    ],
    mechanism:
      'NKCC2 blockade stops Na⁺, K⁺ and 2Cl⁻ uptake in the thick ascending limb, wasting salt and water. Without K⁺ recycling there is no lumen-positive voltage, so Ca²⁺ and Mg²⁺ are also lost.',
    associations: ['Ototoxicity', 'Hypercalciuria', 'Contraction alkalosis', 'Sulfonamide allergy (except ethacrynic acid)'],
    misconception: 'Thiazides decrease urinary calcium; loop diuretics increase it. Mixing them up is a common error.',
    quick:
      'Loops block NKCC2 in the thick ascending limb: big diuresis, ↓K⁺, alkalosis, and ↑ urinary Ca²⁺ (unlike thiazides). Watch for ototoxicity.',
    detailed: [
      'The thick ascending limb reabsorbs about 25% of filtered sodium via NKCC2. K⁺ leaks back into the lumen through ROMK, creating a lumen-positive potential that pushes Ca²⁺ and Mg²⁺ between cells.',
      'Loop diuretics remove this driving force, so Ca²⁺ and Mg²⁺ are excreted. More Na⁺ reaches the collecting duct, where aldosterone-driven Na⁺ uptake promotes K⁺ and H⁺ secretion, causing hypokalaemic metabolic alkalosis.',
    ],
    takeaway: 'Loops: NKCC2 (TAL), ↑ Ca²⁺ excretion, ↓K⁺, alkalosis, ototoxic. Thiazides: ↓ Ca²⁺ excretion.',
    related: ['digoxin', 'raas-cascade'],
    mcq: [
      {
        stem: 'A patient with heart failure is started on furosemide. Which urinary change is expected compared with baseline?',
        options: [
          ['a', 'Increased calcium excretion'],
          ['b', 'Decreased calcium excretion', 'This is the thiazide effect, which is why thiazides help prevent calcium stones.'],
          ['c', 'Decreased potassium excretion', 'More distal Na⁺ delivery increases K⁺ secretion.'],
          ['d', 'Decreased magnesium excretion', 'Mg²⁺ reabsorption in the TAL depends on the lumen-positive voltage that loops remove.'],
        ],
        answer: 'a',
        mini: 'Furosemide blocks NKCC2, removing the lumen-positive voltage that drives Ca²⁺ reabsorption in the thick ascending limb, so urinary Ca²⁺ rises.',
      },
    ],
    tf: [
      { statement: 'Ethacrynic acid is a loop diuretic that can be used in sulfonamide allergy.', isTrue: true, correction: 'Correct: it is the non-sulfonamide loop diuretic.' },
    ],
    clues: [{ answer: 'FUROSEMIDE', clue: 'Loop diuretic that blocks NKCC2 and can cause ototoxicity' }],
  },
  {
    id: 'anion-gap',
    title: 'High anion gap metabolic acidosis',
    discipline: 'physiology',
    system: 'renal',
    alsoSystems: ['multisystem'],
    topic: 'renal-acid-base',
    difficulty: 3,
    objectives: ['Calculate the anion gap', 'List causes of a high anion gap metabolic acidosis', 'Check respiratory compensation with Winter’s formula'],
    facts: [
      'Anion gap = Na⁺ − (Cl⁻ + HCO₃⁻); normal roughly 8–12 mmol/L (laboratory-dependent).',
      'High gap: an unmeasured acid is added (lactate, ketoacids, toxic alcohol metabolites, salicylate, uraemic acids).',
      'Normal gap (hyperchloraemic): HCO₃⁻ loss (diarrhoea, renal tubular acidosis).',
      'Expected PaCO₂ = 1.5 × HCO₃⁻ + 8 ± 2 (Winter’s formula).',
    ],
    mechanism:
      'Each added acid releases H⁺, consumed by bicarbonate. The acid’s anion is not measured, so HCO₃⁻ falls without a matching rise in Cl⁻ and the gap widens.',
    associations: ['Lactic acidosis', 'Diabetic ketoacidosis', 'Methanol and ethylene glycol', 'Salicylates (mixed picture)', 'Uraemia'],
    misconception: 'Diarrhoea causes a metabolic acidosis with a NORMAL anion gap, because bicarbonate is lost and chloride rises.',
    quick:
      'AG = Na⁺ − (Cl⁻ + HCO₃⁻). High gap means an unmeasured acid (lactate, ketones, toxic alcohols, uraemia, salicylate). Check compensation: PaCO₂ ≈ 1.5×HCO₃⁻ + 8 ± 2.',
    detailed: [
      'Acidaemia with low HCO₃⁻ is a metabolic acidosis. Calculate the gap to split causes: high-gap acidoses add an acid; normal-gap acidoses lose bicarbonate.',
      'Winter’s formula predicts the PaCO₂ if respiratory compensation is appropriate. A PaCO₂ higher than predicted means a coexisting respiratory acidosis; lower means a coexisting respiratory alkalosis (as in early salicylate poisoning).',
    ],
    takeaway: 'High AG = added acid; normal AG = lost HCO₃⁻. Use Winter’s formula to spot mixed disorders.',
    related: ['raas-cascade'],
    mcq: [
      {
        stem: 'A patient has Na⁺ 140, Cl⁻ 100 and HCO₃⁻ 12 mmol/L with pH 7.20. PaCO₂ is 26 mmHg. Which statement is correct?',
        options: [
          ['a', 'High anion gap metabolic acidosis with appropriate respiratory compensation'],
          ['b', 'Normal anion gap metabolic acidosis', 'AG = 140 − (100 + 12) = 28, which is high.'],
          ['c', 'High anion gap acidosis with a coexisting respiratory acidosis', 'Expected PaCO₂ = 1.5×12 + 8 = 26 ± 2; measured 26 fits, so no extra respiratory acidosis.'],
          ['d', 'Primary respiratory alkalosis', 'The pH is acidaemic and HCO₃⁻ is low: the primary process is metabolic acidosis.'],
        ],
        answer: 'a',
        mini: 'AG = 140 − 112 = 28 (high). Winter’s: 1.5 × 12 + 8 = 26 ± 2, matching the measured 26, so compensation is appropriate.',
        difficulty: 4,
        estSeconds: 90,
      },
    ],
    tf: [
      { statement: 'Severe diarrhoea causes a high anion gap metabolic acidosis.', isTrue: false, correction: 'Diarrhoea loses HCO₃⁻ and causes a normal anion gap (hyperchloraemic) acidosis.' },
    ],
    clues: [{ answer: 'LACTATE', clue: 'Anion raising the gap in shock and tissue hypoperfusion' }],
  },
]);
