import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

let app: ElectronApplication
let page: Page
let sandboxDir: string
let outputDir: string
let runtimeIssues: string[]

async function launchApp() {
  app = await electron.launch({
    executablePath: join(repoRoot, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['.'],
    cwd: repoRoot,
    env: { ...process.env, KINETICA_USER_DATA_DIR: join(sandboxDir, 'user-data') }
  })
  page = await app.firstWindow()
  page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeIssues.push(`console: ${message.text()}`)
  })
  await page.waitForLoadState('domcontentloaded')
  await expect(page).toHaveTitle('Kinetica')
}

async function expectNoSeriousAccessibilityViolations(context: string) {
  expect(await page.evaluate(() => 'axe' in window), 'axe-core non inizializzato').toBe(true)
  const blocking = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (root: Document, options: unknown) => Promise<{
          violations: { id: string; impact: string | null; help: string; nodes: unknown[] }[]
        }>
      }
    }).axe
    const report = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    })
    return report.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
  })
  expect(blocking, `Violazioni accessibilità bloccanti nella vista ${context}`).toEqual([])
}

test.beforeEach(async () => {
  sandboxDir = await mkdtemp(join(tmpdir(), 'kinetica-e2e-'))
  outputDir = join(sandboxDir, 'exports')
  runtimeIssues = []
  await mkdir(outputDir, { recursive: true })
  await launchApp()
  const accept = page.getByRole('button', { name: 'Ho capito, apri Kinetica' })
  await expect(accept).toBeVisible({ timeout: 10_000 })
  await accept.click()
  await expect(accept).toBeHidden()
})

test.afterEach(async () => {
  await app?.close()
  if (sandboxDir?.startsWith(tmpdir())) await rm(sandboxDir, { recursive: true, force: true })
})

test('crea, salva, riapre, confronta ed esporta un piano isolato', async () => {
  await page.getByRole('button', { name: 'Nuovo' }).click()
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Cerca composto, estere, brand…').fill('testosterone enantato')
  await page.locator('.hit').first().click()

  await page.getByTitle('Rinomina protocollo').click()
  await page.getByLabel('Nome del protocollo').fill('Piano E2E pubblicazione')
  await page.getByLabel('Nome del protocollo').press('Enter')
  await page.getByLabel('Dose (mg)').fill('125')
  await page.getByLabel('Orizzonte').fill('120')

  await page.getByRole('button', { name: 'Profili' }).click()
  await page.getByLabel('Peso in kg').fill('82')
  await page.getByLabel('SHBG').fill('42')
  await page.getByRole('button', { name: 'Salva profilo' }).click()

  await page.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Salvato')

  await page.getByRole('button', { name: 'File' }).click()
  await expect(page.getByText('Piano E2E pubblicazione', { exact: true })).toBeVisible()
  const jsonPath = join(outputDir, 'piano-e2e.json')
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
  }, jsonPath)
  const planCard = page.locator('.file-row-card').filter({ hasText: 'Piano E2E pubblicazione' })
  await planCard.getByRole('button', { name: 'Esporta JSON' }).click()
  await expect.poll(async () => {
    try {
      return (await stat(jsonPath)).size
    } catch {
      return 0
    }
  }).toBeGreaterThan(100)
  const exportedPlan = JSON.parse(await readFile(jsonPath, 'utf8'))
  expect(exportedPlan).toMatchObject({ kind: 'kinetica-plan', version: 1, plan: { name: 'Piano E2E pubblicazione' } })

  await page.getByRole('button', { name: 'Nuovo' }).click()
  await page.getByRole('button', { name: 'File' }).click()
  await page.getByText('Piano E2E pubblicazione', { exact: true }).click()
  await expect(page.getByLabel('Dose (mg)')).toHaveValue('125')
  await expect(page.getByLabel('Orizzonte')).toHaveValue('120')

  await page.getByRole('button', { name: 'Profili' }).click()
  await expect(page.getByLabel('Peso in kg')).toHaveValue('82')
  await expect(page.getByLabel('SHBG')).toHaveValue('42')

  await page.getByRole('button', { name: 'Confronta' }).click()
  await expect(page.getByRole('button', { name: /Duplica Testosterone enantato, 125 mg/ })).toBeVisible()

  await app.evaluate(({ dialog }, targets) => {
    dialog.showSaveDialog = async (_windowOrOptions: unknown, maybeOptions?: unknown) => {
      const options = (maybeOptions ?? _windowOrOptions) as { filters?: { extensions?: string[] }[] }
      const ext = options.filters?.[0]?.extensions?.[0] ?? 'txt'
      return { canceled: false, filePath: targets[ext as keyof typeof targets] }
    }
  }, {
    html: join(outputDir, 'piano-e2e-report.html'),
    csv: join(outputDir, 'piano-e2e-serie.csv'),
    pdf: join(outputDir, 'piano-e2e-report.pdf')
  })

  await page.getByRole('button', { name: 'Report', exact: true }).first().click()
  await expect(page.getByText('HTML, PDF e stampa usano lo stesso documento A4 dedicato.')).toBeVisible()
  await page.getByRole('button', { name: 'Esporta HTML' }).click()
  await page.getByRole('button', { name: 'Esporta CSV' }).click()
  await page.getByRole('button', { name: 'Esporta PDF' }).click()

  const htmlPath = join(outputDir, 'piano-e2e-report.html')
  const csvPath = join(outputDir, 'piano-e2e-serie.csv')
  const pdfPath = join(outputDir, 'piano-e2e-report.pdf')
  await expect
    .poll(async () => {
      try {
        return (await stat(pdfPath)).size
      } catch {
        return 0
      }
    }, { timeout: 20_000 })
    .toBeGreaterThan(10_000)
  const html = await readFile(htmlPath, 'utf8')
  const csv = await readFile(csvPath, 'utf8')
  expect(html).toContain('Piano E2E pubblicazione')
  expect(html).toContain("script-src 'none'")
  expect(html).not.toContain('fonts.googleapis.com')
  expect(csv).toContain('t_days')
  expect(csv.charCodeAt(0)).toBe(0xfeff)

  const qaDir = join(repoRoot, 'test-results', 'release-qa')
  await mkdir(qaDir, { recursive: true })
  await copyFile(htmlPath, join(qaDir, 'kinetica-release-qa.html'))
  await copyFile(csvPath, join(qaDir, 'kinetica-release-qa.csv'))
  await copyFile(pdfPath, join(qaDir, 'kinetica-release-qa.pdf'))
  await page.screenshot({ path: join(qaDir, 'report-view.png'), fullPage: true })

  const libraryPath = join(sandboxDir, 'user-data', 'library.json')
  await expect.poll(async () => JSON.parse(await readFile(libraryPath, 'utf8')).simulations.length).toBe(1)
  await app.close()
  await launchApp()
  await expect(page.getByRole('button', { name: 'Ho capito, apri Kinetica' })).toBeHidden()
  await page.locator('.rail').getByRole('button', { name: 'File' }).click()
  await page.getByRole('button', { name: /^Piano E2E pubblicazioneaperto/ }).click()
  await expect(page.getByLabel('Dose (mg)')).toHaveValue('125')
  await page.locator('.rail').getByRole('button', { name: 'Profili' }).click()
  await expect(page.getByLabel('Peso in kg')).toHaveValue('82')
  await expect(page.getByLabel('SHBG')).toHaveValue('42')

  await page.getByRole('button', { name: 'Teoria' }).click()
  await expect(page.getByText('C(t) = A × [exp(-k_lenta × t) - exp(-k_rapida × t)]')).toBeVisible()
  await page.getByRole('button', { name: 'Info', exact: true }).first().click()
  await expect(page.getByText('v1.2.0')).toBeVisible()
  expect(runtimeIssues).toEqual([])
})

test('importa solo file validi e recupera un archivio locale corrotto', async () => {
  const fixturePath = join(sandboxDir, 'piano-valido.json')
  const now = new Date().toISOString()
  await writeFile(fixturePath, JSON.stringify({
    kind: 'kinetica-plan',
    version: 1,
    exportedAt: now,
    plan: {
      id: 'fixture-plan',
      name: 'Piano importato E2E',
      createdAt: now,
      updatedAt: now,
      patientId: 'fixture-patient',
      horizonDays: 90,
      cvPercent: 25,
      simClusters: [{ id: 'cluster-1', color: '#18a999', stroke: 'solid', lineWidth: 2 }],
      lines: [{
        id: 'fixture-line', formulationId: 'test-enanthate', dose: 100, frequencyId: 'weekly',
        durationDays: 84, startOffsetDays: 0, startHour: 8, enabled: true, simClusterId: 'cluster-1'
      }]
    },
    patient: { id: 'fixture-patient', alias: 'Profilo importato', sex: 'male', weightKg: 78 }
  }), 'utf8')
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
  }, fixturePath)

  await page.locator('.rail').getByRole('button', { name: 'File' }).click()
  await page.getByRole('button', { name: 'Importa', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Piano importato')
  await expect(page.getByText('Piano importato E2E', { exact: true })).toBeVisible()

  const oversizedPath = join(sandboxDir, 'piano-troppo-grande.json')
  await writeFile(oversizedPath, Buffer.alloc(2 * 1024 * 1024 + 1, 0x20))
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
  }, oversizedPath)
  await page.getByRole('button', { name: 'Importa', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('supera il limite di 2 MB')

  await app.close()
  const userDataDir = join(sandboxDir, 'user-data')
  await writeFile(join(userDataDir, 'library.json'), '{ archivio non valido', 'utf8')
  await launchApp()
  await expect(page.getByRole('alert')).toContainText('Archivio locale non leggibile')
  await expect.poll(async () => (await readdir(userDataDir)).some((file) => file.startsWith('library.recovery-'))).toBe(true)
  const accept = page.getByRole('button', { name: 'Ho capito, apri Kinetica' })
  if (await accept.isVisible()) await accept.click()
  expect(runtimeIssues).toEqual([])
})

test('gestisce profili, impostazioni, catalogo, cluster e operazioni di libreria', async () => {
  await page.locator('.rail').getByRole('button', { name: 'Profili' }).click()
  await page.getByRole('button', { name: 'Nuovo profilo' }).click()
  await page.getByLabel('Alias del nuovo profilo').fill('Profilo QA')
  await page.getByRole('button', { name: 'Crea' }).click()
  await expect(page.getByLabel('Alias profilo')).toHaveValue('Profilo QA')
  await page.getByLabel('Peso in kg').fill('91')
  await page.getByRole('button', { name: 'Salva profilo' }).click()
  await page.getByRole('button', { name: 'Duplica', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Profilo QA \(copia\)/ })).toBeVisible()
  await page.getByRole('button', { name: 'Elimina', exact: true }).click()
  await page.getByRole('button', { name: 'Sì', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Profilo QA \(copia\)/ })).toBeHidden()

  await page.locator('.rail').getByRole('button', { name: 'Opzioni' }).click()
  await page.getByRole('combobox', { name: 'Unità' }).selectOption('si')
  await page.getByLabel('Incertezza CV%').fill('20')
  await page.getByLabel('Mostra banda di incertezza').uncheck()
  await expect(page.getByRole('button', { name: 'Cambia unità' })).toHaveText('SI')

  await page.locator('.rail').getByRole('button', { name: 'Catalogo' }).click()
  await page.getByPlaceholder('Filtra catalogo').fill('semaglutide')
  await page.getByRole('button', { name: /Semaglutide/ }).first().click()
  await page.locator('button.primary').filter({ hasText: 'Simula' }).first().click()
  await expect(page.locator('.inspector')).toContainText('Semaglutide')

  await page.getByRole('button', { name: 'Aggiungi cluster' }).click()
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Cerca composto, estere, brand…').fill('testosterone cipionato')
  await page.locator('.hit').first().click()
  await expect(page.getByText(/Confronto · colori e tratti dei cluster/)).toBeVisible()
  await page.locator('.rail').getByRole('button', { name: 'Confronta' }).click()
  await expect(page.getByText('Cluster 2', { exact: true }).last()).toBeVisible()

  await page.getByTitle('Rinomina protocollo').click()
  await page.getByLabel('Nome del protocollo').fill('Workflow QA')
  await page.getByLabel('Nome del protocollo').press('Enter')
  await page.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Salvato')
  await page.locator('.rail').getByRole('button', { name: 'File' }).click()
  const original = page.locator('.file-row-card').filter({ hasText: 'Workflow QA' }).first()
  await original.getByRole('button', { name: 'Duplica' }).click()
  await expect(page.getByText('Workflow QA (copia)', { exact: true })).toBeVisible()
  const copy = page.locator('.file-row-card').filter({ hasText: 'Workflow QA (copia)' })
  await copy.getByRole('button', { name: 'Rinomina' }).click()
  await page.getByLabel('Nome del piano').fill('Workflow QA copia rinominata')
  await page.getByLabel('Nome del piano').press('Enter')
  const renamed = page.locator('.file-row-card').filter({ hasText: 'Workflow QA copia rinominata' })
  await renamed.getByRole('button', { name: 'Elimina' }).click()
  await renamed.getByRole('button', { name: 'Sì' }).click()
  await expect(page.getByText('Workflow QA copia rinominata', { exact: true })).toBeHidden()
  expect(runtimeIssues).toEqual([])
})

test('salva anche le ultime modifiche quando la finestra viene chiusa subito', async () => {
  await page.getByTitle('Rinomina protocollo').click()
  await page.getByLabel('Nome del protocollo').fill('Bozza salvata alla chiusura')
  await page.getByLabel('Nome del protocollo').press('Enter')
  await page.getByLabel('Orizzonte').fill('333')

  await app.close()
  await launchApp()

  await expect(page.getByRole('button', { name: 'Ho capito, apri Kinetica' })).toBeHidden()
  await expect(page.getByLabel('Orizzonte')).toHaveValue('333')
  await expect(page.getByTitle('Rinomina protocollo')).toContainText('Bozza salvata alla chiusura')
  expect(runtimeIssues).toEqual([])
})

test('tutte le viste restano fruibili alla dimensione minima e senza violazioni accessibili bloccanti', async () => {
  await page.addInitScript({ path: join(repoRoot, 'node_modules', 'axe-core', 'axe.min.js') })
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  const accept = page.getByRole('button', { name: 'Ho capito, apri Kinetica' })
  if (await accept.isVisible()) await accept.click()
  await page.setViewportSize({ width: 1100, height: 720 })
  const views = ['Simula', 'Catalogo', 'Confronta', 'File', 'Profili', 'Teoria', 'Report', 'Opzioni', 'Info']
  for (const view of views) {
    await page.locator('.rail').getByRole('button', { name: view }).click()
    await expect(page.locator('.view-loading')).toBeHidden()
    await expectNoSeriousAccessibilityViolations(view)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const qaDir = join(repoRoot, 'test-results', 'release-qa')
  await mkdir(qaDir, { recursive: true })
  await page.screenshot({ path: join(qaDir, 'minimum-window-info.png'), fullPage: true })
  expect(runtimeIssues).toEqual([])
})
