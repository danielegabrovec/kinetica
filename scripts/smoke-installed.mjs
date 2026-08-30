import { _electron as electron } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'

const executablePath = resolve(process.argv[2] ?? '')
const { version: expectedVersion } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const smokeProtocolName = `Smoke installer ${expectedVersion}`
if (!process.argv[2] || !existsSync(executablePath)) {
  throw new Error('Uso: npm run smoke:installed -- "C:\\percorso\\Kinetica.exe"')
}

const smokeRoot = await mkdtemp(join(tmpdir(), 'kinetica-installed-smoke-'))
const userData = join(smokeRoot, 'user-data')
const issues = []
let app

async function launch() {
  app = await electron.launch({
    executablePath,
    cwd: dirname(executablePath),
    env: { ...process.env, KINETICA_USER_DATA_DIR: userData }
  })
  const page = await app.firstWindow()
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  await page.waitForLoadState('domcontentloaded')
  if ((await page.title()) !== 'Kinetica') throw new Error('Titolo finestra installata non valido.')
  return page
}

try {
  let page = await launch()
  const accept = page.getByRole('button', { name: 'Ho capito, apri Kinetica' })
  await accept.waitFor({ state: 'visible', timeout: 10_000 })
  await accept.click()
  await page.getByTitle('Rinomina protocollo').click()
  await page.getByLabel('Nome del protocollo').fill(smokeProtocolName)
  await page.getByLabel('Nome del protocollo').press('Enter')
  await page.getByLabel('Orizzonte').fill('144')
  await app.close()

  page = await launch()
  if (!(await page.getByRole('button', { name: 'Ho capito, apri Kinetica' }).isHidden())) {
    throw new Error('Il consenso iniziale non è stato persistito.')
  }
  if ((await page.getByLabel('Orizzonte').inputValue()) !== '144') throw new Error('La bozza non è stata ripristinata.')
  if (!(await page.getByTitle('Rinomina protocollo').textContent())?.includes(smokeProtocolName)) {
    throw new Error('Il nome della bozza non è stato ripristinato.')
  }
  await page.getByRole('button', { name: 'Info', exact: true }).first().click()
  await page.getByText(`v${expectedVersion}`).waitFor({ state: 'visible', timeout: 10_000 })
  if (issues.length) throw new Error(`Errori runtime: ${issues.join(' | ')}`)
  await app.close()
  app = undefined
  console.log(JSON.stringify({ ok: true, executablePath, persistedHorizon: 144, version: expectedVersion }))
} finally {
  if (app) await app.close().catch(() => undefined)
  const safeRoot = resolve(smokeRoot)
  const tempRoot = resolve(tmpdir())
  if (!safeRoot.startsWith(`${tempRoot}${sep}`)) throw new Error(`Directory temporanea non sicura: ${safeRoot}`)
  await rm(safeRoot, { recursive: true, force: true })
}
