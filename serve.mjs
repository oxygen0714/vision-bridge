/**
 * Vision Bridge — Web 拖拽界面
 * 启动一个本地网页，支持拖拽/粘贴图片进行分析
 *
 * 用法: node serve.mjs [端口]
 * 默认: http://localhost:3456
 */

import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vision Bridge — 视觉桥梁</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
    background: #0d1117; color: #c9d1d9;
    min-height: 100vh; display: flex; justify-content: center; align-items: center;
  }
  .container { max-width: 700px; width: 100%; padding: 24px; }
  h1 { font-size: 28px; text-align: center; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #8b949e; margin-bottom: 24px; font-size: 14px; }

  .dropzone {
    border: 2px dashed #30363d; border-radius: 12px;
    padding: 48px 24px; text-align: center; cursor: pointer;
    transition: all 0.2s; background: #161b22; margin-bottom: 16px;
  }
  .dropzone:hover, .dropzone.drag-over { border-color: #58a6ff; background: #1c2430; }
  .dropzone .icon { font-size: 48px; margin-bottom: 12px; }
  .dropzone .hint { color: #8b949e; font-size: 14px; }
  .dropzone .hint strong { color: #58a6ff; }

  .prompt-area { margin-bottom: 16px; }
  .prompt-area textarea {
    width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #30363d;
    background: #0d1117; color: #c9d1d9; font-size: 14px; resize: vertical;
    font-family: inherit;
  }
  .prompt-area textarea:focus { outline: none; border-color: #58a6ff; }

  .actions { display: flex; gap: 8px; margin-bottom: 16px; }
  .btn {
    padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;
    font-size: 14px; font-weight: 600; transition: all 0.2s;
  }
  .btn-primary { background: #238636; color: white; flex: 1; }
  .btn-primary:hover { background: #2ea043; }
  .btn-primary:disabled { background: #21262d; color: #484f58; cursor: not-allowed; }
  .btn-secondary { background: #21262d; color: #c9d1d9; }
  .btn-secondary:hover { background: #30363d; }

  .preview { margin-bottom: 16px; text-align: center; display: none; }
  .preview img { max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #30363d; }
  .preview .name { font-size: 12px; color: #8b949e; margin-top: 4px; }

  .result { display: none; }
  .result .header { font-size: 12px; color: #8b949e; margin-bottom: 8px; }
  .result .content {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 16px; white-space: pre-wrap; line-height: 1.6; font-size: 14px;
  }

  .status { text-align: center; font-size: 14px; color: #8b949e; min-height: 20px; margin-bottom: 8px; }
  .error { color: #f85149; }

  .tabs { display: flex; gap: 4px; margin-bottom: 16px; background: #161b22; border-radius: 8px; padding: 4px; }
  .tab {
    flex: 1; padding: 8px; text-align: center; border-radius: 6px;
    cursor: pointer; font-size: 13px; color: #8b949e; transition: all 0.2s;
  }
  .tab.active { background: #1f6feb; color: white; }
  .tab:hover:not(.active) { color: #c9d1d9; }
</style>
</head>
<body>
<div class="container">
  <h1>👁️ Vision Bridge</h1>
  <p class="subtitle">拖拽图片 / 粘贴截图 → 本地视觉模型分析</p>

  <div class="tabs">
    <div class="tab active" data-mode="drop">📁 拖拽/选择图片</div>
    <div class="tab" data-mode="paste">📋 粘贴剪贴板截图</div>
  </div>

  <div class="dropzone" id="dropzone">
    <div class="icon">🏞️</div>
    <div class="hint"><strong>点击选择图片</strong> 或拖拽图片到这里</div>
    <div class="hint" style="margin-top:8px">也支持 <strong>Ctrl+V</strong> 粘贴截图</div>
  </div>

  <div class="preview" id="preview">
    <img id="previewImg" src="" alt="预览">
    <div class="name" id="previewName"></div>
  </div>

  <div class="prompt-area">
    <textarea id="prompt" rows="2" placeholder="可选：针对图片提一个问题 (留空则自动描述)"></textarea>
  </div>

  <div class="actions">
    <button class="btn btn-primary" id="analyzeBtn" disabled>🔍 开始分析</button>
    <button class="btn btn-secondary" id="clearBtn" style="display:none">✕ 清除</button>
  </div>

  <div class="status" id="status"></div>
  <div class="result" id="result">
    <div class="header">📝 分析结果 <span id="elapsed"></span></div>
    <div class="content" id="resultContent"></div>
  </div>
</div>

<script>
let currentFile = null;

const dropzone = document.getElementById('dropzone');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');
const result = document.getElementById('result');
const resultContent = document.getElementById('resultContent');
const elapsed = document.getElementById('elapsed');
const promptEl = document.getElementById('prompt');

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// File selection
dropzone.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => handleFile(e.target.files[0]);
  input.click();
});

dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Paste from clipboard
document.addEventListener('paste', e => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      handleFile(item.getAsFile());
      break;
    }
  }
});

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('⚠️ 请选择图片文件', true); return;
  }
  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewName.textContent = file.name || '剪贴板截图';
  preview.style.display = 'block';
  dropzone.style.display = 'none';
  analyzeBtn.disabled = false;
  clearBtn.style.display = 'inline-block';
  result.style.display = 'none';
  setStatus('');
}

clearBtn.addEventListener('click', () => {
  currentFile = null;
  preview.style.display = 'none';
  dropzone.style.display = 'block';
  analyzeBtn.disabled = true;
  clearBtn.style.display = 'none';
  result.style.display = 'none';
  setStatus('');
});

analyzeBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  analyzeBtn.disabled = true;
  setStatus('🤔 视觉模型分析中...');
  result.style.display = 'none';

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const prompt = promptEl.value.trim() || '请详细描述这张图片里的所有内容。';
    const t0 = Date.now();

    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, prompt, mime: currentFile.type })
      });
      const data = await resp.json();
      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      if (data.error) { setStatus('❌ ' + data.error, true); }
      else {
        resultContent.textContent = data.reply;
        elapsed.textContent = '(⏱️ ' + secs + 's)';
        result.style.display = 'block';
        setStatus('');
      }
    } catch (e) {
      setStatus('❌ 请求失败: ' + e.message, true);
    }
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(currentFile);
});

function setStatus(msg, isError) {
  status.textContent = msg;
  status.className = 'status' + (isError ? ' error' : '');
}
</script>
</body>
</html>`;

export async function startServer(port, apiBase, model) {
  // Dynamic import sharp
  const sharp = (await import("sharp")).default;

  const server = createServer(async (req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204); res.end(); return;
    }

    // API: analyze image
    if (req.method === "POST" && req.url === "/api/analyze") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const { image, prompt, mime } = JSON.parse(body);
          const buf = Buffer.from(image, "base64");

          // Compress if needed
          let finalBuf = buf;
          const meta = await sharp(buf).metadata();
          if (meta.width > 2048 || meta.height > 2048 || buf.length > 1.5 * 1024 * 1024) {
            finalBuf = await sharp(buf)
              .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();
          }

          const b64 = finalBuf.toString("base64");
          const mimeType = finalBuf !== buf ? "image/jpeg" : (mime || "image/png");
          const dataUrl = `data:${mimeType};base64,${b64}`;

          const messages = [{
            role: "user",
            content: [
              { type: "text", text: prompt || "请详细描述这张图片里的所有内容。" },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          }];

          const resp = await fetch(`${apiBase}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.2 }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `API 错误: ${errText.slice(0, 200)}` }));
            return;
          }

          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content || "(模型未返回内容)";

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ reply }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // Serve the HTML page
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
  });

  server.listen(port, () => {
    console.log(`\n  🌐 Web 界面已启动: http://localhost:${port}`);
    console.log(`     拖拽图片到网页 / Ctrl+V 粘贴截图 / 点击选择文件`);
    console.log(`     按 Ctrl+C 停止服务器\n`);
  });
}

// Direct run
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = parseInt(process.argv[2]) || 3456;
  const apiBase = process.env.LMSTUDIO_URL || "http://localhost:1234/v1";
  const model = process.env.VISION_MODEL || "google/gemma-4-e4b";
  startServer(port, apiBase, model);
}
