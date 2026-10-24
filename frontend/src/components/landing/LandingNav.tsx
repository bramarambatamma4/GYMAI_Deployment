import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { ScrollMenu } from '@/components/layout/ScrollMenu'
import { useLanguage } from '@/context/LanguageContext'

const links = [
  { href: '#ai-features', label: 'AI Training' },
  { href: '#training', label: 'Exercise Library' },
  { href: '#testimonials', label: 'Member Stories' },
  { href: '#ai-form', label: 'Form Feedback' },
  { href: '/equipment', label: 'Equipment' },
  { href: '/about', label: 'About' },
  { href: '/team', label: 'Team' },
]

/** CHANGE: same behaviour as the app - bar at the top, Menu button (top-right) after scrolling. */
export function LandingNav() {
  const { t } = useLanguage()
  return (
    <ScrollMenu>
      {(close) => (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" onClick={close} className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 font-display text-base font-semibold text-ink">
            Gym<span className="text-orange">AI</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((link) => {
              const cls = 'rounded-xl px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink'
              return link.href.startsWith('/')
                ? <Link key={link.href} to={link.href} onClick={close} className={cls}>{t(link.label)}</Link>
                : <a key={link.href} href={link.href.startsWith('#') ? `/${link.href}` : link.href} onClick={close} className={cls}>{t(link.label)}</a>
            })}
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <LanguageSelector compact />
            <ThemeToggle />
            <Link to="/login" onClick={close} className="rounded-xl px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink">Sign in</Link>
            <Link to="/register" onClick={close} className="rounded-xl bg-orange px-4 py-2.5 text-xs font-semibold text-charcoal shadow-orange transition hover:bg-orange-light">Start my plan</Link>
          </div>
        </div>
      )}
    </ScrollMenu>
  )
}
