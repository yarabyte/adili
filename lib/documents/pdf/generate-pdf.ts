import "server-only";

import puppeteer from "puppeteer";

/**
 * Rendu HTML → PDF A4 via Chromium headless.
 * Les marges et sauts de page viennent de `app/print/print.css` (@page).
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const bytes = await page.pdf({
      format: "a4",
      preferCSSPageSize: true,
      printBackground: true,
    });
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}
