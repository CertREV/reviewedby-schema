// Example: a health article reviewed by a board-certified dermatologist.
// Run: node examples/health-dermatology.js
import { generate, toScriptTag, validate } from '../src/index.js'

const input = {
  page: { url: 'https://example.com/blog/glycolic-acid-guide' },
  article: {
    headline: 'The Complete Guide to Glycolic Acid for Skin Renewal',
    url: 'https://example.com/blog/glycolic-acid-guide',
    datePublished: '2026-05-01',
    dateModified: '2026-06-01',
    image: 'https://example.com/img/glycolic-acid.png',
    author: { name: 'Sarah Mitchell', jobTitle: 'Beauty Editor', url: 'https://example.com/authors/sarah-mitchell' },
  },
  reviewer: {
    name: 'Dr. Elena Vasquez',
    jobTitle: 'Board-Certified Dermatologist',
    url: 'https://example.com/experts/elena-vasquez',
    sameAs: ['https://www.linkedin.com/in/elena-vasquez'],
    credential: {
      name: 'Board Certified in Dermatology',
      category: 'board certification',
      recognizedBy: { name: 'American Board of Dermatology', url: 'https://www.abderm.org' },
    },
  },
  organization: { name: 'CertREV', url: 'https://certrev.com', logo: 'https://certrev.com/logo.png' },
  dateReviewed: '2026-06-02',
}

const check = validate(input)
console.log('valid:', check.valid, '| warnings:', check.warnings.length)
for (const w of check.warnings) console.log('  warning:', w)

console.log('\n--- JSON-LD ---')
console.log(JSON.stringify(generate(input), null, 2))

console.log('\n--- ready to paste ---')
console.log(toScriptTag(generate(input)))
