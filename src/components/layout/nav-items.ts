import {
  ChartNoAxesCombined,
  Dumbbell,
  House,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoy', icon: House, end: true },
  { to: '/entreno', label: 'Entreno', icon: Dumbbell },
  { to: '/nutricion', label: 'Nutrición', icon: UtensilsCrossed },
  { to: '/progreso', label: 'Progreso', icon: ChartNoAxesCombined },
  { to: '/perfil', label: 'Perfil', icon: User },
]
