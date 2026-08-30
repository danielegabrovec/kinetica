import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  emptyLibraryPayload,
  MAX_IMPORT_BYTES,
  MAX_LIBRARY_BYTES,
  parseLibraryPayload
} from '../shared/library'

app.setName('Kinetica')
if (process.platform === 'win32') app.setAppUserModelId('it.gabrovec.kinetica')

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()

const isolatedUserData = process.env.KINETICA_USER_DATA_DIR
if (isolatedUserData) app.setPath('userData', resolve(isolatedUserData))

const MAX_EXPORT_BYTES = 8 * 1024 * 1024
const SAFE_EXTERNAL_URLS = new Set([
  'https://github.com/danielegabrovec/kinetica',
  'https://github.com/danielegabrovec/kinetica/issues'
])
const EXPORT_EXTENSIONS = new Set(['json', 'html', 'csv'])
const closeTimers = new Map<number, ReturnType<typeof setTimeout>>()
const approvedCloses = new Set<number>()

function libraryFile() {
  return join(app.getPath('userData'), 'library.json')
}

function legacyLibraryFile() {
  return join(app.getPath('userData'), 'kinetica', 'library.json')
}

function rendererFile() {
  return join(__dirname, '../renderer/index.html')
}

function developmentRendererUrl(): URL | null {
  if (app.isPackaged || !process.env.ELECTRON_RENDERER_URL) return null
  try {
    const url = new URL(process.env.ELECTRON_RENDERER_URL)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function isTrustedRendererUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const dev = developmentRendererUrl()
    if (dev) return url.origin === dev.origin
    return url.protocol === 'file:' && resolve(fileURLToPath(url)) === resolve(rendererFile())
  } catch {
    return false
  }
}

function normalizedExternalUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    const normalized = `${url.origin}${url.pathname.replace(/\/$/, '')}`
    return url.protocol === 'https:' && SAFE_EXTERNAL_URLS.has(normalized) ? url.toString() : null
  } catch {
    return null
  }
}

async function openSafeExternal(raw: string) {
  const safe = normalizedExternalUrl(raw)
  if (safe) await shell.openExternal(safe)
}

function assertTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent) {
  const owner = BrowserWindow.fromWebContents(event.sender)
  if (!owner || owner.isDestroyed() || event.senderFrame !== event.sender.mainFrame || !isTrustedRendererUrl(event.senderFrame.url)) {
    throw new Error('Richiesta rifiutata: origine renderer non autorizzata.')
  }
}

function safeDefaultName(value: unknown, ext: string): string {
  if (typeof value !== 'string' || value.length > 160) throw new Error('Nome file non valido.')
  const onlyName = basename(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim()
  if (!onlyName || extname(onlyName).toLowerCase() !== `.${ext}`) throw new Error('Nome file o estensione non validi.')
  return onlyName
}

function contentWithin(value: unknown, maxBytes = MAX_EXPORT_BYTES): string {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > maxBytes) throw new Error('Contenuto troppo grande o non valido.')
  return value
}

async function recoveryCopy(file: string): Promise<string | undefined> {
  if (!existsSync(file)) return undefined
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destination = join(app.getPath('userData'), `library.recovery-${stamp}.json`)
  await copyFile(file, destination)
  return destination
}

async function loadLibrary() {
  const file = libraryFile()
  await mkdir(app.getPath('userData'), { recursive: true })
  let migrated = false
  if (!existsSync(file) && existsSync(legacyLibraryFile())) {
    await copyFile(legacyLibraryFile(), file)
    migrated = true
  }
  if (!existsSync(file)) return { payload: emptyLibraryPayload() }
  try {
    const info = await stat(file)
    if (info.size > MAX_LIBRARY_BYTES) {
      const recoveryPath = await recoveryCopy(file)
      return { payload: emptyLibraryPayload(), warning: 'Archivio locale troppo grande: è stata conservata una copia di recupero.', recoveryPath }
    }
    const raw = await readFile(file, 'utf8')
    const parsedJson = JSON.parse(raw) as unknown
    const parsed = parseLibraryPayload(parsedJson)
    if (!parsed.ok) {
      const recoveryPath = await recoveryCopy(file)
      return { payload: emptyLibraryPayload(), warning: parsed.error, recoveryPath }
    }
    const warnings = [...(migrated ? ['Archivio precedente migrato nella nuova posizione.'] : []), ...parsed.value.warnings]
    const recoveryPath = warnings.length ? await recoveryCopy(file) : undefined
    return { payload: parsed.value.payload, ...(warnings.length ? { warning: warnings.join(' '), recoveryPath } : {}) }
  } catch (error) {
    const recoveryPath = await recoveryCopy(file).catch(() => undefined)
    return {
      payload: emptyLibraryPayload(),
      warning: `Archivio locale non leggibile: ${error instanceof Error ? error.message : 'errore sconosciuto'}.`,
      recoveryPath
    }
  }
}

async function saveLibrary(payload: unknown) {
  const parsed = parseLibraryPayload(payload)
  if (!parsed.ok || parsed.value.warnings.length) throw new Error(parsed.ok ? parsed.value.warnings.join(' ') : parsed.error)
  const data = JSON.stringify(parsed.value.payload, null, 2)
  if (Buffer.byteLength(data, 'utf8') > MAX_LIBRARY_BYTES) throw new Error('Archivio locale troppo grande.')
  const file = libraryFile()
  const temporary = `${file}.tmp-${process.pid}`
  const backup = join(app.getPath('userData'), 'library.backup.json')
  await mkdir(app.getPath('userData'), { recursive: true })
  if (existsSync(file)) await copyFile(file, backup)
  try {
    await writeFile(temporary, data, 'utf8')
    await rename(temporary, file)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
  return { ok: true, path: file }
}

async function createReportWindow(html: string): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  const loaded = new Promise<void>((resolveLoaded, reject) => {
    win.webContents.once('did-finish-load', () => resolveLoaded())
    win.webContents.once('did-fail-load', (_event, code, description) => reject(new Error(`Report non caricabile (${code}): ${description}`)))
  })
  await win.loadURL(`data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`)
  await loaded
  return win
}

function createWindow() {
  const iconFile = join(__dirname, '../../build/icon.png')
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0B1220',
    title: 'Kinetica',
    autoHideMenuBar: true,
    ...(existsSync(iconFile) ? { icon: iconFile } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.webContents.session.setPermissionCheckHandler(() => false)
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  win.webContents.setWindowOpenHandler(({ url }) => {
    void openSafeExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url)) return
    event.preventDefault()
    void openSafeExternal(url)
  })
  win.on('close', (event) => {
    if (approvedCloses.delete(win.id)) return
    event.preventDefault()
    if (closeTimers.has(win.id)) return
    win.webContents.send('kinetica:prepare-close')
    const timer = setTimeout(() => {
      closeTimers.delete(win.id)
      if (win.isDestroyed()) return
      approvedCloses.add(win.id)
      win.close()
    }, 2_000)
    closeTimers.set(win.id, timer)
  })
  win.on('closed', () => {
    const timer = closeTimers.get(win.id)
    if (timer) clearTimeout(timer)
    closeTimers.delete(win.id)
    approvedCloses.delete(win.id)
  })

  const dev = developmentRendererUrl()
  if (dev) void win.loadURL(dev.toString())
  else void win.loadFile(rendererFile())
}

ipcMain.handle('kinetica:load-library', async (event) => {
  assertTrustedSender(event)
  return loadLibrary()
})

ipcMain.handle('kinetica:save-library', async (event, payload: unknown) => {
  assertTrustedSender(event)
  return saveLibrary(payload)
})

ipcMain.handle('kinetica:export-file', async (event, raw: unknown) => {
  assertTrustedSender(event)
  const opts = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const ext = typeof opts?.ext === 'string' ? opts.ext.toLowerCase().replace(/^\./, '') : ''
  if (!EXPORT_EXTENSIONS.has(ext)) throw new Error('Formato export non supportato.')
  const defaultName = safeDefaultName(opts?.defaultName, ext)
  const content = contentWithin(opts?.content)
  const res = await dialog.showSaveDialog({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  if (res.canceled || !res.filePath) return { ok: false }
  await writeFile(res.filePath, content, 'utf8')
  return { ok: true, path: res.filePath }
})

ipcMain.handle('kinetica:import-file', async (event) => {
  assertTrustedSender(event)
  const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Piano Kinetica', extensions: ['json'] }] })
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true }
  const path = res.filePaths[0]
  if (extname(path).toLowerCase() !== '.json') throw new Error('Seleziona un file .json.')
  const info = await stat(path)
  if (info.size > MAX_IMPORT_BYTES) throw new Error(`Il file supera il limite di ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`)
  return { ok: true, content: await readFile(path, 'utf8'), path }
})

ipcMain.handle('kinetica:print-report', async (event, rawHtml: unknown) => {
  assertTrustedSender(event)
  const report = await createReportWindow(contentWithin(rawHtml))
  try {
    return await new Promise<{ ok: boolean }>((resolvePrint) => {
      report.webContents.print({ silent: false, printBackground: true }, (success) => resolvePrint({ ok: success }))
    })
  } finally {
    if (!report.isDestroyed()) report.destroy()
  }
})

ipcMain.handle('kinetica:pdf-report', async (event, raw: unknown) => {
  assertTrustedSender(event)
  const opts = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const defaultName = safeDefaultName(opts?.defaultName, 'pdf')
  const html = contentWithin(opts?.html)
  const res = await dialog.showSaveDialog({ defaultPath: defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
  if (res.canceled || !res.filePath) return { ok: false }
  const report = await createReportWindow(html)
  try {
    const pdf = await report.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true })
    await writeFile(res.filePath, pdf)
    return { ok: true, path: res.filePath }
  } finally {
    if (!report.isDestroyed()) report.destroy()
  }
})

ipcMain.on('kinetica:close-ready', (event, saved: unknown) => {
  try {
    assertTrustedSender(event)
  } catch {
    return
  }
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  const timer = closeTimers.get(win.id)
  if (timer) clearTimeout(timer)
  closeTimers.delete(win.id)
  if (saved !== true) return
  approvedCloses.add(win.id)
  win.close()
})

if (hasSingleInstanceLock) {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })
  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
