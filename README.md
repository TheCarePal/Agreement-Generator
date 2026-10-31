# CarePal Agreement Generator

Create service agreements for **Carepalz Internet Private Limited** with the same left-hand editor, live PDF preview and download workflow as the approved CarePal Offer Letter Creator.

The standard A4 template follows the supplied three-page service agreement: service and payment terms, the remaining company/client terms and signatures, then caregiver details and the selected scope of work. Longer entered text can continue onto additional pages.

## Features

- Editable client, patient, caregiver and service-location details
- Service description, caregiver role, daily hours, billing cycle and service dates
- Four explicit registration-fee modes with calculated first-payment totals
- Caregiver education, certification, ID-proof description and police-verification status
- Seven groups of selectable caregiving duties, plus additional custom duties
- Company and client signature names/dates, with blank signature lines
- Live PDF preview, zoom, printing and PDF download
- Automatic saving of the current draft in the browser
- Responsive desktop and mobile layouts
- Static export and a GitHub Pages deployment workflow

The interface intentionally keeps a single working draft, with **New agreement** and **Download PDF** actions. It does not include a previous-agreements/history button. Download completed PDFs to retain separate copies before creating a new agreement.

## Registration fees

The service fee is the recurring amount for the selected monthly, weekly or daily billing cycle. Registration is a one-time fee. The mode controls its treatment in the first bill; it is not added again in later cycles.

For a recurring service fee of **Rs. 23,000** and a registration fee of **Rs. 3,999**:

| Mode | First-cycle service portion | Registration due now | First payment |
| --- | ---: | ---: | ---: |
| Included in first bill | Rs. 19,001 | Rs. 3,999 | Rs. 23,000 |
| Add to first bill | Rs. 23,000 | Rs. 3,999 | Rs. 26,999 |
| Already paid | Rs. 23,000 | Rs. 0 | Rs. 23,000 |
| Waived | Rs. 23,000 | Rs. 0 | Rs. 23,000 |

The recurring fee remains **Rs. 23,000** in each example. An included registration fee cannot exceed the first-cycle bill. Export validation also checks currency precision, valid dates, advance-payment timing, daily service hours and the required party/service details.

## Company and template details

Company identity is fixed to The CarePal. The registered office is kept literally as **National Park**, as supplied in the reference agreement; no street address is inferred from another project. The company CIN, PAN, contact information and standard cancellation, refund and other agreement terms come from the supplied reference.

Client, patient, caregiver, government-ID and signatory identities start blank. Certification and police verification start as **Pending**, so a new agreement does not inherit the sample person's details or claim completed checks.

## Privacy and storage

Draft data and PDF generation stay in the browser. The application does not send entered agreement details to a database or application server. The draft uses its own `carepal-agreement:draft:v1` browser-storage key, separate from offer-letter drafts.

Storage belongs to the current browser and site origin. Clearing site data, switching browsers or using a different device does not preserve that draft. If browser storage is blocked, the editor reports it and PDF downloads can still be used to retain a copy. A published GitHub Pages site serves the application files; entered client and caregiver data are not included in those files.

## Run locally

Use Node.js 22 or newer and the pinned pnpm 10.33.4 package manager:

```bash
corepack enable
corepack install
pnpm install --frozen-lockfile
pnpm dev
```

The default URL is <http://localhost:3000>. If the offer-letter app already uses port 3000, run the agreement app separately:

```bash
npm run dev -- --port 3001
```

Then open <http://localhost:3001>.

## Check and build

```bash
pnpm type-check
pnpm test
pnpm build
```

The static site is written to `out/`. PDF generation and viewing run in the browser. Installation copies the PDF.js worker from the pinned dependency into `public/`, keeping the viewer and worker versions aligned.

## GitHub Pages

Deployment URL: [CarePal Agreement Generator](https://thecarepal.github.io/Agreement-Generator/).
Source repository: [TheCarePal/Agreement-Generator](https://github.com/TheCarePal/Agreement-Generator).

Pushes to `main` run the deployment workflow. To deploy a separate copy:

1. Create a GitHub repository and push this project to its `main` branch.
2. Open **Settings → Pages** in that repository.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Run **Deploy CarePal Agreement Generator to GitHub Pages** from the **Actions** tab, or push to `main`.

The included workflow installs the locked dependencies, checks types, runs tests, builds the static export and deploys `out/`. It reads the repository's GitHub Pages base path automatically, so the company logo and PDF worker also work beneath a project URL.

For a manual build beneath a repository path:

```bash
NEXT_PUBLIC_BASE_PATH=/Agreement-Generator pnpm build
```

No custom backend, Firebase setup or API keys are required.

## Attribution and license

Derived from the approved CarePal Offer Letter Creator and CarePal Invoice Generator, retaining the original AGPL-3.0 license and attribution. See [LICENSE](LICENSE).
