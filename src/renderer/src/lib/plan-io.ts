import { serializePlanFile, slugPlanName } from '@shared/library'
import type { PatientProfile, SavedSimulation } from '@shared/types'
import { saveText } from './export'

export async function exportPlanToDisk(plan: SavedSimulation, patient?: PatientProfile) {
  const content = serializePlanFile(plan, patient)
  return saveText(`${slugPlanName(plan.name)}.json`, content, 'json')
}

export async function pickPlanFile(): Promise<string | null> {
  if (window.kinetica?.importFile) {
    const res = await window.kinetica.importFile()
    if (!res.ok || !res.content) return null
    return res.content
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      void file.text().then(resolve)
    }
    input.click()
  })
}
