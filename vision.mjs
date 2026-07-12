#!/usr/bin/env node
/**
 * Vision Bridge — 让 LM Studio 中的视觉模型成为你的"眼睛"
 *
 * 用法:
 *   node vision.mjs screenshot             截屏并描述
 *   node vision.mjs file <path>            描述指定图片
 *   node vision.mjs webcam                 拍照并描述 (需要摄像头)
 *   node vision.mjs watch [间隔秒数]        定时截屏观察 (默认 5 秒)
 *
 * 前置条件:
 *   1. 打开 LM Studio → 加载视觉模型 (如 Gemma-4, Qwen2.5-VL)
 *   2. 终端运行: lms server start --port 1234
 *   3. 或: LM Studio → Developer → Local Server → Start
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { basename, join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 配置 ──────────────────────────────────────────────
const CONFIG = {
  apiBase: process.env.LMSTUDIO_URL || "http://localhost:1234/v1",
  model: process.env.VISION_MODEL || "google/gemma-4-e4b",
  maxTokens: 2048,  // Gemma-4 有思考过程，需要更大 token 数
  temperature: 0.2,
  maxImageDim: 2048,    // 超过此尺寸自动压缩
  compressOverMB: 1.5,  // 超过此大小自动压缩为 JPEG
};

// ── LM Studio API ────────────────────────────────────

async function chatWithVision(messages, apiBase, model) {
  const url = `${apiBase}/chat/completions`;
  const body = {
    model,
    messages,
    max_tokens: CONFIG.maxTokens,
    temperature: CONFIG.temperature,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${errText.slice(0, 500)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "(模型未返回内容)";
}

// ── 图片处理 ─────────────────────────────────────────

function imageToBase64(filePath) {
  const buf = readFileSync(filePath);
  const ext = basename(filePath).split(".").pop().toLowerCase();
  const mimeMap = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", bmp: "bmp", gif: "gif" };
  const mime = mimeMap[ext] || "jpeg";
  return { dataUrl: `data:image/${mime};base64,${buf.toString("base64")}`, sizeBytes: buf.length };
}

async function compressIfNeeded(filePath) {
  const sharp = (await import("sharp")).default;
  const img = sharp(filePath);
  const meta = await img.metadata();

  let currentPath = filePath;
  let needsResize = meta.width > CONFIG.maxImageDim || meta.height > CONFIG.maxImageDim;
  let needsCompress = readFileSync(filePath).length > CONFIG.compressOverMB * 1024 * 1024;

  if (!needsResize && !needsCompress) return filePath;

  if (needsResize) {
    const resizedPath = filePath.replace(/\.(\w+)$/, "_rs.$1");
    await img
      .resize(CONFIG.maxImageDim, CONFIG.maxImageDim, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(resizedPath);
    const oldSize = (readFileSync(filePath).length / 1024 / 1024).toFixed(1);
    const newSize = (readFileSync(resizedPath).length / 1024).toFixed(1);
    console.log(`  📐 压缩: ${meta.width}x${meta.height} ${oldSize}MB → ${newSize}KB`);
    currentPath = resizedPath;
  } else if (needsCompress) {
    const jpegPath = filePath.replace(/\.\w+$/, ".jpg");
    await img.jpeg({ quality: 80 }).toFile(jpegPath);
    const oldSize = (readFileSync(filePath).length / 1024 / 1024).toFixed(1);
    const newSize = (readFileSync(jpegPath).length / 1024).toFixed(1);
    console.log(`  📐 压缩: ${oldSize}MB → ${newSize}KB`);
    currentPath = jpegPath;
  }

  return currentPath;
}

// ── 截图 ─────────────────────────────────────────────

async function takeScreenshot() {
  const imgPath = join(process.cwd(), `screenshot_${Date.now()}.png`);

  // 使用外部 PowerShell 脚本 (避免转义地狱)
  const ps1 = join(__dirname, "screenshot.ps1");
  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}" -Output "${imgPath}"`,
    { timeout: 15000 }
  );
  console.log(`  📸 截图已保存: ${imgPath}`);
  return imgPath;
}

// ── 视觉分析 ─────────────────────────────────────────

async function analyzeImage(imagePath, prompt, apiBase, model) {
  const processedPath = await compressIfNeeded(imagePath);
  const { dataUrl } = imageToBase64(processedPath);

  // 清理临时文件
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
  console.log(`\n👁️  持续观察模式 (每 ${intervalSec}s), 按 Ctrl+C 退出\n`);

  const analyze = async () => {
    const now = new Date().toLocaleTimeString("zh-CN");
    console.log(`── ${now} ──`);
    try {
      const imgPath = await takeScreenshot();
      const { reply, elapsed } = await analyzeImage(imgPath, prompt, apiBase, model);
      console.log(`  ⏱️  ${elapsed}s`);
      console.log(`  📝 ${reply.replace(/\n/g, "\n  ")}`);
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }
  };

  await analyze();
  const timer = setInterval(analyze, intervalSec * 1000);

  process.on("SIGINT", () => {
    clearInterval(timer);
    console.log("\n👁️  已停止。");
    process.exit(0);
  });
}

// ── API 连接检查 ─────────────────────────────────────

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
╔══════════════════════════════════════════════════════╗
║          👁️  Vision Bridge — 视觉桥梁              ║
║     让 LM Studio 视觉模型成为你的 AI 眼睛          ║
╚══════════════════════════════════════════════════════╝

用法:
  node vision.mjs <命令> [参数]

命令:
  screenshot [prompt]    截屏并分析
  file <路径> [prompt]   分析指定图片
  watch [秒] [prompt]    持续截屏观察 (默认每5秒)
  check                  检查 API 连接

选项:
  --model <name>        指定模型
  --url  <url>          指定 API 地址

示例:
  node vision.mjs screenshot "图片中有什么文字?"
  node vision.mjs file ./photo.jpg
  node vision.mjs watch 10 "描述屏幕变化"

启动服务器:
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
  const cmdArgs = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) { apiBase = args[i + 1]; i++; }
    else if (args[i] === "--model" && args[i + 1]) { model = args[i + 1]; i++; }
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
      case "screenshot": case "screen": case "shot": {
        const prompt = cmdArgs[0] || "请详细描述这张屏幕截图里的所有内容，包括窗口、文字、图标等。";
        const img = await takeScreenshot();
        const { reply, elapsed } = await analyzeImage(img, prompt, apiBase, resolvedModel);
        console.log(`\n⏱️ ${elapsed}s\n${"-".repeat(50)}\n${reply}\n${"-".repeat(50)}`);
        break;
      }

      case "file": case "image": case "img": {
        const fp = cmdArgs[0];
        if (!fp) { console.error("❌ 请指定图片路径"); process.exit(1); }
        if (!existsSync(fp)) { console.error(`❌ 文件不存在: ${fp}`); process.exit(1); }
        const prompt = cmdArgs[1] || "请详细描述这张图片里的所有内容。";
        const { reply, elapsed } = await analyzeImage(fp, prompt, apiBase, resolvedModel);
        console.log(`\n⏱️ ${elapsed}s\n${"-".repeat(50)}\n${reply}\n${"-".repeat(50)}`);
        break;
      }

      case "webcam": case "cam": case "camera": {
        console.error("❌ 摄像头功能需要额外配置，请使用 screenshot 命令");
        process.exit(1);
      }

      case "watch": case "observe": case "monitor": {
        const interval = Math.max(1, parseInt(cmdArgs[0]) || 5);
        const prompt = cmdArgs[1] || "简洁描述屏幕当前内容，重点关注变化。";
        await watchMode(interval, prompt, apiBase, resolvedModel);
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
