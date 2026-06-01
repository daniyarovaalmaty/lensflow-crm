/**
 * Generates a 16:9 (1280x720) PDF presentation
 * Screenshots each .page slide individually → combines into PDF
 */
const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = '/Users/daniyarovaruslanovna/Downloads/LensFlow_Presentation.pdf';
const SLIDE_W = 1280;
const SLIDE_H = 720;
const TEMP_DIR = path.join(__dirname, '.tmp_slides');

(async () => {
  // Create temp dir
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: SLIDE_W, height: SLIDE_H, deviceScaleFactor: 2 });

  // Load HTML (hide print button)
  let html = fs.readFileSync('public/presentation.html', 'utf8');
  html = html.replace("document.getElementById('printBtn').style.display='block';", '');

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 4000)); // wait for fonts

  // Get all slides
  const slides = await page.$$('.page');
  console.log(`Found ${slides.length} slides`);

  const screenshots = [];
  for (let i = 0; i < slides.length; i++) {
    const box = await slides[i].boundingBox();
    const imgPath = path.join(TEMP_DIR, `slide_${i}.png`);
    await page.screenshot({
      path: imgPath,
      clip: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: SLIDE_W,
        height: SLIDE_H
      }
    });
    screenshots.push(imgPath);
    console.log(`  ✓ Slide ${i + 1}/${slides.length}`);
  }

  await browser.close();

  // Build PDF from screenshots
  console.log('Building PDF...');
  const doc = new PDFDocument({
    size: [SLIDE_W, SLIDE_H],
    margin: 0,
    autoFirstPage: false
  });

  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  for (let i = 0; i < screenshots.length; i++) {
    doc.addPage({ size: [SLIDE_W, SLIDE_H], margin: 0 });
    doc.image(screenshots[i], 0, 0, { width: SLIDE_W, height: SLIDE_H });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Cleanup temp files
  for (const f of screenshots) fs.unlinkSync(f);
  fs.rmdirSync(TEMP_DIR);

  const size = fs.statSync(OUTPUT).size;
  console.log(`\n✅ PDF saved! ${slides.length} slides, ${(size/1024/1024).toFixed(1)} MB`);
  console.log(`📁 ${OUTPUT}`);
})().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
