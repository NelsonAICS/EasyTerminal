# EasyTerminal 架构设计与开发计划 (Plan)

## 1. 项目概述 (Project Summary)

**目标**：开发一款专为 AI Agent CLI 设计的交互友好型终端（类似 Warp/Wave Terminal），将传统的终端交互升级为类似聊天对话框的形式。
**核心特性**：

* **混合终端界面**：聊天式输入体验，支持文本编辑、图片直接渲染和 Markdown 预览。

* **智能交互**：地址快速查询、模糊查找（Fuzzy Search）、最近地址提示、常用工具一键调用。

* **终端接管与迁移**：底层基于 `tmux`，支持在普通终端与 EasyTerminal 之间无缝接管和迁移会话，随时查看所有运行中的终端。

* **全局灵动岛**：系统级全局悬浮窗，用于接收 Agent 的运行状态通知、进行操作确认（如“是否允许执行 rm -rf”），避免频繁切屏。

* **内联友好编辑**：拦截类似于 `vim` 的文本编辑命令，直接展开用户友好的富文本/代码编辑器（如 Monaco Editor）。

* **高扩展性**：为未来原生集成终端大模型 Agent 预留通信与插件接口。

## 2. 现状分析 (Current State Analysis)

* 当前目录 (`/Users/nelson/Desktop/APP/EasyTerminal_en`) 为空目录。

* **架构确认**：用户确认采用 **Electron + React** 组合实现精美 UI，使用 **tmux** 架构实现无缝会话迁移，并使用 **系统级全局悬浮窗** 实现灵动岛交互。

## 3. 技术栈架构选型 (Architecture Design)

* **桌面框架**：Electron (提供跨平台系统级能力、全局悬浮窗、IPC 通信)。

* **前端视图**：React + Vite + TypeScript + TailwindCSS + Shadcn UI (构建精美的聊天式界面和动画)。

* **终端底层引擎**：`node-pty` 生成伪终端，结合 `xterm.js` 处理纯终端输出流。

* **会话持久化层**：`tmux`。所有终端进程通过 node-pty 启动为 tmux session，从而支持外部普通终端 `tmux attach` 随时接管。

* **内嵌代码编辑器**：`@monaco-editor/react` (提供舒适的“vim替代”编辑体验)。

## 4. 模块与实现方案 (Proposed Changes)

### 模块一：UI 布局与聊天式交互 (Hybrid Chat UI)

* **视图结构**：分为顶部会话标签页、中间滚动消息流 (Block-based Output)、底部智能输入框 (Chat Input)。

* **渲染策略**：拦截特定命令输出。当检测到普通 CLI 输出时，渲染为小型只读的 `xterm.js` 实例或普通文本；当检测到 Markdown 或图片时，渲染为 React 原生组件。

### 模块二：路径补全与模糊搜索 (Smart Autocomplete)

* **输入拦截**：在底部输入框输入命令（如 `cd `  或 `./`）时，通过 Node.js 的 `fs` 和 `fast-glob` 读取当前路径下的文件，弹出类似 IDE 的补全菜单。

* **最近路径**：记录用户的 `cd` 历史，支持快捷键弹出菜单快速跳转。

### 模块三：内联文本编辑 (Inline Editor)

* **命令劫持**：当用户输入 `vim <file>` 或 `nano <file>` 时，拦截该命令（或通过 `.bashrc`/`.zshrc` alias 重写），读取文件内容，在当前消息流中展开一个 Monaco Editor 块。

* **保存与关闭**：用户在图形界面修改完成后点击“保存”，通过 Node API 直接覆写文件，并在界面中关闭该块。

### 模块四：系统级灵动岛 (Global Dynamic Island)

* **多窗口管理**：Electron 主进程中创建一个始终置顶 (`alwaysOnTop`)、透明无边框 (`transparent`, `frame: false`) 的小窗口。

* **IPC 通信**：Agent 在执行高危操作或需要用户决策时，发送指令到主进程，主进程唤起灵动岛并展示选项（如“允许”、“拒绝”、“跳过”），并将结果返回给 Agent。

### 模块五：tmux 会话管理 (Session Management)

* **会话创建**：每次新建 Tab 时，背后执行 `tmux new-session -s easy_term_<id>`。

* **无缝迁移**：提供界面按钮“查看所有终端”，列出 `tmux ls` 的结果；提供快捷命令指导用户在普通终端执行 `tmux attach -t <id>` 来无缝迁移。

### 模块六：Agent 扩展接口预留 (Agent API)

* **本地服务**：内置一个轻量级 WebSocket Server 或基于标准输入输出的 JSON-RPC 协议，让外部 AI 脚本能够直接发送“富文本卡片”、“灵动岛确认请求”等结构化消息给终端 UI。

## 5. 执行步骤 (Implementation Steps)

1. **第一阶段：项目初始化**

   * 使用 Vite (Electron-Vite 模板) 初始化 React + TypeScript 项目。

   * 配置 TailwindCSS 和基础 UI 组件库 (Shadcn UI)。

   * 安装核心依赖：`node-pty`, `xterm`, `@monaco-editor/react`, `fzf` 等。
2. **第二阶段：核心终端引擎与 tmux 接入**

   * 在 Electron 主进程中集成 `node-pty`。

   * 实现前端 React 界面与主进程的 PTY IPC 通信。

   * 包装 `tmux` 命令，确保每次新建终端都运行在 tmux session 中。
3. **第三阶段：混合式聊天界面开发**

   * 实现底部富文本/代码输入框。

   * 实现命令执行后的 Block 历史记录流（包括 xterm 块、Markdown 块、图片块）。
4. **第四阶段：智能补全与内联编辑**

   * 监听输入框变化，调用 Node API 实现目录和历史路径模糊匹配下拉菜单。

   * 拦截文本编辑命令，实现内联 Monaco Editor 唤起与文件存取。
5. **第五阶段：系统级灵动岛与 Agent 接口**

   * 创建第二个 Electron 窗口作为全局灵动岛。

   * 建立 IPC 桥梁，演示如何从终端通过命令（如 `easy-notify "Require Confirmation"`）触发灵动岛交互，并将点击结果返回至终端。
6. **第六阶段：体验优化与打磨**

   * 完善主题、快捷键（如一键隐藏/唤起主窗口）。

   * 完善错误处理与性能优化，确保应用反应灵敏。

## 6. 假设与决策 (Assumptions & Decisions)

* **假设 1**：用户的系统 (macOS) 已经安装了 `tmux`。如果没有，应用可能会在初始化时提示安装或自动降级为无 tmux 的独立 pty 模式。

* **决策 1**：由于真正的 vim 运行在 pty 内部较难与 React UI 完美融合，我们将优先采用“命令别名拦截”策略（例如自动注入环境变量或 alias 将 vim 映射为向 EasyTerminal 发送 IPC 打开图形化编辑器的指令）。

* **决策 2**：灵动岛窗口为系统级原生窗口，不受限于主终端应用是否最小化。

## 7. 验证标准 (Verification Steps)

1. 项目能成功编译启动，显示聊天式的输入界面。
2. 输入 `ls` 等普通命令能正确执行并显示结果（通过 pty）。
3. 可以在输入框进行路径的模糊补全提示。
4. 创建会话后，能在 macOS 系统原生 Terminal 中通过 `tmux attach` 接管该会话。
5. 触发模拟的 Agent 确认事件时，屏幕上方能弹出“灵动岛”悬浮窗，点击后能将反馈结果送回终端界面。

