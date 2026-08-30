export interface KineticaApi {
  loadLibrary: () => Promise<{
    payload: { schemaVersion: number; simulations: unknown[]; patients: unknown[]; draft: unknown }
    warning?: string
    recoveryPath?: string
  }>
  saveLibrary: (payload: unknown) => Promise<{ ok: boolean; path?: string }>
  exportFile: (opts: {
    defaultName: string
    content: string
    ext: string
  }) => Promise<{ ok: boolean; path?: string }>
  importFile: () => Promise<{ ok: boolean; canceled?: boolean; content?: string; path?: string }>
  printReport: (html: string) => Promise<{ ok: boolean }>
  pdfReport: (opts: { defaultName: string; html: string }) => Promise<{ ok: boolean; path?: string }>
  onPrepareClose: (callback: () => void | Promise<void>) => () => void
  completeClose: (saved: boolean) => void
}

declare global {
  interface Window {
    kinetica?: KineticaApi
  }
}

export {}
