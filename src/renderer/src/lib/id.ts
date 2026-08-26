export function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)
}
