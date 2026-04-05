# EasyTerminal

<div align="center">
  <h3>✨ 一款为 AI Agent 时代量身定制的次世代智能终端 ✨</h3>
  <p>基于 Electron + React + TailwindCSS + xterm.js 构建的现代化 TUI (Text User Interface) 代理工具。</p>
</div>

---

## 🌟 核心特性 (Features)

EasyTerminal 打破了传统命令行的僵硬交互，以现代化的 GUI 理念重塑终端体验：

- **🖥️ 现代化的新拟态 UI (Neo-Glassmorphism)**
  - 沉浸式的磨砂玻璃质感、悬浮阴影与流体动画，告别枯燥的黑框。
  - 多会话（Tab）侧边栏管理，支持快捷键新建、双击内联重命名与悬浮安全关闭。
  - 支持多套预设主题（如 Obsidian、GitHub Dark 等）无缝切换。

- **🏝️ 原生级灵动岛 (Dynamic Island) 通知系统**
  - **零侵入式 TUI 劫持**：底层采用 `xterm.js` 的 buffer 轮询方案，实时监听终端输出。
  - 自动识别类似 Claude Code 或 Inquirer.js 发出的交互式选择菜单（如 `> 1. Yes`、`2. No`）。
  - 在屏幕上方以苹果原生级别的“灵动岛”悬浮窗形式呈现选项卡片。
  - 用户只需点击灵动岛按钮，后台会自动向 PTY 注入精准的 ANSI 键盘序列（如 `\x1b[B\r` 或 `1\r`），完美代理复杂的命令行交互。
  - 支持复杂的多行选项描述提取、防抖处理以及僵尸选项（Zombie Prompts）自动过滤。

- **💬 类 Chat 的沉浸式多行输入框**
  - 将传统的末行输入符转变为常驻底部的自适应多行文本框（Textarea）。
  - 支持快捷发送（Enter）与换行（Shift + Enter）。
  - 在空状态下，完美映射终端原生按键（上下箭头浏览历史、退格键、回车键等）。

- **📁 内置资源管理器与编辑器**
  - 右侧集成了可视化文件树（File Tree），支持展开目录、查看代码文件内容以及图片预览。
  - 深度集成了 Monaco Editor，可以在终端旁直接浏览和编辑脚本文件。
  - 快捷工具栏（Quick Tools）支持一键执行高频预设命令（如 `ls -la`、`git status` 等）。

---

## 🛠️ 技术栈 (Tech Stack)

- **框架**: [Electron](https://www.electronjs.org/) + [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **语言**: TypeScript
- **样式**: Tailwind CSS + `lucide-react` 图标库
- **终端底层**: `node-pty` (伪终端进程管理) + `xterm.js` (WebGL 加速渲染)
- **代码编辑器**: `@monaco-editor/react`

---

## ⚙️ 环境要求 (Prerequisites)

- **Node.js**: `v18.0.0` 或更高版本。
- **操作系统**: 推荐在 macOS 环境下运行以获得最佳的透明窗口与玻璃质感体验。
- **编译工具**: macOS 需要安装 Xcode Command Line Tools（为了编译 `node-pty` 底层 C++ 模块）。
  ```bash
  xcode-select --install
  ```

---

## 🚀 安装与部署 (Installation)

1. **克隆项目到本地**
   ```bash
   git clone <repository-url>
   cd EasyTerminal_en
   ```

2. **安装依赖包**
   *注意：由于包含 `node-pty` 原生模块，安装过程可能会触发 C++ 编译，请耐心等待。*
   ```bash
   npm install
   ```
   > **权限修复提示**：
   > `package.json` 中已配置 `postinstall` 脚本 (`npm rebuild node-pty || true`)。如果遇到 macOS 下 `posix_spawnp failed` 报错，说明 `node-pty` 的 `spawn-helper` 丢失了可执行权限，该脚本会自动尝试修复。

3. **启动开发环境 (Development)**
   ```bash
   npm run dev
   ```
   *应用启动后，按 `Cmd+Option+I` (Mac) 可打开 Electron 开发者工具进行调试。*

4. **打包构建 (Production Build)**
   将应用打包为当前系统架构的独立执行文件：
   ```bash
   npm run build
   ```
   打包后的文件将输出到 `dist` 或 `release` 相关目录中。

---

## 📖 使用指南 (Usage)

- **与 Agent 交互**：在底部输入框输入命令（如启动 `claude`）。当 Agent 请求授权或让你进行单选决策时，无需在终端里按上下键，直接留意屏幕上方的**灵动岛弹窗**并点击按钮即可。
- **多会话管理**：点击左侧栏的 `+` 号新建终端 Tab。双击图标下方的文字可以进行重命名。将鼠标悬停在图标上，右上角会出现红色的 `X` 按钮用于安全关闭进程。
- **快捷指令**：在底部输入框上方有一排 `Quick Tools`，点击即可一键将预设命令发送到当前激活的终端中。

---

## 🤝 参与贡献 (Contributing)

如果您有任何优化建议（特别是针对不同类型 CLI 工具的 TUI 选项正则提取规则），欢迎提交 Issue 或 Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送至分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

---

## 📄 许可证 (License)

本项目采用 MIT 许可证，详情请参阅项目中的 LICENSE 文件。