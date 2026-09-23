import { DayTrail } from '@/components/DayTrail'
import { PlannerBoard } from '@/components/planner/PlannerBoard'
import { usePlanner } from '@/hooks/usePlanner'

export default function App() {
  const planner = usePlanner()

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line px-4 py-2 sm:px-6">
        <div className="shrink-0">
          <h1 className="font-serif text-lg font-semibold leading-tight sm:text-xl">Roteiro de férias</h1>
          <p className="font-mono text-[10px] text-ink-dim">24/09 – 12/10/2026</p>
        </div>
        <div className="min-w-0 flex-1">
          <DayTrail anchorDayId={planner.anchorDayId} onSelect={planner.setAnchorDay} />
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4 lg:overflow-hidden">
        <PlannerBoard planner={planner} />
      </main>
    </div>
  )
}
