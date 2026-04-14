export type ManualCategoryId = 'easyterminal' | 'linux' | 'node' | 'npm' | 'agent'
export type ManualFilterId = 'all' | ManualCategoryId
export type ManualEntryType = 'shortcut' | 'command'
export type ManualVerification = 'local' | 'general'

export interface ManualCategory {
  id: ManualCategoryId
  label: string
  description: string
}

export interface ManualEntry {
  id: string
  type: ManualEntryType
  category: ManualCategoryId
  title: string
  summary: string
  purpose: string
  syntax: string
  example?: string
  actionCommand?: string
  pinLabel?: string
  note?: string
  tags: string[]
  verification: ManualVerification
  dangerous?: boolean
}

export interface ManualCommandSuggestion {
  entryId: string
  title: string
  command: string
  hint: string
}

export const COMMAND_MANUAL_CATEGORIES: ManualCategory[] = [
  {
    id: 'easyterminal',
    label: 'EasyTerminal',
    description: '应用快捷操作、内联编辑和悬浮交互',
  },
  {
    id: 'linux',
    label: 'Linux',
    description: '目录、文件、搜索和权限等常用终端命令',
  },
  {
    id: 'node',
    label: 'Node',
    description: 'Node.js 运行、调试和 watch 模式',
  },
  {
    id: 'npm',
    label: 'npm',
    description: '依赖安装、脚本运行和项目构建',
  },
  {
    id: 'agent',
    label: 'Agent CLI',
    description: 'Claude Code 与 Codex 的常用调用方式',
  },
]

export const COMMAND_MANUAL_ENTRIES: ManualEntry[] = [
  {
    id: 'et-open-manual',
    type: 'shortcut',
    category: 'easyterminal',
    title: '打开命令手册',
    summary: '随时呼出这份快捷手册，查命令、看格式、直接执行。',
    purpose: '快速打开或关闭手册面板，不必在终端里来回翻 README 或网页文档。',
    syntax: 'F1  或  Cmd/Ctrl + /',
    note: '适合开发中途忘记命令格式时即时查阅。',
    tags: ['help', 'manual', 'shortcut', '快捷键', '命令手册'],
    verification: 'general',
  },
  {
    id: 'et-send-command',
    type: 'shortcut',
    category: 'easyterminal',
    title: '发送当前输入',
    summary: '把输入框里的命令或提示词发给当前终端会话。',
    purpose: '在底部输入框输入完成后，用单键发送到当前激活的 Terminal Tab。',
    syntax: 'Enter',
    note: '如果输入框为空，会发送一个原生回车给终端，适合交互式 CLI。',
    tags: ['enter', 'send', 'terminal', '输入'],
    verification: 'general',
  },
  {
    id: 'et-new-line',
    type: 'shortcut',
    category: 'easyterminal',
    title: '在输入框内换行',
    summary: '编写多行 Prompt、Shell 片段或备注时使用。',
    purpose: '避免误发送，尤其适合给 Agent 写多行任务描述。',
    syntax: 'Shift + Enter',
    tags: ['multiline', 'prompt', '换行'],
    verification: 'general',
  },
  {
    id: 'et-autocomplete',
    type: 'shortcut',
    category: 'easyterminal',
    title: '补全第一条建议',
    summary: '对路径补全或模糊命令建议进行快速确认。',
    purpose: '输入框上方出现候选项时，直接补全当前最匹配的一条。',
    syntax: 'Tab',
    note: '路径命令会走路径补全，普通命令会走模糊搜索。',
    tags: ['tab', 'autocomplete', '补全', 'suggestions'],
    verification: 'general',
  },
  {
    id: 'et-history-keys',
    type: 'shortcut',
    category: 'easyterminal',
    title: '把方向键透传给终端',
    summary: '在输入框为空时，方向键会直接发送给终端。',
    purpose: '用于浏览 shell 历史、控制交互式 CLI 列表或移动光标。',
    syntax: '输入框为空时：↑ ↓ ← →',
    note: '这对 Inquirer、Claude Code 等交互式界面尤其有用。',
    tags: ['arrow keys', 'history', 'tui', '交互'],
    verification: 'general',
  },
  {
    id: 'et-vim-inline',
    type: 'command',
    category: 'easyterminal',
    title: '拦截 vim 并打开内联编辑器',
    summary: '把 `vim` 编辑动作转成应用内编辑体验。',
    purpose: '避免在终端里直接进入 Vim，而是在右侧打开 Monaco 编辑器进行修改。',
    syntax: 'vim <文件路径>',
    example: 'vim src/App.tsx',
    actionCommand: 'vim src/App.tsx',
    pinLabel: 'vim file',
    note: '适合快速编辑单个文件，保存后仍留在当前终端工作流里。',
    tags: ['vim', 'editor', 'monaco', '文件编辑'],
    verification: 'general',
  },
  {
    id: 'et-notify',
    type: 'command',
    category: 'easyterminal',
    title: '触发灵动岛通知',
    summary: '手动发起一个顶部悬浮通知，适合调试交互流程。',
    purpose: '验证系统级悬浮岛样式、文案和交互是否正常。',
    syntax: 'notify <消息内容>',
    example: 'notify 是否确认继续部署？',
    actionCommand: 'notify 是否确认继续部署？',
    pinLabel: 'notify',
    tags: ['notify', 'island', '灵动岛', 'debug'],
    verification: 'general',
  },
  {
    id: 'et-status',
    type: 'command',
    category: 'easyterminal',
    title: '触发状态悬浮提示',
    summary: '展示一个简短状态提示，而不是完整确认框。',
    purpose: '适合用来演示正在进行中的状态或完成状态。',
    syntax: 'status <状态消息>',
    example: 'status Build completed',
    actionCommand: 'status Build completed',
    pinLabel: 'status',
    tags: ['status', 'overlay', '提示'],
    verification: 'general',
  },
  {
    id: 'linux-pwd',
    type: 'command',
    category: 'linux',
    title: '查看当前目录',
    summary: '确认你当前正在操作哪个路径。',
    purpose: '在多项目、多终端窗口之间切换时，快速确认当前工作目录。',
    syntax: 'pwd',
    example: 'pwd',
    actionCommand: 'pwd',
    pinLabel: 'pwd',
    tags: ['pwd', 'path', 'directory', '目录'],
    verification: 'general',
  },
  {
    id: 'linux-ls',
    type: 'command',
    category: 'linux',
    title: '显示目录详细列表',
    summary: '查看文件、权限、大小和隐藏文件。',
    purpose: '快速了解当前目录内容，是排查环境和结构最常用的命令之一。',
    syntax: 'ls -la',
    example: 'ls -la',
    actionCommand: 'ls -la',
    pinLabel: 'ls -la',
    tags: ['ls', 'files', 'permissions', '隐藏文件'],
    verification: 'general',
  },
  {
    id: 'linux-cd',
    type: 'command',
    category: 'linux',
    title: '切换目录',
    summary: '进入目标目录，或返回上一级目录。',
    purpose: '组织开发流程时的基础命令，通常配合 `pwd` 和 `ls -la` 使用。',
    syntax: 'cd <目录路径>',
    example: 'cd src/components',
    actionCommand: 'cd src/components',
    pinLabel: 'cd',
    note: '常见变体：`cd ..` 返回上一级，`cd ~` 回到用户主目录。',
    tags: ['cd', 'folder', 'directory', '路径切换'],
    verification: 'general',
  },
  {
    id: 'linux-mkdir',
    type: 'command',
    category: 'linux',
    title: '递归创建目录',
    summary: '一次性创建多层目录结构。',
    purpose: '开发新模块、脚本目录或文档目录时，比逐层创建更快。',
    syntax: 'mkdir -p <目录路径>',
    example: 'mkdir -p src/data/manual',
    actionCommand: 'mkdir -p src/data/manual',
    pinLabel: 'mkdir -p',
    tags: ['mkdir', 'create folder', '目录创建'],
    verification: 'general',
  },
  {
    id: 'linux-copy',
    type: 'command',
    category: 'linux',
    title: '复制文件或目录',
    summary: '复制单个文件，或使用 `-r` 复制整个目录。',
    purpose: '保留原始文件的同时创建副本，适合模板复制与备份。',
    syntax: 'cp -r <源路径> <目标路径>',
    example: 'cp -r src/components src/components-backup',
    actionCommand: 'cp -r src/components src/components-backup',
    pinLabel: 'cp -r',
    tags: ['cp', 'copy', 'backup', '复制'],
    verification: 'general',
  },
  {
    id: 'linux-move',
    type: 'command',
    category: 'linux',
    title: '移动或重命名文件',
    summary: '既能移动位置，也能直接改名。',
    purpose: '整理目录结构和重命名文件时，`mv` 是最高频命令之一。',
    syntax: 'mv <源路径> <目标路径>',
    example: 'mv old-name.ts new-name.ts',
    actionCommand: 'mv old-name.ts new-name.ts',
    pinLabel: 'mv',
    tags: ['mv', 'rename', 'move', '移动', '重命名'],
    verification: 'general',
  },
  {
    id: 'linux-rg',
    type: 'command',
    category: 'linux',
    title: '全文搜索关键字',
    summary: '在代码库里快速找变量、组件、函数和文案。',
    purpose: '比 `grep` 更快，特别适合大型项目的代码定位。',
    syntax: 'rg "<关键词>" <目录>',
    example: 'rg "showHelp" src',
    actionCommand: 'rg "showHelp" src',
    pinLabel: 'rg search',
    note: '想只列出文件名时可用：`rg --files src`。',
    tags: ['rg', 'ripgrep', 'search', '全文搜索', '代码定位'],
    verification: 'general',
  },
  {
    id: 'linux-find',
    type: 'command',
    category: 'linux',
    title: '按文件名查找文件',
    summary: '当你记得文件名模式，但不确定在哪个目录时很好用。',
    purpose: '按名称或通配符检索文件，适合快速定位配置、脚本和资源文件。',
    syntax: 'find <目录> -name "<模式>"',
    example: 'find . -name "*.tsx"',
    actionCommand: 'find . -name "*.tsx"',
    pinLabel: 'find file',
    tags: ['find', 'filename', 'glob', '查文件'],
    verification: 'general',
  },
  {
    id: 'linux-chmod',
    type: 'command',
    category: 'linux',
    title: '给脚本添加执行权限',
    summary: '让 shell 脚本可以直接运行。',
    purpose: '适合新建脚本后立即赋予执行权限，例如构建脚本或自动化脚本。',
    syntax: 'chmod +x <文件路径>',
    example: 'chmod +x scripts/deploy.sh',
    actionCommand: 'chmod +x scripts/deploy.sh',
    pinLabel: 'chmod +x',
    tags: ['chmod', 'permission', 'script', '执行权限'],
    verification: 'general',
  },
  {
    id: 'linux-rm',
    type: 'command',
    category: 'linux',
    title: '强制删除目录或文件',
    summary: '高风险命令，速度快，但删除后难以恢复。',
    purpose: '在明确知道目标路径正确时，用于清理临时目录或废弃产物。',
    syntax: 'rm -rf <路径>',
    example: 'rm -rf dist',
    actionCommand: 'rm -rf dist',
    pinLabel: 'rm -rf',
    note: '默认不建议一键执行，先确认路径，再选择插入或复制更安全。',
    tags: ['rm', 'delete', 'danger', '删除', '高风险'],
    verification: 'general',
    dangerous: true,
  },
  {
    id: 'node-version',
    type: 'command',
    category: 'node',
    title: '查看 Node 版本',
    summary: '确认当前终端使用的 Node.js 版本。',
    purpose: '排查运行环境、脚本兼容性和构建问题时非常常见。',
    syntax: 'node -v',
    example: 'node -v',
    actionCommand: 'node -v',
    pinLabel: 'node -v',
    tags: ['node', 'version', 'runtime'],
    verification: 'local',
  },
  {
    id: 'node-run-script',
    type: 'command',
    category: 'node',
    title: '执行一个 Node 脚本',
    summary: '直接运行 JavaScript 文件。',
    purpose: '用来启动本地脚本、工具脚本或简单服务入口。',
    syntax: 'node <脚本文件>',
    example: 'node scripts/sync-data.js',
    actionCommand: 'node scripts/sync-data.js',
    pinLabel: 'node file',
    tags: ['node', 'script', 'run js'],
    verification: 'local',
  },
  {
    id: 'node-eval',
    type: 'command',
    category: 'node',
    title: '执行一段即时 JS 代码',
    summary: '用单行命令快速验证 JavaScript 逻辑。',
    purpose: '适合做小型数据转换、字符串处理或环境检查。',
    syntax: 'node -e "<JavaScript 代码>"',
    example: 'node -e "console.log(process.version)"',
    actionCommand: 'node -e "console.log(process.version)"',
    pinLabel: 'node -e',
    tags: ['node -e', 'eval', 'one-liner'],
    verification: 'local',
  },
  {
    id: 'node-watch',
    type: 'command',
    category: 'node',
    title: '以 watch 模式运行脚本',
    summary: '文件变化后自动重启脚本。',
    purpose: '开发 CLI、小型服务或脚本时，快速验证改动效果。',
    syntax: 'node --watch <脚本文件>',
    example: 'node --watch server.js',
    actionCommand: 'node --watch server.js',
    pinLabel: 'node --watch',
    tags: ['node --watch', 'watch mode', 'hot reload'],
    verification: 'local',
  },
  {
    id: 'npm-install',
    type: 'command',
    category: 'npm',
    title: '安装项目依赖',
    summary: '根据 `package.json` 安装当前项目全部依赖。',
    purpose: '拉起一个新项目或刚切换分支时，这是最常用的初始化命令。',
    syntax: 'npm install',
    example: 'npm install',
    actionCommand: 'npm install',
    pinLabel: 'npm install',
    tags: ['npm install', 'dependencies', '初始化'],
    verification: 'local',
  },
  {
    id: 'npm-add-dep',
    type: 'command',
    category: 'npm',
    title: '安装生产依赖',
    summary: '把一个包加入项目依赖列表。',
    purpose: '安装运行时需要的库，例如 UI 组件库、HTTP 客户端等。',
    syntax: 'npm install <包名>',
    example: 'npm install axios',
    actionCommand: 'npm install axios',
    pinLabel: 'npm add',
    tags: ['npm', 'dependency', 'add package', '安装依赖'],
    verification: 'local',
  },
  {
    id: 'npm-add-devdep',
    type: 'command',
    category: 'npm',
    title: '安装开发依赖',
    summary: '把工具类包加入 `devDependencies`。',
    purpose: '适合 ESLint、TypeScript、测试工具和构建工具。',
    syntax: 'npm install -D <包名>',
    example: 'npm install -D vitest',
    actionCommand: 'npm install -D vitest',
    pinLabel: 'npm add -D',
    tags: ['npm -D', 'devDependencies', '开发依赖'],
    verification: 'general',
  },
  {
    id: 'npm-run-script',
    type: 'command',
    category: 'npm',
    title: '运行 package.json 脚本',
    summary: '执行任意自定义脚本名，比如 dev、build、lint。',
    purpose: '统一项目命令入口，是团队协作里最常见的约定方式。',
    syntax: 'npm run <脚本名>',
    example: 'npm run dev',
    actionCommand: 'npm run dev',
    pinLabel: 'npm run',
    tags: ['npm run', 'scripts', 'package.json'],
    verification: 'local',
  },
  {
    id: 'npm-build',
    type: 'command',
    category: 'npm',
    title: '执行项目构建',
    summary: '运行项目的 build 脚本，生成可发布产物。',
    purpose: '通常在打包、发版或上线前执行。',
    syntax: 'npm run build',
    example: 'npm run build',
    actionCommand: 'npm run build',
    pinLabel: 'npm build',
    tags: ['build', 'bundle', 'production'],
    verification: 'general',
  },
  {
    id: 'npm-test',
    type: 'command',
    category: 'npm',
    title: '运行测试',
    summary: '执行当前项目定义的测试命令。',
    purpose: '修改逻辑后快速回归，确认功能没有被破坏。',
    syntax: 'npm test',
    example: 'npm test',
    actionCommand: 'npm test',
    pinLabel: 'npm test',
    tags: ['test', 'unit test', '回归测试'],
    verification: 'local',
  },
  {
    id: 'npm-exec',
    type: 'command',
    category: 'npm',
    title: '临时执行一个 CLI 包',
    summary: '不需要手动全局安装，也能执行包里的二进制命令。',
    purpose: '适合一次性脚手架或按需调用工具。',
    syntax: 'npm exec <命令或包>',
    example: 'npm exec vite -- --host',
    actionCommand: 'npm exec vite -- --host',
    pinLabel: 'npm exec',
    tags: ['npm exec', 'npx', 'cli', '一次性工具'],
    verification: 'local',
  },
  {
    id: 'claude-open',
    type: 'command',
    category: 'agent',
    title: '启动 Claude Code 交互会话',
    summary: '默认进入交互式 Claude Code 会话。',
    purpose: '在当前目录直接让 Claude 参与代码理解、修改和执行。',
    syntax: 'claude [prompt]',
    example: 'claude',
    actionCommand: 'claude',
    pinLabel: 'claude',
    note: '该命令已通过当前机器的 `claude --help` 本机校验。',
    tags: ['claude', 'claude code', 'agent', 'interactive'],
    verification: 'local',
  },
  {
    id: 'claude-print',
    type: 'command',
    category: 'agent',
    title: '以非交互模式输出结果',
    summary: '执行一次任务并直接打印结果，适合脚本化或管道。',
    purpose: '当你只想拿到结果文本，而不是进入长期会话时使用。',
    syntax: 'claude -p "<任务说明>"',
    example: 'claude -p "总结这个项目的目录结构"',
    actionCommand: 'claude -p "总结这个项目的目录结构"',
    pinLabel: 'claude -p',
    note: '`-p/--print` 来自本机 `claude --help` 输出。',
    tags: ['claude -p', 'print', 'non-interactive'],
    verification: 'local',
  },
  {
    id: 'claude-continue',
    type: 'command',
    category: 'agent',
    title: '继续最近一次会话',
    summary: '在当前目录续接最近的 Claude Code 对话。',
    purpose: '避免重复描述上下文，适合中断后继续开发。',
    syntax: 'claude -c',
    example: 'claude -c',
    actionCommand: 'claude -c',
    pinLabel: 'claude -c',
    tags: ['claude continue', 'resume latest'],
    verification: 'local',
  },
  {
    id: 'claude-resume',
    type: 'command',
    category: 'agent',
    title: '恢复指定或可选会话',
    summary: '通过会话 ID 或交互选择器恢复会话。',
    purpose: '在需要切换到更早的工作上下文时使用。',
    syntax: 'claude -r [sessionId]',
    example: 'claude -r',
    actionCommand: 'claude -r',
    pinLabel: 'claude -r',
    tags: ['claude resume', 'session'],
    verification: 'local',
  },
  {
    id: 'claude-auth-status',
    type: 'command',
    category: 'agent',
    title: '查看 Claude 登录状态',
    summary: '检查 Anthropic 认证是否正常。',
    purpose: '当命令无法调用或怀疑 token 失效时，优先查看认证状态。',
    syntax: 'claude auth status',
    example: 'claude auth status',
    actionCommand: 'claude auth status',
    pinLabel: 'claude auth',
    tags: ['claude auth', 'login', 'status'],
    verification: 'local',
  },
  {
    id: 'claude-mcp-list',
    type: 'command',
    category: 'agent',
    title: '列出 Claude MCP 服务',
    summary: '查看当前已经配置的 MCP 服务器。',
    purpose: '排查 Claude Code 能否访问外部工具与数据源时非常关键。',
    syntax: 'claude mcp list',
    example: 'claude mcp list',
    actionCommand: 'claude mcp list',
    pinLabel: 'claude mcp',
    tags: ['claude mcp', 'mcp list', 'tools'],
    verification: 'local',
  },
  {
    id: 'claude-mcp-add',
    type: 'command',
    category: 'agent',
    title: '添加一个 Claude MCP 服务',
    summary: '把新的 MCP Server 接入 Claude Code。',
    purpose: '给 Claude 增加额外的浏览、文档或系统能力。',
    syntax: 'claude mcp add <name> -- <command> [args...]',
    example: 'claude mcp add my-server -- npx my-mcp-server',
    actionCommand: 'claude mcp add my-server -- npx my-mcp-server',
    pinLabel: 'claude mcp add',
    note: '示例来自本机 `claude mcp --help` 输出。',
    tags: ['claude mcp add', 'mcp server', 'tooling'],
    verification: 'local',
  },
  {
    id: 'codex-open',
    type: 'command',
    category: 'agent',
    title: '启动 Codex 交互会话',
    summary: '进入 Codex CLI 的交互式开发模式。',
    purpose: '在当前仓库里直接让 Codex 读取、修改并验证代码。',
    syntax: 'codex [prompt]',
    example: 'codex',
    actionCommand: 'codex',
    pinLabel: 'codex',
    note: '该命令已通过当前机器的 `codex --help` 本机校验。',
    tags: ['codex', 'interactive', 'openai'],
    verification: 'local',
  },
  {
    id: 'codex-exec',
    type: 'command',
    category: 'agent',
    title: '非交互执行 Codex 任务',
    summary: '一次性执行任务并输出结果，不进入长期会话。',
    purpose: '适合脚本化批处理、CI 或快速检查类任务。',
    syntax: 'codex exec "<任务说明>"',
    example: 'codex exec "解释当前仓库的构建流程"',
    actionCommand: 'codex exec "解释当前仓库的构建流程"',
    pinLabel: 'codex exec',
    note: '命令格式来自本机 `codex exec --help`。',
    tags: ['codex exec', 'non-interactive', 'automation'],
    verification: 'local',
  },
  {
    id: 'codex-review',
    type: 'command',
    category: 'agent',
    title: '审查当前未提交改动',
    summary: '让 Codex 直接对当前工作区改动进行 review。',
    purpose: '在提交前快速发现回归风险、缺测点和明显问题。',
    syntax: 'codex review --uncommitted',
    example: 'codex review --uncommitted',
    actionCommand: 'codex review --uncommitted',
    pinLabel: 'codex review',
    note: '来自本机 `codex review --help` 输出。',
    tags: ['codex review', 'code review', 'uncommitted'],
    verification: 'local',
  },
  {
    id: 'codex-resume',
    type: 'command',
    category: 'agent',
    title: '恢复最近一次 Codex 会话',
    summary: '把之前的交互式会话重新接回来。',
    purpose: '适合长任务暂停后继续，不需要重新解释上下文。',
    syntax: 'codex resume --last',
    example: 'codex resume --last',
    actionCommand: 'codex resume --last',
    pinLabel: 'codex resume',
    tags: ['codex resume', 'session'],
    verification: 'local',
  },
  {
    id: 'codex-full-auto',
    type: 'command',
    category: 'agent',
    title: '以低摩擦自动执行模式运行',
    summary: '使用 Codex 的 `--full-auto` 快速进入更顺滑的自动执行工作流。',
    purpose: '在你信任当前工作区和任务范围时，可以减少中间确认。',
    syntax: 'codex --full-auto "<任务说明>"',
    example: 'codex --full-auto "修复当前项目的 lint 错误"',
    actionCommand: 'codex --full-auto "修复当前项目的 lint 错误"',
    pinLabel: 'codex auto',
    note: '`--full-auto` 的含义来自本机 `codex --help`。',
    tags: ['codex --full-auto', 'automation', 'workspace-write'],
    verification: 'local',
  },
  {
    id: 'codex-search',
    type: 'command',
    category: 'agent',
    title: '开启联网搜索能力',
    summary: '让 Codex 在会话中具备实时 Web Search 能力。',
    purpose: '当任务依赖最新文档、最新 API 或外部信息时使用。',
    syntax: 'codex --search "<任务说明>"',
    example: 'codex --search "调研这个库最近的 breaking changes"',
    actionCommand: 'codex --search "调研这个库最近的 breaking changes"',
    pinLabel: 'codex search',
    note: '该选项来自本机 `codex --help`。',
    tags: ['codex --search', 'web search', 'research'],
    verification: 'local',
  },
  {
    id: 'codex-cd',
    type: 'command',
    category: 'agent',
    title: '指定 Codex 的工作目录',
    summary: '从任意位置启动并把根目录指向目标项目。',
    purpose: '适合你当前 shell 不在项目目录里，但想直接进入某个仓库工作。',
    syntax: 'codex -C <目录> [prompt]',
    example: 'codex -C /Users/nelson/Desktop/APP/EasyTerminal_en2',
    actionCommand: 'codex -C /Users/nelson/Desktop/APP/EasyTerminal_en2',
    pinLabel: 'codex -C',
    tags: ['codex -C', 'working directory', 'project root'],
    verification: 'local',
  },
]

const normalize = (value: string) => value.trim().toLowerCase()

const buildSearchText = (entry: ManualEntry) => {
  return [
    entry.title,
    entry.summary,
    entry.purpose,
    entry.syntax,
    entry.example || '',
    entry.note || '',
    ...entry.tags,
    COMMAND_MANUAL_CATEGORIES.find(category => category.id === entry.category)?.label || '',
    COMMAND_MANUAL_CATEGORIES.find(category => category.id === entry.category)?.description || '',
  ]
    .join(' ')
    .toLowerCase()
}

const getSuggestionScore = (entry: ManualEntry, query: string) => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery || !entry.actionCommand) return 0

  const title = entry.title.toLowerCase()
  const summary = entry.summary.toLowerCase()
  const purpose = entry.purpose.toLowerCase()
  const syntax = entry.syntax.toLowerCase()
  const example = (entry.example || '').toLowerCase()
  const actionCommand = entry.actionCommand.toLowerCase()
  const tags = entry.tags.map(tag => tag.toLowerCase())
  const haystack = buildSearchText(entry)

  if (!haystack.includes(normalizedQuery) && !actionCommand.includes(normalizedQuery)) {
    return 0
  }

  let score = 10

  if (title.includes(normalizedQuery)) score += 80
  if (summary.includes(normalizedQuery)) score += 36
  if (purpose.includes(normalizedQuery)) score += 24
  if (syntax.includes(normalizedQuery)) score += 30
  if (example.includes(normalizedQuery)) score += 22
  if (actionCommand.startsWith(normalizedQuery)) score += 42
  else if (actionCommand.includes(normalizedQuery)) score += 18
  if (tags.some(tag => tag.includes(normalizedQuery))) score += 44
  if (entry.dangerous) score -= 12

  return score
}

export const searchManualCommandSuggestions = (
  query: string,
  limit = 6,
): ManualCommandSuggestion[] => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []

  const seen = new Set<string>()

  return COMMAND_MANUAL_ENTRIES
    .filter(entry => entry.type === 'command' && !!entry.actionCommand)
    .map(entry => ({
      entry,
      score: getSuggestionScore(entry, normalizedQuery),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter(item => {
      if (!item.entry.actionCommand || seen.has(item.entry.actionCommand)) {
        return false
      }
      seen.add(item.entry.actionCommand)
      return true
    })
    .slice(0, limit)
    .map(item => ({
      entryId: item.entry.id,
      title: item.entry.title,
      command: item.entry.actionCommand!,
      hint: item.entry.summary,
    }))
}
