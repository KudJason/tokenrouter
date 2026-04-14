const puppeteer = require('puppeteer');
const path = require('path');

async function convertToPDF() {
  const htmlPath = path.join(__dirname, 'DEMO_TUTORIAL.html');
  const pdfPath = path.join(__dirname, 'DEMO_TUTORIAL.pdf');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('Opening HTML...');
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle0'
  });

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    }
  });

  await browser.close();
  console.log(`PDF saved to: ${pdfPath}`);
}

convertToPDF().catch(console.error);
