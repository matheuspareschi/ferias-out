import { DayTrail } from '@/components/DayTrail'
import { usePlanner } from '@/hooks/usePlanner'

export default function App() {
  const planner = usePlanner()

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <header className="border-b border-line px-6 py-4">
        <h1 className="font-serif text-2xl font-semibold">Roteiro de férias</h1>
        <p className="font-mono text-xs text-ink-dim">24/09 — 12/10/2026</p>
      </header>
      <main className="px-6 py-4">
        <DayTrail anchorDayId={planner.anchorDayId} onSelect={planner.setAnchorDay} />
      </main>
    </div>
  )
}
