import { useState } from 'react'
import { ScrollReveal } from './effects'

const goals = ['Build Muscle', 'Lose Fat', 'Gain Strength', 'Endurance'] as const
const experience = ['Beginner', 'Intermediate', 'Advanced'] as const

export function PersonalizationSection() {
  const [goal, setGoal] = useState<(typeof goals)[number]>('Build Muscle')
  const [level, setLevel] = useState<(typeof experience)[number]>('Intermediate')

  return (
    <section className="py-20 sm:py-28 border-t border-surface-border">
      <div className="container-shell">
        <ScrollReveal>
         <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
          <p className="label-eyebrow mb-3">Personal training</p>
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl leading-tight mb-4">
            A plan shaped around the way you train
          </h2>
          <p className="text-ink-muted leading-relaxed mb-8 max-w-2xl">
            Choose the outcome you want and the experience you bring. GymAI uses those signals to guide exercise selection, training volume, recovery and progression without forcing you into a one-size-fits-all routine.
          </p>

          <p className="text-xs uppercase tracking-wide text-ink-faint mb-2.5">Goal</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {goals.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  goal === g
                    ? 'border-orange/40 bg-orange/10 text-orange'
                    : 'border-surface-borderStrong text-ink-muted hover:text-ink'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <p className="text-xs uppercase tracking-wide text-ink-faint mb-2.5">Experience</p>
          <div className="flex flex-wrap gap-2">
            {experience.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  level === l
                    ? 'border-orange/40 bg-orange/10 text-orange'
                    : 'border-surface-borderStrong text-ink-muted hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          </div>

          {/* CHANGE: image on the right side of the Personal training section */}
          <div className="card-surface relative overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=1000&q=85"
              onError={(e) => { e.currentTarget.src = 'https://img.freepik.com/premium-photo/cropped-photo-strong-athlrtic-man-taking-dumbbells-from-floor-work-out-modern-gym-warm-orange-light_116317-20357.jpg' }}
              alt="Athlete training with a barbell in the gym"
              loading="lazy"
              className="aspect-[4/3] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
              <span className="inline-block rounded-full border border-orange/50 bg-black/50 px-3 py-1 text-xs font-medium text-orange backdrop-blur">{goal} · {level}</span>
              <p className="mt-2 text-sm text-white/80">Your plan adapts to this combination.</p>
            </div>
          </div>
         </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
