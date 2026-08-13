export type WorkbenchTemplateId =
  | 'cockpit'
  | 'focus-board'
  | 'desktop-tool'
  | 'prompt-studio'
  | 'knowledge-desk'
  | 'review-station'
  | 'settings-console';

export type WorkbenchTemplateIcon =
  | 'sparkles'
  | 'kanban'
  | 'desktop'
  | 'wand'
  | 'layers'
  | 'review'
  | 'command';

type WorkbenchPreviewMode = 'cockpit' | 'board' | 'split' | 'settings';

interface WorkbenchPreviewStat {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning';
}

interface WorkbenchPreviewSection {
  title: string;
  description: string;
  items: string[];
}

interface WorkbenchPreviewColumn {
  title: string;
  count: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning';
  cards: Array<{
    title: string;
    description: string;
    meta: string[];
    priority?: 'normal' | 'high' | 'done';
  }>;
}

interface WorkbenchPreviewConfig {
  mode: WorkbenchPreviewMode;
  sidebarItems?: string[];
  commandHint?: string;
  stats?: WorkbenchPreviewStat[];
  sections?: WorkbenchPreviewSection[];
  columns?: WorkbenchPreviewColumn[];
}

export interface WorkbenchTemplateDefinition {
  id: WorkbenchTemplateId;
  name: string;
  icon: WorkbenchTemplateIcon;
  summary: string;
  useCase: string;
  starterComponentName: string;
  shell: WorkbenchPreviewMode;
  scaffoldGoal: string;
  sections: string[];
  acceptanceCriteria: string[];
  preview: WorkbenchPreviewConfig;
}

export const WORKBENCH_SCAFFOLD_RULES = [
  '先选壳层：个人总览用 cockpit，流程推进用 board，工具应用用 split，偏配置页用 settings。',
  '页面第一屏必须同时交代标题、当前上下文、主要操作，不要把用户扔进空白正文。',
  '正文结构优先使用 WorkbenchSection、WorkbenchStatGrid、WorkbenchBoard 组合，而不是直接散写 div。',
  '每个页面至少补齐 empty、loading、error 中的一种可见占位方案，避免出现纯空白区域。',
  '交互密度遵循桌面工具节奏：按钮高度 32-40px，输入框高度 40px，卡片圆角 20-28px。',
  '局部强调使用 accent 和语义 badge，避免每个模块自己发明一套颜色语言。',
  '一个模板里最多允许 1 个强命令入口和 2 个次级操作区，避免工具页再次失控。',
];

export const WORKBENCH_TEMPLATE_REGISTRY: WorkbenchTemplateDefinition[] = [
  {
    id: 'cockpit',
    name: 'Personal Cockpit',
    icon: 'sparkles',
    summary: '个人控制台首页，适合任务总览、焦点工作、快捷操作和活动流。',
    useCase: '个人工作台 / AI 助手首页 / 生产力中心',
    starterComponentName: 'PersonalCockpitPage',
    shell: 'cockpit',
    scaffoldGoal: '让用户在一屏内看到当前状态、主命令入口和今天最重要的两到三个任务。',
    sections: ['Topbar', 'Command Bar', 'Stats', 'Today Stack', 'Recent Activity'],
    acceptanceCriteria: [
      '左侧导航和顶部标题区都能说明当前用户所处工作上下文。',
      '命令入口在首屏可见，并且不会和统计卡抢视觉焦点。',
      '今日任务与最近活动至少各有一个可折叠或可替换的容器位。',
    ],
    preview: {
      mode: 'cockpit',
      sidebarItems: ['Overview', 'Command Center', 'Boards', 'Activity'],
      commandHint: 'Ask AI, jump to board, create task, or open a workspace',
      stats: [
        { label: 'Focus', value: '4.5h', detail: '比昨天多 38 分钟', tone: 'info' },
        { label: 'Shipped', value: '7', detail: '本周已完成卡片', tone: 'success' },
        { label: 'Backlog', value: '18', detail: '仍需整理', tone: 'warning' },
        { label: 'Review', value: '3', detail: '等待你的决定' },
      ],
      sections: [
        { title: 'Today Stack', description: '按注意力排序，而不是按文件夹排序。', items: ['Refine terminal onboarding', '整理 Prompt 模板'] },
        { title: 'Recent Activity', description: '结合状态和结果，减少切到日志页的频率。', items: ['Context bundle refreshed', 'Workflow release-check completed'] },
      ],
    },
  },
  {
    id: 'focus-board',
    name: 'Focus Board',
    icon: 'kanban',
    summary: '轻量看板模板，强调个人节奏、任务流和推进状态。',
    useCase: '项目看板 / 周计划 / 产品任务板',
    starterComponentName: 'FocusBoardPage',
    shell: 'board',
    scaffoldGoal: '把状态切换和卡片优先级做得足够轻，不做重型企业流程。',
    sections: ['Topbar', 'Board Filters', 'Now Column', 'Flowing Column', 'Done Column'],
    acceptanceCriteria: [
      '列标题、数量和卡片优先级一眼可读。',
      '卡片支持高优先、完成和普通三种密度状态。',
      '看板宽度在桌面窗口内无需横向滚动即可完成主视图阅读。',
    ],
    preview: {
      mode: 'board',
      columns: [
        {
          title: 'Now',
          count: '3',
          tone: 'warning',
          cards: [
            { title: 'UI engine polishing', description: '继续完善工作台 primitives。', meta: ['Priority', 'Today'], priority: 'high' },
            { title: 'Browser panel cleanup', description: '统一头部控件尺寸和切换反馈。', meta: ['UI', '40 min'] },
          ],
        },
        {
          title: 'Flowing',
          count: '4',
          tone: 'info',
          cards: [
            { title: 'Knowledge search states', description: '补 empty/loading/error 状态。', meta: ['In Progress', 'Queued'] },
            { title: 'Theme preview cards', description: '让主题选择更像模板库。', meta: ['Visual', 'Exploring'] },
          ],
        },
        {
          title: 'Done',
          count: '5',
          tone: 'success',
          cards: [
            { title: 'Prompt panel refactor', description: '换到统一主从面板。', meta: ['Done', 'Synced'], priority: 'done' },
            { title: 'Sidebar shell upgrade', description: '重建桌面工作台骨架。', meta: ['Done', 'Published'], priority: 'done' },
          ],
        },
      ],
    },
  },
  {
    id: 'desktop-tool',
    name: 'Desktop Tool',
    icon: 'desktop',
    summary: '桌面双栏工具模板，适合检查器、预览器、编辑器和文件型工具。',
    useCase: '桌面应用 / Inspector / 文件工具',
    starterComponentName: 'DesktopToolPage',
    shell: 'split',
    scaffoldGoal: '建立稳定的“主画布 + 属性侧栏”结构，让工具类页面更像真正桌面应用。',
    sections: ['Sidebar', 'Topbar', 'Primary Canvas', 'Properties', 'Activity'],
    acceptanceCriteria: [
      '主区域与侧栏信息层级清晰，用户不会把属性面板误当主内容。',
      '主画布必须支持留白态，不能在空内容时塌掉。',
      '侧栏中的输入控件间距、标签和按钮尺寸与全局规范一致。',
    ],
    preview: {
      mode: 'split',
      sidebarItems: ['Inspector', 'Layouts', 'Pinned Views'],
      sections: [
        { title: 'Primary Canvas', description: '放预览、编辑器、终端输出或 builder 画布。', items: ['Content preview surface', 'Resizable viewport'] },
        { title: 'Properties', description: '集中放输入控件、切换项和属性组。', items: ['Project name', 'Workspace path', 'State block'] },
        { title: 'Activity', description: '用于日志、差异、处理结果等次级信息。', items: ['Layout token updated', 'Preview exported'] },
      ],
    },
  },
  {
    id: 'prompt-studio',
    name: 'Prompt Studio',
    icon: 'wand',
    summary: '偏创作和编辑的工作区模板，适合 Prompt、文案、模版和 AI 指令中心。',
    useCase: 'Prompt 管理 / 内容编辑 / AI 指令工作台',
    starterComponentName: 'PromptStudioPage',
    shell: 'split',
    scaffoldGoal: '让左侧资源库、中央编辑区和右侧说明/变量区各司其职，避免编辑页再次变成表单堆。',
    sections: ['Resource List', 'Editor', 'Variables Panel', 'Optimization Card'],
    acceptanceCriteria: [
      '编辑区始终是视觉中心，说明区不能反客为主。',
      '变量和标签信息有独立块，不与正文混排。',
      '优化、预览、保存三类动作分层清晰。',
    ],
    preview: {
      mode: 'split',
      sidebarItems: ['Templates', 'Drafts', 'Variables'],
      sections: [
        { title: 'Editor', description: '中央放长文本、模版正文和实时优化结果。', items: ['Prompt title', 'Long-form editor', 'Preview tab'] },
        { title: 'Variables', description: '右侧聚合变量、标签和输入 schema。', items: ['{{project}}', '{{tone}}', '{{constraints}}'] },
        { title: 'Optimization', description: '下方附带 AI 优化建议和版本切换。', items: ['Improve structure', 'Apply variant'] },
      ],
    },
  },
  {
    id: 'knowledge-desk',
    name: 'Knowledge Desk',
    icon: 'layers',
    summary: '偏资料检索和知识运营的页面模板，适合文档、片段和检索结果工作区。',
    useCase: '知识库 / 文档检索 / 内容资产管理',
    starterComponentName: 'KnowledgeDeskPage',
    shell: 'cockpit',
    scaffoldGoal: '把检索入口、资料集合、结果卡片和文档详情放在同一条认知路径上。',
    sections: ['Search Bar', 'Collection Filters', 'Result Summary', 'Document Detail', 'Recent Imports'],
    acceptanceCriteria: [
      '搜索入口必须在首屏清晰可见。',
      '检索结果与文档详情至少有一侧固定位置，减少跳转。',
      '集合筛选和导入动作必须可独立操作，不埋在详情页。',
    ],
    preview: {
      mode: 'cockpit',
      sidebarItems: ['Collections', 'Search', 'Imports', 'Saved Snippets'],
      commandHint: 'Search a topic, filter a collection, or open a document detail',
      stats: [
        { label: 'Docs', value: '142', detail: '跨 6 个 collection' },
        { label: 'Chunks', value: '5.6k', detail: '检索索引已完成', tone: 'success' },
        { label: 'Pending', value: '3', detail: '等待重新解析', tone: 'warning' },
        { label: 'Hits', value: '24', detail: '今日搜索命中', tone: 'info' },
      ],
      sections: [
        { title: 'Result Summary', description: '首屏显示最高相关结果和引用来源。', items: ['Top hit: context runtime design', 'Matched in 3 collections'] },
        { title: 'Recent Imports', description: '让导入和重建索引动作有可见落点。', items: ['2026 roadmap.md', 'architecture-review.pdf'] },
      ],
    },
  },
  {
    id: 'review-station',
    name: 'Review Station',
    icon: 'review',
    summary: '面向审查和确认动作的模板，适合 code review、设计 review 和发布前检查。',
    useCase: '代码审查 / 设计审阅 / QA 验收',
    starterComponentName: 'ReviewStationPage',
    shell: 'split',
    scaffoldGoal: '让问题列表、详细说明和确认动作保持同屏，降低来回切页的审查疲劳。',
    sections: ['Review Queue', 'Finding Detail', 'Action Rail', 'Decision Summary'],
    acceptanceCriteria: [
      '左侧问题队列必须能快速切换，不需要额外搜索也能扫描优先级。',
      '详细区支持长文本和引用内容，不会因内容多而崩布局。',
      '确认、回退、通过三类动作分层清楚，不会误触。',
    ],
    preview: {
      mode: 'split',
      sidebarItems: ['Critical', 'Needs Follow-up', 'Approved'],
      sections: [
        { title: 'Review Queue', description: '按优先级展示待审项目。', items: ['P1 Auth regression', 'P2 Empty state mismatch'] },
        { title: 'Finding Detail', description: '详细解释问题、影响面和建议改法。', items: ['Code snippet', 'Impact analysis', 'Suggested fix'] },
        { title: 'Decision Summary', description: '收敛最终结论与风险等级。', items: ['Approve with comments', 'Block release'] },
      ],
    },
  },
  {
    id: 'settings-console',
    name: 'Settings Console',
    icon: 'command',
    summary: '偏偏好配置和连接管理的模板，适合设置中心、账户、服务接入页。',
    useCase: '设置页 / 服务配置 / 偏好中心',
    starterComponentName: 'SettingsConsolePage',
    shell: 'settings',
    scaffoldGoal: '让设置页也保持工作台质感，而不是退回平面表单堆栈。',
    sections: ['Settings Header', 'Preference Groups', 'Connection Cards', 'Safety Actions'],
    acceptanceCriteria: [
      '设置项要按主题分组，并且每组都要有简短说明。',
      '高风险操作必须脱离普通表单区，使用独立警示块。',
      '连接状态、保存状态和测试动作都应有即时反馈位。',
    ],
    preview: {
      mode: 'settings',
      sections: [
        { title: 'Appearance', description: '主题、字号、密度和窗口行为。', items: ['Theme preset', 'Font scale', 'Compact mode'] },
        { title: 'Integrations', description: 'API、模型和外部连接。', items: ['Provider card', 'Test connection', 'Fallback model'] },
        { title: 'Safety', description: '高风险操作和敏感设置。', items: ['Reset workspace', 'Clear history'] },
      ],
    },
  },
];

function buildCockpitStarter(template: WorkbenchTemplateDefinition, componentName: string) {
  return `import {
  UIButton,
  UIBadge,
  UIPageBody,
  UIPageHeader,
  UIPageShell,
  WorkbenchCommandBar,
  WorkbenchFrame,
  WorkbenchMain,
  WorkbenchSection,
  WorkbenchShell,
  WorkbenchSidebar,
  WorkbenchSidebarItem,
  WorkbenchStatCard,
  WorkbenchStatGrid,
  WorkbenchTopbar,
} from '../components/ui'

export function ${componentName}() {
  return (
    <UIPageShell>
      <UIPageHeader
        kicker="${template.name.toUpperCase()}"
        title="${template.name}"
        description="${template.scaffoldGoal}"
      />
      <UIPageBody>
        <WorkbenchShell>
          <WorkbenchFrame className="min-h-[44rem]">
            <WorkbenchSidebar>
              <WorkbenchSidebarItem active label="Overview" />
              <WorkbenchSidebarItem label="Secondary View" />
            </WorkbenchSidebar>
            <WorkbenchMain>
              <WorkbenchTopbar
                title="${template.name}"
                subtitle="Replace this subtitle with the current context for this page."
                actions={<UIButton tone="primary" size="sm">Primary Action</UIButton>}
              />
              <div className="space-y-5 p-5">
                <WorkbenchCommandBar>
                  <div className="min-w-0 flex-1 text-sm text-[var(--text-primary)]">Primary command or search entry</div>
                  <UIBadge tone="info">Command</UIBadge>
                </WorkbenchCommandBar>
                <WorkbenchStatGrid>
                  <WorkbenchStatCard label="Primary" value="12" detail="Replace with page metric" />
                  <WorkbenchStatCard label="Secondary" value="4" detail="Replace with page metric" tone="info" />
                  <WorkbenchStatCard label="Resolved" value="8" detail="Replace with page metric" tone="success" />
                  <WorkbenchStatCard label="Pending" value="3" detail="Replace with page metric" />
                </WorkbenchStatGrid>
                <div className="grid gap-5 xl:grid-cols-2">
                  <WorkbenchSection title="${template.sections[template.sections.length - 2] || 'Primary Section'}" description="Describe why this block matters.">
                    Main content
                  </WorkbenchSection>
                  <WorkbenchSection title="${template.sections[template.sections.length - 1] || 'Secondary Section'}" description="Use this for activity, detail, or supporting context.">
                    Secondary content
                  </WorkbenchSection>
                </div>
              </div>
            </WorkbenchMain>
          </WorkbenchFrame>
        </WorkbenchShell>
      </UIPageBody>
    </UIPageShell>
  )
}`;
}

function buildBoardStarter(template: WorkbenchTemplateDefinition, componentName: string) {
  return `import {
  UIButton,
  UIPageBody,
  UIPageHeader,
  UIPageShell,
  WorkbenchBoard,
  WorkbenchBoardColumn,
  WorkbenchShell,
  WorkbenchTaskCard,
  WorkbenchTopbar,
} from '../components/ui'

export function ${componentName}() {
  return (
    <UIPageShell>
      <UIPageHeader
        kicker="${template.name.toUpperCase()}"
        title="${template.name}"
        description="${template.scaffoldGoal}"
      />
      <UIPageBody>
        <WorkbenchShell className="p-5">
          <WorkbenchTopbar
            title="${template.name}"
            subtitle="Replace this with the board objective and current cycle."
            actions={<UIButton tone="primary" size="sm">Add Card</UIButton>}
          />
          <div className="p-5 pt-4">
            <WorkbenchBoard>
              <WorkbenchBoardColumn title="Now" count="3" tone="warning">
                <WorkbenchTaskCard title="High priority task" description="Describe the current goal." priority="high" />
              </WorkbenchBoardColumn>
              <WorkbenchBoardColumn title="Flowing" count="4" tone="info">
                <WorkbenchTaskCard title="In progress item" description="Describe the current flow." />
              </WorkbenchBoardColumn>
              <WorkbenchBoardColumn title="Done" count="8" tone="success">
                <WorkbenchTaskCard title="Completed item" description="Describe what shipped." priority="done" />
              </WorkbenchBoardColumn>
            </WorkbenchBoard>
          </div>
        </WorkbenchShell>
      </UIPageBody>
    </UIPageShell>
  )
}`;
}

function buildSplitStarter(template: WorkbenchTemplateDefinition, componentName: string) {
  return `import {
  UIButton,
  UIPageBody,
  UIPageHeader,
  UIPageShell,
  WorkbenchFrame,
  WorkbenchMain,
  WorkbenchSection,
  WorkbenchShell,
  WorkbenchSidebar,
  WorkbenchSidebarItem,
  WorkbenchTopbar,
} from '../components/ui'

export function ${componentName}() {
  return (
    <UIPageShell>
      <UIPageHeader
        kicker="${template.name.toUpperCase()}"
        title="${template.name}"
        description="${template.scaffoldGoal}"
      />
      <UIPageBody>
        <WorkbenchShell>
          <WorkbenchFrame className="min-h-[44rem]">
            <WorkbenchSidebar className="w-56">
              <WorkbenchSidebarItem active label="${template.sections[0] || 'Primary View'}" />
              <WorkbenchSidebarItem label="${template.sections[1] || 'Secondary View'}" />
            </WorkbenchSidebar>
            <WorkbenchMain>
              <WorkbenchTopbar
                title="${template.name}"
                subtitle="Use the center for the primary canvas and the right side for focused controls."
                actions={<UIButton tone="primary" size="sm">Apply</UIButton>}
              />
              <div className="grid min-h-0 flex-1 gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
                <WorkbenchSection title="${template.sections[2] || 'Primary Canvas'}" description="Main workspace goes here.">
                  Main workspace
                </WorkbenchSection>
                <div className="space-y-5">
                  <WorkbenchSection title="${template.sections[3] || 'Side Panel'}" description="Place contextual controls or supporting information here.">
                    Side controls
                  </WorkbenchSection>
                  <WorkbenchSection title="${template.sections[4] || 'Support'}" description="Use this block for logs, summaries, or activity.">
                    Supporting details
                  </WorkbenchSection>
                </div>
              </div>
            </WorkbenchMain>
          </WorkbenchFrame>
        </WorkbenchShell>
      </UIPageBody>
    </UIPageShell>
  )
}`;
}

function buildSettingsStarter(template: WorkbenchTemplateDefinition, componentName: string) {
  return `import {
  UIButton,
  UIInput,
  UIPageBody,
  UIPageHeader,
  UIPageShell,
  WorkbenchSection,
  WorkbenchShell,
  WorkbenchTopbar,
} from '../components/ui'

export function ${componentName}() {
  return (
    <UIPageShell>
      <UIPageHeader
        kicker="${template.name.toUpperCase()}"
        title="${template.name}"
        description="${template.scaffoldGoal}"
      />
      <UIPageBody>
        <WorkbenchShell className="p-5">
          <WorkbenchTopbar
            title="${template.name}"
            subtitle="Keep settings grouped and explain each group briefly."
            actions={<UIButton tone="primary" size="sm">Save Changes</UIButton>}
          />
          <div className="grid gap-5 p-5 xl:grid-cols-2">
            <WorkbenchSection title="Appearance" description="Visual preferences and density settings.">
              <div className="space-y-3">
                <UIInput placeholder="Theme preset" />
                <UIInput placeholder="Font scale" />
              </div>
            </WorkbenchSection>
            <WorkbenchSection title="Connections" description="Service and provider configuration.">
              Connection cards go here
            </WorkbenchSection>
            <WorkbenchSection title="Safety" description="High risk actions should be separated from normal controls." className="xl:col-span-2">
              Danger zone
            </WorkbenchSection>
          </div>
        </WorkbenchShell>
      </UIPageBody>
    </UIPageShell>
  )
}`;
}

export function buildWorkbenchStarterCode(
  template: WorkbenchTemplateDefinition,
  componentName = template.starterComponentName,
) {
  if (template.shell === 'board') return buildBoardStarter(template, componentName);
  if (template.shell === 'settings') return buildSettingsStarter(template, componentName);
  if (template.shell === 'split') return buildSplitStarter(template, componentName);
  return buildCockpitStarter(template, componentName);
}

export function getWorkbenchTemplate(templateId: WorkbenchTemplateId) {
  return WORKBENCH_TEMPLATE_REGISTRY.find(template => template.id === templateId) || WORKBENCH_TEMPLATE_REGISTRY[0];
}
