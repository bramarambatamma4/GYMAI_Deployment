import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const LETTERS = ['G', 'Y', 'M', 'A', 'I']
const SHOW_MS = 3600 // + 400 ms fade-out = the website appears at 4 seconds

// Plays on every full page load / refresh, but not when moving between pages inside the site.
let played = false

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({ id: i, left: 4 + ((i * 53) % 92), delay: (i % 6) * 0.35, size: 2 + (i % 3) }))

/** Cinematic GYMAI intro: letters slam in out of the dark, a light sweep crosses the logo, then the site fades in. */
export function IntroSplash() {
  const [visible, setVisible] = useState(!played)

  useEffect(() => {
    if (!visible) return
    played = true
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => setVisible(false), SHOW_MS)
    return () => { window.clearTimeout(timer); document.body.style.overflow = previous }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          role="status"
          aria-label="GymAI is loading"
        >
          {/* warm glow that breathes behind the logo */}
          <motion.div
            className="absolute h-[60vmin] w-[60vmin] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,90,0,0.38) 0%, rgba(255,90,0,0.08) 45%, transparent 70%)' }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0.75, 1], scale: [0.4, 1, 1.12, 1.25] }}
            transition={{ duration: 3.6, ease: 'easeOut' }}
          />

          {/* rising embers */}
          {PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              className="absolute bottom-0 rounded-full bg-orange"
              style={{ left: `${p.left}%`, width: p.size, height: p.size }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: '-95vh', opacity: [0, 0.9, 0] }}
              transition={{ duration: 2.6, delay: p.delay, ease: 'easeOut' }}
            />
          ))}

          {/* letters */}
          <div className="relative flex" aria-hidden>
            {LETTERS.map((letter, i) => (
              <motion.span
                key={letter + i}
                className={`font-display text-[22vw] font-bold leading-none sm:text-[16vw] lg:text-[11rem] ${i >= 3 ? 'text-orange' : 'text-white'}`}
                initial={{ opacity: 0, y: 60, scale: 1.6, filter: 'blur(24px)', letterSpacing: '0.4em' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', letterSpacing: '0.02em' }}
                transition={{ delay: 0.5 + i * 0.14, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{ textShadow: '0 0 40px rgba(255,90,0,0.45)' }}
              >
                {letter}
              </motion.span>
            ))}
            {/* light sweep across the wordmark */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 -skew-x-12"
              style={{ width: '22%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)', mixBlendMode: 'overlay' }}
              initial={{ left: '-30%', opacity: 0 }}
              animate={{ left: '120%', opacity: [0, 1, 1, 0] }}
              transition={{ delay: 1.7, duration: 0.9, ease: 'easeInOut' }}
            />
          </div>

          {/* expanding line + tagline */}
          <motion.div
            className="mt-2 h-[2px] bg-gradient-to-r from-transparent via-orange to-transparent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'min(70vw, 560px)', opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.9, ease: 'easeOut' }}
          />
          <motion.p
            className="mt-5 text-center text-[11px] font-medium uppercase tracking-[0.5em] text-white/70 sm:text-xs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.3, duration: 0.7 }}
          >
            Intelligent Fitness System
          </motion.p>

          {/* cinematic bars + vignette */}
          <motion.div className="absolute inset-x-0 top-0 bg-black" initial={{ height: '14vh' }} animate={{ height: '0vh' }} transition={{ delay: 2.9, duration: 0.7, ease: 'easeInOut' }} />
          <motion.div className="absolute inset-x-0 bottom-0 bg-black" initial={{ height: '14vh' }} animate={{ height: '0vh' }} transition={{ delay: 2.9, duration: 0.7, ease: 'easeInOut' }} />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)' }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
