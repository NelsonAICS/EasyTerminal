# EasyTerminal Agent 能力衍生扩展设计文档

## 1. 整体架构与愿景 (Overview & Architecture)
在现有的 EasyTerminal 基础上，引入 Agent 能力扩展，将其从一个单纯的“终端+浏览器”双屏工具，升级为一个**私有化的 AI 智能工作站**。
核心理念是将 Terminal 作为**输入与执行的入口**（配合现有的 TUI 劫持与灵动岛），将右侧面板作为**编排与管理的画布**。

### 1.1 核心模块关系
*   **输入层 (Terminal + 灵动岛)**：用户通过自然语言或快捷指令（如 `@kb`, `/prompt`）发起意图。
*   **路由层 (Agent Router)**：LLM 解析意图，决定是调用 Skill、查询知识库、还是执行 Workflow。
*   **推理引擎层 (ReAct Engine)**：通过“思考 (Thought) -> 行动 (Action) -> 观察 (Observation)”的多轮循环，自主决策工具调用、状态管理及任务推进。
*   **执行层 (Capabilities)**：
    *   **Skill Hub**：本地工具与能力执行（如文件操作、网络请求）。
    *   **PKB (Personal Knowledge Base)**：RAG 检索与上下文注入。
    *   **Prompt Assistant**：系统提示词组装与优化。
    *   **Workflow Engine**：DAG 任务有向无环图调度执行。

---

## 2. 大模型 API 配置与 ReAct 核心推理引擎

作为整个 Agent 能力的大脑，大模型接入与推理机制是所有上层功能（Skill、Workflow、知识库）的基石。

### 2.1 多厂商大模型 API 统一网关 (LLM API Gateway)
**功能描述**：支持动态配置多厂商的大模型 API Key，提供统一的调用封装，并在新增/修改 Key 时强制进行连通性测试验证。
*   **UI 设计**：
    *   **设置面板**：在系统设置中增加“模型提供商”页面，下拉列表选择厂商（内置支持 OpenAI、GLM、KIMI、Gemini、MiniMax 等），并提供自定义 BaseURL 选项。
    *   **连通性指示器**：每个 Key 旁边带有红/绿指示灯，保存时显示 Loading 状态。
*   **交互设计**：
    1.  用户填入 `MiniMax API Key` 并点击保存。
    2.  系统自动发起一个极简的探测请求（如 `Ping` 或发送 `"hi"`），并在验证成功后才将 Key 写入本地加密存储。
    3.  若失败，提示明确的报错信息（如网络不可达、Token 耗尽）。
*   **实现方式**：
    *   **本地存储**：使用 `electron-store` 配合 Node.js `crypto` 模块将 API Key 加密保存在用户本地。
    *   **统一适配层**：引入 `@ai-sdk` (Vercel AI SDK) 或 `LangChain.js` 构建统一的 Provider 适配器，抹平各家厂商的 API 格式差异。

### 2.2 ReAct 核心推理模式 (Reasoning and Acting)
**功能描述**：摒弃单纯的“一问一答”，采用 ReAct 模式赋予大模型连续解决复杂任务的能力。通过多轮循环：大模型思考分析 -> 决定调用某个工具 (Skill/KB) -> 系统执行工具并将结果 (Observation) 注入上下文 -> 大模型再次思考推理。
*   **UI 与交互设计 (灵动岛透出)**：
    *   **思考状态透明化**：当大模型开始执行复杂任务时，灵动岛不再只是一个 Loading，而是实时打字机显示当前状态：
        *   `🤔 思考中：需要先在本地知识库中查找 API 文档...`
        *   `🛠️ 执行中：正在调用 [知识库检索] 插件...`
        *   `👀 观察中：获取到 3 条相关文档，正在分析...`
        *   `✅ 任务完成：为您输出最终结果。`
*   **实现方式**：
    *   **工具定义 (Tool Calling)**：
        将所有的 Skill、KB 查询等能力，严格按照 JSON Schema 定义为 Tools（如 `zod` 声明）。
    *   **执行循环 (The Loop)**：
        使用 `LangGraph` 的 `createReactAgent` 范式，或者手写状态机：
        1. 组装 System Prompt (包含可用 Tools 定义)。
        2. LLM 返回结果。如果包含 `tool_calls`，则进入第 3 步；如果是文本，则直接输出给用户。
        3. Node.js 拦截到 `tool_calls`，并行或串行执行对应的本地函数 (如查询 SQLite、运行 Python 脚本)。
        4. 将执行结果作为 `tool_outputs` 角色重新推入历史会话数组中。
        5. 再次请求 LLM，直至 LLM 认为已收集足够信息，返回最终文本答案。
    *   **防死循环机制**：设置最大迭代次数（如 `max_iterations: 10`），一旦触发强制中断，避免 API 费用失控。

---

## 3. 详细功能设计 (Feature Design)

### 3.1 Skill 查找与工作流推荐 (Skill Hub)
**功能描述**：对本地已安装的 Skill 进行索引，当用户输入自然语言需求时，利用本地知识库和 LLM 语义检索推荐合适的 Skill，并能自动组装成建议的工作流。
*   **UI 设计**：
    *   **快捷触发 (左侧终端)**：类似 Raycast/Spotlight 的悬浮搜索框，或者在终端内直接输入 `?skill [需求]`，灵动岛弹出推荐列表。
    *   **管理面板 (右侧分屏)**：Skill 市场/列表视图，展示本地已下载的 Skill 卡片，包含描述、版本、入参出参说明。
*   **交互设计**：
    1.  用户在终端输入：“帮我把当前目录的图片压缩并传到 OSS”。
    2.  LLM 分析意图 -> 本地向量检索匹配到 `image_compress` 和 `oss_upload` 两个 Skill。
    3.  灵动岛弹出推荐：“💡 发现可用 Skill：图片压缩、OSS 上传。是否自动生成并执行该工作流？ [执行] [查看详情]”。
*   **实现方式**：
    *   **索引构建**：读取本地 Skill 文件夹（解析 `manifest.json` 或 `package.json`），将其名称、描述调用本地 Embedding 模型（如 BGE-m3 或 OpenAI text-embedding）向量化。
    *   **存储**：使用轻量级本地向量数据库（如 `SQLite-vss`, `ChromaDB` 或单纯的 JSON+Cosine Similarity 内存计算）。
    *   **工作流生成**：将匹配到的 Top-K Skill 描述作为上下文交给 LLM，Prompt 设定为：“根据用户需求，将以下可用工具编排为 JSON 格式的顺序执行步骤”。

### 3.2 个人知识库构建 (Personal Knowledge Base - PKB)
**功能描述**：允许用户将本地文档（PDF、Markdown、代码、网页剪报）沉淀为个人知识库，供 Agent 在回答或执行任务时作为 RAG (检索增强生成) 的上下文。
*   **UI 设计**：
    *   **知识库管理 (右侧分屏)**：拖拽上传区域，文件列表（支持按 Collection/Tag 分类），解析进度条。
    *   **终端融合**：输入框支持 `@` 唤出知识库列表（类似于现有的 DOM Picker 注入上下文）。
*   **交互设计**：
    1.  用户将一份 API 接口文档拖入右侧面板，系统显示“正在分块与向量化...”。
    2.  用户在终端提问：“@API_Doc 如何调用登录接口？”
    3.  系统隐式提取相关文档片段，连同问题一起发给 LLM，输出准确结果。
*   **实现方式**：
    *   **文档解析**：使用 `pdf.js` 或 `mammoth` 解析 PDF，使用 AST 语法树解析代码。
    *   **切片与嵌入 (Chunking & Embedding)**：使用 LangChain.js 或 LlamaIndex.ts 提供的 `RecursiveCharacterTextSplitter` 进行文本分块。
    *   **存储与检索**：持久化至本地向量库。在提问时，进行语义检索（Top-K）+ 关键词混合检索（Hybrid Search），重排后注入 Prompt。

### 3.3 个人 Prompt 助手 (Prompt Assistant)
**功能描述**：支持 Prompt 的归类、聚合、快捷调用，并提供 LLM 驱动的 Prompt 优化（Prompt Engineering）功能。
*   **UI 设计**：
    *   **右侧面板**：分为“我的 Prompt”和“Prompt 优化器”。支持树形目录（如 Coding, Writing, Code Review）。
    *   **优化器界面**：左侧输入“草稿”，点击“优化”按钮，右侧输出“结构化高阶 Prompt”，并展示“改动说明”。
*   **交互设计**：
    1.  **快捷调用**：终端内输入 `/` 触发自动补全菜单（依托 xterm.js 拦截），通过方向键选择 Prompt 模板，按下回车后直接填入输入框，等待用户补充变量。
    2.  **优化流程**：用户写了一句“帮我写个正则”，点击优化，LLM 将其扩写为包含 Role, Context, Task, Format 要求的标准 Prompt，并一键保存。
*   **实现方式**：
    *   **数据管理**：使用 `lowdb` 或 `SQLite` 存储 Prompt 结构（包含 Title, Content, Tags, Variables）。
    *   **变量解析**：正则提取 Prompt 中的 `{{variable}}`，在终端调用时灵动岛弹出 Input 框让用户依次填入变量。
    *   **优化模型**：预置一套强大的 Meta-Prompt（如 CO-STAR 框架），专门用于调优用户的草稿。

### 3.4 个人工作流设置 (Workflow Builder)
**功能描述**：类似于 Coze、Dify 或 Deerflow 的 DAG（有向无环图）可视化工作流编排。允许用户将 LLM、Skill、知识库、Prompt 组合成复杂的自动化流程。
*   **UI 设计**：
    *   **右侧分屏扩展**：当打开工作流编辑器时，触发 IPC 通信将窗口拉宽至 1400px（利用现有机制）。
    *   **画布 (Canvas)**：左侧为节点组件库，中间为连线画布，右侧为节点属性配置面板。
*   **交互设计**：
    1.  拖拽“开始节点” -> “知识库检索节点” -> “LLM 节点” -> “Skill 执行节点 (如发送飞书)” -> “结束节点”。
    2.  通过鼠标连线定义数据流（如将 LLM 的输出映射为 Skill 的输入）。
    3.  保存为自定义命令（如 `my_daily_report`），在左侧终端直接敲击命令即可无感运行整个工作流，灵动岛实时展示当前运行到哪个节点。
*   **实现方式**：
    *   **前端渲染**：引入 `React Flow` 或 `@vue-flow/core` 构建可视化 DAG 画布。
    *   **数据结构**：工作流序列化为 JSON 格式，包含 `nodes` (节点类型、配置) 和 `edges` (连线依赖关系)。
    *   **调度引擎 (Scheduler)**：
        *   在 Node.js 主进程中实现一个基于拓扑排序 (Topological Sort) 的执行引擎。
        *   支持异步并发控制（当多个节点无依赖时并行执行）。
        *   节点间状态透传：使用一个全局的 `context` 对象在节点间传递 payload。

---

## 4. 实施路径规划 (Implementation Roadmap)

建议按照从基础到复杂、从单点到串联的路径进行开发：

*   **Phase 1: 数据层与 Prompt 助手 (基建期)**
    *   引入本地数据库 (SQLite/lowdb)。
    *   实现 Prompt 的 CRUD 及终端 `/` 快捷键唤出（复用现有的 TUI 拦截与灵动岛交互）。
*   **Phase 2: 本地知识库 (PKB) 与 RAG (探索期)**
    *   集成本地向量数据库。
    *   实现文件的拖拽解析、切片、Embedding。
    *   打通终端 `@kb` 检索。
*   **Phase 3: Skill 接入与智能推荐 (融合期)**
    *   定义统一的 Skill 接口规范 (Schema)。
    *   利用 Phase 2 的向量能力实现 Skill 语义检索。
    *   利用 LLM 意图识别动态推荐 Skill。
*   **Phase 4: DAG 工作流编排 (完全体)**
    *   引入 React Flow / Vue Flow 开发右侧编排画布。
    *   开发主进程的 DAG 执行引擎。
    *   将 Prompt、PKB、Skill 封装为标准节点，实现大一统。

---

## 5. 技术栈选型建议
*   **前端 UI 组件**：Radix UI / Shadcn (高颜值、高定制性，符合项目要求精美的调性)
*   **DAG 可视化**：`React Flow` (目前生态最成熟的节点连线库)
*   **向量数据库**：`chromadb` 或 `sqlite-vss` (轻量级，适合桌面端 Electron 嵌入)
*   **LLM/Agent 框架**：`LangChain.js` 或 `@ai-sdk` (Vercel)，用于简化 RAG 流程和 Tool Calling 调用。
