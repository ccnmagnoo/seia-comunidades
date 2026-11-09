import { app, BrowserWindow, dialog, protocol, shell } from 'electron';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { bootstrap } from '../src/app/bootstrap';
import type { Container } from '../src/app/bootstrap';
import { registerIpcHandlers } from './ipc/handlers';
import { ElectronPdfPrinter } from './exporters/electron-pdf-printer';
import { IPC_EVENTS } from '../src/shared/ipc';

const APP_SCHEME = 'app';
const DEV_URL = process.env.SEIA_DEV_URL ?? 'http://127.0.0.1:4321';
const DIST_DIR = resolve(app.getAppPath(), 'dist');

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let container: Container | null = null;

function resolveWorkspaceRoot(): string {
  if (process.env.SEIA_DATA_DIR) return resolve(process.env.SEIA_DATA_DIR);
  if (app.isPackaged) return app.getPath('userData');
  return process.cwd();
}

function ensureConfig(workspaceRoot: string): void {
  const destination = join(workspaceRoot, 'config', 'seia.toml');
  if (existsSync(destination)) return;

  const source = join(app.getAppPath(), 'config', 'seia.toml');
  if (!existsSync(source)) {
    throw new Error(`No se encontró config/seia.toml en ${source}`);
  }
  mkdirSync(join(workspaceRoot, 'config'), { recursive: true });
  copyFileSync(source, destination);
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 960,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#0b1020',
    title: 'SEIA Comunidades',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed =
      url.startsWith(`${APP_SCHEME}://`) ||
      (!app.isPackaged && url.startsWith(DEV_URL));
    if (!allowed) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        void shell.openExternal(url);
      }
    }
  });

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  if (!app.isPackaged && process.env.SEIA_USE_DIST !== '1') {
    await mainWindow.loadURL(DEV_URL);
  } else {
    await mainWindow.loadURL(`${APP_SCHEME}://app/`);
  }
}

function registerAppProtocol(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      let pathname = decodeURIComponent(url.pathname);
      if (!pathname || pathname === '/') pathname = '/index.html';

      let filePath = resolve(join(DIST_DIR, pathname));
      if (!extname(filePath)) {
        filePath = resolve(join(DIST_DIR, pathname, 'index.html'));
      }

      const normalizedDist = normalize(DIST_DIR);
      if (!normalize(filePath).startsWith(normalizedDist)) {
        return new Response('Forbidden', { status: 403 });
      }

      const data = await readFile(filePath);
      return new Response(new Uint8Array(data), {
        headers: {
          'content-type': contentType(filePath),
          'cache-control': 'no-cache',
        },
      });
    } catch {
      try {
        const index = await readFile(join(DIST_DIR, 'index.html'));
        return new Response(new Uint8Array(index), {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-cache',
          },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }
  });
}

function contentType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json; charset=utf-8',
  };
  return types[extension] ?? 'application/octet-stream';
}

function wireEvents(currentContainer: Container): void {
  currentContainer.bus.on('DATA_CHANGED', () => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_EVENTS.dataChanged);
    }
  });
}

async function start(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  ensureConfig(workspaceRoot);
  container = await bootstrap({
    workspaceRoot,
    version: app.getVersion(),
    pdfPrinter: new ElectronPdfPrinter(),
  });
  registerIpcHandlers(container);
  wireEvents(container);
  registerAppProtocol();
  await createWindow();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await start();
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      dialog.showErrorBox('SEIA Comunidades no pudo iniciar', message);
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}


