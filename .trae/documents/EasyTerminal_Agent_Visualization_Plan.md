# EasyTerminal 新阶段功能开发计划

## 1. 灵动岛消息支持手动关闭

### 需求分析
当前灵动岛（Dynamic Island）在弹出消息或选择项时，如果不进行交互，卡片会一直停留在屏幕上方，遮挡视线。需要提供一个手动的关闭/忽略机制。

### 实现方案
- **UI 改进**：在 `Island.tsx` 的卡片 UI 右上角添加一个关闭按钮（`X` 图标，悬停时变色）。
- **交互逻辑**：
  - 点击关闭按钮时，触发一个 `dismissCurrentPrompt` 函数。
  - 该函数会将当前的 prompt 从 React 的 `prompts` 状态数组中移除。
  - 如果移除后 `prompts` 数组为空，将 `islandState` 切换为 `hidden`。
  - 灵动岛窗口尺寸会自动缩回（触发 IPC `resize-island` 到主进程）。

---

## 2. 终端对话内容导出（MD / PDF）

### 需求分析
用户希望能够将终端中的对话内容导出为 Markdown 或 PDF 格式，以便做任务记录、归档或分享。

### 实现方案
- **触发入口**：在主窗口的终端 Tab 栏右侧，或者每个终端视图的右上角添加两个悬浮图标：【⬇️ MD】和【⬇️ PDF】。
- **内容提取**：
  - 通过 `xterm.js` 的 Buffer API (`terminalRef.current.terminal.buffer.active`) 遍历所有行。
  - 提取纯文本内容，过滤掉由于终端清屏产生的多余空行，组合成完整的字符串。
- **Markdown 导出**：
  - 将提取的文本组合成 Markdown 格式（可以包裹在 ` ```sh ... ``` ` 代码块中，或直接输出）。
  - 通过 Electron IPC 向主进程发送保存请求，调用 `dialog.showSaveDialog` 弹出系统保存弹窗，使用 Node.js 的 `fs.writeFile` 写入 `.md` 文件。
- **PDF 导出**：
  - **方案 B（Electron 原生，推荐）**：将提取的终端文本渲染为一段包含深色主题和终端字体（如 Fira Code）的 HTML 字符串，然后在主进程创建一个隐藏的 `BrowserWindow` 加载该 HTML，调用 `webContents.printToPDF()` 生成排版完美的 PDF，最后保存到本地。

---

## 3. 每个终端独立的像素风 Agent 可视化

### 需求分析
把每个终端背后执行任务的 Agent 具象化，设计成“像素风 + 科技风”的打工人形象。为了体现动态与活力，**每一个打开的终端都将拥有一个完全独立、专属的 Agent 形象**，让用户感觉到每个终端背后都有一个独一无二的 AI 助手在为其工作。

### 设计思路与实现方案
- **终端专属 Agent 分配机制（Independent Agent Identity）**：
  - 取消手动选择角色的繁琐步骤，系统内置一个“Agent 形象池”（包含多种不同颜色、外观的像素机器人/打工人/赛博宠物等）。
  - 当用户**新建一个终端（Tab）时，系统会自动为其随机或顺序分配一个专属的 Agent 形象**。
  - 这个专属形象与终端的生命周期绑定，即使用户切换 Tab，也能通过 Agent 的不同外貌快速辨认出当前是哪个终端在工作。

- **呈现方式（终端内嵌悬浮窗）**：
  - 在每个 `TerminalView` 的 **右下角或右上角** 放置一个悬浮面板（Agent Widget）。
  - 面板边框设计成**复古 CRT 显示器**或**赛博朋克风**的金属边框，伴随 CSS 扫描线（Scanline）特效。

- **状态感知逻辑（State Machine）**：
  通过在 `TerminalView.tsx` 中监听 `xterm.js` 的 `onData` 和文本流，分析当前任务状态，不同专属形象在相同状态下有专属的像素动作表现：
  1. **Idle（待机）**：终端超过 3 秒没有新输出。小人动作：喝咖啡 / 玩手机 / 发呆。
  2. **Working（搬砖）**：终端正在高频输出日志。小人动作：疯狂敲击键盘 / 屏幕闪烁。
  3. **Thinking（卡壳）**：发送了命令，但终端暂停输出超过 2 秒。小人动作：托腮 / 头顶冒出转动的齿轮或问号。
  4. **Waiting（等待指示）**：触发了灵动岛的选择题。小人动作：举起一个带有问号的像素牌子。
  5. **Error（报错）**：检测到终端输出包含 `Error:`、`Exception` 或 `Failed`。小人动作：抱头痛哭 / 身上冒烟。

- **技术栈与实现步骤**：
  - 新建 `AgentVisualizer.tsx` 组件，支持传入 `agentId`（决定外观）和 `state`（工作状态）。
  - 在 assets 中准备或用 CSS/SVG 实现多种独立形象在 5 种状态下的像素动画（使用 sprite sheet 或 GIF）。
  - 在 `App.tsx` 的会话状态中为每个 Session 增加 `agentId` 字段。
  - 在 `TerminalView.tsx` 引入状态机，通过防抖（debounce）实时分析终端文本，更新状态并传递给 `AgentVisualizer`。