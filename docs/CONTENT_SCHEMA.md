# Content schema

Types live in `src/content/schema.ts`. Content is data, separate from game logic. Every game item links to one or more concepts, and analytics roll performance up from concept to topic, organ system and discipline.

## Concept
| Field | Meaning |
| --- | --- |
| `id` | Permanent kebab-case id |
| `title` | Display name |
| `packages` | `step1` now; `step2ck`/`step3` later |
| `discipline`, `alsoDisciplines` | Primary plus extra discipline tags |
| `system`, `alsoSystems` | Primary plus extra organ-system tags |
| `topic` | Level-3 topic id (`taxonomy.ts` `TOPICS`) |
| `difficulty` | 1 (core recall) to 5 (multi-step application) |
| `objectives` | Learning objectives |
| `facts` | Verified facts (≥3) |
| `mechanism` | Underlying mechanism |
| `associations` | Clinical/lab associations |
| `misconception` | A common misconception, corrected |
| `quick` | ≤60 words (about a 20 s read) |
| `detailed` | ≥2 paragraphs |
| `takeaway` | One-line Step 1 takeaway |
| `related` | Related concept ids (validated) |
| `citations` | `{ sourceId, locator }` into the source register |
| `review` | `{ status, provenance, reviewedBy?, reviewedAt?, notes? }` |
| `version`, `updatedAt` | Versioning |

## Items (`GameItem` union)
Shared fields: `id`, `conceptIds`, `difficulty`, `review`, `version`.

| Kind | Used by | Specific fields |
| --- | --- | --- |
| `mcq` | Survival, Review, lessons, (Step 1 Challenge) | `stem`, `options[{id,text,whyWrong}]` (every distractor explains itself), `answerId`, `mini`, `mechanism`, `takeaway`, `estSeconds` |
| `tf` | Fact or Fiction, Survival, Review | `statement`, `isTrue`, `correction`, `mini` |
| `clue` | Crossword | `answer` (A–Z, 3–15 letters), `clue` (must not contain the answer), `mini` |
| `group` | Connections | `label`, `members` (≥4, complete for the terms used), `explanation`, `tier` 1–4 |
| `case` | Mystery Patient | `title`, `stages[]`, `question`, `options`, `answerId`, `explanation`, `mechanism`, `takeaway`, `differentials[]` |

Item ids are `<conceptId>:<kind><n>` for concept-authored items, `grp:*` and `case:*` otherwise. **Never reorder** an existing concept's items: learner history references these ids.

Subject, organ system and topic for an item come from its first concept (`ContentRepo.classify`).

## Review lifecycle
`draft → in_review → approved → published → retired`. Only `published` is visible in production builds; a concept's items are hidden if any linked concept is not visible. Provenance is `ai-drafted`, `human-authored` or `imported`.

## Authoring
Write concepts with `defineConcepts([...])` (`src/content/define.ts`) in a file under `src/content/step1/`, add it to `src/content/index.ts`, and run `npm test`. `validateContent` must report no issues.
