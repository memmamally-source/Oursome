# Game designs

Every game reads the shared content repository (`src/content`), emits learning events through the progress store, declares its study context for time tracking, and shows explanations for every wrong answer.

## Built

### 1. Medical Crossword (`features/games/crossword`)
- **Engine:** original freeform generator. Places the longest words first, then crossings that maximise intersections and compactness within a size limit; tries several seeded attempts and keeps the best. `validateGrid` re-derives every letter run and checks it is exactly one clued entry, entries match the grid and the grid is connected (tested over many seeds).
- **Modes:** Daily Medical Mini (≈6 words, ≤9×9), Daily Standard (≈12, ≤13×13), Subject (filtered by discipline/system/topic/concept), Advanced (difficulty ≥3). Dailies are seeded `step1:<date>:<kind>`.
- **Play:** tap or arrows to move, tap twice or Space to switch direction, Tab for the next clue, Backspace. Check word, Reveal letter (hint), Finish. Optional timer (untimed hides it).
- **Score:** 100 per word solved unaided, 50 if letters were revealed, 0 if wrong. Time is shown but not scored.
- **Learning:** each entry is an answer event (hint → FSRS "Hard"); results list every answer with its explanation and Teach Me This.

### 2. Medical Connections (`connections`)
- 16 terms, four groups of four, four mistakes allowed, "one away" feedback, shuffle, repeat-guess detection.
- **Fairness:** a puzzle uses four categories from the bank; each group shows only members that are not in any other chosen category's full member list, so each tile has exactly one home (tested over 200 seeds, e.g. Fabry is never shown when both "lysosomal" and "X-linked" groups are chosen).
- Daily puzzle seeded by date; practice puzzles can prefer a subject's groups.
- **Score:** 100 per group found, −25 per mistake. Every group is a learning event (found = correct).

### 3. Mystery Patient (`mystery`)
- Stages: presentation → history → examination → laboratory → imaging/tests → further clue. Answer at any point; the final question targets a mechanism.
- **Score:** 100 with only the presentation, −15 per extra clue, floor 30; wrong = 0. Clues used are recorded as hints.
- After answering: why the chosen option is wrong, explanation, mechanism, differentials, takeaway, Teach Me This.

### 4. Medical Survival (`survival`)
- Three lives. Target difficulty rises one level every three correct answers; the next item is the unused item closest to that level. No repeats in a run.
- **Score:** 100 × difficulty, streak bonus up to +50%, optional 30 s timer adds up to +20% (never subtracts; timing out costs a life). Accuracy dominates.
- Feedback after each answer or at the end (faster); the end screen always reviews every answer.

### 5. Fact or Fiction (`quiz`)
Ten statements, balanced true/false, instant explanation; false statements show the corrected fact.

### 6. Spaced Review (`quiz`)
One item per due concept (FSRS), preferring a different item and format from the last one seen. With nothing due, it practises open mistakes.

## Designed, not built

| Game | Core loop | Content needed | Notes |
| --- | --- | --- | --- |
| Mechanism Lab | Order scrambled pathway steps; branch slots for divergent pathways; visual explanation after | `pathway` item: ordered steps with optional branches, per-step explanation | Start with RAAS, coagulation, urea cycle, steroid synthesis |
| Microbiology Hunt | Progressive lab clues (Gram stain → morphology → O₂ → tests → toxins → clinical); guess any time | `organism` profiles derived from micro concepts | Original memory aids only, no Sketchy imagery |
| Pharmacology Match | Match drug ↔ mechanism/receptor/toxicity/antidote; timed or untimed; class filters | Drug fact table linked to concepts | Highest-yield next build |
| Biostatistics Blitz | Generated 2×2 tables and trial results; calculator; step-by-step working | Parametric generators (no fixed bank needed) | Untimed mode by default |
| Genetics Detective | Interactive pedigree (SVG) → inheritance pattern → disorder → mechanism | Pedigree generator constrained by inheritance rules | Validate every generated pedigree is unambiguous |
| Pathology Spotlight | Identify finding in an image, then its significance | Licensed images with attribution metadata | Blocked on image licensing (PMC OA CC BY, CDC PHIL PD, Wikimedia per file) |
| Step 1 Challenge | 5/10/20-question blocks; tutor, timed (≈90 s/question, matching current pacing), untimed; targeted weak areas | Large reviewed MCQ bank with vignettes | Never claims to predict exam outcomes |
