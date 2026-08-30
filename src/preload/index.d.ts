export interface KineticaApi {
  loadLibrary: () => Promise<{
    simulations: unknown[]
    patients: unknown[]
    draft: unknown
  }>
  saveLibrary: (payload: unknown) => Promise<{ ok: boolean }>
  exportFile: (opts: {
    defaultName: string
    content: string
    ext: string
  }) => Promise<{ ok: boolean; path?: string }>
  importFile: () => Promise<{ ok: boolean; canceled?: boolean; content?: string; path?: string }>
  print: () => Promise<{ ok: boolean }>
  pdf: (defaultName: string) => Promise<{ ok: boolean; path?: string }>
  openPath: (p: string) => Promise<void>
}

declare global {
  interface Window {
    kinetica?: KineticaApi
  }
}

export {}
