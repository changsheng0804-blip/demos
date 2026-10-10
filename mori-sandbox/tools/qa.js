// 自动验收：node tools/qa.js <站点目录> <输出目录>
// 截图：1523/1550/1557 · 1× 与 3×；手机宽度；录屏模式；阵营/家族视图。输出 errors.json
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const [dir, out] = [process.argv[2], process.argv[3]]; fs.mkdirSync(out, { recursive: true });
const sleep = (t) => new Promise((r) => setTimeout(r, t));
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.C, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const errs = [];
  const open = async (w, h, hash = '') => {
    const p = await b.newPage(); await p.setViewport({ width: w, height: h });
    p.on('pageerror', (e) => errs.push(`${w}x${h}${hash}: ${e.message}`));
    p.on('requestfailed', (r) => { if (r.url().startsWith('file:')) errs.push('missing ' + r.url()); });
    await p.goto('file://' + dir + '/index.html' + hash, { waitUntil: 'load' }); await sleep(2000); return p;
  };
  const year = async (p, n) => { for (let i = 0; i < n; i++) { await p.keyboard.press('ArrowRight'); await sleep(250); } await sleep(4500); };
  const zoom = async (p, x, y) => { await p.mouse.move(x, y); for (let i = 0; i < 5; i++) { await p.mouse.wheel({ deltaY: -200 }); await sleep(150); } await sleep(1500); };
  let p = await open(1600, 950); await sleep(3500); await p.screenshot({ path: out + '/1523_1x.png' });
  await year(p, 12); await p.screenshot({ path: out + '/1550_1x.png' });
  await zoom(p, 560, 420); await p.screenshot({ path: out + '/1550_3x.png' });
  await p.keyboard.press('ArrowRight'); await year(p, 6); await p.screenshot({ path: out + '/1557_1x.png' });
  for (const v of ['阵营', '家族']) {
    const ok = await p.evaluate((t) => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); if (e) e.click(); return !!e; }, v);
    await sleep(2500); if (ok) await p.screenshot({ path: out + `/view_${v}.png` });
  }
  await p.close();
  p = await open(390, 844); await sleep(3000); await p.screenshot({ path: out + '/phone.png' }); await p.close();
  p = await open(1920, 1080, '#rec=1550-1551'); await sleep(5000); await p.screenshot({ path: out + '/rec.png' }); await p.close();
  fs.writeFileSync(out + '/errors.json', JSON.stringify(errs, null, 1)); console.log('errors:', errs.length, errs.slice(0, 5));
  await b.close();
})();
