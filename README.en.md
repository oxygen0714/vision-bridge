<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/GPU-CUDA%20%7C%20Vulkan-orange" alt="GPU">
</p>

<h1 align="center">👁️ Vision Bridge</h1>
<p align="center"><strong>Give Your Local LLM the Gift of Sight</strong></p>
<p align="center">Capture → Compress → Vision Model → Text → Any LLM</p>

---

## 📖 Overview

**Vision Bridge** bridges the gap between text-only LLMs and the visual world. It captures your screen (or any image), sends it to a locally-running vision-language model in **LM Studio**, and returns a detailed text description — effectively giving "eyes" to any AI that can read text.

> 🎯 **Use case:** You're chatting with DeepSeek, Claude, GPT, or any text-only model. You want it to "see" your screen, a chart, a UI mockup, or a photo. Vision Bridge makes that possible — **100% local, 100% free.**

## 🏗️ Architecture

```
┌──────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────┐
│  Screen   │ ──▶ │  Vision Bridge   │ ──▶ │  LM Studio       │ ──▶ │  Your    │
│  / Image  │     │  (Node.js CLI)   │     │  (Vision Model)  │     │  LLM     │
└──────────┘     │                  │     │                  │     │          │
                 │  • Screenshot    │     │  Gemma-4 /       │     │ DeepSeek │
                 │  • Compress      │     │  Qwen2.5-VL /    │     │ Claude   │
                 │  • Base64        │     │  Llama 4 ...     │     │ GPT ...  │
                 │  • API call      │     │                  │     │          │
                 └──────────────────┘     └─────────────────┘     └──────────┘
                     ▲  Vision Bridge       ▲  Text Description       ▲
                     │  handles the         │  "The screen shows     │  LLM reads
                     │  image pipeline      │   a code editor..."    │  and responds
```

## ✨ Features

- 📸 **One-click Screenshot** — Captures your screen and describes it in natural language
- 🖼️ **Image File Analysis** — Point it at any image file (PNG, JPG, WebP, BMP, GIF)
- 🔁 **Watch Mode** — Continuous monitoring: takes screenshots every N seconds
- 📐 **Auto-compression** — Large images are automatically resized/compressed before sending
- 🌐 **OpenAI-compatible API** — Works with any LM Studio model (Gemma-4, Qwen2.5-VL, Llama 4...)
- 🔒 **100% Local & Private** — All processing happens on your machine, nothing leaves it
- 🎨 **Dark mode friendly** — Clean CLI output that looks great anywhere

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **LM Studio** | ≥ 0.3.x | [Download](https://lmstudio.ai) |
| **Node.js** | ≥ 18 | [Download](https://nodejs.org) |
| **A Vision Model** | — | Gemma-4, Qwen2.5-VL, Llama 4... |
| **GPU (recommended)** | — | NVIDIA RTX 2060+ / AMD / Apple Silicon |

### 1. Download a Vision Model in LM Studio

Open LM Studio → Search → Download any vision-capable model:

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| **Gemma-4-E4B-it** | ~6GB | ⭐⭐⭐ | ⚡⚡⚡ |
| **Qwen2.5-VL-7B** | ~5GB | ⭐⭐⭐⭐ | ⚡⚡ |
| **Llama 4 Scout** | ~12GB | ⭐⭐⭐⭐⭐ | ⚡ |

### 2. Start the LM Studio Server

```bash
# Via CLI (recommended)
lms server start --port 1234

# Or via GUI
# LM Studio → Developer tab → Local Server → Start
```

### 3. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/vision-bridge.git
cd vision-bridge
npm install
```

### 4. Run!

```bash
# Take a screenshot and describe it
node vision.mjs screenshot

# Ask a specific question about what's on screen
node vision.mjs screenshot "What error message is showing?"

# Analyze an image file
node vision.mjs file ./photo.jpg

# Continuous observation (every 10 seconds)
node vision.mjs watch 10 "What changed on the screen?"
```

## 📚 Usage

### Commands

```
screenshot [prompt]    Capture screen and analyze
file <path> [prompt]   Analyze an image file
watch [secs] [prompt]  Continuous screen monitoring
check                  Test API connection
```

### Options

```
--model <name>    Override model (default: google/gemma-4-e4b)
--url  <url>      Override API URL (default: http://localhost:1234/v1)
```

### Environment Variables

```bash
export VISION_MODEL="qwen2.5-vl-7b-instruct"
export LMSTUDIO_URL="http://localhost:8080/v1"
```

### Practical Examples

```bash
# Programming: understand error messages
node vision.mjs screenshot "What is the error in this IDE?"

# Design: get feedback on UI
node vision.mjs file ./mockup.png "What could be improved in this UI?"

# Research: understand charts
node vision.mjs file ./chart.png "Summarize the trends in this chart"

# Productivity: monitor a dashboard
node vision.mjs watch 30 "Has the deploy status changed?"

# Education: understand diagrams
node vision.mjs file ./diagram.jpg "Explain this architecture diagram"
```

### Integration with Other LLMs

The real power comes from piping Vision Bridge output into any LLM:

```bash
# With Claude Code
! node /c/Users/1/vision-bridge/vision.mjs screenshot

# With DeepSeek
node vision.mjs screenshot | deepseek-cli

# In any shell script
DESCRIPTION=$(node vision.mjs screenshot "Describe the current state")
echo "$DESCRIPTION" | your-llm-tool
```

## 🔧 Configuration

```javascript
// vision.mjs — default config
const CONFIG = {
  apiBase: "http://localhost:1234/v1",
  model: "google/gemma-4-e4b",
  maxTokens: 2048,
  temperature: 0.2,
  maxImageDim: 2048,    // resize if larger
  compressOverMB: 1.5,  // compress to JPEG if larger
};
```

## 🧠 How It Works

1. **Capture** — PowerShell (Windows) or `screenshot-desktop` (macOS/Linux) captures the screen
2. **Compress** — Images > 1.5MB or > 2048px are auto-compressed via `sharp`
3. **Encode** — Image is converted to base64 data URL
4. **Send** — OpenAI-compatible `POST /v1/chat/completions` with `image_url` content
5. **Receive** — Vision model returns a natural language description
6. **Relay** — Description is printed to stdout, ready for any downstream LLM

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| [`sharp`](https://www.npmjs.com/package/sharp) | Image compression & resizing |
| Node.js built-ins | `fetch`, `fs`, `path`, `child_process` |

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `❌ API not connected` | Run `lms server start --port 1234` |
| `❌ Model not found` | Check available models with `lms ps` |
| `Screenshot fails` | Run `powershell -File screenshot.ps1` directly |
| `Response is empty` | Increase `maxTokens` (Gemma-4 has thinking tokens) |
| `Slow inference` | Use a smaller model or enable GPU offloading in LM Studio |

## 🤝 Contributing

Pull requests, issues, and suggestions are welcome! This is a simple tool with room for improvement:

- [ ] Webcam / camera support
- [ ] Region selection for screenshots
- [ ] Streaming mode for real-time vision
- [ ] MCP server integration
- [ ] Docker support
- [ ] Python version

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <sub>Built with ❤️ for the local AI community</sub>
</p>
