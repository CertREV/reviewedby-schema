import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generate, toScriptTag, validate, CREDENTIAL_CATEGORIES } from '../src/index.js'

const fullInput = {
  page: { url: 'https://bloomwellness.com/blog/glycolic-acid-guide' },
  article: {
    headline: 'The Complete Guide to Glycolic Acid for Skin Renewal',
    url: 'https://bloomwellness.com/blog/glycolic-acid-guide',
    datePublished: '2026-05-01',
    dateModified: '2026-06-01',
    image: 'https://bloomwellness.com/img/glycolic.png',
    author: { name: 'Sarah Mitchell', url: 'https://bloomwellness.com/authors/sarah' },
  },
  reviewer: {
    name: 'Dr. Elena Vasquez',
    jobTitle: 'Board-Certified Dermatologist',
    url: 'https://certrev.com/expert/elena-vasquez',
    sameAs: ['https://www.linkedin.com/in/elena-vasquez'],
    credential: {
      name: 'Board Certified in Dermatology',
      category: 'board certification',
      recognizedBy: { name: 'American Board of Dermatology', url: 'https://www.abderm.org' },
    },
  },
  organization: { name: 'CertREV', url: 'https://certrev.com', logo: 'https://certrev.com/logo.png' },
  dateReviewed: '2026-06-02',
  contentHash: 'a'.repeat(64),
}

test('generate produces a WebPage with reviewedBy Person', () => {
  const out = generate(fullInput)
  assert.equal(out['@context'], 'https://schema.org')
  assert.equal(out['@type'], 'WebPage')
  assert.equal(out.url, fullInput.page.url)
  assert.equal(out.reviewedBy['@type'], 'Person')
  assert.equal(out.reviewedBy.name, 'Dr. Elena Vasquez')
})

test('reviewer credential is modeled as EducationalOccupationalCredential with recognizedBy', () => {
  const cred = generate(fullInput).reviewedBy.hasCredential
  assert.equal(cred['@type'], 'EducationalOccupationalCredential')
  assert.equal(cred.credentialCategory, 'board certification')
  assert.equal(cred.recognizedBy['@type'], 'Organization')
  assert.equal(cred.recognizedBy.name, 'American Board of Dermatology')
})

test('lastReviewed comes from dateReviewed', () => {
  assert.equal(generate(fullInput).lastReviewed, '2026-06-02')
})

test('mainEntity Article carries author and inherits publisher', () => {
  const out = generate(fullInput)
  assert.equal(out.mainEntity['@type'], 'Article')
  assert.equal(out.mainEntity.headline, fullInput.article.headline)
  assert.equal(out.mainEntity.author.name, 'Sarah Mitchell')
  // author must NOT carry a (review) credential
  assert.equal(out.mainEntity.author.hasCredential, undefined)
  assert.equal(out.mainEntity.publisher.name, 'CertREV')
})

test('contentHash becomes a sha256 PropertyValue identifier', () => {
  const id = generate(fullInput).identifier
  assert.equal(id['@type'], 'PropertyValue')
  assert.equal(id.propertyID, 'sha256')
  assert.equal(id.value, 'a'.repeat(64))
})

test('empty/undefined fields are pruned (no null leakage)', () => {
  const out = generate({ reviewer: { name: 'Jane Doe' }, page: { url: 'https://x.com/a' } })
  assert.equal(JSON.stringify(out).includes('null'), false)
  assert.equal(out.reviewedBy.hasCredential, undefined)
  assert.equal(out.mainEntity, undefined)
})

test('generate throws without a reviewer name', () => {
  assert.throws(() => generate({ page: { url: 'https://x.com' } }), TypeError)
  assert.throws(() => generate({ reviewer: {} }), TypeError)
})

test('toScriptTag wraps valid JSON-LD', () => {
  const tag = toScriptTag(generate(fullInput))
  assert.match(tag, /^<script type="application\/ld\+json">/)
  assert.match(tag, /<\/script>$/)
  // body must be parseable JSON
  const json = tag.replace(/^<script[^>]*>\n/, '').replace(/\n<\/script>$/, '')
  assert.doesNotThrow(() => JSON.parse(json))
})

test('validate: valid input passes with no errors', () => {
  const r = validate(fullInput)
  assert.equal(r.valid, true)
  assert.equal(r.errors.length, 0)
  assert.equal(r.warnings.length, 0)
})

test('validate: missing reviewer and url are errors', () => {
  const r = validate({ article: { headline: 'x' } })
  assert.equal(r.valid, false)
  assert.ok(r.errors.some((e) => /reviewer\.name/.test(e)))
  assert.ok(r.errors.some((e) => /url/.test(e)))
})

test('validate: missing credential / dateReviewed / publisher are warnings', () => {
  const r = validate({ reviewer: { name: 'Jane' }, page: { url: 'https://x.com/a' } })
  assert.equal(r.valid, true)
  assert.ok(r.warnings.some((w) => /credential/.test(w)))
  assert.ok(r.warnings.some((w) => /lastReviewed|dateReviewed/.test(w)))
  assert.ok(r.warnings.some((w) => /organization/.test(w)))
})

test('validate: non-standard credential category warns', () => {
  const r = validate({
    ...fullInput,
    reviewer: { ...fullInput.reviewer, credential: { ...fullInput.reviewer.credential, category: 'wizard' } },
  })
  assert.ok(r.warnings.some((w) => /non-standard/.test(w)))
})

test('validate: bad ISO date warns', () => {
  const r = validate({ ...fullInput, dateReviewed: 'June 2, 2026' })
  assert.ok(r.warnings.some((w) => /ISO date/.test(w)))
})

test('CREDENTIAL_CATEGORIES is a frozen list including license and certification', () => {
  assert.ok(CREDENTIAL_CATEGORIES.includes('license'))
  assert.ok(CREDENTIAL_CATEGORIES.includes('certification'))
  assert.equal(Object.isFrozen(CREDENTIAL_CATEGORIES), true)
})
