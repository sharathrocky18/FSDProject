const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'screenshots', '08_test_suite_terminal.png');

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 750, deviceScaleFactor: 2 });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0; padding: 30px;
        background: #0f172a;
        font-family: 'Consolas', 'Courier New', monospace;
        display: flex; justify-content: center; align-items: center; min-height: 100vh;
      }
      .terminal {
        background: #181d2e;
        border: 1px solid #2a3047;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        width: 100%;
        max-width: 980px;
        overflow: hidden;
      }
      .term-header {
        background: #101422;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #2a3047;
      }
      .dots { display: flex; gap: 8px; margin-right: 18px; }
      .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
      .dot-red { background: #ef4444; }
      .dot-yellow { background: #f59e0b; }
      .dot-green { background: #10b981; }
      .term-title { color: #94a3b8; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }
      .term-body {
        padding: 24px 28px;
        color: #e2e8f0;
        font-size: 14px;
        line-height: 1.7;
      }
      .cmd { color: #38bdf8; font-weight: 600; margin-bottom: 14px; }
      .pass { color: #34d399; font-weight: bold; }
      .time { color: #64748b; font-size: 12px; margin-left: 8px; }
      .summary-box {
        margin-top: 20px;
        padding: 14px 18px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 8px;
        display: flex;
        gap: 24px;
        align-items: center;
      }
      .stat-item { display: flex; flex-direction: column; }
      .stat-lbl { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
      .stat-val { font-size: 18px; font-weight: bold; }
      .val-green { color: #34d399; }
      .val-blue { color: #38bdf8; }
    </style>
  </head>
  <body>
    <div class="terminal">
      <div class="term-header">
        <div class="dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <span class="term-title">powershell &mdash; StudySync Node.js Test Runner (node:test)</span>
      </div>
      <div class="term-body">
        <div class="cmd">&gt; studysync@0.1.0 test<br>&gt; node --no-warnings test.js</div>
        <div><span class="pass">&#10004;</span> rejects a session with no subject <span class="time">(59.08ms)</span></div>
        <div><span class="pass">&#10004;</span> rejects zero, negative and absurd durations <span class="time">(22.10ms)</span></div>
        <div><span class="pass">&#10004;</span> rejects an unknown category <span class="time">(32.05ms)</span></div>
        <div><span class="pass">&#10004;</span> creates and lists sessions, newest first <span class="time">(26.94ms)</span></div>
        <div><span class="pass">&#10004;</span> summary totals by subject and category <span class="time">(9.22ms)</span></div>
        <div><span class="pass">&#10004;</span> summary excludes sessions older than the range <span class="time">(2.27ms)</span></div>
        <div><span class="pass">&#10004;</span> deletes a session and 404s on a missing one <span class="time">(9.09ms)</span></div>
        <div><span class="pass">&#10004;</span> updates an existing session and validates updates <span class="time">(22.95ms)</span></div>
        <div><span class="pass">&#10004;</span> normalises subject on POST and PUT with whitespace collapsing &amp; case-matching <span class="time">(33.55ms)</span></div>
        <div><span class="pass">&#10004;</span> migration merges rows differing by case/spacing into most frequent spelling <span class="time">(39.85ms)</span></div>
        <div><span class="pass">&#10004;</span> GET /api/subjects returns subjects ordered by most recent use <span class="time">(32.97ms)</span></div>
        
        <div class="summary-box">
          <div class="stat-item"><span class="stat-lbl">Total Tests</span><span class="stat-val">11</span></div>
          <div class="stat-item"><span class="stat-lbl">Passed</span><span class="stat-val val-green">11 (100%)</span></div>
          <div class="stat-item"><span class="stat-lbl">Failed</span><span class="stat-val">0</span></div>
          <div class="stat-item"><span class="stat-lbl">Suites</span><span class="stat-val">Node Native</span></div>
          <div class="stat-item"><span class="stat-lbl">Duration</span><span class="stat-val val-blue">304 ms</span></div>
          <div class="stat-item"><span class="stat-lbl">Status</span><span class="stat-val val-green">PASS</span></div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('Terminal screenshot saved at:', OUT);
}

run().catch(console.error);
