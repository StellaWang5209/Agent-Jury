// Agent Jury 演示视频录制脚本（playwright + 系统 Chrome，约 2.5 分钟）
// 片头卡片 → 独立演示台(危险案例盲审全流程) → 集成演示(Kuru 风控回调) → 片尾卡片
const { chromium } = require("playwright");
const path = require("path");

const DEMO = "http://localhost:4180";
const VIDEO_DIR = path.join(__dirname, "raw");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 平滑滚动导览：stops = [ [滚动距离, 停留ms], ... ]
async function slowTour(page, stops) {
  for (const [dy, hold] of stops) {
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, dy / 8);
      await sleep(110);
    }
    await sleep(hold);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();

  // ===== 1. 片头卡片 (10s) =====
  await page.goto("file:///" + path.join(__dirname, "card-intro.html").replace(/\\/g, "/"));
  await sleep(10000);
  console.log("[1] intro done");

  // ===== 2. 独立演示台：危险案例手动盲审 =====
  await page.goto(DEMO + "/", { waitUntil: "load", timeout: 30000 });
  await sleep(2500); // 展示首页整体
  await page.click('button:has-text("危险案例")');
  await sleep(1800); // 展示案件文本已填入
  await page.click('button:has-text("开始盲审")');
  await page.waitForSelector("text=全体陪审员已密封承诺", { timeout: 20000 });
  await sleep(4500); // 展示 THINKING→COMMITTED 状态与承诺哈希
  await page.click('button:has-text("揭晓裁决")');
  await page.waitForSelector("text=结论：阻止执行该操作", { timeout: 20000 });
  await sleep(5000); // 展示最终裁决 BLOCK
  console.log("[2] standalone verdict shown");

  // 向下导览：引擎条 → 陪审员卡片 → 最终裁决卡
  await slowTour(page, [[350, 4500], [380, 4500], [380, 5000], [350, 5500]]);
  console.log("[2] standalone tour done");

  // ===== 3. 集成演示：Kuru Exchange =====
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1500);
  await page.click('button:has-text("集成演示")');
  await sleep(5000); // 展示集成横幅 + 架构连线
  await page.click('button:has-text("一键载入 Kuru 集成场景")');
  await sleep(2800); // 展示案件输入
  await page.click('button:has-text("开始盲审")');
  await page.waitForSelector("text=全体陪审员已密封承诺", { timeout: 20000 });
  await sleep(4500);
  await page.click('button:has-text("揭晓裁决")');
  await page.waitForSelector("text=交易已拦截", { timeout: 20000 });
  await sleep(5500); // 展示 5 步管线全部点亮 + BLOCK 回调
  console.log("[3] kuru callback shown");

  // 导览：管线 → Kuru 面板/回调结果 → 陪审团与共识
  await slowTour(page, [[340, 5000], [400, 5000], [400, 5500], [400, 5500]]);
  console.log("[3] kuru tour done");

  // ===== 4. 片尾卡片 (14s) =====
  await page.goto("file:///" + path.join(__dirname, "card-outro.html").replace(/\\/g, "/"));
  await sleep(14000);
  console.log("[4] outro done");

  const video = page.video();
  await ctx.close();
  const rawPath = await video.path();
  console.log("VIDEO_SAVED=" + rawPath);
  await browser.close();
})().catch((e) => {
  console.error("RECORD_FAILED:", e.message);
  process.exit(1);
});
