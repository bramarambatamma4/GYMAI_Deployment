import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrainCircuit, Dumbbell, Gauge, Ruler, Scale, Sparkles, Target, Timer, UserRound } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { User, Workout } from '@/types'
import { generateAIWorkout } from '@/services/aiWorkoutService'
import { Button } from '@/components/ui/Button'

const DURATIONS = [20, 30, 45, 60, 90]
const STEPS = ['Reading your profile', 'Matching exercises to your equipment', 'Balancing sets, reps and rest', 'Finalising your plan']

interface Props {
  user: User
  onGenerated: (workout: Workout) => void
}

export function AIWorkoutPlanner({ user, onGenerated }: Props) {
  const { t } = useLanguage()
  const [minutes, setMinutes] = useState(45)
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')

  const equipment = user.equipment?.length ? user.equipment : []
  const ready = Boolean(user.height_cm && user.weight_kg && user.goal && user.fitness_level && equipment.length)

  useEffect(() => {
    if (!loading) return
    setStepIndex(0)
    const id = window.setInterval(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), 900)
    return () => window.clearInterval(id)
  }, [loading])

  const facts = useMemo(() => [
    { icon: <Target size={15} />, label: 'Goal', value: user.goal },
    { icon: <Gauge size={15} />, label: 'Level', value: user.fitness_level },
    { icon: <Ruler size={15} />, label: 'Height', value: user.height_cm ? `${user.height_cm} cm` : null },
    { icon: <Scale size={15} />, label: 'Weight', value: user.weight_kg ? `${user.weight_kg} kg` : null },
    { icon: <Timer size={15} />, label: 'Frequency', value: user.training_frequency ? `${user.training_frequency}+ ${t('days/week')}` : null },
    { icon: <Dumbbell size={15} />, label: 'Equipment', value: equipment.length ? equipment.map((e) => (e === 'None' ? 'No equipment' : e)).join(', ') : null },
  ], [user, equipment, t])

  const generate = async () => {
    setError('')
    if (!ready) return setError(t('Complete your profile first so the coach knows what you need.'))
    setLoading(true)
    try {
      const workout = await generateAIWorkout({
        height_cm: Number(user.height_cm),
        weight_kg: Number(user.weight_kg),
        goal: user.goal!,
        fitness_level: user.fitness_level!,
        equipment,
        workout_time_minutes: minutes,
        age: user.age ?? undefined,
        gender: user.gender ?? undefined,
        training_frequency: user.training_frequency ?? undefined,
      })
      onGenerated(workout)
    } catch {
      setError(t('Unable to generate the workout right now. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card-surface overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange/10 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="icon-tile !h-12 !w-12"><BrainCircuit size={22} /></div>
        <div>
          <p className="label-eyebrow flex items-center gap-2"><Sparkles size={13} /> {t('GymAI Coach')}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{t('Your plan, built from your profile')}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            {t('The coach uses the goals, body details and equipment saved in your profile. Choose a session length and press generate.')}
          </p>
        </div>
      </div>

      {!ready ? (
        <div className="relative mt-6 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-orange/40 bg-orange/5 p-5">
          <p className="flex items-center gap-2 text-sm text-ink"><UserRound size={16} className="text-orange" /> {t('Your profile is missing details the coach needs.')}</p>
          <Link to="/profile"><Button>{t('Complete profile')}</Button></Link>
        </div>
      ) : (
        <>
          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-faint"><span className="text-orange">{f.icon}</span>{t(f.label)}</p>
                <p className="mt-1.5 truncate text-sm font-medium text-ink">{f.value ? t(String(f.value)) : '—'}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-5">
            <p className="mb-2 text-sm font-medium text-ink">{t('Session length')}</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((m) => (
                <button key={m} type="button" onClick={() => setMinutes(m)} disabled={loading}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${minutes === m ? 'border-orange bg-orange/10 text-orange shadow-[0_0_18px_-6px_rgba(255,90,0,.7)]' : 'border-surface-borderStrong bg-surface-raised text-ink-muted hover:border-orange/40 hover:text-ink'}`}>
                  {m} {t('min')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p className="relative mt-4 text-sm text-orange" role="alert">{error}</p>}

      {ready && (
        <div className="relative mt-6 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[20px] text-sm text-ink-muted" aria-live="polite">
            {loading && <span className="flex items-center gap-2"><span className="coach-dot" />{t(STEPS[stepIndex])}…</span>}
          </div>
          <Button onClick={generate} loading={loading} disabled={loading}>
            <Sparkles size={16} />
            {loading ? t('Generating workout...') : t('Generate Plan')}
          </Button>
        </div>
      )}
    </section>
  )
}
