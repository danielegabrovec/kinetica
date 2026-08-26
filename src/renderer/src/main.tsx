import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { bindAutosave, hydrateStore } from './lib/persist'
import './styles/index.css'

void hydrateStore().then(() => {
  bindAutosave()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
