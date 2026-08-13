/**
 * EasyTerminal Design Token System
 *
 * 这是一个集中化的设计令牌系统，确保 UI 组件的视觉一致性。
 * 所有组件样式应通过这些令牌构建，避免硬编码值。
 *
 * 设计原则：
 * - 颜色通过 CSS 变量引用（支持主题切换）
 * - 间距使用 4px 基准网格
 * - 圆角按使用场景分层（sm/md/lg/xl）
 * - 阴影按深度分层（subtle/raised/elevated/overlay）
 */

// ─── Color Tokens ────────────────────────────────────────────────
/**
 * 颜色令牌 - 映射到 CSS 变量
 * 使用 var() 引用确保主题切换时自动适配
 */
export const colors = {
  /** 主背景色 */
  bgBase: 'var(--bg-base)',
  /** 背景渐变 */
  bgGradient: 'var(--bg-gradient)',

  /** 面板背景色 */
  panelBg: 'var(--panel-bg)',
  /** 面板边框色 */
  panelBorder: 'var(--panel-border)',
  /** 面板聚焦边框发光色 */
  panelBorderGlow: 'var(--panel-border-glow)',

  /** 主要强调色 */
  accent: 'var(--accent)',

  /** 主要文字色 */
  textPrimary: 'var(--text-primary)',
  /** 次要文字色 */
  textSecondary: 'var(--text-secondary)',

  /** 终端背景色 */
  termBg: 'var(--term-bg)',
  /** 终端前景色 */
  termFg: 'var(--term-fg)',

  /** 弱表面色（按钮、输入框背景） */
  surfaceMuted: 'var(--surface-muted)',
  /** 强表面色（对话框、卡片背景） */
  surfaceStrong: 'var(--surface-strong)',

  /** 阴影颜色 */
  shadowColor: 'var(--shadow-color)',

  /** 语义颜色 */
  semantic: {
    danger: '#f87171',
    dangerMuted: 'rgba(248, 113, 113, 0.18)',
    success: '#4ade80',
    successMuted: 'rgba(74, 222, 128, 0.20)',
    warning: '#fbbf24',
    warningMuted: 'rgba(251, 191, 36, 0.18)',
    info: '#60a5fa',
    infoMuted: 'rgba(96, 165, 250, 0.18)',
  },
} as const;

// ─── Spacing Tokens ─────────────────────────────────────────────
/**
 * 间距令牌 - 基于 4px 基准网格
 * 使用固定值而非 Tailwind 语义名，确保精确控制
 */
export const spacing = {
  /** 2px */
  0.5: '2px',
  /** 4px */
  1: '4px',
  /** 8px */
  2: '8px',
  /** 12px */
  3: '12px',
  /** 16px */
  4: '16px',
  /** 20px */
  5: '20px',
  /** 24px */
  6: '24px',
  /** 32px */
  8: '32px',
  /** 40px */
  10: '40px',
  /** 48px */
  12: '48px',
  /** 64px */
  16: '64px',
} as const;

// ─── Border Radius Tokens ───────────────────────────────────────
/**
 * 圆角令牌 - 按使用场景分层
 *
 * - subtle: 基础元素，圆角最小
 * - default: 标准元素，大多数组件使用
 * - lg: 大面板、卡片
 * - xl: 大面积面板、模态框
 * - full: 完全圆角（用于 badge、pill 等）
 */
export const radius = {
  /** 12px */
  subtle: '12px',
  /** 16px */
  default: '16px',
  /** 20px */
  lg: '20px',
  /** 28px */
  xl: '28px',
  /** 32px */
  '2xl': '32px',
  /** 完全圆角 */
  full: '9999px',
} as const;

/**
 * 圆角 Tailwind 类名 - 用于 className
 * 与 radius 令牌对应，但使用 Tailwind 类名格式
 */
export const radiusClass = {
  subtle: 'rounded-xl',
  default: 'rounded-2xl',
  lg: 'rounded-2xl',
  xl: 'rounded-[1.75rem]',
  '2xl': 'rounded-[2rem]',
  full: 'rounded-full',
} as const;

// ─── Shadow Tokens ──────────────────────────────────────────────
/**
 * 阴影令牌 - 按深度分层
 *
 * - inset: 内凹效果（输入框内部阴影）
 * - sm: 微弱阴影
 * - default: 标准阴影
 * - md: 中等阴影（按钮默认）
 * - lg: 大阴影（面板）
 * - xl: 极大阴影（模态框）
 * - glow: 发光效果（聚焦状态）
 */
export const shadows = {
  /** 内凹阴影 - 用于输入框内部高光 */
  inset: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  /** 微弱阴影 */
  sm: '0 1px 2px var(--shadow-color)',
  /** 标准阴影 */
  default: '0 2px 8px var(--shadow-color)',
  /** 按钮默认阴影 */
  button: '0 8px 24px rgba(0,0,0,0.16)',
  /** 面板阴影 */
  panel: '0 4px 20px var(--shadow-color)',
  /** 模态框阴影 */
  modal: '0 40px 120px rgba(0,0,0,0.55)',
  /** 聚焦发光效果 */
  glow: '0 0 0 2px var(--panel-border-glow)',
  /** 悬停发光效果 */
  glowHover: '0 0 0 3px rgba(96, 165, 250, 0.2)',
} as const;

// ─── Transition Tokens ───────────────────────────────────────────
/**
 * 过渡动画令牌 - 统一样式切换动画时长
 */
export const transitions = {
  /** 快速 - 悬停状态 */
  fast: '150ms',
  /** 默认 - 常规状态切换 */
  default: '200ms',
  /** 慢速 - 面板展开 */
  slow: '300ms',
  /** 贝塞尔曲线 - 标准缓动 */
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─── Component Tokens ───────────────────────────────────────────
/**
 * 组件基础样式令牌 - 提供可复用的 class 字符串组合
 */

/** 输入框基础样式 */
export const inputBase = [
  'w-full',
  'border',
  'outline-none',
  'transition-colors',
  `shadow-[${shadows.inset}]`,
  'placeholder:text-white/30',
].join(' ');

/** 输入框聚焦样式 */
export const inputFocus = [
  'focus:border-[var(--panel-border-glow)]',
  'focus:bg-white/[0.09]',
].join(' ');

/** 面板基础样式 */
export const panelBase = [
  'rounded-[1.75rem]',
  'border',
  'bg-[var(--surface-muted)]',
  'border-[var(--panel-border)]',
].join(' ');

/** 面板悬停样式 */
export const panelHover = [
  'hover:border-[var(--panel-border-glow)]',
].join(' ');

/** 模态框基础样式 */
export const modalBase = [
  'rounded-[2rem]',
  'border',
  'border-[var(--panel-border)]',
  'shadow-[0_40px_120px_rgba(0,0,0,0.55)]',
  'bg-[linear-gradient(180deg,rgba(10,14,25,0.98),rgba(8,12,22,0.99))]',
].join(' ');

/** 按钮基础样式 */
export const buttonBase = [
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-1.5',
  'border',
  'font-medium',
  'transition-colors',
  'disabled:cursor-not-allowed',
  'disabled:opacity-50',
].join(' ');

/** 文本输入框圆角 */
export const inputRadius = radius.lg; // rounded-2xl (20px)

/** 面板圆角 */
export const panelRadius = '1.75rem'; // rounded-[1.75rem]

/** 模态框圆角 */
export const modalRadius = '2rem'; // rounded-[2rem]

// ─── Typography Tokens ───────────────────────────────────────────
/**
 * 字体/排版令牌 - 统一样式层级
 */
export const typography = {
  /** 页面标题 */
  pageTitle: {
    fontSize: '30px',
    fontWeight: '600',
    lineHeight: '1.2',
    letterSpacing: '-0.025em',
    color: colors.textPrimary,
  },
  /** 面板标题 */
  panelTitle: {
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.3',
    letterSpacing: '-0.015em',
    color: colors.textPrimary,
  },
  /** 卡片标题 */
  cardTitle: {
    fontSize: '16px',
    fontWeight: '500',
    lineHeight: '1.4',
    color: colors.textPrimary,
  },
  /** 正文文字 */
  body: {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.6',
    color: colors.textPrimary,
  },
  /** 次要文字 */
  caption: {
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.5',
    color: colors.textSecondary,
  },
  /** 标签文字 */
  kicker: {
    fontSize: '11px',
    fontWeight: '500',
    lineHeight: '1',
    letterSpacing: '0.24em',
    color: colors.textSecondary,
  },
} as const;

// ─── Focus Ring Tokens ───────────────────────────────────────────
/**
 * 聚焦环令牌 - 确保键盘可访问性
 */
export const focusRing = {
  /** 默认聚焦环 */
  default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
  /** 无聚焦环（用于已有边框的元素） */
  none: '',
} as const;

// ─── Backdrop Blur Tokens ───────────────────────────────────────
/**
 * 背景模糊令牌 - 用于毛玻璃效果
 */
export const backdrop = {
  /** 微模糊 */
  sm: 'backdrop-blur-sm',
  /** 标准模糊 */
  default: 'backdrop-blur-lg',
  /** 强模糊 */
  xl: 'backdrop-blur-2xl',
} as const;

// ─── Z-Index Scale ──────────────────────────────────────────────
/**
 * Z-Index 层级令牌 - 避免层级冲突
 */
export const zIndex = {
  /** 基础层级 */
  base: '0',
  /** 悬浮元素 */
  raised: '10',
  /** 下拉菜单 */
  dropdown: '50',
  /** 侧边栏 */
  sidebar: '60',
  /** Island / 灵动岛 */
  island: '80',
  /** 模态框背景 */
  modalBackdrop: '110',
  /** 模态框 */
  modal: '120',
  /** Toast / 通知 */
  toast: '150',
  /** Tooltip */
  tooltip: '180',
} as const;

// ─── Utility Classes ─────────────────────────────────────────────
/**
 * 常用样式组合 - 减少重复代码
 */

/** 面板内边距 */
export const panelPadding = 'px-5 py-5';

/** Section 内边距 */
export const sectionPadding = 'px-5 py-5 sm:px-8';

/** 页面内边距 */
export const pagePadding = 'px-5 py-5 sm:px-8';

/** 分隔线样式 */
export const divider = 'border-b border-[var(--panel-border)]';

/** 列表项悬停效果 */
export const listItemHover = 'hover:bg-[var(--surface-muted)] transition-colors rounded-xl';

/** 禁用状态 */
export const disabled = 'opacity-50 cursor-not-allowed pointer-events-none';

/** 文字截断 */
export const truncate = 'overflow-hidden text-ellipsis whitespace-nowrap';

/** 滚动条隐藏 */
export const scrollbarHidden = 'scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';
