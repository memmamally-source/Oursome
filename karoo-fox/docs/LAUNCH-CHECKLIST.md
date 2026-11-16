# Karoo Fox launch checklist

What must happen before the website can be public, and before it can support the Apple organisation enrolment and the Google Play move. Run `SITE_URL=https://<your-domain> npm run readiness` at any time to see what is still outstanding.

Nothing here has been bought, registered or submitted. Each step that costs money or creates an account is for you to decide and do.

## 1. Legal entity (CIPC)

- [ ] File the name amendment so that **EM Medical Group (Pty) Ltd** becomes **Karoo Fox (Pty) Ltd**. The reservation of KAROO FOX (reference **9471244619**) is valid until **18 May 2027**.
- [ ] When the CIPC confirms the amendment, set `nameAmendmentComplete: true` in `src/config/company.ts`. Until then the site correctly says that Karoo Fox is a brand of EM Medical Group (Pty) Ltd that intends to change its name.
- [ ] Add the **registration number** (`registrationNumber`). The registration number stays the same after a name change.
- [ ] Add the **business address** (`address`). Use exactly the same address that will appear on the D-U-N-S record.
- [ ] Name the **POPIA Information Officer** (`informationOfficer`). This is the head of the company unless the role is delegated. Register them with the Information Regulator if you haven't already.

## 2. Domain

1. **Choose and register a domain.** Check availability yourself; nothing has been checked or reserved. Candidates are `karoofox.com` (best for an international audience), `karoofox.co.za`, or both, with one redirecting to the other. Registration is a paid step for you to do.
2. **Verify the domain with GitHub first.** This stops anyone else claiming it for their Pages site. Go to GitHub → your profile **Settings → Pages → Add a domain**, then add the TXT record GitHub shows at your DNS provider.
3. **Point DNS at GitHub Pages:**

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `memmamally-source.github.io` |

   Check these values against GitHub's current documentation ("Managing a custom domain for your GitHub Pages site") when you do it. If you use Cloudflare for DNS, as you do for oursome.org, set these records to **DNS only** (grey cloud) so that GitHub can issue the HTTPS certificate.
4. **Connect the domain to the repository.** In the website repository, go to Settings → Pages → Custom domain, enter the domain and save. Wait for the DNS check, then tick **Enforce HTTPS**. With the Actions deployment no `CNAME` file is needed.
5. **Re-run the deploy workflow.** It reads the domain from Pages, so canonical URLs, the sitemap and social tags use the new domain automatically.

## 3. Business email on the domain

Apple and your users should see addresses on the company domain, such as `hello@`, `support@` and `privacy@`. The options below are listed without choosing one, because most of them cost money:

| Option | Sends and receives as @domain | Cost |
| --- | --- | --- |
| Google Workspace | Yes | Paid per user per month |
| Microsoft 365 Business | Yes | Paid per user per month |
| Zoho Mail | Yes | Has a limited free tier and paid plans |
| Cloudflare Email Routing → your existing inbox | Receives only; sending as the domain needs an SMTP service | Free |

For a company mailbox that Apple and partners will write to, a full mailbox (one of the first three) is the safer choice. You can make one mailbox and add `support@` and `privacy@` as free aliases.

Whichever provider you choose:
- [ ] Add its **MX** records.
- [ ] Add **SPF**: a TXT record on `@`, using the value the provider gives you.
- [ ] Add **DKIM**: a TXT or CNAME record from the provider.
- [ ] Add **DMARC**: a TXT record on `_dmarc`, starting with `v=DMARC1; p=none; rua=mailto:<your address>`, then tightening it to `quarantine` once mail flows correctly.
- [ ] Put the addresses in `src/config/company.ts` (`emails.general`, `emails.support`, `emails.privacy`).
- [ ] Send a test email to each address and reply from it.

## 4. Publish

- [ ] Run `npm run check` (all green) and `SITE_URL=https://<domain> npm run readiness` (it should report "Ready to publish").
- [ ] Merge to `main` in the website repository; the workflow builds, tests and deploys.
- [ ] Open the site on a phone and a computer. Check that the preview banner is gone and nothing is highlighted as "to be supplied".
- [ ] Check that `https://<domain>/robots.txt` allows crawling and lists the sitemap, then submit the sitemap in Google Search Console (free).

## 5. Apple Developer: Individual → Organization

Apple converts an existing Individual membership to an Organization through Apple Developer Support. Check Apple's current requirements when you apply; they generally include:

- [ ] **A legal entity in the company's name.** Complete the CIPC amendment first, so Apple enrols *Karoo Fox (Pty) Ltd* rather than EM Medical Group (Pty) Ltd.
- [ ] **A D-U-N-S number** for the company. Its legal name and address must match the CIPC record exactly. Look it up or request one free through Apple's D-U-N-S lookup tool. If the company already has a D-U-N-S number under EM Medical Group, ask Dun & Bradstreet to update the name after the amendment. Updates can take several days to weeks before Apple sees them.
- [ ] **Legal binding authority.** You must be able to sign for the company, for example as a director.
- [ ] **A public website on the company's domain.** This site, live on the custom domain over HTTPS, with no preview banner. It must name the company and show contact details, support and privacy policy pages.
- [ ] **A work email on the same domain**, for Apple to contact you.

After approval, the App Store seller name comes from the verified legal entity. Apple decides what it shows, so don't assume a particular display name.

Then, in App Store Connect, for each app:

| Field | Value |
| --- | --- |
| Support URL | `https://<domain>/apps/<slug>/support/` |
| Marketing URL | `https://<domain>/apps/<slug>/` |
| Privacy Policy URL | The app's full policy, `privacyPolicyUrl` in `apps.ts`, until the full policy is hosted on this site |
| Copyright | e.g. `2026 Karoo Fox (Pty) Ltd`, once the amendment is complete |

## 6. Google Play: Centurion Creatives → Karoo Fox

The developer name, website and contact details are changed in Play Console. Changing a personal account into an organisation account, or moving apps into a new organisation account, needs Google's identity verification. Organisations need a D-U-N-S number. Check the current Play Console options before starting; moving to an organisation account may mean creating a new one and transferring the apps.

For each Android app in Play Console:

| Field | Value |
| --- | --- |
| Developer website | `https://<domain>/` |
| Developer email | `support@<domain>` (shown publicly) |
| Privacy policy | The app's full policy URL |
| Delete account URL (Data safety) | `https://<domain>/apps/<slug>/delete-data/` |

## 7. Things found in the app repositories (not changed)

These are in the apps' own repositories, which were only read, never modified. They need attention there:

- **Each app's own privacy policy** describes the operator as "an independent developer", by your personal name, or not at all. When Karoo Fox becomes the operator, update each policy to name the company, with legal review recommended, and update `privacyPolicyDate` in `apps.ts`.
- **Research Tracker** is called "Research Tracker" in the app and listing but "Research Project Tracker" on its website. It has no App Store link in the repository, so its iPhone status is `unconfirmed` and hidden here. Once you confirm it, set it in `apps.ts`.
- **Crossword Hub:** its support page describes Duels and hint credits, while its status notes say they are off until Cloud Functions are deployed. The Karoo Fox site leaves them out until you confirm they're live.
- **Oursome:** `PROGRESS.md` still says "No Firebase project yet", but its 9 Nov notes and privacy policy describe Firebase as on for family sharing.
- **StePhD:** its content is AI-drafted and not medically reviewed, so the Karoo Fox site makes no expert-review claims and repeats the app's "educational purposes only / not affiliated with the USMLE, FSMB or NBME" disclaimer.
- **The photo album app** is listed as *planned* with no final name, as the brief requires. Its repository (`in-pictures`) has a public web preview at memmamally-source.github.io/in-pictures, which the Karoo Fox site does not link to. It gets a privacy policy and support details before release. "Oursome" is also marked as a working name.
- **Each app uses a different free-mail support address** (Gmail or Outlook). Consider moving them to `support@<domain>`, or app-specific aliases, after the email is set up, and update `supportEmail` in `apps.ts`.
