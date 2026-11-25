/* eslint-disable @typescript-eslint/no-require-imports */
// アイコン PNG を生成する: node scripts/generate-icons.cjs
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");

const svg = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" ${pad ? "" : 'rx="22"'} fill="#2f5bd3"/>
  <g transform="translate(50 50) scale(${pad ? 0.72 : 1}) translate(-50 -50)">
    <text x="50" y="62" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="44" fill="#fff">T</text>
    <rect x="28" y="72" width="44" height="5" rx="2.5" fill="#ffd166"/>
  </g>
</svg>`;

const targets = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/icon-maskable-512.png", 512, true],
  ["src/app/apple-icon.png", 180, true],
  ["src/app/icon.png", 64, false],
];

(async () => {
mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [path, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, pad)}</body></html>`);
  await page.locator("svg").screenshot({ path, omitBackground: true });
}
await browser.close();
console.log("done");
})();
