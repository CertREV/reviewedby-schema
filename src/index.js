// reviewedby-schema: generate standards-correct reviewedBy / E-E-A-T JSON-LD.
//
// Schema basis (verified against schema.org v30):
//   - `reviewedBy`  : property of WebPage, range Person | Organization.
//   - `lastReviewed`: property of WebPage (date the content was last reviewed).
//   - `hasCredential`: property of Person | Organization, range Credential
//                      (EducationalOccupationalCredential), with credentialCategory
//                      and recognizedBy (the issuing authority / license board).
//
// This library emits the markup. It does NOT verify that a credential is real;
// that binding (a vetted expert + board-checked credential) is the CertREV service.
// https://certrev.com

export const SCHEMA_CONTEXT = 'https://schema.org'

/** Common values for EducationalOccupationalCredential.credentialCategory. */
export const CREDENTIAL_CATEGORIES = Object.freeze([
  'license',
  'certification',
  'degree',
  'board certification',
  'professional designation',
])

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0
const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v)
// Accepts YYYY-MM-DD or full ISO 8601 datetimes.
const isIsoDate = (v) =>
  isNonEmptyString(v) && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(v)

const prune = (obj) => {
  if (Array.isArray(obj)) {
    const arr = obj.map(prune).filter((v) => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (isObject(obj)) {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
      const pv = prune(v)
      if (pv !== undefined) out[k] = pv
    }
    return Object.keys(out).length ? out : undefined
  }
  if (typeof obj === 'string') return obj.trim() ? obj : undefined
  return obj == null ? undefined : obj
}

function buildOrganization(org) {
  if (!isObject(org) || !isNonEmptyString(org.name)) return undefined
  return prune({
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    logo: org.logo ? { '@type': 'ImageObject', url: org.logo } : undefined,
  })
}

function buildCredential(cred) {
  if (!isObject(cred)) return undefined
  // A credential is only meaningful with a name or an issuing authority.
  if (!isNonEmptyString(cred.name) && !isObject(cred.recognizedBy)) return undefined
  return prune({
    '@type': 'EducationalOccupationalCredential',
    name: cred.name,
    credentialCategory: cred.category,
    recognizedBy: buildOrganization(cred.recognizedBy),
    url: cred.url,
    validIn: isNonEmptyString(cred.validIn)
      ? { '@type': 'AdministrativeArea', name: cred.validIn }
      : undefined,
  })
}

function buildPerson(person, { credential = true } = {}) {
  if (!isObject(person) || !isNonEmptyString(person.name)) return undefined
  return prune({
    '@type': 'Person',
    name: person.name,
    jobTitle: person.jobTitle,
    url: person.url,
    sameAs: person.sameAs,
    hasCredential: credential ? buildCredential(person.credential) : undefined,
  })
}

function buildArticle(article) {
  if (!isObject(article) || !isNonEmptyString(article.headline)) return undefined
  return prune({
    '@type': article.type || 'Article',
    headline: article.headline,
    url: article.url,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: buildPerson(article.author, { credential: false }),
  })
}

/**
 * Build a schema.org WebPage with reviewedBy / lastReviewed E-E-A-T provenance.
 * @param {object} input
 * @returns {object} JSON-LD object (WebPage)
 */
export function generate(input) {
  if (!isObject(input)) throw new TypeError('generate(input): input must be an object')

  const page = isObject(input.page) ? input.page : {}
  const reviewer = buildPerson(input.reviewer)
  if (!reviewer) {
    throw new TypeError('generate(input): input.reviewer.name is required')
  }

  const publisher = buildOrganization(input.organization)
  const mainEntity = buildArticle(input.article)
  // Attach the publisher to the article too, where Google reads it.
  if (mainEntity && publisher && !mainEntity.publisher) mainEntity.publisher = publisher

  const url = page.url || input.article?.url

  const jsonld = prune({
    '@context': SCHEMA_CONTEXT,
    '@type': page.type || 'WebPage',
    url,
    name: page.name || input.article?.headline,
    reviewedBy: reviewer,
    lastReviewed: input.dateReviewed,
    mainEntity,
    publisher,
    identifier: isNonEmptyString(input.contentHash)
      ? { '@type': 'PropertyValue', propertyID: 'sha256', value: input.contentHash }
      : undefined,
  })

  return jsonld
}

/**
 * Wrap a JSON-LD object in a ready-to-paste <script> tag.
 * @param {object} jsonld
 * @returns {string}
 */
export function toScriptTag(jsonld) {
  if (!isObject(jsonld)) throw new TypeError('toScriptTag(jsonld): jsonld must be an object')
  return `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>`
}

/**
 * Validate review input for completeness and common E-E-A-T mistakes.
 * Does NOT verify credentials are real; that is the CertREV service.
 * @param {object} input
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validate(input) {
  const errors = []
  const warnings = []

  if (!isObject(input)) {
    return { valid: false, errors: ['input must be an object'], warnings }
  }

  // Required
  if (!isObject(input.reviewer) || !isNonEmptyString(input.reviewer.name)) {
    errors.push('reviewer.name is required (the named credentialed reviewer)')
  }
  const url = input.page?.url || input.article?.url
  if (!isNonEmptyString(url)) {
    errors.push('a page.url or article.url is required (the certified page)')
  }

  // Recommended (E-E-A-T quality)
  const cred = input.reviewer?.credential
  if (!isObject(cred) || (!isNonEmptyString(cred.name) && !isObject(cred.recognizedBy))) {
    warnings.push('reviewer.credential is missing: E-E-A-T relies on a named, verifiable credential')
  } else {
    if (!isObject(cred.recognizedBy) || !isNonEmptyString(cred.recognizedBy.name)) {
      warnings.push('reviewer.credential.recognizedBy is missing: name the issuing board/authority')
    }
    if (cred.category && !CREDENTIAL_CATEGORIES.includes(cred.category)) {
      warnings.push(`reviewer.credential.category "${cred.category}" is non-standard (see CREDENTIAL_CATEGORIES)`)
    }
  }
  if (!isNonEmptyString(input.reviewer?.url) && !Array.isArray(input.reviewer?.sameAs)) {
    warnings.push('reviewer has no url or sameAs: add a stable link so the reviewer is a resolvable entity')
  }
  if (!isNonEmptyString(input.dateReviewed)) {
    warnings.push('dateReviewed is missing: lastReviewed signals freshness to crawlers')
  } else if (!isIsoDate(input.dateReviewed)) {
    warnings.push('dateReviewed should be an ISO date (YYYY-MM-DD or full ISO 8601)')
  }
  if (!isObject(input.organization) || !isNonEmptyString(input.organization.name)) {
    warnings.push('organization (publisher) is missing: adds authoritativeness')
  }
  if (!isObject(input.article) || !isNonEmptyString(input.article.headline)) {
    warnings.push('article.headline is missing: without it there is no content entity to attach review to')
  } else {
    if (!isObject(input.article.author) || !isNonEmptyString(input.article.author.name)) {
      warnings.push('article.author is missing: author and reviewer are distinct E-E-A-T signals')
    }
    for (const d of ['datePublished', 'dateModified']) {
      if (input.article[d] && !isIsoDate(input.article[d])) {
        warnings.push(`article.${d} should be an ISO date`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export default { generate, toScriptTag, validate, CREDENTIAL_CATEGORIES, SCHEMA_CONTEXT }
