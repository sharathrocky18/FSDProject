const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 }); // Crisp 2x retina scale

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Full Dashboard Light Mode
  console.log('Capturing full dashboard...');
  await page.screenshot({
    path: path.join(OUT_DIR, '01_dashboard_hero.png'),
    fullPage: false
  });

  // 1b. Full tall page
  await page.screenshot({
    path: path.join(OUT_DIR, '01_dashboard_fullpage.png'),
    fullPage: true
  });

  // 2. Focused Timer & Form Card
  console.log('Starting timer and capturing logging flow...');
  // Click start timer
  const startBtn = await page.$('#startBtn');
  if (startBtn) {
    await startBtn.click();
    await new Promise(r => setTimeout(r, 2200)); // wait for clock to tick
  }
  const logCard = await page.$('#logCard');
  if (logCard) {
    await logCard.screenshot({ path: path.join(OUT_DIR, '02_timer_active_card.png') });
  }

  // 3. Analytics Card (Subject Bars & Category Donut)
  console.log('Capturing analytics breakdown card...');
  const cards = await page.$$('.card');
  if (cards.length > 1) {
    await cards[1].screenshot({ path: path.join(OUT_DIR, '03_analytics_card.png') });
  }

  // 4. Minutes Per Day Chart
  console.log('Capturing daily trend chart...');
  const dayCard = await page.$('#dayChart');
  if (dayCard) {
    const parentCard = await page.evaluateHandle(el => el.closest('.card'), dayCard);
    await parentCard.screenshot({ path: path.join(OUT_DIR, '04_daily_trend_card.png') });
  }

  // 5. Recent Sessions Table
  console.log('Capturing recent sessions table...');
  const tableWrap = await page.$('.table-wrap');
  if (tableWrap) {
    const parentCard = await page.evaluateHandle(el => el.closest('.card'), tableWrap);
    await parentCard.screenshot({ path: path.join(OUT_DIR, '05_recent_sessions_card.png') });
  }

  // 6. Edit Session Modal Dialog
  console.log('Triggering edit dialog modal...');
  const editBtn = await page.$('button.edit');
  if (editBtn) {
    await editBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(OUT_DIR, '06_edit_session_modal.png'),
      fullPage: false
    });
    // close modal
    const cancelBtn = await page.$('#cancelEditBtn');
    if (cancelBtn) await cancelBtn.click();
  } else {
    console.log('button.edit not found');
  }

  // 7. Dark Mode View
  console.log('Capturing Dark Mode dashboard...');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(OUT_DIR, '07_dashboard_dark.png'),
    fullPage: false
  });

  await browser.close();
  console.log('All screenshots captured successfully in:', OUT_DIR);
}

run().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
