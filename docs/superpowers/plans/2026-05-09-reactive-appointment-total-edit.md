# Reactive Appointment Total Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the appointment edit drawer recalculate the visible total immediately when services or manual price change.

**Architecture:** Put price-form rules into a small pure helper under `pages/dashboard/lib` and cover it with Node's built-in test runner after TypeScript compilation. Wire `AppointmentDrawer` to the helper so selected services drive the local total while preserving manual deltas.

**Tech Stack:** React 19, TypeScript, MUI, RTK Query, Node test runner via `tsc` compilation.

---

## File Structure

- Create: `frontend/src/pages/dashboard/lib/appointmentTotalForm.ts` — pure helper functions for calculated/manual appointment total form state.
- Create: `frontend/src/pages/dashboard/lib/appointmentTotalForm.test.ts` — focused tests for automatic totals, manual deltas, and manual input.
- Modify: `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx` — use helpers in state initialization, service selection, price input, reset link, and save payload.
- Modify: `docs/vault/product/status.md` — add a short shipped-note if implementation is completed.

## Task 1: Price Helper

**Files:**
- Create: `frontend/src/pages/dashboard/lib/appointmentTotalForm.ts`
- Create: `frontend/src/pages/dashboard/lib/appointmentTotalForm.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend && ./node_modules/.bin/tsc src/pages/dashboard/lib/appointmentTotalForm.test.ts --module NodeNext --moduleResolution NodeNext --target ES2022 --outDir /tmp/appointment-total-form-test --skipLibCheck && node --test /tmp/appointment-total-form-test/appointmentTotalForm.test.js
```

Expected: FAIL because `appointmentTotalForm.ts` does not exist yet.

- [ ] **Step 3: Add the minimal helper implementation**

```ts
export type AppointmentTotalPriceMode = 'calculated' | 'manual'

export type AppointmentTotalFormState = {
  priceMode: AppointmentTotalPriceMode
  totalCents: number | null
  manualDeltaCents: number
}

type ServicePrice = {
  id: string
  priceCents?: number | null
}

type InitialAppointmentTotal = {
  totalCents?: number | null
  calculatedTotalCents?: number | null
  totalSource?: AppointmentTotalPriceMode | null
}

export function clampTotalCents(value: number): number {
  return Math.max(0, Math.round(value))
}

export function calculateServicesTotalCents(serviceIds: string[], services: ServicePrice[]): number {
  const selected = new Set(serviceIds)
  return services.reduce((sum, service) => {
    if (!selected.has(service.id)) return sum
    return sum + (service.priceCents ?? 0)
  }, 0)
}

export function initialAppointmentTotalForm(
  appointment: InitialAppointmentTotal,
): AppointmentTotalFormState {
  const calculatedTotalCents = appointment.calculatedTotalCents ?? 0
  const editableTotal = appointment.totalCents ?? appointment.calculatedTotalCents ?? null
  const priceMode: AppointmentTotalPriceMode =
    appointment.totalSource === 'manual' && editableTotal !== null ? 'manual' : 'calculated'

  return {
    priceMode,
    totalCents: editableTotal,
    manualDeltaCents: priceMode === 'manual' ? editableTotal - calculatedTotalCents : 0,
  }
}

export function applyServicesTotalChange(
  current: AppointmentTotalFormState,
  selectedServicesTotalCents: number,
): AppointmentTotalFormState {
  if (current.priceMode === 'manual') {
    return {
      ...current,
      totalCents: clampTotalCents(selectedServicesTotalCents + current.manualDeltaCents),
    }
  }

  return {
    priceMode: 'calculated',
    totalCents: clampTotalCents(selectedServicesTotalCents),
    manualDeltaCents: 0,
  }
}

export function applyManualTotalInput(
  totalCents: number | null,
  selectedServicesTotalCents: number,
): AppointmentTotalFormState {
  if (totalCents === null) {
    return {
      priceMode: 'calculated',
      totalCents: null,
      manualDeltaCents: 0,
    }
  }

  const normalizedTotal = clampTotalCents(totalCents)
  return {
    priceMode: 'manual',
    totalCents: normalizedTotal,
    manualDeltaCents: normalizedTotal - selectedServicesTotalCents,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run the same command from Step 2. Expected: PASS.

## Task 2: Drawer Integration

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx`

- [ ] **Step 1: Import helper functions and state type**

Add:

```ts
import {
  applyManualTotalInput,
  applyServicesTotalChange,
  calculateServicesTotalCents,
  initialAppointmentTotalForm,
  type AppointmentTotalPriceMode,
} from '@pages/dashboard/lib/appointmentTotalForm'
```

- [ ] **Step 2: Add price mode state and selected-base memo**

Near `totalCents` state add:

```ts
const [priceMode, setPriceMode] = useState<AppointmentTotalPriceMode>('calculated')
const [manualDeltaCents, setManualDeltaCents] = useState(0)
```

Add memo after `menuItemSx`:

```ts
const selectedServicesTotalCents = useMemo(
  () => calculateServicesTotalCents(serviceIds, services),
  [serviceIds, services],
)
```

- [ ] **Step 3: Reset price state from appointment detail**

In `resetFromAppt`, replace direct `setTotalCents(editableTotalCents(a))` with:

```ts
const priceState = initialAppointmentTotalForm(a)
setTotalCents(priceState.totalCents)
setPriceMode(priceState.priceMode)
setManualDeltaCents(priceState.manualDeltaCents)
```

Also reset empty state to `priceMode = calculated` and `manualDeltaCents = 0`.

- [ ] **Step 4: Add a local service-selection updater**

Add inside component:

```ts
const updateServiceSelection = useCallback(
  (nextServiceIds: string[]) => {
    const nextBaseTotal = calculateServicesTotalCents(nextServiceIds, services)
    const nextPriceState = applyServicesTotalChange(
      { priceMode, totalCents, manualDeltaCents },
      nextBaseTotal,
    )
    setServiceIds(nextServiceIds)
    setTotalCents(nextPriceState.totalCents)
    setPriceMode(nextPriceState.priceMode)
    setManualDeltaCents(nextPriceState.manualDeltaCents)
  },
  [manualDeltaCents, priceMode, services, totalCents],
)
```

Use it in the Autocomplete `onChange`.

- [ ] **Step 5: Make manual input update mode and delta**

Replace the current `onChange` body for the «Итого» field with:

```ts
const val = parseFloat(e.target.value)
const nextPriceState = applyManualTotalInput(
  isNaN(val) ? null : Math.round(val * 100),
  selectedServicesTotalCents,
)
setTotalCents(nextPriceState.totalCents)
setPriceMode(nextPriceState.priceMode)
setManualDeltaCents(nextPriceState.manualDeltaCents)
```

- [ ] **Step 6: Make reset link use current selected services**

Show the reset link when `totalCents !== null && totalCents !== selectedServicesTotalCents`. On click, call `applyManualTotalInput(selectedServicesTotalCents, selectedServicesTotalCents)` and write all three state fields from the result.

- [ ] **Step 7: Send manual total only for manual mode**

Before mutation:

```ts
const shouldSendManualTotal = priceMode === 'manual' && totalCents !== null
const priceChanged = shouldSendManualTotal && totalCents !== editableTotalCents(appointment)
```

In payload:

```ts
...(shouldSendManualTotal ? { totalCents } : {}),
```

## Task 3: Documentation and Verification

**Files:**
- Modify: `docs/vault/product/status.md`

- [ ] **Step 1: Update product status**

Add one bullet under `### Последние изменения (2026-05-09)`:

```md
- **Web dashboard — реактивная стоимость при редактировании записи:** в drawer деталей записи поле «Итого» теперь пересчитывается до сохранения при добавлении/удалении услуг. Для авто-цены используется сумма выбранных услуг, для ручной цены сохраняется дельта скидки/надбавки; `totalCents` отправляется в API только при manual-режиме.
```

- [ ] **Step 2: Run focused helper test**

Run:

```bash
cd /Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend && ./node_modules/.bin/tsc src/pages/dashboard/lib/appointmentTotalForm.test.ts --module NodeNext --moduleResolution NodeNext --target ES2022 --outDir /tmp/appointment-total-form-test --skipLibCheck && node --test /tmp/appointment-total-form-test/appointmentTotalForm.test.js
```

Expected: PASS.

- [ ] **Step 3: Run frontend lint**

Run:

```bash
cd /Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend && npm run lint
```

Expected: PASS or report existing unrelated lint failures.

- [ ] **Step 4: Run frontend build**

Run:

```bash
cd /Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend && npm run build
```

Expected: PASS or report environment/build errors.
