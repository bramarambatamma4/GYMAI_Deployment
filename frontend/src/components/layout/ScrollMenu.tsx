import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

const SHOW_AFTER_PX = 80

/**
 * Shared navigation behaviour for every page:
 *  - at the top of the page the full bar is shown in normal flow (it scrolls away with the page);
 *  - after the user scrolls down, a Menu button appears fixed at the top-RIGHT;
 *  - clicking it opens the same bar as a floating panel (closes on link click, outside click, Escape,
 *    route change, or when the user scrolls back to the top).
 * `children` receives `close` so links can dismiss the floating panel.
 */
export function ScrollMenu({ children }: { children: (close: () => void) => ReactNode }) {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > SHOW_AFTER_PX
      setScrolled(past)
      if (!past) setOpen(false)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      {/* Full bar: visible at the top of the page, not fixed. */}
      <div className="relative z-30 mx-auto mt-4 w-[calc(100%-2rem)] max-w-7xl">
        <div className="glow-card rounded-2xl border border-surface-borderStrong bg-charcoal p-3 shadow-card">{children(() => undefined)}</div>
      </div>

      {/* Menu button: only after scrolling, fixed at the top-right. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('Close menu') : t('Open menu')}
        aria-expanded={open}
        tabIndex={scrolled ? 0 : -1}
        className={`glow-card fixed right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl border border-surface-borderStrong bg-charcoal text-orange shadow-card transition-all duration-200 hover:bg-surface-raised ${scrolled ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'}`}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && scrolled && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={close} aria-hidden />
          <div className="fixed left-4 right-4 top-[68px] z-50 mx-auto max-w-6xl">
            <div className="glow-card max-h-[calc(100vh-88px)] overflow-y-auto rounded-2xl border border-surface-borderStrong bg-charcoal p-3 shadow-card">{children(close)}</div>
          </div>
        </>
      )}
    </>
  )
}
