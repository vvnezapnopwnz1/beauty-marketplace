/**
 * Shared context passed between steps within a single flow.
 * Steps can store values (e.g. created salon ID, appointment ID)
 * and later steps can read them.
 */
export class TestContext {
  private store = new Map<string, unknown>()

  set(key: string, value: unknown) {
    this.store.set(key, value)
  }

  get<T = string>(key: string): T {
    const v = this.store.get(key)
    if (v === undefined) {
      throw new Error(`TestContext: key "${key}" not found. Available: ${[...this.store.keys()].join(', ')}`)
    }
    return v as T
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  /** Resolve template strings like "/salon/{salonId}" */
  resolve(template: string): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return String(this.get(key))
    })
  }

  clear() {
    this.store.clear()
  }
}
