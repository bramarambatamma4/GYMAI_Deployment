import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  ariaLabel: string
  disabled?: boolean
}

/** Type-to-search dropdown. Letters filter the list (prefix matches first); free text is also accepted. */
export function Combobox({ value, onChange, options, placeholder, ariaLabel, disabled }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options.slice(0, 60)
    const starts = options.filter((o) => o.toLowerCase().startsWith(q))
    const contains = options.filter((o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q))
    return [...starts, ...contains].slice(0, 60)
  }, [value, options])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = (option: string) => { onChange(option); setOpen(false) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); e.stopPropagation(); pick(matches[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={box} className="relative">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setActive(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        className="w-full rounded-xl border border-surface-borderStrong bg-surface-raised py-2 pl-3 pr-9 text-sm text-ink outline-none focus:border-orange disabled:opacity-50"
      />
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      {open && matches.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 z-[90] mt-1 max-h-56 overflow-y-auto rounded-xl border border-surface-borderStrong bg-charcoal py-1 shadow-card">
          {matches.map((option, i) => (
            <li key={option} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(option)} onMouseEnter={() => setActive(i)}
                className={`block w-full px-3 py-2 text-left text-sm ${i === active ? 'bg-orange/10 text-orange' : 'text-ink-muted'}`}>
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
