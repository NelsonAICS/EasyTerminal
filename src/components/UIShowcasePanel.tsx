import { useState } from 'react';
import { CheckCircle2, Component, Copy, Search } from 'lucide-react';
import { UIBadge, UIButton, UIInput, UIModal, UIPanel, UISectionKicker, UITextarea } from './ui';

const usage = [
  {
    name: 'UIButton',
    code: `<UIButton tone="primary">保存</UIButton>`,
    note: '统一按钮尺寸、色阶和交互态，避免每页自己写样式。',
  },
  {
    name: 'UIInput / UITextarea',
    code: `<UIInput placeholder="搜索..." />`,
    note: '统一输入框圆角、边框、焦点态和文字尺寸。',
  },
  {
    name: 'UIPanel',
    code: `<UIPanel className="p-4">内容</UIPanel>`,
    note: '统一卡片容器视觉和层级，保证页面结构一致。',
  },
  {
    name: 'UIBadge',
    code: `<UIBadge tone="info">标签</UIBadge>`,
    note: '用于分类、状态和摘要信息。',
  },
  {
    name: 'UIModal',
    code: `<UIModal open={open}>...</UIModal>`,
    note: '统一弹层基础结构，用于编辑器/配置页面。',
  },
];

export function UIShowcasePanel() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [copied, setCopied] = useState('');

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(''), 1200);
  };

  return (
    <div className="h-full min-w-0 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <UIPanel className="px-6 py-6">
          <UISectionKicker>UI KIT ENTRY</UISectionKicker>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">UI 组件库</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/48">
            以后前端先扩展组件，再落页面。这里是统一组件入口，包含示例、名称和基础用法，避免不同页面风格漂移。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <UIBadge>统一设计语言</UIBadge>
            <UIBadge tone="info">先组件后页面</UIBadge>
            <UIBadge tone="success">可复用可维护</UIBadge>
          </div>
        </UIPanel>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <UIPanel className="p-5">
            <div className="flex items-center gap-2">
              <Component size={16} className="text-cyan-300" />
              <div className="text-base font-semibold text-white">组件清单与用法</div>
            </div>
            <div className="mt-4 space-y-3">
              {usage.map(item => (
                <div key={item.name} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <UIButton tone="ghost" size="sm" onClick={() => void copyCode(item.code)}>
                      <Copy size={13} />
                      {copied === item.code ? '已复制' : '复制'}
                    </UIButton>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-cyan-200">
                    <code>{item.code}</code>
                  </pre>
                  <div className="mt-2 text-xs leading-6 text-white/50">{item.note}</div>
                </div>
              ))}
            </div>
          </UIPanel>

          <UIPanel className="p-5">
            <div className="text-base font-semibold text-white">实时示例</div>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <UIButton tone="primary">主按钮</UIButton>
                <UIButton tone="neutral">次按钮</UIButton>
                <UIButton tone="success">成功</UIButton>
                <UIButton tone="danger">危险</UIButton>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-white/35" />
                <UIInput placeholder="输入框示例" className="pl-9" />
              </div>

              <UITextarea rows={4} placeholder="多行输入示例" />

              <div className="flex flex-wrap gap-2">
                <UIBadge>默认标签</UIBadge>
                <UIBadge tone="info">信息</UIBadge>
                <UIBadge tone="success">完成</UIBadge>
                <UIBadge tone="danger">异常</UIBadge>
              </div>

              <UIButton tone="primary" onClick={() => setDemoOpen(true)}>
                打开 Modal 示例
              </UIButton>
            </div>
          </UIPanel>
        </div>
      </div>

      <UIModal open={demoOpen} className="max-w-3xl">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 bg-black/30">
            <div className="text-sm font-medium text-white">UIModal 示例</div>
            <UIButton tone="ghost" size="icon" onClick={() => setDemoOpen(false)}>
              <CheckCircle2 size={16} />
            </UIButton>
          </div>
          <div className="p-6 text-sm leading-7 text-white/70">
            这里展示统一弹层结构。后续新增设置页、编辑页都应复用 `UIModal`，不要再单独写一套弹层样式。
          </div>
        </div>
      </UIModal>
    </div>
  );
}

