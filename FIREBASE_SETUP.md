# Shared CarePal document history

The Agreement Generator uses the existing **the-carepal** Firebase project and its own public Web App configuration. The Offer Letter Generator uses a separate Web App in that same project. Only the existing approved accounts, **sandeep@thecarepal.com** and **admin@thecarepal.com**, can save or read shared history. Access follows their trusted Firebase Authentication email; it does not depend on an obsolete account UID.

## Saved agreements

- Firestore: `organizations/carepal/documentArchives/agreements/records/{id}`
- Cloud Storage: `document-archives/agreements/{id}.pdf`
- The exact generated PDF and original validated form snapshot are saved, along with the saving operator, server time, hashes and filename.
- Saves use a content-derived ID. Retrying the same snapshot and PDF does not create duplicate records.
- Downloads verify the archived snapshot and PDF hashes. Preview, download and saved-field reuse use the saved archive, with no PDF regeneration for an original download.
- Records and PDF objects are immutable. Reusing terms starts a fresh draft and leaves saved records intact.

Unfinished drafts remain in this browser. Staff sign-in uses session persistence. Closing the browser session or signing out requires signing in again. Password reset uses Firebase Authentication; the application never stores passwords in draft data or the repository.

## Central Firebase rules

Both generators use one shared set of production rules, maintained in the [Offer Letter Generator repository](https://github.com/TheCarePal/OfferLetter-Generator/blob/main/FIREBASE_SETUP.md). That repository owns `firestore.rules`, `storage.rules`, the Firebase deployment configuration and the emulator security suite.

Deploy shared rules from the Offer Letter repository after comparing them with the current live Firebase rules. Do not deploy older rule files from the invoice repository: the live project contains additional CRM, released-invoice and invoice-PDF protections that its older local copy does not include.

The central rules preserve those existing policies and protect the new `documentArchives` and `document-archives` namespaces. Do not add a broad public Storage rule that matches these PDFs: Firebase combines matching allows, so a specific deny cannot override a broad allow.

The client uses authenticated Storage `getBlob` downloads and local blob URLs. It does not store public Firebase download-token URLs. GitHub Pages origin is `https://thecarepal.github.io`, shared by both repositories. Bucket CORS must allow that origin for authenticated browser downloads; inspect and merge existing configuration before changing it. See the central guide for verified deployment status and emulator checks.

## Development

Public Firebase identifiers are bundled in `src/lib/firebase/client.ts`. No private keys, credentials or application server are needed for the static site. Analytics is not initialized for these sensitive document flows.

Local testing may opt into Auth/Firestore/Storage emulators with `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true`. Production builds always use the configured Firebase project. The ordinary unit suite mocks Firebase and does not read or write production data.
