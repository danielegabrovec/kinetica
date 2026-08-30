import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource-variable/source-serif-4'
import { App } from './App'
import { bindAutosave, flushPersist, hydrateStore } from './lib/persist'
import './styles/index.css'

void hydrateStore().then(() => {
  bindAutosave()
  const stopCloseListener = window.kinetica?.onPrepareClose(async () => {
    window.kinetica?.completeClose(await flushPersist())
  })
  if (stopCloseListener) window.addEventListener('beforeunload', stopCloseListener, { once: true })
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
