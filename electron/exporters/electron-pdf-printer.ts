import { BrowserWindow, app } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PdfPrinter } from '../../src/application/ports/report-service';

export class ElectronPdfPrinter implements PdfPrinter {
  async print(html: string, outputPath: string): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });
    const tempHtml = join(app.getPath('temp'), `seia-report-${randomUUID()}.html`);
    await writeFile(tempHtml, html, 'utf8');

    const window = new BrowserWindow({
      show: false,
      width: 900,
      height: 1200,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    try {
      await window.loadURL(pathToFileURL(tempHtml).toString());
      const pdf = await window.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      await writeFile(outputPath, pdf);
    } finally {
      window.destroy();
      await unlink(tempHtml).catch(() => undefined);
    }
  }
}
