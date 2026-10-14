import { useCallback, useEffect, useState } from 'react'
import { clearFileHandle, loadFileHandle, saveFileHandle } from '@/lib/fileHandleStore'
import { parseRitualFile, renderRitualFile, type RitualAnswers } from '@/lib/ritualTemplate'

export type RitualFileStatus =
  | 'checking'
  | 'unsupported'
  | 'no-file'
  | 'needs-permission'
  | 'ready'
  | 'error'

const PICKER_OPTIONS: OpenFilePickerOptions = {
  types: [{ description: 'Ritual', accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt'] } }],
  excludeAcceptAllOption: false,
}

/**
 * Lê/escreve o arquivo de ritual direto do disco via File System Access API
 * (só Chrome/Edge) — guarda o handle no IndexedDB pra não pedir pra
 * escolher o arquivo de novo toda vez, só reconfirmar permissão quando o
 * Chrome exigir.
 */
export function useRitualFile() {
  const supported = typeof window !== 'undefined' && 'showOpenFilePicker' in window
  const [status, setStatus] = useState<RitualFileStatus>(supported ? 'checking' : 'unsupported')
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null)
  const [answers, setAnswers] = useState<RitualAnswers | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadFromHandle = useCallback(async (h: FileSystemFileHandle) => {
    try {
      const file = await h.getFile()
      const text = await file.text()
      setAnswers(parseRitualFile(text))
      setFileName(h.name)
      setHandle(h)
      setError(null)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('Não consegui ler o arquivo — ele pode ter sido movido ou apagado.')
    }
  }, [])

  // Ao abrir a página: recupera o handle salvo e, se a permissão ainda vale, carrega direto sem pedir nada.
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    void (async () => {
      const saved = await loadFileHandle()
      if (cancelled) return
      if (!saved) {
        setStatus('no-file')
        return
      }
      const perm = await saved.queryPermission({ mode: 'readwrite' })
      if (cancelled) return
      setHandle(saved)
      setFileName(saved.name)
      if (perm === 'granted') {
        await loadFromHandle(saved)
      } else {
        setStatus('needs-permission')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supported, loadFromHandle])

  const pickFile = useCallback(async () => {
    try {
      const [h] = await window.showOpenFilePicker(PICKER_OPTIONS)
      await saveFileHandle(h)
      await loadFromHandle(h)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setStatus('error')
      setError('Não consegui abrir o arquivo.')
    }
  }, [loadFromHandle])

  const reconnect = useCallback(async () => {
    if (!handle) return
    try {
      const perm = await handle.requestPermission({ mode: 'readwrite' })
      if (perm === 'granted') {
        await loadFromHandle(handle)
      }
    } catch {
      setStatus('error')
      setError('Permissão negada pelo navegador.')
    }
  }, [handle, loadFromHandle])

  /** Relê o arquivo do zero — garante que o que aparece na tela é sempre o conteúdo atual do disco. */
  const reload = useCallback(async () => {
    if (!handle) return
    await loadFromHandle(handle)
  }, [handle, loadFromHandle])

  const forget = useCallback(async () => {
    await clearFileHandle()
    setHandle(null)
    setAnswers(null)
    setFileName(null)
    setError(null)
    setStatus('no-file')
  }, [])

  const save = useCallback(
    async (next: RitualAnswers): Promise<boolean> => {
      if (!handle) return false
      setSaving(true)
      try {
        const writable = await handle.createWritable()
        await writable.write(renderRitualFile(next))
        await writable.close()
        setAnswers(next)
        setSaving(false)
        return true
      } catch {
        setSaving(false)
        setError('Não consegui salvar no arquivo.')
        return false
      }
    },
    [handle],
  )

  return { status, answers, fileName, error, saving, pickFile, reconnect, forget, save, setAnswers, reload }
}

export type UseRitualFileReturn = ReturnType<typeof useRitualFile>
