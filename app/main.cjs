const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')
const treeKill = require('tree-kill')

const REPO_ROOT = path.resolve(__dirname, '..')
const BACKEND_DIR = path.join(REPO_ROOT, 'backend')
const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend')

const FRONTEND_URL = 'http://localhost:5173/'
const WAIT_MS = 120_000
const POLL_MS = 400

/** @type {import('child_process').ChildProcess[]} */
const children = []

function pushChild(cp) {
  if (cp && cp.pid) {
    children.push(cp)
  }
}

function resolvePythonCommand() {
  return process.platform === 'win32' ? 'python' : 'python3'
}

function spawnNodeBackend() {
  return spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    shell: process.platform === 'win32',
    env: { ...process.env },
  })
}

function spawnDjango() {
  const cmd = resolvePythonCommand()
  return spawn(cmd, ['manage.py', 'runserver', '8000'], {
    cwd: BACKEND_DIR,
    shell: process.platform === 'win32',
    env: { ...process.env },
  })
}

function spawnVite() {
  return spawn('npm run dev', {
    cwd: FRONTEND_DIR,
    shell: true,
    env: { ...process.env },
  })
}

function waitForHttpOk(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const tryOnce = () => {
      const req = http.get(url, { timeout: 2_000 }, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) {
          resolve()
          return
        }
        schedule()
      })
      req.on('error', schedule)
      req.on('timeout', () => {
        req.destroy()
        schedule()
      })
    }
    const schedule = () => {
      if (Date.now() > deadline) {
        reject(new Error(`не дождались ответа: ${url}`))
        return
      }
      setTimeout(tryOnce, POLL_MS)
    }
    tryOnce()
  })
}

function logChild(name, cp) {
  if (!cp || !cp.stdout || !cp.stderr) return
  cp.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`))
  cp.stderr.on('data', (d) => process.stderr.write(`[${name}] ${d}`))
}

function killAllChildren() {
  for (const cp of children) {
    if (cp.pid && !cp.killed) {
      try {
        treeKill(cp.pid)
      } catch {
        /* ignore */
      }
    }
  }
  children.length = 0
}

let mainWindow = null

async function startServices() {
  const nodeCp = spawnNodeBackend()
  pushChild(nodeCp)
  logChild('node', nodeCp)

  const djangoCp = spawnDjango()
  pushChild(djangoCp)
  logChild('django', djangoCp)

  const viteCp = spawnVite()
  pushChild(viteCp)
  logChild('vite', viteCp)

  await waitForHttpOk(FRONTEND_URL, WAIT_MS)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL(FRONTEND_URL)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    await startServices()
    createWindow()
  } catch (err) {
    killAllChildren()
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    const fallback = new BrowserWindow({
      width: 560,
      height: 200,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:16px;background:#111;color:#ddd">
      <p>не удалось запустить сервисы.</p>
      <p style="font-size:14px;opacity:.85">${msg.replace(/</g, '&lt;')}</p>
      <p style="font-size:13px;opacity:.7">нужны node, python и зависимости: <code>backend/npm i</code>, <code>frontend/npm i</code>, django venv.</p>
    </body></html>`
    fallback.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  killAllChildren()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  killAllChildren()
})
