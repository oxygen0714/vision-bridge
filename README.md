<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/GPU-CUDA%20%7C%20Vulkan-orange" alt="GPU">
</p>

<h1 align="center">👁️ Vision Bridge</h1>
<p align="center">
  <strong>给你的本地 LLM 装上眼睛 — 免费、本地、即插即用</strong><br>
  <sub>English version: <a href="README.en.md">README.en.md</a></sub>
</p>

---

## 🎯 一句话说清楚

> **Vision Bridge 让不会看图的 LLM（DeepSeek / Claude / GPT / 本地模型）能够"看见"你的屏幕。**

它截屏 → 发给 LM Studio 里的视觉模型 → 把画面翻译成文字 → 喂给你的 LLM。

## 🏗️ 原理

```
你的屏幕/图片  →  Vision Bridge   →  LM Studio 视觉模型  →  文字描述  →  任意 LLM
                 (截图+压缩+编码)    (Gemma-4/Qwen2.5-VL)               (理解 & 回复)
```

| 环节 | 做什么 |
|------|--------|
| ① 截图 | PowerShell / screenshot-desktop 捕获屏幕 |
| ② 压缩 | 大图自动缩小 + 转 JPEG（2MB → 300KB） |
| ③ 编码 | 转 base64，走 OpenAI 兼容 API |
| ④ 理解 | 本地视觉模型看图说话 |
| ⑤ 使用 | 文字描述喂给任何 LLM |

## ✨ 特性

- 📸 **一键截屏分析** — 截图后自动描述屏幕内容
- 🖼️ **任意图片分析** — 支持 PNG / JPG / WebP / BMP / GIF
- 🔁 **持续观察模式** — 每 N 秒自动截屏，持续监控
- 📐 **智能压缩** — 大图自动缩放到 2048px，压缩到 JPEG
- 🔒 **100% 本地运行** — 数据不出你的电脑
- 🎨 **简洁 CLI** — 一条命令搞定

## 🚀 快速开始

### 你需要

- [LM Studio](https://lmstudio.ai) ≥ 0.3.x
- [Node.js](https://nodejs.org) ≥ 18
- 一个视觉模型（推荐 Gemma-4-E4B-it 或 Qwen2.5-VL-7B）
- NVIDIA GPU 推荐（RTX 2060+）

### 1. 在 LM Studio 下载视觉模型

| 模型 | 大小 | 效果 | 速度 |
|------|------|------|------|
| **Gemma-4-E4B-it** | ~6GB | ⭐⭐⭐ | ⚡⚡⚡ |
| **Qwen2.5-VL-7B** | ~5GB | ⭐⭐⭐⭐ | ⚡⚡ |
| **Llama 4 Scout** | ~12GB | ⭐⭐⭐⭐⭐ | ⚡ |

### 2. 启动 LM Studio 服务

```bash
lms server start --port 1234
```

### 3. 安装 Vision Bridge

```bash
git clone https://github.com/YOUR_USERNAME/vision-bridge.git
cd vision-bridge
npm install
```

### 4. 开始使用

```bash
# 截屏
node vision.mjs screenshot

# 带问题截屏
node vision.mjs screenshot "这页PPT有什么问题？"

# 分析图片
node vision.mjs file ./photo.jpg

# 持续观察（每10秒）
node vision.mjs watch 10 "屏幕有什么变化？"
```

## 📖 全部命令

```
screenshot [问题]    截屏并分析
file <路径> [问题]   分析指定图片
watch [秒] [问题]    持续监控模式
check                检查 API 连接
```

### 选项

```
--model <模型名>    指定模型（默认 google/gemma-4-e4b）
--url  <地址>       指定 API 地址（默认 http://localhost:1234/v1）
```

### 环境变量

```bash
export VISION_MODEL="qwen2.5-vl-7b-instruct"
export LMSTUDIO_URL="http://localhost:8080/v1"
```

## 💡 实战场景

```bash
# 编程：看不懂的报错
node vision.mjs screenshot "IDE 里的报错是什么意思？"

# 设计：UI 走查
node vision.mjs file ./mockup.png "这个 UI 有什么可以改进的？"

# 科研：论文图表理解
node vision.mjs file ./chart.png "总结这张图的趋势"

# 运维：监控大盘
node vision.mjs watch 30 "部署状态变了吗？"

# 学习：理解示意图
node vision.mjs file ./diagram.jpg "解释这个架构图"
```

## 🔗 与 Claude Code 配合

在对话中直接输入：

```
! node /c/Users/1/vision-bridge/vision.mjs screenshot
```

Claude 会读到视觉模型的描述，间接获得视觉能力。

## 📦 依赖

| 包 | 用途 |
|----|------|
| [`sharp`](https://www.npmjs.com/package/sharp) | 图片压缩与缩放 |

核心功能使用 Node.js 内置模块（`fetch`, `fs`, `path`, `child_process`），无需额外网络依赖。

## 🐛 常见问题

| 问题 | 解决 |
|------|------|
| `❌ API 无法连接` | 运行 `lms server start --port 1234` |
| `❌ 找不到模型` | 用 `lms ps` 查看已加载的模型 |
| `截图失败` | 确保 PowerShell 执行策略已放行 |
| `回复为空` | 增大 `maxTokens`（推理模型需要更多 token） |
| `速度慢` | 换更小的模型，或在 LM Studio 中启用 GPU |

## 🤝 参与贡献

欢迎提 Issue 和 PR！后续可以做的：

- [ ] 摄像头实时画面支持
- [ ] 截图区域选择
- [ ] 实时流式视觉
- [ ] MCP Server 集成
- [ ] Docker 镜像
- [ ] Python 版本

## 📄 开源协议

MIT — 详见 [LICENSE](LICENSE)

---

<p align="center">
  <sub>为本地 AI 社区 ❤️ 而生</sub>
</p>
