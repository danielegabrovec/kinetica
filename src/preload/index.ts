import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('kinetica', {
  loadLibrary: () => ipcRenderer.invoke('kinetica:load-library'),
  saveLibrary: (payload: unknown) => ipcRenderer.invoke('kinetica:save-library', payload),
  exportFile: (opts: { defaultName: string; content: string; ext: string }) =>
    ipcRenderer.invoke('kinetica:export-file', opts),
  importFile: () => ipcRenderer.invoke('kinetica:import-file'),
  print: () => ipcRenderer.invoke('kinetica:print'),
  pdf: (defaultName: string) => ipcRenderer.invoke('kinetica:pdf', defaultName),
  openPath: (p: string) => ipcRenderer.invoke('kinetica:open-path', p)
})
