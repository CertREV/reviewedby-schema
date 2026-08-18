<p align="center">
  <img src="https://raw.githubusercontent.com/CertREV/.github/main/profile/logo.png" alt="CertREV" width="96" height="96" />
</p>

<h1 align="center">reviewedby-schema</h1>

<p align="center">Generate standards-correct <code>reviewedBy</code> / E-E-A-T JSON-LD for content provenance.</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-brightgreen.svg" />
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-green.svg" />
</p>

---

AI search engines and crawlers increasingly reward content that carries **verifiable signals of who reviewed it**. Schema.org's [`reviewedBy`](https://schema.org/reviewedBy) is the property that says *"a named reviewer checked this page for accuracy."* This library emits correct, validatable JSON-LD for that: free, zero-dependency, and MIT-licensed.

> **What it does, and does not do.** It builds valid `WebPage` → `reviewedBy` → `Person` + `hasCredential` markup and warns on common E-E-A-T mistakes. It does **not** verify that a credential is real. That binding, a vetted expert and a board-checked credential, is the [CertREV](https://certrev.com) service.

## Why this shape

Verified against schema.org (v30):

- `reviewedBy` is a property of **`WebPage`**, with a range of `Person` or `Organization`.
- `lastReviewed` (also on `WebPage`) carries the review date.
- The reviewer's expertise is modeled as `Person` → `hasCredential` → **`EducationalOccupationalCredential`**, with `credentialCategory` and `recognizedBy` (the issuing board / authority).

So this library produces a `WebPage` with `reviewedBy` + `lastReviewed`, the content as `mainEntity` (an `Article` with its own author and publisher), and the reviewer's credential modeled properly. That is the structure Google and LLM crawlers actually parse.

## Install

```bash
npm install reviewedby-schema
```

Zero dependencies, ES modules, Node >= 18.

## Quick start

```js
import { generate, toScriptTag, validate } from 'reviewedby-schema'

const input = {
  page: { url: 'https://example.com/blog/glycolic-acid-guide' },
  article: {
    headline: 'The Complete Guide to Glycolic Acid for Skin Renewal',
    datePublished: '2026-05-01',
    author: { name: 'Sarah Mitchell', jobTitle: 'Beauty Editor' },
  },
  reviewer: {
    name: 'Dr. Elena Vasquez',
    jobTitle: 'Board-Certified Dermatologist',
    url: 'https://example.com/experts/elena-vasquez',
    credential: {
      name: 'Board Certified in Dermatology',
      category: 'board certification',
      recognizedBy: { name: 'American Board of Dermatology', url: 'https://www.abderm.org' },
    },
  },
  organization: { name: 'CertREV', url: 'https://certrev.com', logo: 'https://certrev.com/logo.png' },
  dateReviewed: '2026-06-02',
}

const check = validate(input)        // { valid, errors[], warnings[] }
const html = toScriptTag(generate(input))  // ready-to-paste <script> block
```

## API

### `generate(input)` → `object`

Returns the JSON-LD `WebPage` object. Throws if `reviewer.name` is missing. Undefined/empty fields are pruned, so the output never contains `null`s.

### `toScriptTag(jsonld)` → `string`

Wraps a JSON-LD object in a ready-to-paste `<script type="application/ld+json">` block.

### `validate(input)` → `{ valid, errors, warnings }`

Checks required fields (a reviewer name and a page/article URL) and warns on common E-E-A-T gaps: a missing credential, no `recognizedBy` authority, a non-standard `credentialCategory`, a missing `dateReviewed`, a missing publisher, no author, or non-ISO dates.

### `CREDENTIAL_CATEGORIES`

The frozen list of recommended `credentialCategory` values: `license`, `certification`, `degree`, `board certification`, `professional designation`.

## Example output

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://example.com/blog/glycolic-acid-guide",
  "reviewedBy": {
    "@type": "Person",
    "name": "Dr. Elena Vasquez",
    "hasCredential": {
      "@type": "EducationalOccupationalCredential",
      "name": "Board Certified in Dermatology",
      "credentialCategory": "board certification",
      "recognizedBy": { "@type": "Organization", "name": "American Board of Dermatology" }
    }
  },
  "lastReviewed": "2026-06-02",
  "mainEntity": { "@type": "Article", "headline": "...", "author": { "@type": "Person", "name": "Sarah Mitchell" } }
}
```

See [`examples/`](examples/) for a full runnable example.

## What good provenance includes

A named reviewer, their credential, the issuing authority, the review date, and a stable URL for the reviewer. `validate()` nudges you toward all five.

## How CertREV uses this

This is the open schema layer. CertREV adds the parts that make the markup *true*: credentialed experts whose licenses are verified before assignment, a SHA-256 fingerprint of the reviewed text, a public certificate anyone can verify, and a badge and contributor card rendered on your own page. Learn more at [certrev.com](https://certrev.com).

## Contributing

Issues and PRs welcome. Run the tests with `npm test` (`node --test`, no build step).

## License

[MIT](LICENSE) © CertREV LLC
