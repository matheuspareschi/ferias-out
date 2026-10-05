import { ChevronLeft, ChevronRight, Cloud, CloudOff, Download, Moon, Plug, RefreshCw, Sun, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { AnoPage } from '@/components/ano/AnoPage'
import { BacklogPage } from '@/components/backlog/BacklogPage'
import { DayTrail } from '@/components/DayTrail'
import { HabitosPage } from '@/components/habitos/HabitosPage'
import { MesPage } from '@/components/mes/MesPage'
import { NavTabs, type SectionId } from '@/components/NavTabs'
import { PlannerBoard } from '@/components/planner/PlannerBoard'
import { ProjetosPage } from '@/components/projetos/ProjetosPage'
import { RetrospectivaPage } from '@/components/retrospectiva/RetrospectivaPage'
import { useGoogleCalendar, type UseGoogleCalendarReturn } from '@/hooks/useGoogleCalendar'
import { useGoogleSyncedPlanner } from '@/hooks/useGoogleSyncedPlanner'
import { usePlanner } from '@/hooks/usePlanner'
import { useTheme } from '@/hooks/useTheme'
import { addDays, monthIdOf, todayId } from '@/lib/dates'
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

/** Estado da conexão com o Google Agenda (5.3) — nunca bloqueia o uso do app, falhando em silêncio. */
function GoogleStatus({ google }: { google: UseGoogleCalendarReturn }) {
  if (google.status === 'unconfigured') {
    return (
      <span title="Integração com Google Agenda não configurada (defina VITE_GOOGLE_CLIENT_ID)" className="flex items-center text-ink-faint">
        <Plug className="size-3.5" />
      </span>
    )
  }
  if (google.status === 'connected') {
    return (
      <span title="Conectado ao Google Agenda" className="flex items-center text-done">
        <Plug className="size-3.5" />
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={google.connect}
      className="flex items-center gap-1 rounded-sm border border-line px-2 py-1.5 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
      title={google.status === 'error' ? 'Falha ao conectar — tentar de novo' : 'Conectar ao Google Agenda'}
    >
      {google.status === 'connecting' ? <RefreshCw className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
      {google.status === 'error' ? 'tentar de novo' : 'Google'}
    </button>
  )
}

const headerButtonClass =
  'flex items-center gap-1.5 rounded-sm border border-line px-2 py-1.5 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink'

export default function App() {
  const planner = usePlanner()
  const google = useGoogleCalendar()
  const syncedPlanner = useGoogleSyncedPlanner(planner, google)
  const { theme, toggle } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState<SectionId>('semana')
  const [mesMonth, setMesMonth] = useState(monthIdOf(todayId()))
  const [retroMonth, setRetroMonth] = useState(monthIdOf(todayId()))

  function goToMonth(month: string) {
    setMesMonth(month)
    setSection('mes')
  }

  function goToRetrospectiva(month: string) {
    setRetroMonth(month)
    setSection('retrospectiva')
  }

  function handleExport() {
    const json = JSON.stringify(syncedPlanner.exportState(), null, 2)
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
      const ok = syncedPlanner.importState(String(reader.result))
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
            <GoogleStatus google={google} />
            <SyncIndicator status={syncedPlanner.syncStatus} />
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
              onClick={() => syncedPlanner.setAnchorDay(addDays(syncedPlanner.anchorDayId, -1))}
              className="shrink-0 rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink"
              aria-label="Dia anterior"
              title="Dia anterior"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <DayTrail anchorDayId={syncedPlanner.anchorDayId} onSelect={syncedPlanner.setAnchorDay} />
            </div>
            <button
              type="button"
              onClick={() => syncedPlanner.setAnchorDay(addDays(syncedPlanner.anchorDayId, 1))}
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
          <PlannerBoard planner={syncedPlanner} />
        ) : section === 'projetos' ? (
          <ProjetosPage planner={syncedPlanner} />
        ) : section === 'habitos' ? (
          <HabitosPage planner={syncedPlanner} />
        ) : section === 'mes' ? (
          <MesPage planner={syncedPlanner} month={mesMonth} onMonthChange={setMesMonth} onOpenRetrospectiva={goToRetrospectiva} />
        ) : section === 'ano' ? (
          <AnoPage planner={syncedPlanner} onOpenMonth={goToMonth} />
        ) : section === 'retrospectiva' ? (
          <RetrospectivaPage planner={syncedPlanner} month={retroMonth} onMonthChange={setRetroMonth} />
        ) : section === 'backlog' ? (
          <BacklogPage planner={syncedPlanner} />
        ) : null}
      </main>
    </div>
  )
}
