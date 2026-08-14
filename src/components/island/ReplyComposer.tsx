import { useEffect, useRef, useState } from 'react'
import type { IslandIpc } from './island-types'

interface ReplyComposerProps {
  interactionId: string
  initialValue?: string
  placeholder?: string
  disabled?: boolean
  ipc: IslandIpc | null
  onSubmit: (value: string) => void
  onDraftChange?: (value: string) => void
  onCancel?: () => void
  submitLabel?: string
  allowEmpty?: boolean
}

export function ReplyComposer({
  interactionId,
  initialValue = '',
  placeholder = '告诉 Agent 需要修改什么……',
  disabled = false,
  ipc,
  onSubmit,
  onDraftChange,
  onCancel,
  submitLabel = '发送',
  allowEmpty = false,
}: ReplyComposerProps) {
  const [value, setValue] = useState(initialValue)
  const [focused, setFocused] = useState(false)
  const [composing, setComposing] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!focused || !ipc) return
    void ipc.invoke('island:set-interactive', { interactionId, interactive: true, reason: 'composer-focus' })
    const firstFrame = window.requestAnimationFrame(() => textAreaRef.current?.focus())
    const delayed = window.setTimeout(() => textAreaRef.current?.focus(), 80)
    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.clearTimeout(delayed)
    }
  }, [focused, interactionId, ipc])

  const submit = () => {
    if (disabled || (!allowEmpty && !value.trim())) return
    onSubmit(value)
  }

  return (
    <div className="island-composer" data-interactive-target="true">
      <textarea
        ref={textAreaRef}
        value={value}
        rows={1}
        maxLength={10000}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        onFocus={() => {
          setFocused(true)
          void ipc?.invoke('island:set-interactive', { interactionId, interactive: true, reason: 'composer-focus' })
        }}
        onBlur={() => {
          setFocused(false)
          window.setTimeout(() => {
            if (!value.trim()) void ipc?.invoke('island:set-interactive', { interactionId, interactive: false, reason: 'composer-blur' })
          }, 200)
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onChange={event => {
          setValue(event.target.value)
          onDraftChange?.(event.target.value)
        }}
        onKeyDown={event => {
          event.stopPropagation()
          if (event.key === 'Enter' && !event.shiftKey && !composing && !event.nativeEvent.isComposing) {
            event.preventDefault()
            submit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel?.()
          }
        }}
      />
      <div className="island-composer-footer">
        <span className="island-composer-hint">Enter 发送 · Shift+Enter 换行</span>
        <span className="island-char-count">{value.length}/10000</span>
        <button type="button" className="island-button island-button-primary" disabled={disabled || (!allowEmpty && !value.trim())} onMouseDown={event => event.preventDefault()} onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
