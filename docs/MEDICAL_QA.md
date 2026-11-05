# Medical quality assurance

## Automated checks (`src/content/validate.ts`, run by `npm test`)
- Unique concept and item ids; every link (related concepts, item → concept, citations → source register, topic) resolves.
- Concepts have ≥3 facts, mechanism, misconception, takeaway, a ≤60-word quick explanation and ≥2 detailed paragraphs.
- MCQs and cases: ≥4 options, unique ids and texts, the answer key exists, and **every distractor has a "why wrong" explanation**.
- True/false items have a correction.
- Crossword answers are A–Z, 3–15 letters, and clues don't contain their answer. Generated grids are validated (`validateGrid`).
- Connections groups have ≥4 unique members; generated puzzles are checked so each tile fits exactly one chosen group.
- Near-duplicate MCQ stems (token Jaccard > 0.7) and duplicate statements are flagged.

These checks cannot judge medical accuracy.

## Medical review checklist (per concept and its items)
1. Facts accurate and current; no outdated guidance or drug names.
2. Mechanism correct at Step 1 depth.
3. MCQs: one best answer; distractors plausible but clearly inferior; vignette details consistent (age, timing, vitals, lab units and ranges); "why wrong" text accurate.
4. True/false statements unambiguous (no "always/never" traps unless genuinely absolute).
5. Crossword clue has exactly one reasonable answer of that length.
6. Connections category is defensible and complete for the members shown.
7. Cases are internally consistent: plausible lab values, realistic findings, defensible answer and differentials.
8. Originality: not copied or closely paraphrased from any commercial resource or exam recall.
9. Citations point to appropriate sources.
10. Set `review.status` to `approved` or `published` and record `reviewedBy`, `reviewedAt` and notes.

## Current state
All 40 concepts and their items are `draft` / `ai-drafted`. **None has been medically reviewed.** The author paid particular care to these points, which the reviewer should check closely: digoxin and potassium interactions; class IC post-MI wording; Winter's formula example; G6PD assay timing; HIT timing; the A1AT liver-histology wording; OTC vs CPS I orotic acid; CAH stage values; and the Connections membership lists, especially hypersensitivity types and catalase-positive organisms.

## Error reports
Learners can report errors from any explanation or lesson. Reports are stored on the device (`reports` in progress) until cloud sync exists, then they will go to `reports/` for editors.
