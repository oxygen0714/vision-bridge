<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/GPU-CUDA%20%7C%20Vulkan-orange" alt="GPU">
</p>

<h1 align="center">👁️ 让你的 Claude Code 纯文本模型长出「眼睛」</h1>
<p align="center">
  <strong>截图 → 本地视觉模型 → 文字描述 → 喂给 Claude Code / DeepSeek / 任意纯文本 LLM</strong><br>
  <sub>100% 本地运行 · 零成本 · 即插即用</sub>
</p>

---

## 🎯 一句话说清楚

> Claude Code、DeepSeek、GPT 等纯文本模型**本来不会看图**。这个工具截一张屏，发给 LM Studio 里的本地视觉模型（Gemma-4 / Qwen2.5-VL），让它把画面翻译成文字，再喂给你的 LLM——**等于给纯文本模型装上了眼睛。**

```
你按 Win+Shift+S 框选 → Vision Bridge 从剪贴板读取 → 本地视觉模型看图说话 → Claude Code 读到描述
```

## 🏗️ 原理

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Win+Shift+S │ ──▶ │  Vision Bridge   │ ──▶ │  LM Studio       │ ──▶ │  Claude Code │
│  框选截屏     │     │  剪贴板读取+压缩  │     │  Gemma-4 视觉模型 │     │  获得视觉能力 │
└──────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
```

| 环节 | 做什么 |
|------|--------|
| ① 你截图 | `Win+Shift+S` 框选任意区域，图片进剪贴板 |
| ② 读取 | Vision Bridge 从剪贴板读取，自动压缩大图 |
| ③ 看图 | 本地视觉模型（Gemma-4 等）分析画面 |
| ④ 说话 | 返回文字描述，Claude Code 读到后就能"看见" |

## ✨ 为什么用这个

| 痛点 | 解决 |
|------|------|
| Claude Code 不会看图 | ✅ 视觉模型代劳，返回文字描述 |
| 云端 API 要钱 | ✅ 本地 LM Studio，完全免费 |
| 数据隐私 | ✅ 所有处理都在你的电脑上 |
| 全屏截图有命令行干扰 | ✅ 剪贴板模式，想截哪里截哪里 |
| 模型选择困难 | ✅ 支持 Gemma-4 / Qwen2.5-VL / Llama 4… |

## 🚀 快速开始

### 你需要

- [LM Studio](https://lmstudio.ai) ≥ 0.3.x
- [Node.js](https://nodejs.org) ≥ 18
- 一个视觉模型（推荐 Gemma-4-E4B-it，~6GB）
- NVIDIA GPU 推荐

### 1. 下载视觉模型

LM Studio → 搜索 → 下载：

| 模型 | 大小 | 效果 | 速度 |
|------|------|------|------|
| **Gemma-4-E4B-it** | ~6GB | ⭐⭐⭐ | ⚡⚡⚡ |
| **Qwen2.5-VL-7B** | ~5GB | ⭐⭐⭐⭐ | ⚡⚡ |

### 2. 启动服务

```bash
lms server start --port 1234
```

### 3. 安装

```bash
git clone https://github.com/oxygen0714/vision-bridge.git
cd vision-bridge
npm install
```

### 4. 使用（Claude Code 中）

```
① 按 Win+Shift+S → 框选你想让 Claude 看的区域
② ! node /c/Users/1/vision-bridge/vision.mjs clipboard
③ Claude 就能"看见"了
```

## 📖 全部命令

```
⭐ clipboard [问题]     从剪贴板读取 Win+Shift+S 的截图 (推荐!)
   screenshot [问题]    全屏截图
     --minimize          截图前最小化终端
     --delay N           延迟 N 秒截图
   file <路径> [问题]    分析本地图片
   watch [秒] [问题]     持续监控
   serve [端口]          启动 Web 拖拽界面
   check                 检查 API 连接
```

## 💡 实战场景

```bash
# 代码报错，让 Claude 帮你看
Win+Shift+S 框选报错区域
! node /c/Users/1/vision-bridge/vision.mjs clipboard "这个报错怎么解决？"

# UI 设计走查
Win+Shift+S 框选界面
! node /c/Users/1/vision-bridge/vision.mjs clipboard "这个 UI 有什么可以改进的？"

# 论文图表理解
! node /c/Users/1/vision-bridge/vision.mjs file ./chart.png "总结这张图的趋势"

# 监控部署状态
! node /c/Users/1/vision-bridge/vision.mjs watch 30 "部署状态变了吗？"
```

## 🐛 常见问题

| 问题 | 解决 |
|------|------|
| `❌ API 无法连接` | `lms server start --port 1234` |
| `剪贴板为空` | 先 `Win+Shift+S` 截图，再运行命令 |
| `回复为空` | 增大 `maxTokens`（Gemma-4 有思考 token） |
| `速度慢` | 换更小的模型，或启用 GPU |

## 📄 开源协议

MIT — 详见 [LICENSE](LICENSE)

---

<p align="center">
  <sub>为本地 AI 社区 ❤️ 而生 —— 让纯文本 LLM 也能看见世界</sub>
</p>
