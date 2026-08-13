import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Command,
  Copy,
  FolderKanban,
  Layers3,
  LayoutTemplate,
  MonitorSmartphone,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  buildWorkbenchStarterCode,
  type WorkbenchTemplateDefinition,
  type WorkbenchTemplateId,
  WORKBENCH_SCAFFOLD_RULES,
  WORKBENCH_TEMPLATE_REGISTRY,
} from '../lib/workbench-templates';
import {
  UIBadge,
  UIButton,
  UICardGrid,
  UIInput,
  UIListCard,
  UIPageBody,
  UIPageHeader,
  UIPageShell,
  UIPanel,
  UISectionKicker,
  WorkbenchBoard,
  WorkbenchBoardColumn,
  WorkbenchCommandBar,
  WorkbenchFrame,
  WorkbenchMain,
  WorkbenchSection,
  WorkbenchShell,
  WorkbenchSidebar,
  WorkbenchSidebarItem,
  WorkbenchStatCard,
  WorkbenchStatGrid,
  WorkbenchTaskCard,
  WorkbenchTopbar,
} from './ui';

const templateIconMap = {
  sparkles: Sparkles,
  kanban: FolderKanban,
  desktop: MonitorSmartphone,
  wand: Wand2,
  layers: Layers3,
  review: CheckCircle2,
  command: Command,
} as const;

function renderTemplatePreview(template: WorkbenchTemplateDefinition) {
  if (template.preview.mode === 'board') {
    return (
      <WorkbenchShell className="min-h-[36rem] p-5">
        <WorkbenchTopbar
          title={template.name}
          subtitle={template.summary}
          actions={
            <>
              <UIButton tone="ghost" size="sm">Filter</UIButton>
              <UIButton tone="primary" size="sm">Add Card</UIButton>
            </>
          }
        />
        <div className="p-5 pt-4">
          <WorkbenchBoard>
            {(template.preview.columns || []).map(column => (
              <WorkbenchBoardColumn key={column.title} title={column.title} count={column.count} tone={column.tone}>
                {column.cards.map(card => (
                  <WorkbenchTaskCard
                    key={card.title}
                    title={card.title}
                    description={card.description}
                    priority={card.priority}
                    meta={card.meta.map(meta => <span key={`${card.title}-${meta}`}>{meta}</span>)}
                  />
                ))}
              </WorkbenchBoardColumn>
            ))}
          </WorkbenchBoard>
        </div>
      </WorkbenchShell>
    );
  }

  if (template.preview.mode === 'settings') {
    return (
      <WorkbenchShell className="min-h-[36rem] p-5">
        <WorkbenchTopbar
          title={template.name}
          subtitle={template.summary}
          actions={<UIButton tone="primary" size="sm">Save Changes</UIButton>}
        />
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          {(template.preview.sections || []).map(section => (
            <WorkbenchSection
              key={section.title}
              title={section.title}
              description={section.description}
              className={section.title === 'Safety' ? 'xl:col-span-2' : undefined}
            >
              <div className="space-y-3">
                {section.items.map(item => (
                  <div key={`${section.title}-${item}`} className="rounded-[1.25rem] border border-[var(--panel-border)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-primary)]">
                    {item}
                  </div>
                ))}
              </div>
            </WorkbenchSection>
          ))}
        </div>
      </WorkbenchShell>
    );
  }

  if (template.preview.mode === 'split') {
    return (
      <WorkbenchShell className="min-h-[36rem]">
        <WorkbenchFrame className="min-h-[36rem]">
          <WorkbenchSidebar className="w-56">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{template.name}</div>
            <div className="mt-3 space-y-2">
              {(template.preview.sidebarItems || []).map((item, index) => (
                <WorkbenchSidebarItem key={item} active={index === 0} label={item} />
              ))}
            </div>
          </WorkbenchSidebar>
          <WorkbenchMain>
            <WorkbenchTopbar
              title={template.name}
              subtitle={template.summary}
              actions={
                <>
                  <UIButton tone="ghost" size="sm">Preview</UIButton>
                  <UIButton tone="primary" size="sm">Apply</UIButton>
                </>
              }
            />
            <div className="grid min-h-0 flex-1 gap-5 p-5 xl:grid-cols-[1.08fr_0.92fr]">
              <WorkbenchSection
                title={template.preview.sections?.[0]?.title || 'Primary Canvas'}
                description={template.preview.sections?.[0]?.description || 'Main workspace'}
              >
                <div className="space-y-3">
                  {(template.preview.sections?.[0]?.items || []).map(item => (
                    <div key={item} className="rounded-[1.25rem] border border-dashed border-[var(--panel-border)] bg-black/10 px-4 py-4 text-sm text-[var(--text-primary)]">
                      {item}
                    </div>
                  ))}
                </div>
              </WorkbenchSection>
              <div className="space-y-5">
                {(template.preview.sections || []).slice(1).map(section => (
                  <WorkbenchSection key={section.title} title={section.title} description={section.description}>
                    <div className="space-y-3">
                      {section.items.map(item => (
                        <div key={`${section.title}-${item}`} className="rounded-[1.25rem] border border-[var(--panel-border)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-primary)]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </WorkbenchSection>
                ))}
              </div>
            </div>
          </WorkbenchMain>
        </WorkbenchFrame>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell className="min-h-[36rem]">
      <WorkbenchFrame className="min-h-[36rem]">
        <WorkbenchSidebar>
          <div className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--panel-border)] bg-white/[0.04] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[var(--accent)]/12 text-[var(--accent)]">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{template.name}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{template.useCase}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(template.preview.sidebarItems || []).map((item, index) => (
              <WorkbenchSidebarItem key={item} active={index === 0} label={item} />
            ))}
          </div>
        </WorkbenchSidebar>
        <WorkbenchMain>
          <WorkbenchTopbar
            title={template.name}
            subtitle={template.summary}
            actions={
              <>
                <UIButton tone="ghost" size="sm">Customize</UIButton>
                <UIButton tone="primary" size="sm">Primary Action</UIButton>
              </>
            }
          />
          <div className="space-y-5 p-5">
            <WorkbenchCommandBar>
              <Command size={16} className="text-[var(--accent)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[var(--text-primary)]">{template.preview.commandHint || template.scaffoldGoal}</div>
                <div className="mt-1 text-[11px] text-[var(--text-secondary)]">Cmd+K to focus · Tab to autocomplete</div>
              </div>
              <UIBadge tone="info">Command</UIBadge>
            </WorkbenchCommandBar>
            <WorkbenchStatGrid>
              {(template.preview.stats || []).map(stat => (
                <WorkbenchStatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  detail={stat.detail}
                  tone={stat.tone}
                />
              ))}
            </WorkbenchStatGrid>
            <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              {(template.preview.sections || []).map(section => (
                <WorkbenchSection key={section.title} title={section.title} description={section.description}>
                  <div className="space-y-3">
                    {section.items.map(item => (
                      <div key={`${section.title}-${item}`} className="rounded-[1.25rem] border border-[var(--panel-border)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-primary)]">
                        {item}
                      </div>
                    ))}
                  </div>
                </WorkbenchSection>
              ))}
            </div>
          </div>
        </WorkbenchMain>
      </WorkbenchFrame>
    </WorkbenchShell>
  );
}

export function UIShowcasePanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<WorkbenchTemplateId>('cockpit');

  const filteredTemplates = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return WORKBENCH_TEMPLATE_REGISTRY;
    return WORKBENCH_TEMPLATE_REGISTRY.filter(template => {
      return `${template.name} ${template.summary} ${template.useCase} ${template.sections.join(' ')}`.toLowerCase().includes(normalized);
    });
  }, [searchQuery]);

  const activeTemplate = filteredTemplates.find(template => template.id === activeTemplateId)
    || WORKBENCH_TEMPLATE_REGISTRY.find(template => template.id === activeTemplateId)
    || WORKBENCH_TEMPLATE_REGISTRY[0];

  const starterCode = buildWorkbenchStarterCode(activeTemplate);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(''), 1200);
  };

  return (
    <UIPageShell>
      <UIPageHeader
        kicker="WORKBENCH UI ENGINE"
        title="页面脚手架生成规范 + 模板中心"
        description="现在不只是组件库，而是一套面向个人工作台、生产力工具、看板和桌面应用的页面生成方法。模板、规则、起步代码都来自同一个注册表。"
        actions={<UIButton tone="primary">Scaffold Ready</UIButton>}
      >
        <div className="mt-5 flex flex-wrap gap-2">
          <UIBadge>Desktop-first</UIBadge>
          <UIBadge tone="info">Template-driven</UIBadge>
          <UIBadge tone="success">Production UI</UIBadge>
        </div>
      </UIPageHeader>

      <UIPageBody className="space-y-5">
        <UICardGrid className="2xl:grid-cols-4">
          <UIListCard>
            <UISectionKicker>Engine</UISectionKicker>
            <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">模板先行</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              新页面先选模板壳层，再填 section 和动作，不再从空白容器开始。
            </p>
          </UIListCard>
          <UIListCard>
            <UISectionKicker>Scope</UISectionKicker>
            <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">工作台取向</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              默认适配个人控制台、Prompt 工作区、知识台、审查站和桌面工具。
            </p>
          </UIListCard>
          <UIListCard>
            <UISectionKicker>Contract</UISectionKicker>
            <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">统一页面契约</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              标题、上下文、主动作、主要区域和状态反馈都被收敛到可复用规范里。
            </p>
          </UIListCard>
          <UIListCard>
            <UISectionKicker>Output</UISectionKicker>
            <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">直接复制起步代码</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              选中模板后就能复制脚手架起步代码，再按页面需求继续细化。
            </p>
          </UIListCard>
        </UICardGrid>

        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <UIPanel className="p-5">
            <div className="flex items-center gap-2">
              <LayoutTemplate size={17} className="text-[var(--accent)]" />
              <div className="text-base font-semibold text-[var(--text-primary)]">模板注册表</div>
            </div>
            <div className="relative mt-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <UIInput
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="搜索模板、场景、页面结构"
                className="pl-9 text-sm"
              />
            </div>
            <div className="mt-4 space-y-3">
              {filteredTemplates.map(template => {
                const Icon = templateIconMap[template.icon];
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setActiveTemplateId(template.id)}
                    className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors ${
                      activeTemplate.id === template.id
                        ? 'border-[var(--panel-border-glow)] bg-[var(--accent)]/10'
                        : 'border-[var(--panel-border)] bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[var(--panel-border)] bg-white/[0.04] text-[var(--accent)]">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{template.name}</div>
                        <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{template.summary}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <UIBadge className="px-2.5 py-1 text-[10px]">{template.shell}</UIBadge>
                      <UIBadge tone="info" className="px-2.5 py-1 text-[10px]">{template.useCase}</UIBadge>
                    </div>
                  </button>
                );
              })}
            </div>
          </UIPanel>

          <UIPanel className="overflow-hidden p-4">
            <div className="mb-4 flex items-center justify-between gap-3 px-2">
              <div>
                <div className="text-base font-semibold text-[var(--text-primary)]">Live Template Preview</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{activeTemplate.scaffoldGoal}</div>
              </div>
              <UIBadge tone="info">{activeTemplate.id}</UIBadge>
            </div>
            {renderTemplatePreview(activeTemplate)}
          </UIPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr]">
          <UIPanel className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-300" />
              <div className="text-base font-semibold text-[var(--text-primary)]">页面脚手架规范</div>
            </div>
            <div className="mt-4 space-y-3">
              {WORKBENCH_SCAFFOLD_RULES.map(rule => (
                <div key={rule} className="rounded-[1.25rem] border border-[var(--panel-border)] bg-white/[0.03] px-4 py-3 text-sm leading-7 text-[var(--text-primary)]">
                  {rule}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--panel-border)] bg-black/10 p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">当前模板必须包含</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeTemplate.sections.map(section => (
                  <UIBadge key={section} className="px-2.5 py-1 text-[10px]">
                    {section}
                  </UIBadge>
                ))}
              </div>
              <div className="mt-4 text-sm font-semibold text-[var(--text-primary)]">验收标准</div>
              <div className="mt-3 space-y-2">
                {activeTemplate.acceptanceCriteria.map(item => (
                  <div key={item} className="rounded-[1rem] border border-[var(--panel-border)] bg-white/[0.03] px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </UIPanel>

          <UIPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[var(--text-primary)]">生成脚手架起步代码</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">
                  来自 `workbench-templates` 注册表的代码生成结果，可直接复制作为新页面起点。
                </div>
              </div>
              <UIButton tone="ghost" size="sm" onClick={() => void copyCode(starterCode)}>
                <Copy size={13} />
                {copied === starterCode ? '已复制' : '复制脚手架'}
              </UIButton>
            </div>

            <pre className="mt-4 max-h-[34rem] overflow-auto rounded-[1.5rem] border border-[var(--panel-border)] bg-black/20 p-4 text-xs leading-6 text-cyan-200">
              <code>{starterCode}</code>
            </pre>
          </UIPanel>
        </div>
      </UIPageBody>
    </UIPageShell>
  );
}
