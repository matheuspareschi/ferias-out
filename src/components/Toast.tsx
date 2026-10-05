import type { PlannerToast } from '@/hooks/usePlanner'

/** Toast efêmero "Movido para … · Desfazer" (1.6) — fixo no rodapé, não bloqueia nada. */
export function Toast({ toast, onDismiss }: { toast: PlannerToast | null; onDismiss: () => void }) {
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-3 rounded-sm border border-line-strong bg-paper-raised px-3 py-2 text-xs text-ink shadow-lifted">
        <span>{toast.message}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={() => {
              toast.undo!()
              onDismiss()
            }}
            className="font-medium text-accent hover:underline"
          >
            desfazer
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label="Fechar" className="text-ink-faint hover:text-ink">
          ×
        </button>
      </div>
    </div>
  )
}
