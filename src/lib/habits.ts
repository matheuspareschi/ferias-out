import { BookOpen, Flame, Footprints, PersonStanding, Search, type LucideIcon } from 'lucide-react'
import type { HabitId } from './types'

export const HABIT_ORDER: HabitId[] = ['devocional', 'alongamento', 'leitura', 'exercicio', 'revisao']

export const HABIT_ICON: Record<HabitId, LucideIcon> = {
  devocional: Flame,
  alongamento: PersonStanding,
  leitura: BookOpen,
  exercicio: Footprints,
  revisao: Search,
}

export const HABIT_LABEL: Record<HabitId, string> = {
  devocional: 'Devocional',
  alongamento: 'Alongamento',
  leitura: 'Leitura',
  exercicio: 'Exercício',
  revisao: 'Revisão da faculdade',
}
