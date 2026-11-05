# Learning analytics

## Event model (`src/engine/events.ts`)
`game_started`, `game_paused`, `game_resumed`, `game_completed`, `question_presented`, `answer_submitted`, `hint_used`, `explanation_opened`, `concept_reviewed`, `study_time`. Each has a unique `id` and timestamp `at`. `applyEvent` (`src/engine/progress.ts`) is the only writer of progress and ignores an id it has already applied, so retries and future sync replays cannot double-count. Game start and completion events use deterministic ids (`start:<session>`, `done:<session>`).

`answer_submitted` carries item, concepts, correctness, the learner's response, the expected answer, prompt, hints used, latency and difficulty. It updates:
- concept records (attempts, correct, last 30 outcomes),
- FSRS cards (rating: wrong → Again, right with a hint → Hard, right → Good),
- daily answer counts,
- the mistakes library (wrong answers create or increment an entry; later attempts are appended to its history, so nothing is ever deleted).

## Active study time (`src/engine/studyTime.ts`, `src/state/studyTimer.ts`)
- Screens declare a study context (`play`, `explanation`, `lesson`, `review`, `mistakes`, plus game and concept ids). No context, no time.
- A 5 s tick credits the time since the last tick only if the page is visible, the game isn't paused, the learner interacted within 90 s, and this tab holds the timer lock. A single tick credits at most 10 s, so a sleeping laptop or throttled tab never adds a block of time.
- Lock: a localStorage record `{tabId, at}`, stale after 15 s. The tab id lives in sessionStorage, so a reload keeps it; the lock is released on `pagehide` and when the tab is hidden.
- Time is split evenly across the disciplines and systems of the concepts in context, and attributed per game and per activity. A crash loses at most one tick (≤5 s).
- External study (UWorld, Anki …) is logged manually and stored separately; totals are combined only on display.
- A study day is active with ≥1 minute in-app or any logged external study. A streak stays alive until a whole day is missed.

## Separate metrics (`src/engine/analysis.ts`, `stats.ts`)
| Metric | Definition |
| --- | --- |
| Active study time | Above |
| Arcade score | Per-game scores and personal bests (`games`) |
| Accuracy | Correct ÷ answered |
| Concept mastery | Beta(1,1) posterior; correct adds 0.6 + 0.1·difficulty, wrong adds 0.6 + 0.1·(6 − difficulty); 45-day half-life decay |
| Retention | Accuracy on concept attempts made ≥1 day after the previous attempt |
| Syllabus coverage | Concepts encountered ÷ concepts in the package |
| Improvement | Accuracy over the last 7 days vs the 7 before (needs ≥10 answers in each) |

## Status labels
`not_studied` (0 attempts) · `insufficient` (<3 attempts or evidence <2.5) · `strong` (mean ≥0.8 and mean − 0.84·SD ≥0.7) · `improving` (recent-half accuracy ≥25 points above earlier half, ≥6 outcomes) · `needs_revision` (mean <0.6) · `developing` (otherwise). One correct answer is never "strong".

## Weak areas
Four levels: discipline, organ system (with a discipline breakdown inside each system), topic, concept. `priorityWeaknesses` ranks topics and concepts by (1 − mastery) × confidence and returns the most specific weak node, without listing both a topic and its own concept. That is how "antiarrhythmics" is reported rather than "cardiology" (tested with the brief's example).

## Recommendations (`src/engine/plan.ts`)
Plans for 5–60 minutes: due reviews first, then games with content for the top weaknesses, unfinished dailies, an unexplored topic, then quick mixed recall. Learners can always choose anything else.

## Not claimed
No pass/fail or score prediction. Learning effectiveness (e.g. retention cohorts, transfer to new items) needs real users and a proper evaluation design.
