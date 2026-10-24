import { NavLink, Link } from 'react-router-dom'
import { Activity, ShieldCheck, Dumbbell, History, LayoutDashboard, Library, TrendingUp, User, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { ScrollMenu } from './ScrollMenu'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/exercises', label: 'Exercises', icon: Library },
  { to: '/nutrition', label: 'Nutrition', icon: Utensils },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/equipment', label: 'Equipment', icon: Dumbbell },
]

/** CHANGE: bar shows at the top of the page; after scrolling, a Menu button (top-right) opens it. */
export function Navbar() {
  const { t } = useLanguage()
  const { user } = useAuth()
  // CHANGE: the Admin link is only shown to admins (the server checks again on every request)
  const items = user?.is_admin ? [...nav, { to: '/admin', label: 'Admin', icon: ShieldCheck }] : nav
  return (
    <ScrollMenu>
      {(close) => (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/dashboard" onClick={close} className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald/15 text-emerald"><Activity size={17} /></div>
            <span className="font-display text-base font-semibold text-ink">Gym<span className="text-orange">AI</span></span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={close}
                className={({ isActive }) =>
                  cn('flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all',
                    isActive ? 'bg-emerald/10 text-emerald' : 'text-ink-muted hover:bg-surface-raised hover:text-ink')
                }
              >
                <Icon size={14} />
                {t(label)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2"><NotificationBell /><LanguageSelector compact /><ThemeToggle /><UserMenu /></div>
        </div>
      )}
    </ScrollMenu>
  )
}
