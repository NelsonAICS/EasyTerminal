# EasyTerminal UI Component Library

This document defines the shared UI layer used by the app.
Rule: build or extend components first, then use them in product pages.

## Entry

- In app: left sidebar -> `UI 组件库`
- Source panel: `src/components/UIShowcasePanel.tsx`

## Core Components

### `UIButton`

Use for all clickable actions.

```tsx
<UIButton tone="primary">保存</UIButton>
<UIButton tone="success" size="sm">试运行</UIButton>
<UIButton tone="ghost" size="icon"><X size={16} /></UIButton>
```

- Props:
- `tone`: `primary | neutral | ghost | success | danger`
- `size`: `sm | md | lg | icon`

### `UIInput` / `UITextarea`

Use for all text input controls.

```tsx
<UIInput placeholder="搜索..." />
<UITextarea rows={4} placeholder="请输入内容" />
```

### `UIPanel`

Use for all card/surface containers.

```tsx
<UIPanel className="p-5">...</UIPanel>
```

### `UIBadge`

Use for tags, status, compact metadata.

```tsx
<UIBadge>默认</UIBadge>
<UIBadge tone="info">信息</UIBadge>
<UIBadge tone="success">成功</UIBadge>
<UIBadge tone="danger">异常</UIBadge>
```

- Props:
- `tone`: `neutral | info | success | danger`

### `UISectionKicker`

Use for section kickers (small uppercase headings).

```tsx
<UISectionKicker>WORKFLOW HUB</UISectionKicker>
```

### `UIModal`

Use for full-screen or centered editing overlays.

```tsx
<UIModal open={open}>
  <div>...</div>
</UIModal>
```

## Source Paths

- `src/components/ui/index.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/surface.tsx`
- `src/components/ui/modal.tsx`
- `src/lib/cn.ts`

## Adoption Notes

- New frontend work should import from `src/components/ui`.
- Avoid re-creating one-off button/input/card styles in feature pages.
- If new visual patterns are needed, add them to UI components first.

