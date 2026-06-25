// Type definitions for reviewedby-schema

export type CredentialCategory =
  | 'license'
  | 'certification'
  | 'degree'
  | 'board certification'
  | 'professional designation'
  | (string & {})

export interface OrganizationInput {
  name: string
  url?: string
  logo?: string
}

export interface CredentialInput {
  /** e.g. "Board Certified in Dermatology" */
  name?: string
  /** e.g. "license" | "certification" — see CREDENTIAL_CATEGORIES */
  category?: CredentialCategory
  /** The issuing board / authority that recognized the credential. */
  recognizedBy?: OrganizationInput
  /** A stable URL for the credential, if any. */
  url?: string
  /** Jurisdiction the credential is valid in, e.g. "California". */
  validIn?: string
}

export interface PersonInput {
  name: string
  jobTitle?: string
  url?: string
  /** Authoritative profile URLs (LinkedIn, license-board listing, etc.). */
  sameAs?: string[]
  credential?: CredentialInput
}

export interface ArticleInput {
  headline: string
  /** Schema type, defaults to "Article". */
  type?: string
  url?: string
  description?: string
  image?: string
  /** ISO 8601 date. */
  datePublished?: string
  /** ISO 8601 date. */
  dateModified?: string
  author?: PersonInput
}

export interface GenerateInput {
  /** The certified page. */
  page?: { url?: string; name?: string; type?: string }
  /** The content being reviewed (attached as mainEntity). */
  article?: ArticleInput
  /** The credentialed expert who reviewed the content. Required. */
  reviewer: PersonInput
  /** The publisher / brand. */
  organization?: OrganizationInput
  /** ISO 8601 date the content was reviewed -> WebPage.lastReviewed. */
  dateReviewed?: string
  /** SHA-256 of the certified content -> identifier PropertyValue. */
  contentHash?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export const SCHEMA_CONTEXT: string
export const CREDENTIAL_CATEGORIES: readonly string[]

/** Build a schema.org WebPage with reviewedBy / lastReviewed E-E-A-T provenance. */
export function generate(input: GenerateInput): Record<string, unknown>

/** Wrap a JSON-LD object in a ready-to-paste <script type="application/ld+json"> tag. */
export function toScriptTag(jsonld: Record<string, unknown>): string

/** Validate review input for completeness and common E-E-A-T mistakes. */
export function validate(input: GenerateInput): ValidationResult

declare const _default: {
  generate: typeof generate
  toScriptTag: typeof toScriptTag
  validate: typeof validate
  CREDENTIAL_CATEGORIES: typeof CREDENTIAL_CATEGORIES
  SCHEMA_CONTEXT: typeof SCHEMA_CONTEXT
}
export default _default
