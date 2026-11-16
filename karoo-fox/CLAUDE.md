# Karoo Fox website — standing instructions

These are the owner's instructions. They override older notes, including `docs/CLAUDE_MASTER_PROMPT.md`.

1. **The company is Karoo Fox (Pty) Ltd.** The name change is done (owner, 16 Nov 2026). Never describe Karoo Fox as a brand of EM Medical Group, and never mention EM Medical Group on the website. `nameAmendmentComplete` stays `true` in `src/config/company.ts`.
2. **The album app ("In Pictures") is not on the website.** Don't add it back, or mention it, unless the owner asks. `scripts/verify-build.mjs` fails the build if either rule is broken.
3. **The logo is the approved artwork.** Every logo image is generated from `brand/source/Karoo_Fox_Logo_High_Resolution_6144x4096.png` by `npm run brand`: blank canvas trimmed, then resized, never redrawn. The homepage shows the complete logo (fox and wordmark). Logo images sit on white backgrounds only. The SVG in `brand/vector-candidate/` is not approved.
4. **App Store:** Crossword Hub, Oursome and Research Tracker are on the App Store. Research Tracker's listing URL is still needed; don't invent links.
5. **Never invent company details**, such as the registration number, address or emails. Leave them `null` until the owner supplies them.
6. Run `npm run check` before every commit.
