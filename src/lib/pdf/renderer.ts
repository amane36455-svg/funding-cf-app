import puppeteer from 'puppeteer-core';
import { documentHtml } from '@/lib/pdf/template';

export async function renderPdfBuffer(args: {
  title: string;
  markdown: string;
}): Promise<Buffer> {
  const launchOptions = await resolveLaunchOptions();

  const browser = await puppeteer.launch({
    ...launchOptions,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(documentHtml(args), { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '18mm',
        bottom: '18mm',
        left: '18mm',
      },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:9px;width:100%;padding:0 18mm;color:#64748b;">${escapeHeader(args.title)}</div>`,
      footerTemplate:
        '<div style="font-size:9px;width:100%;padding:0 18mm;color:#64748b;text-align:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function escapeHeader(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function resolveLaunchOptions(): Promise<{
  executablePath: string;
  args: string[];
  headless: true;
}> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    };
  }

  const chromium = (await import('@sparticuz/chromium-min')).default;
  const executablePath = await chromium.executablePath(process.env.CHROMIUM_DOWNLOAD_URL);
  return {
    executablePath,
    args: chromium.args,
    headless: true,
  };
}
