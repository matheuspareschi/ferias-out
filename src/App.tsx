import { DayTrail } from '@/components/DayTrail'
import { PlannerBoard } from '@/components/planner/PlannerBoard'
import { usePlanner } from '@/hooks/usePlanner'

export default function App() {
  const planner = usePlanner()

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <header className="flex items-baseline justify-between border-b border-line px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-serif text-xl font-semibold sm:text-2xl">Roteiro de férias</h1>
          <p className="font-mono text-[11px] text-ink-dim">24/09 — 12/10/2026</p>
        </div>
      </header>

      <div className="border-b border-line px-4 sm:px-6">
        <DayTrail anchorDayId={planner.anchorDayId} onSelect={planner.setAnchorDay} />
      </div>

      <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:overflow-hidden">
        <PlannerBoard planner={planner} />
      </main>
    </div>
  )
}
