import { create } from 'zustand'
import { useApp } from './useApp'

type FileModal = 'save-as' | 'load' | 'unsaved' | null
type ContinueFn = () => void

interface FileUi {
  modal: FileModal
  then: ContinueFn | null
  toast: string | null
  toastKind: 'ok' | 'err'
  openSaveAs: (then?: ContinueFn) => void
  openLoad: () => void
  request: (then: ContinueFn) => void
  close: () => void
  flash: (msg: string, kind?: 'ok' | 'err') => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useFileUi = create<FileUi>((set, get) => ({
  modal: null,
  then: null,
  toast: null,
  toastKind: 'ok',
  openSaveAs: (then) => set({ modal: 'save-as', then: then ?? null }),
  openLoad: () => set({ modal: 'load', then: null }),
  request: (then) => {
    if (useApp.getState().dirty) set({ modal: 'unsaved', then })
    else then()
  },
  close: () => set({ modal: null, then: null }),
  flash: (msg, kind = 'ok') => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: msg, toastKind: kind })
    toastTimer = setTimeout(() => {
      if (get().toast === msg) set({ toast: null })
    }, 1800)
  }
}))
