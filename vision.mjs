#!/usr/bin/env node
/**
 * Vision Bridge — 让 LM Studio 中的视觉模型成为你的"眼睛"
 *
 * ═══════════════════════════════════════════════════════════
 *  推荐用法 (零干扰，终端不会出现在截图里):
 *    1. Win+Shift+S 手动框选截图区域 → 图片进入剪贴板
 *    2. node vision.mjs clipboard "你的问题"
 * ═══════════════════════════════════════════════════════════
 *
 * 前置条件:
 *   1. LM Studio 加载视觉模型 → lms server start --port 1234
 *   2. Node.js >= 18
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { basename, join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 配置 ──────────────────────────────────────────────
const CONFIG = {
  apiBase: process.env.LMSTUDIO_URL || "http://localhost:1234/v1",
  model: process.env.VISION_MODEL || "google/gemma-4-e4b",
  maxTokens: 2048,
  temperature: 0.2,
  maxImageDim: 2048,
  compressOverMB: 1.5,
};

// ── PowerShell 辅助 ───────────────────────────────────

function runPS(scriptFile, extraArgs = "") {
  const ps1 = join(__dirname, scriptFile);
  return execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}" ${extraArgs}`,
    { timeout: 15000, encoding: "utf-8" }
  ).trim();
}

// ── LM Studio API ────────────────────────────────────

async function chatWithVision(messages, apiBase, model) {
  const url = `${apiBase}/chat/completions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: CONFIG.maxTokens, temperature: CONFIG.temperature }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "(模型未返回内容)";
}

// ── 图片处理 ─────────────────────────────────────────

function imageToBase64(filePath) {
  const buf = readFileSync(filePath);
  const ext = basename(filePath).split(".").pop().toLowerCase();
  const mimeMap = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", bmp: "bmp", gif: "gif" };
  return { dataUrl: `data:image/${mimeMap[ext] || "jpeg"};base64,${buf.toString("base64")}`, sizeBytes: buf.length };
}

async function compressIfNeeded(filePath) {
  const sharp = (await import("sharp")).default;
  const img = sharp(filePath);
  const meta = await img.metadata();
  const sizeMB = readFileSync(filePath).length / 1024 / 1024;

  if (meta.width <= CONFIG.maxImageDim && meta.height <= CONFIG.maxImageDim && sizeMB <= CONFIG.compressOverMB) {
    return filePath;
  }

  const outPath = filePath.replace(/\.\w+$/, ".jpg");
  await img
    .resize(CONFIG.maxImageDim, CONFIG.maxImageDim, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);

  const newKB = (readFileSync(outPath).length / 1024).toFixed(0);
  console.log(`  📐 ${meta.width}x${meta.height} ${sizeMB.toFixed(1)}MB → ${newKB}KB`);
  return outPath;
}

// ── 图像获取 (三种模式) ──────────────────────────────

/** 模式1: 剪贴板 — Win+Shift+S 后使用，终端不会出现在截图里 ⭐推荐 */
async function fromClipboard() {
  console.log("  📋 从剪贴板读取图片...");
  const imgPath = join(process.cwd(), `clipboard_${Date.now()}.png`);
  try {
    const result = runPS("clipboard.ps1", `-Output "${imgPath}"`);
    if (!existsSync(imgPath)) {
      throw new Error("剪贴板图片保存失败");
    }
    console.log(`  ✅ 剪贴板图片已读取: ${imgPath}`);
    return imgPath;
  } catch (e) {
    const msg = e.stderr || e.message || "";
    if (msg.includes("CLIPBOARD_EMPTY")) {
      throw new Error("剪贴板中没有图片！请先按 Win+Shift+S 框选截图区域。");
    }
    throw new Error(`剪贴板读取失败: ${msg.slice(0, 200)}`);
  }
}

/** 模式2: 全屏截图 — 可配合 --minimize 或 --delay */
async function fullScreenshot(minimize = false) {
  if (minimize) {
    try { runPS("minimize.ps1"); } catch {}
    await sleep(500); // 等待窗口最小化
  }

  const imgPath = join(process.cwd(), `screenshot_${Date.now()}.png`);
  runPS("screenshot.ps1", `-Output "${imgPath}"`);
  console.log(`  📸 截图已保存: ${imgPath}`);
  return imgPath;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── 视觉分析 ─────────────────────────────────────────

async function analyzeImage(imagePath, prompt, apiBase, model) {
  const processedPath = await compressIfNeeded(imagePath);
  const { dataUrl } = imageToBase64(processedPath);

  if (processedPath !== imagePath) {
    try { unlinkSync(processedPath); } catch {}
  }

  const messages = [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: dataUrl } },
    ],
  }];

  console.log("  🤔 视觉模型分析中...");
  const startTime = Date.now();
  const reply = await chatWithVision(messages, apiBase, model);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return { reply, elapsed };
}

// ── 持续观察 ─────────────────────────────────────────

async function watchMode(intervalSec, prompt, apiBase, model) {
  console.log(`\n👁️  持续观察 (每 ${intervalSec}s), Ctrl+C 退出\n`);

  const analyze = async () => {
    const now = new Date().toLocaleTimeString("zh-CN");
    console.log(`── ${now} ──`);
    try {
      const imgPath = await fullScreenshot(true); // 观察模式自动最小化
      const { reply, elapsed } = await analyzeImage(imgPath, prompt, apiBase, model);
      console.log(`  ⏱️  ${elapsed}s`);
      console.log(`  📝 ${reply.replace(/\n/g, "\n  ")}`);
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }
  };

  await analyze();
  const timer = setInterval(analyze, intervalSec * 1000);
  process.on("SIGINT", () => { clearInterval(timer); console.log("\n👁️  已停止。"); process.exit(0); });
}

// ── API 检查 ─────────────────────────────────────────

async function checkAPI(apiBase, model) {
  try {
    const resp = await fetch(`${apiBase}/models`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const models = data.data?.map(m => m.id) || [];
    console.log(`  ✅ API 已连接 (${apiBase})`);
    if (models.length > 0) {
      console.log(`  📋 可用模型: ${models.join(", ")}`);
      const match = models.find(m => m.toLowerCase().includes(model.toLowerCase()));
      if (!match && models.length > 0) {
        console.log(`  ⚠️  "${model}" 未找到, 使用: ${models[0]}`);
        return models[0];
      }
      if (match) return match;
    }
    return model;
  } catch (e) {
    console.error(`  ❌ 无法连接: ${e.message}`);
    console.error(`  💡 请运行: lms server start --port 1234`);
    return null;
  }
}

// ── 帮助 ─────────────────────────────────────────────

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║            👁️  Vision Bridge — 视觉桥梁                ║
║       让 LM Studio 视觉模型成为你的 AI 眼睛            ║
╚══════════════════════════════════════════════════════════╝

⭐ 推荐用法 (零干扰，终端不会出现在截图里):
   Win+Shift+S → 框选区域 → node vision.mjs clipboard "你的问题"

┌──────────────────────────────────────────────────────────┐
│ 命令                       │ 说明                        │
├──────────────────────────────────────────────────────────┤
│ clipboard [问题]            │ 从剪贴板读取图片分析 ⭐     │
│ screenshot [问题] [选项]    │ 全屏截图分析               │
│ file <路径> [问题]          │ 分析指定图片文件           │
│ watch [秒] [问题]           │ 持续截图观察               │
│ check                       │ 检查 API 连接状态          │
│ serve [端口]                │ 启动 Web 拖拽界面          │
└──────────────────────────────────────────────────────────┘

截图选项:
  --minimize    截图前自动最小化终端窗口 (避免出现黑框)
  --delay N     延迟 N 秒后截图 (给你时间调整窗口)

示例:
  # 最佳实践: Win+Shift+S 框选 → 分析剪贴板 (推荐!)
  node vision.mjs clipboard "这段代码有什么问题?"

  # 截全屏 (终端会被最小化)
  node vision.mjs screenshot --minimize

  # 延迟 3 秒截图 (有时间手动切换窗口)
  node vision.mjs screenshot --delay 3 "屏幕上显示了什么?"

  # 分析本地图片文件
  node vision.mjs file ./photo.jpg

  # 每 10 秒观察一次屏幕
  node vision.mjs watch 10 "屏幕有什么变化?"

环境变量:
  VISION_MODEL    视觉模型 (默认: google/gemma-4-e4b)
  LMSTUDIO_URL    API 地址 (默认: http://localhost:1234/v1)

启动服务:
  lms server start --port 1234
`);
}

// ── 主函数 ───────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    showHelp();
    process.exit(0);
  }

  let apiBase = CONFIG.apiBase, model = CONFIG.model;
  let minimize = false, delaySec = 0;
  const cmdArgs = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) { apiBase = args[i + 1]; i++; }
    else if (args[i] === "--model" && args[i + 1]) { model = args[i + 1]; i++; }
    else if (args[i] === "--minimize") { minimize = true; }
    else if (args[i] === "--delay" && args[i + 1]) { delaySec = parseInt(args[i + 1]) || 0; i++; }
    else { cmdArgs.push(args[i]); }
  }

  if (cmd === "check") {
    await checkAPI(apiBase, model);
    process.exit(0);
  }

  const resolvedModel = await checkAPI(apiBase, model);
  if (!resolvedModel) process.exit(1);

  try {
    switch (cmd) {

      // ═══ 剪贴板模式 (推荐) ═══
      case "clipboard": case "clip": case "paste": {
        const prompt = cmdArgs[0] || "请详细描述这张图片里的所有内容。";
        const img = await fromClipboard();
        const { reply, elapsed } = await analyzeImage(img, prompt, apiBase, resolvedModel);
        console.log(`\n⏱️ ${elapsed}s\n${"-".repeat(50)}\n${reply}\n${"-".repeat(50)}`);
        break;
      }

      // ═══ 全屏截图 ═══
      case "screenshot": case "screen": case "shot": {
        const prompt = cmdArgs[0] || "请详细描述这张屏幕截图里的所有内容。";

        if (delaySec > 0) {
          console.log(`  ⏳ ${delaySec} 秒后截图，请准备好窗口...`);
          for (let t = delaySec; t > 0; t--) {
            console.log(`     ${t}...`);
            await sleep(1000);
          }
        }

        const img = await fullScreenshot(minimize);
        const { reply, elapsed } = await analyzeImage(img, prompt, apiBase, resolvedModel);
        console.log(`\n⏱️ ${elapsed}s\n${"-".repeat(50)}\n${reply}\n${"-".repeat(50)}`);
        break;
      }

      // ═══ 本地文件 ═══
      case "file": case "image": case "img": {
        const fp = cmdArgs[0];
        if (!fp) { console.error("❌ 请指定图片路径"); process.exit(1); }
        if (!existsSync(fp)) { console.error(`❌ 文件不存在: ${fp}`); process.exit(1); }
        const prompt = cmdArgs[1] || "请详细描述这张图片里的所有内容。";
        const { reply, elapsed } = await analyzeImage(fp, prompt, apiBase, resolvedModel);
        console.log(`\n⏱️ ${elapsed}s\n${"-".repeat(50)}\n${reply}\n${"-".repeat(50)}`);
        break;
      }

      // ═══ 持续观察 ═══
      case "watch": case "observe": case "monitor": {
        const interval = Math.max(1, parseInt(cmdArgs[0]) || 5);
        const prompt = cmdArgs[1] || "简洁描述屏幕当前内容，重点关注变化。";
        await watchMode(interval, prompt, apiBase, resolvedModel);
        break;
      }

      // ═══ Web 拖拽界面 ═══
      case "serve": case "web": case "server": {
        const port = parseInt(cmdArgs[0]) || 3456;
        const { startServer } = await import("./serve.mjs");
        await startServer(port, apiBase, resolvedModel);
        break;
      }

      default:
        console.error(`❌ 未知命令: ${cmd}`);
        showHelp();
        process.exit(1);
    }
  } catch (e) {
    console.error(`\n❌ 执行失败: ${e.message}`);
    process.exit(1);
  }
}

main();
