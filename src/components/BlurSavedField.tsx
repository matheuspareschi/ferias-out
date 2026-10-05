import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Regra 0.1: enquanto o campo está focado, o texto vive só em estado local
 * — sem gravar, sem comparar com o banco, sem re-renderizar o resto da
 * tela (por isso isso mora dentro do próprio input/textarea, não num hook
 * usado pelo componente pai). Grava só ao sair do foco, trocar de
 * aba/página (`visibilitychange`) ou desmontar com o campo ainda focado.
 * Uma atualização vinda de fora (outra aba, sync) nunca sobrescreve um
 * campo focado.
 */
function useBlurSave(value: string, onSave: (value: string) => void) {
  const [local, setLocal] = useState(value)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const localRef = useRef(local)
  const editingRef = useRef(false)
  const savedValueRef = useRef(value)
  const onSaveRef = useRef(onSave)
  const savedPulseTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    localRef.current = local
  })
  useEffect(() => {
    onSaveRef.current = onSave
  })

  useEffect(() => {
    if (!editing) {
      setLocal(value)
      savedValueRef.current = value
    }
  }, [value, editing])

  const commit = useCallback(() => {
    if (localRef.current !== savedValueRef.current) {
      onSaveRef.current(localRef.current)
      savedValueRef.current = localRef.current
      setSaved(true)
      window.clearTimeout(savedPulseTimer.current)
      savedPulseTimer.current = window.setTimeout(() => setSaved(false), 1500)
    }
  }, [])

  const handleFocus = useCallback(() => {
    editingRef.current = true
    setEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    editingRef.current = false
    setEditing(false)
    commit()
  }, [commit])

  useEffect(() => {
    if (!editing) return
    function onVisibilityChange() {
      if (document.hidden) commit()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [editing, commit])

  // Salva se o componente desmontar com o campo ainda em foco (ex.: trocou de página).
  useEffect(
    () => () => {
      if (editingRef.current) onSaveRef.current(localRef.current)
      window.clearTimeout(savedPulseTimer.current)
    },
    [],
  )

  return {
    local,
    saved,
    onChange: (next: string) => setLocal(next),
    onFocus: handleFocus,
    onBlur: handleBlur,
  }
}

function SavedPulse({ saved }: { saved: boolean }) {
  return (
    <span
      className={cn(
        'pointer-events-none select-none font-mono text-[9px] text-done transition-opacity duration-300',
        saved ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!saved}
    >
      salvo
    </span>
  )
}

interface BlurSavedTextareaProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
}

export function BlurSavedTextarea({ value, onSave, placeholder, className, rows }: BlurSavedTextareaProps) {
  const field = useBlurSave(value, onSave)
  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={field.local}
        onChange={(e) => field.onChange(e.target.value)}
        onFocus={field.onFocus}
        onBlur={field.onBlur}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      <SavedPulse saved={field.saved} />
    </div>
  )
}

interface BlurSavedInputProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  type?: 'text' | 'number'
  min?: number
  showSaved?: boolean
}

export function BlurSavedInput({ value, onSave, placeholder, className, type = 'text', min, showSaved }: BlurSavedInputProps) {
  const field = useBlurSave(value, onSave)
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={field.local}
        onChange={(e) => field.onChange(e.target.value)}
        onFocus={field.onFocus}
        onBlur={field.onBlur}
        placeholder={placeholder}
        type={type}
        min={min}
        className={className}
      />
      {showSaved && <SavedPulse saved={field.saved} />}
    </div>
  )
}
