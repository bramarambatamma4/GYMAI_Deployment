import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Github, Linkedin, Minus, Plus } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { LandingNav } from '@/components/landing/LandingNav'
import { useAuth } from '@/context/AuthContext'
import { TEAM, type TeamMember } from '@/data/team'

const SERIF = 'Georgia, "Times New Roman", serif'
const GOLD = '#f3f1ea'
const TINT = 'linear-gradient(180deg, rgba(243, 242, 229, 0.78) 0%, rgba(242, 245, 81, 0.28) 38%, rgba(240, 203, 162, 0.08) 100%)' // colour that floods the card

/** Silhouette used until a real photo is added (transparent background, so the circle shows behind it). */
const SILHOUETTE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7280"/><stop offset="1" stop-color="#374151"/></linearGradient></defs><rect width="300" height="400" fill="#e5e7eb"/><circle cx="150" cy="140" r="62" fill="url(#g)"/><path d="M20 400c4-96 54-150 130-150s126 54 130 150z" fill="url(#g)"/></svg>',
)}`

const LINKEDIN_HOME = 'https://www.linkedin.com'
const GITHUB_HOME = 'https://github.com'

/** Always rendered. Until a real profile link is added in data/team.ts it opens the site's home page. */
function Social({ href, fallback, label, children, delay = 0, small = false }: { href: string; fallback: string; label: string; children: React.ReactNode; delay?: number; small?: boolean }) {
  const real = Boolean(href)
  return (
    <motion.a
      href={href || fallback} target="_blank" rel="noopener noreferrer" aria-label={label} title={real ? label : `${label} (link not added yet)`}
      initial={{ opacity: 0, x: -10, scale: 0.6 }} animate={{ opacity: real ? 1 : 0.7, x: 0, scale: 1 }} exit={{ opacity: 0, x: -10, scale: 0.6 }} transition={{ delay, duration: 0.25 }}
      className={`flex items-center justify-center rounded-full text-white transition hover:text-orange ${small ? 'h-9 w-9 border border-surface-borderStrong bg-surface-raised hover:border-orange' : 'h-10 w-10 bg-[#1a0f2e] hover:bg-black'}`}
    >
      {children}
    </motion.a>
  )
}

function MemberCard({ member, index }: { member: TeamMember; index: number }) {
  const [open, setOpen] = useState(false)
  const photo = member.photo || SILHOUETTE
  // Hover opens the card on desktop; tapping the gold button works everywhere (touch, keyboard).
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: (index % 3) * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-[min(100%,300px)]"
      onMouseEnter={() => canHover && setOpen(true)} onMouseLeave={() => canHover && setOpen(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-pink-200/40 bg-[#1b1030] shadow-[0_22px_50px_-18px_rgba(0,0,0,0.6)]">
        {/* 1) closed state: grayscale portrait */}
        <img src={photo} alt={member.photo ? `${member.name}, ${member.role}` : ''} loading="lazy" draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-top grayscale" />

        {/* 2) open state: the same portrait in full colour, revealed by a circle that grows from the face and floods the card */}
        <div aria-hidden className="absolute inset-0 transition-[clip-path] duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
          style={{ clipPath: `circle(${open ? '150%' : '0%'} at 50% 38%)` }}>
          <img src={photo} alt="" draggable={false} className="h-full w-full scale-105 object-cover object-top" />
          <div className="absolute inset-0" style={{ background: TINT }} />
        </div>
        {/* ring that travels with the reveal */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/70 transition-all duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
          style={{ width: open ? '320%' : '0%', opacity: open ? 0 : 0.9 }} />

        {/* readability scrims */}
        <div aria-hidden className="absolute inset-x-0 top-0 z-[5] h-[34%] bg-gradient-to-b from-black/65 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-[5] h-[38%] bg-gradient-to-t from-[#1b1030] via-[#1b1030]/75 to-transparent" />

        {/* closed-state heading */}
        <div className={`pointer-events-none absolute inset-x-0 top-5 z-10 px-3 text-center transition-all duration-500 ${open ? '-translate-y-2 opacity-0 blur-sm' : 'opacity-100'}`}>
          <p className="text-xl font-semibold italic" style={{ fontFamily: SERIF, color: GOLD }}>{member.badge}</p>
          <p className="mt-0.5 text-2xl font-black uppercase italic leading-tight text-white sm:text-[28px]" style={{ fontFamily: SERIF }}>{member.focus}</p>
        </div>

        {/* open-state quote */}
        <p className={`pointer-events-none absolute inset-x-0 top-6 z-10 px-5 text-center text-2xl font-semibold italic leading-snug text-white transition-all duration-500 [text-shadow:0_2px_12px_rgba(0,0,0,.45)] ${open ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-3 opacity-0'}`}
          style={{ fontFamily: SERIF }}>
          &ldquo;{member.quote}&rdquo;
        </p>

        {/* gold toggle + social icons */}
        <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2">
          <button
            type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? `Close ${member.name}` : `Show ${member.name}'s details`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-black shadow-lg transition hover:scale-110" style={{ background: GOLD }}
          >
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>{open ? <Minus size={18} /> : <Plus size={18} />}</motion.span>
          </button>
          <AnimatePresence>
            {open && (
              <>
                <Social href={member.linkedin} fallback={LINKEDIN_HOME} label={`${member.name} on LinkedIn`} delay={0.15}><Linkedin size={17} /></Social>
                <Social href={member.github} fallback={GITHUB_HOME} label={`${member.name} on GitHub`} delay={0.25}><Github size={17} /></Social>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <h2 className="mt-5 text-center font-display text-lg font-semibold tracking-wide text-ink">{member.name}</h2>
      <p className="mt-1 text-center text-sm text-ink-muted">{member.role}</p>
      {/* icons are always visible under every profile, even before the card is opened */}
      <div className="mt-3 flex justify-center gap-2">
        <Social small href={member.linkedin} fallback={LINKEDIN_HOME} label={`${member.name} on LinkedIn`}><Linkedin size={16} /></Social>
        <Social small href={member.github} fallback={GITHUB_HOME} label={`${member.name} on GitHub`}><Github size={16} /></Social>
      </div>
    </motion.article>
  )
}

function TeamGrid() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-2xl text-center">
        <p className="label-eyebrow">The people behind GymAI</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-5xl">Meet the <span className="text-orange">team</span></h1>
        <p className="mt-4 text-ink-muted">Six builders combining AI, design and engineering to make training feel personal. Tap the + on a card to meet them.</p>
      </div>
      <div className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-14">
        {TEAM.map((member, i) => <MemberCard key={member.name + i} member={member} index={i} />)}
      </div>
    </div>
  )
}

/** Public team page: logged-in members keep their app navigation, visitors get the landing navigation. */
export default function Team() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <AppShell><TeamGrid /></AppShell>
  return (
    <div className="min-h-screen bg-charcoal gym-app-bg">
      <LandingNav />
      <main className="px-5 pb-20 pt-10 lg:px-8"><TeamGrid /></main>
    </div>
  )
}
