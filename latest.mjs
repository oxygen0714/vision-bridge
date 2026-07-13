// latest.mjs - 自动分析 Screenshots 文件夹中最新的截图
import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const folder = process.argv[2] || "C:/Users/1/Pictures/Screenshots";
const question = process.argv[3] || "详细描述截图里显示了什么？包括所有菜单、按钮、弹窗文字、代码内容、红色波浪线和错误信息";

// 找最新文件
const files = readdirSync(folder)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .map(f => ({ name: f, time: statSync(join(folder, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

if (!files.length) { console.log("❌ 没有找到截图"); process.exit(1); }

const latest = join(folder, files[0].name);
console.log(`📸 最新截图: ${files[0].name} (${new Date(files[0].time).toLocaleTimeString()})`);

// 调用 vision.mjs
execSync(`node "${__dirname}/vision.mjs" file "${latest}" "${question}"`, {
    stdio: 'inherit',
    cwd: __dirname
});
