import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

app.setName('Kinetica')
if (process.platform === 'win32') {
  app.setAppUserModelId('it.gabrovec.kinetica')
}

function dataDir() {
  return join(app.getPath('userData'), 'kinetica')
}

async function ensureDir() {
  const dir = dataDir()
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  return dir
}

function parentWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
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
      sandbox: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL()
    if (url !== current && !url.startsWith('file:') && !url.startsWith(process.env.ELECTRON_RENDERER_URL ?? 'about:blank')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('kinetica:load-library', async () => {
  const dir = await ensureDir()
  const file = join(dir, 'library.json')
  if (!existsSync(file)) return { simulations: [], patients: [], draft: null }
  try {
    const raw = await readFile(file, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { simulations: [], patients: [], draft: null }
  }
})

ipcMain.handle('kinetica:save-library', async (_e, payload: unknown) => {
  const dir = await ensureDir()
  await writeFile(join(dir, 'library.json'), JSON.stringify(payload, null, 2), 'utf8')
  return { ok: true }
})

ipcMain.handle('kinetica:export-file', async (_e, opts: { defaultName: string; content: string; ext: string }) => {
  const win = parentWindow()
  const dialogOpts = {
    defaultPath: opts.defaultName,
    filters: [{ name: opts.ext.toUpperCase(), extensions: [opts.ext.replace('.', '')] }]
  }
  const res = win ? await dialog.showSaveDialog(win, dialogOpts) : await dialog.showSaveDialog(dialogOpts)
  if (res.canceled || !res.filePath) return { ok: false }
  await writeFile(res.filePath, opts.content, 'utf8')
  return { ok: true, path: res.filePath }
})

ipcMain.handle('kinetica:import-file', async () => {
  const win = parentWindow()
  const dialogOpts = {
    properties: ['openFile' as const],
    filters: [
      { name: 'Piano Kinetica', extensions: ['json'] },
      { name: 'Tutti i file', extensions: ['*'] }
    ]
  }
  const res = win ? await dialog.showOpenDialog(win, dialogOpts) : await dialog.showOpenDialog(dialogOpts)
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true }
  const content = await readFile(res.filePaths[0], 'utf8')
  return { ok: true, content, path: res.filePaths[0] }
})

ipcMain.handle('kinetica:print', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { ok: false }
  win.webContents.print({ silent: false })
  return { ok: true }
})

ipcMain.handle('kinetica:pdf', async (_e, defaultName: string) => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { ok: false }
  const res = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (res.canceled || !res.filePath) return { ok: false }
  const pdf = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'default' }
  })
  await writeFile(res.filePath, pdf)
  return { ok: true, path: res.filePath }
})

ipcMain.handle('kinetica:open-path', async (_e, p: string) => {
  await shell.showItemInFolder(p)
})
