// 自动验收：node tools/qa.js <站点目录> <输出目录>
// 截图：1523/1533/1550/1557/1564/1582/1600（阵营/家族视图在 1600 年） · 1× 与 3×（1564 放大东部伯耆）；手机宽度；录屏模式；阵营/家族视图。输出 errors.json
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
  // 按年份跳帧（不依赖帧序号：增删帧后截图仍是同一年）；该年无帧则记一条错误
  const goYear = async (p, y) => {
    const i = await p.evaluate((y) => { const i = SANDBOX.frames.findIndex((f) => f.year === y); if (i >= 0) go(i, true); return i; }, y);
    if (i < 0) errs.push('no frame for ' + y); await sleep(4500);
  };
  const zoom = async (p, x, y) => { await p.mouse.move(x, y); for (let i = 0; i < 5; i++) { await p.mouse.wheel({ deltaY: -200 }); await sleep(150); } await sleep(1500); };
  let p = await open(1600, 950); await sleep(3500); await p.screenshot({ path: out + '/1523_1x.png' });
  await goYear(p, 1550); await p.screenshot({ path: out + '/1550_1x.png' });
  await zoom(p, 560, 420); await p.screenshot({ path: out + '/1550_3x.png' });
  await goYear(p, 1557); await p.screenshot({ path: out + '/1557_1x.png' });
  await goYear(p, 1533); await p.screenshot({ path: out + '/1533_1x.png' });
  await goYear(p, 1564); await p.screenshot({ path: out + '/1564_1x.png' });
  await zoom(p, 1000, 260); await p.screenshot({ path: out + '/1564_east_3x.png' });
  await p.click('#zRe').catch(() => {}); await sleep(800);
  await goYear(p, 1582); await p.screenshot({ path: out + '/1582_1x.png' });
  await goYear(p, 1600); await p.screenshot({ path: out + '/1600_1x.png' });
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
