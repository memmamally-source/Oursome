# Steps Ahead — notes for Claude

Read `PROGRESS.md` first: status, decisions and the next stage. Update it at the end of each stage.

- Standalone product. Never touch Crossword Hub, Oursome or any other app's repo or Firebase project.
- Vite + React 19 + TS. Run `npm run check` (typecheck, lint, tests) before committing. Lint includes React Compiler rules: no `Date.now()`/`Math.random()` in render (use `useNow`/`useSeed` from `src/state/clock.ts`), no setState directly in effects, no ref reads in render.
- Brand strings from `src/config/brand.ts`; colours are CSS tokens in `src/theme/global.css`.
- Domain logic stays pure in `src/engine/*` and `src/features/games/*/logic.ts` with tests; screens stay thin.
- All state changes go through `applyEvent` (`src/engine/progress.ts`). Never mutate progress elsewhere.
- Medical content: original only, never copied or closely paraphrased from commercial resources or exam recalls. New content starts as `draft` / `ai-drafted`; only a medical reviewer can move it to `published`. `npm test` runs `validateContent`, which must stay clean.
- Item ids (`<concept>:mcq1`…) are permanent: append, never reorder.
- Never claim device testing, deployment or medical review that did not happen. Ask before paid services, deploys, billing or store submissions.
