# Content sources and licensing

The register is code (`src/content/sources.ts`) and is shown in the app (Content & sources). Each entry records name, URL, type, reliability, access method, licence, reuse rule, attribution, last-reviewed date, and whether the licence page was re-opened during that review (`verifiedLive`).

| Source | Reuse rule | Notes |
| --- | --- | --- |
| USMLE content outline | cite only | Official blueprint; © FSMB/NBME |
| OpenStax Anatomy & Physiology 2e, Microbiology | commercial with attribution (CC BY 4.0) | Note changes when adapting |
| NCBI Bookshelf (incl. StatPearls) | per item | StatPearls is CC BY-NC-ND: cite only, never adapt for a commercial product |
| PubMed | cite only | Abstracts belong to publishers |
| PMC Open Access subset | per item | Only CC BY / CC0 items are usable commercially |
| CDC | public domain (mostly) | Third-party material on CDC pages is excluded |
| CDC PHIL | per item | Most images are public domain; check each one |
| MedlinePlus | per item | A.D.A.M. encyclopedia content is licensed, not reusable |
| Wikimedia Commons | per item | Licence per file; labels need medical verification |

**Rules**
- Free to read is not free to reuse. Record the licence per item or image before using it.
- Never ingest protected text, images or questions from commercial resources (UWorld, AMBOSS, First Aid, Pathoma, Sketchy, NBME, Kaplan …) into authoring or generation.
- No recalled exam content, ever.
- Citations support facts. They don't license copying: our wording is always original.
- `verifiedLive` is `false` for every entry in the first review because licence pages could not be opened from the build sandbox. Re-check before launch.
