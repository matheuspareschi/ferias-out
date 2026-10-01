import { ChevronLeft, ChevronRight, Cloud, CloudOff, Download, Moon, Plug, RefreshCw, Sun, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { ComingSoon } from '@/components/ComingSoon'
import { DayTrail } from '@/components/DayTrail'
import { NavTabs, type SectionId } from '@/components/NavTabs'
import { PlannerBoard } from '@/components/planner/PlannerBoard'
import { usePlanner } from '@/hooks/usePlanner'
import { useTheme } from '@/hooks/useTheme'
import { addDays, todayId } from '@/lib/dates'
import { cn } from '@/lib/utils'

function SyncIndicator({ status }: { status: ReturnType<typeof usePlanner>['syncStatus'] }) {
  if (status === 'disabled') return null
  if (status === 'syncing') {
    return (
      <span title="Sincronizando…" className="flex items-center text-ink-faint">
        <RefreshCw className="size-3.5 animate-spin" />
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span title="Falha ao sincronizar — dados salvos só neste aparelho por enquanto" className="flex items-center text-attention">
        <CloudOff className="size-3.5" />
      </span>
    )
  }
  return (
    <span title="Sincronizado" className="flex items-center text-done">
      <Cloud className="size-3.5" />
    </span>
  )
}

/** Placeholder — a integração real com Google Calendar chega na Fase 4. */
function GoogleStatus() {
  return (
    <span title="Integração com Google Calendar ainda não conectada (chega na Fase 4)" className="flex items-center text-ink-faint">
      <Plug className="size-3.5" />
    </span>
  )
}

const headerButtonClass =
  'flex items-center gap-1.5 rounded-sm border border-line px-2 py-1.5 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink'

const COMING_SOON: Record<Exclude<SectionId, 'semana'>, { title: string; note: string }> = {
  mes: { title: 'Mês', note: 'Visão mensal chega na Fase 4, junto com a integração ao Google Calendar.' },
  ano: { title: 'Ano', note: 'Visão anual chega na Fase 4, junto com a integração ao Google Calendar.' },
  habitos: { title: 'Hábitos', note: 'Página dedicada de hábitos chega na Fase 3 — por enquanto eles aparecem na faixa de cada dia, na Semana.' },
  backlog: { title: 'Backlog', note: 'Página cheia de backlog chega na Fase 5 — por enquanto use o painel de backlog na Semana.' },
  projetos: { title: 'Projetos', note: 'Páginas de projetos chegam na Fase 6.' },
  retrospectiva: { title: 'Retrospectiva', note: 'Geração de retrospectiva chega na Fase 7.' },
}

export default function App() {
  const planner = usePlanner()
  const { theme, toggle } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState<SectionId>('semana')

  function handleExport() {
    const json = JSON.stringify(planner.exportState(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roteiro-backup-${todayId()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const ok = planner.importState(String(reader.result))
      if (!ok) window.alert('Não consegui ler esse arquivo — confira se é um backup exportado daqui mesmo.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <header className="flex flex-col gap-1.5 border-b border-line px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <NavTabs active={section} onChange={setSection} />
          <div className="flex shrink-0 items-center gap-2">
            <GoogleStatus />
            <SyncIndicator status={planner.syncStatus} />
            <button type="button" onClick={handleExport} className={headerButtonClass} title="Exportar backup (.json)">
              <Download className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={headerButtonClass}
              title="Importar backup (.json)"
            >
              <Upload className="size-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={toggle}
              className={cn(headerButtonClass)}
              aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
          </div>
        </div>

        {section === 'semana' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => planner.setAnchorDay(addDays(planner.anchorDayId, -1))}
              className="shrink-0 rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink"
              aria-label="Dia anterior"
              title="Dia anterior"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <DayTrail anchorDayId={planner.anchorDayId} onSelect={planner.setAnchorDay} />
            </div>
            <button
              type="button"
              onClick={() => planner.setAnchorDay(addDays(planner.anchorDayId, 1))}
              className="shrink-0 rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink"
              aria-label="Dia seguinte"
              title="Dia seguinte"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4 lg:overflow-hidden">
        {section === 'semana' ? (
          <PlannerBoard planner={planner} />
        ) : (
          <ComingSoon title={COMING_SOON[section].title} note={COMING_SOON[section].note} />
        )}
      </main>
    </div>
  )
}
