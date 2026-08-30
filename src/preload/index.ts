import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('kinetica', {
  loadLibrary: () => ipcRenderer.invoke('kinetica:load-library'),
  saveLibrary: (payload: unknown) => ipcRenderer.invoke('kinetica:save-library', payload),
  exportFile: (opts: { defaultName: string; content: string; ext: string }) =>
    ipcRenderer.invoke('kinetica:export-file', opts),
  importFile: () => ipcRenderer.invoke('kinetica:import-file'),
  printReport: (html: string) => ipcRenderer.invoke('kinetica:print-report', html),
  pdfReport: (opts: { defaultName: string; html: string }) => ipcRenderer.invoke('kinetica:pdf-report', opts),
  onPrepareClose: (callback: () => void | Promise<void>) => {
    const listener = () => void callback()
    ipcRenderer.on('kinetica:prepare-close', listener)
    return () => ipcRenderer.removeListener('kinetica:prepare-close', listener)
  },
  completeClose: (saved: boolean) => ipcRenderer.send('kinetica:close-ready', saved)
})
