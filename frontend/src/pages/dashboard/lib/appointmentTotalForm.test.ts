import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyManualTotalInput,
  applyServicesTotalChange,
  calculateServicesTotalCents,
  initialAppointmentTotalForm,
} from './appointmentTotalForm.js'

const services = [
  { id: 'haircut', priceCents: 200000 },
  { id: 'color', priceCents: 350000 },
  { id: 'free', priceCents: null },
]

test('calculates selected services total from available service prices', () => {
  assert.equal(calculateServicesTotalCents(['haircut', 'color'], services), 550000)
  assert.equal(calculateServicesTotalCents(['free', 'missing'], services), 0)
})

test('updates calculated totals to the selected services base total', () => {
  const state = initialAppointmentTotalForm({
    totalCents: 200000,
    calculatedTotalCents: 200000,
    totalSource: 'calculated',
  })

  assert.deepEqual(applyServicesTotalChange(state, 550000), {
    priceMode: 'calculated',
    totalCents: 550000,
    manualDeltaCents: 0,
  })
})

test('preserves manual delta when selected services change', () => {
  const state = initialAppointmentTotalForm({
    totalCents: 250000,
    calculatedTotalCents: 300000,
    totalSource: 'manual',
  })

  assert.deepEqual(applyServicesTotalChange(state, 400000), {
    priceMode: 'manual',
    totalCents: 350000,
    manualDeltaCents: -50000,
  })
})

test('manual total input switches to manual mode and stores delta from current base', () => {
  assert.deepEqual(applyManualTotalInput(480000, 550000), {
    priceMode: 'manual',
    totalCents: 480000,
    manualDeltaCents: -70000,
  })
})
