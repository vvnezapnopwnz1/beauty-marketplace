import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { fileURLToPath } from 'url'

export interface FlowStep {
  action: string
  data?: Record<string, unknown>
  assert?: Record<string, unknown>
}

export interface Flow {
  name: string
  tags: string[]
  roles: string[]
  preconditions?: string[]
  steps: FlowStep[]
}

interface FlowsFile {
  flows: Flow[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function loadFlows(yamlPath: string): Flow[] {
  const abs = path.resolve(__dirname, '..', yamlPath)
  const content = fs.readFileSync(abs, 'utf-8')
  const parsed = yaml.load(content) as FlowsFile
  return parsed.flows
}

export function filterFlowsByTag(flows: Flow[], tag: string): Flow[] {
  return flows.filter((f) => f.tags.includes(tag))
}

export function filterFlowsByRole(flows: Flow[], role: string): Flow[] {
  return flows.filter((f) => f.roles.includes(role))
}
