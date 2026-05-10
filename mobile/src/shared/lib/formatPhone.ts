/** Full Russian display mask as produced by `formatPhone` when 11 digits are entered. */
export const RU_PHONE_FORMATTED_REGEX = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/

/** Backend-valid Russian mobile/landline E.164 (country 7 + 10 digits). */
export const RU_PHONE_E164_REGEX = /^\+7\d{10}$/

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 1) return '+7'
  if (digits.length <= 4) return `+7 (${digits.slice(1)}`
  if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
  if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
}

/**
 * Normalizes arbitrary user input to `+7` + 10 digits, or `null` if incomplete/invalid.
 * Accepts formatted mask, E.164, 8XXXXXXXXXX, 10-digit national, etc.
 */
export function toRuE164(input: string): string | null {
  let d = input.replace(/\D/g, '').slice(0, 11)
  if (d.length === 10) d = `7${d}`
  if (d.length !== 11) return null
  if (d[0] === '8') d = `7${d.slice(1)}`
  if (d[0] !== '7') return null
  const national = d.slice(1)
  if (national.length !== 10) return null
  return `+7${national}`
}

export function ruPhonesEqual(a: string, b: string): boolean {
  const na = toRuE164(a)
  const nb = toRuE164(b)
  if (na && nb) return na === nb
  return na === nb
}

export type OptionalRuPhoneResult =
  | { kind: 'empty' }
  | { kind: 'valid'; e164: string }
  | { kind: 'invalid' }

/** Digits only / empty → empty; complete valid RU → E.164; otherwise invalid. */
export function parseOptionalRuPhone(input: string): OptionalRuPhoneResult {
  if (!input.replace(/\D/g, '').length) return { kind: 'empty' }
  const n = toRuE164(input)
  return n ? { kind: 'valid', e164: n } : { kind: 'invalid' }
}
