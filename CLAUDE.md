# Oursome — notes for Claude

Read `PROGRESS.md` first: it holds status, decisions and the next stage plan. Update it at the end of each stage.

- Expo SDK 58 / RN 0.88 / TS 6. Expo APIs change between SDKs: check `node_modules` types or versioned docs rather than memory.
- `api.expo.dev` may be blocked in cloud sandboxes: use `EXPO_OFFLINE=1 npx expo install <pkg>`.
- Run `npm run check` (typecheck, lint, tests) before committing. Lint includes React Compiler rules: use `sharedValue.set()` rather than assigning `.value`, and avoid setState inside effects.
- Brand/name strings come from `src/config/brand.ts`; colours from `src/theme/tokens.ts` (use `soft`/`ink` pairs for text on tints).
- Keep domain logic pure in `src/features/*/logic.ts`-style modules with tests; screens stay thin.
- Never claim device testing that wasn't done. Ask before paid services, deploys, billing or store submissions.
