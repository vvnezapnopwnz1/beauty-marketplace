import { test } from '@playwright/test'
import { loadFlows, filterFlowsByTag, type Flow } from '../helpers/flow-loader'
import { getAction } from '../actions'
import { TestContext } from '../helpers/test-context'
import { ApiHelpers } from '../helpers/api-helpers'

// ─── Configuration ───────────────────────────────────────────
const env = globalThis.process?.env ?? {}
const SCENARIO_FILE = env.E2E_SCENARIOS || 'scenarios/flows.yaml'
const TAG_FILTER = env.E2E_TAG // e.g. "smoke", "critical-path", "regression"

// ─── Load scenarios ──────────────────────────────────────────
let flows: Flow[] = loadFlows(SCENARIO_FILE)
if (TAG_FILTER) {
  flows = filterFlowsByTag(flows, TAG_FILTER)
}

// ─── Generate tests ──────────────────────────────────────────
for (const flow of flows) {
  test.describe(flow.name, () => {
    let ctx: TestContext
    let api: ApiHelpers

    test.beforeAll(async () => {
      api = new ApiHelpers()
      await api.init()
    })

    test.afterAll(async () => {
      await api.dispose()
    })

    test.beforeEach(() => {
      ctx = new TestContext()
      const salonId = api.getDefaultSalonId()
      if (salonId) {
        ctx.set('salonId', salonId)
      }
    })

    // Each flow runs as a single sequential test
    test(flow.name, async ({ page }) => {
      test.info().annotations.push(
        ...flow.tags.map((t) => ({ type: 'tag', description: t })),
        ...flow.roles.map((r) => ({ type: 'role', description: r })),
      )

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i]
        const actionFn = getAction(step.action)

        // Merge data + assert into a single data object for the action
        const mergedData = { ...step.data, ...step.assert }

        await test.step(`[${i + 1}/${flow.steps.length}] ${step.action}`, async () => {
          await actionFn(page, ctx, api, Object.keys(mergedData).length > 0 ? mergedData : undefined)
        })
      }
    })
  })
}
