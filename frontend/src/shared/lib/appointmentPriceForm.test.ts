import assert from 'node:assert/strict'
import test from 'node:test'
import {
  rubToCents,
  centsToRubInput,
  calculateSelectedServicesTotalCents,
  shouldSendManualTotal,
} from './appointmentPriceForm.js'

test('rubToCents handles normal integers', () => {
  assert.equal(rubToCents('1000'), 100000)
  assert.equal(rubToCents('50'), 5000)
  assert.equal(rubToCents('0'), 0)
})

test('rubToCents handles decimals and commas', () => {
  assert.equal(rubToCents('100.5'), 10050)
  assert.equal(rubToCents('100,5'), 10050)
  assert.equal(rubToCents('100,50'), 10050)
})

test('rubToCents ignores spaces and non-breaking spaces', () => {
  assert.equal(rubToCents('1 000'), 100000)
  assert.equal(rubToCents('1\u00A0000'), 100000)
  assert.equal(rubToCents(' 1000 '), 100000)
})

test('rubToCents returns null for empty or invalid inputs', () => {
  assert.equal(rubToCents(''), null)
  assert.equal(rubToCents('   '), null)
  assert.equal(rubToCents('-'), null)
  assert.equal(rubToCents('.'), null)
  assert.equal(rubToCents(','), null)
  assert.equal(rubToCents('abc'), null)
})

test('rubToCents prevents negative values', () => {
  assert.equal(rubToCents('-100'), 0)
})

test('centsToRubInput returns empty string for null', () => {
  assert.equal(centsToRubInput(null), '')
})

test('centsToRubInput returns rounded ruble amount', () => {
  assert.equal(centsToRubInput(100000), '1000')
  assert.equal(centsToRubInput(10050), '101') // Math.round(100.5) is 101
  assert.equal(centsToRubInput(0), '0')
})

test('calculateSelectedServicesTotalCents calculates total for selected services', () => {
  const services = [
    { id: '1', priceCents: 1000 },
    { id: '2', priceCents: 2000 },
    { id: '3', priceCents: 3000 },
    { id: '4' }, // undefined priceCents
  ]
  assert.equal(calculateSelectedServicesTotalCents(['1', '2'], services), 3000)
  assert.equal(calculateSelectedServicesTotalCents(['1', '4'], services), 1000)
  assert.equal(calculateSelectedServicesTotalCents(['5'], services), 0)
})

test('shouldSendManualTotal returns false if manual mode is disabled', () => {
  assert.equal(
    shouldSendManualTotal({
      manualEnabled: false,
      valueCents: 1000,
      initialValueCents: null,
    }),
    false
  )
})

test('shouldSendManualTotal returns false if valueCents is null', () => {
  assert.equal(
    shouldSendManualTotal({
      manualEnabled: true,
      valueCents: null,
      initialValueCents: 1000,
    }),
    false
  )
})

test('shouldSendManualTotal returns false if value is unchanged', () => {
  assert.equal(
    shouldSendManualTotal({
      manualEnabled: true,
      valueCents: 5000,
      initialValueCents: 5000,
    }),
    false
  )
})

test('shouldSendManualTotal returns true if value changed', () => {
  assert.equal(
    shouldSendManualTotal({
      manualEnabled: true,
      valueCents: 6000,
      initialValueCents: 5000,
    }),
    true
  )

  assert.equal(
    shouldSendManualTotal({
      manualEnabled: true,
      valueCents: 6000,
      initialValueCents: null,
    }),
    true
  )
})
