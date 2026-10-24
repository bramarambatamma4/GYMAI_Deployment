import { useEffect, useMemo, useState } from 'react'
import { AlarmClock, CheckCircle2, Circle, Clock3, Play, RotateCcw, SkipForward, Flag, Square } from 'lucide-react'
import { motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { WorkoutProgress } from '@/components/gymai/WorkoutProgress'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { completeWorkout } from '@/services/workoutService'
import { getActiveWorkout } from '@/services/aiWorkoutService'
import { TIMER_KEY, LAP_KEY } from '@/lib/workoutTimerStorage'
import { ExerciseMedia } from '@/components/gymai/ExerciseMedia'
import { ExerciseInlineVideo } from '@/components/gymai/ExerciseInlineVideo'
import { AIWorkoutPlanner } from '@/components/gymai/AIWorkoutPlanner'
import type { Workout as WorkoutType, WorkoutExercise } from '@/types'

/**
 * The timer is intentionally stored as elapsed seconds + a start timestamp.
 * The timer continues while the page is hidden or refreshed. It is cleared
 * on every login/logout (see AuthContext), so each session starts at 00:00.
 */
type TimerState = { running: boolean; elapsed: number; startedAt: number | null }

const EMPTY_TIMER: TimerState = { running: false, elapsed: 0, startedAt: null }

function readTimer(): TimerState {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null') as TimerState | null
    if (!saved) return EMPTY_TIMER
    const elapsed = Math.max(0, saved.elapsed || 0)
    // Keep the original startedAt: elapsed time is always elapsed + (now - startedAt).
    return saved.running && saved.startedAt ? { running: true, elapsed, startedAt: saved.startedAt } : { running: false, elapsed, startedAt: null }
  } catch {
    return EMPTY_TIMER
  }
}

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function translateFocus(focus: string, t: (key: string) => string) {
  return focus
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => t(item))
    .join(', ')
}

export default function Workout() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLanguage()
  const [workout, setWorkout] = useState<WorkoutType | null>(null)
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [timer, setTimer] = useState<TimerState>(readTimer)
  const [laps, setLaps] = useState<number[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAP_KEY) || '[]')
      return Array.isArray(saved) ? saved.filter((value) => Number.isFinite(value)) : []
    } catch {
      return []
    }
  })
  const [alarmShaking, setAlarmShaking] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoLevel, setVideoLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner')

  // Re-render every 250ms while running so the clock ticks; the value itself
  // is derived from startedAt, so background tabs never lose time.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!timer.running) return
    const id = window.setInterval(() => setTick((n) => n + 1), 250)
    const wake = () => setTick((n) => n + 1)
    document.addEventListener('visibilitychange', wake)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', wake) }
  }, [timer.running])

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer))
  }, [timer])

  useEffect(() => {
    localStorage.setItem(LAP_KEY, JSON.stringify(laps))
  }, [laps])

  const elapsedSeconds = timer.running && timer.startedAt
    ? timer.elapsed + Math.max(0, Math.floor((Date.now() - timer.startedAt) / 1000))
    : timer.elapsed

  const completedCount = useMemo(
    () => exercises.filter((exercise) => exercise.completed).length,
    [exercises],
  )
  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
    [exercises],
  )
  const completedSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + (exercise.completedSets ?? 0), 0),
    [exercises],
  )

  const active = exercises[activeIndex]
  const elapsedMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60))
  const timerLabel = formatTime(elapsedSeconds)
  const timerStarted = timer.running || timer.elapsed > 0
  const translatedFocus = workout ? translateFocus(workout.focus, t) : ''

  const startTimer = () => {
    setTimer((current) => {
      if (current.running) return current
      return {
        running: true,
        elapsed: current.elapsed,
        startedAt: Date.now(),
      }
    })
  }

  const stopTimer = () => {
    setTimer((current) => {
      if (!current.running || !current.startedAt) return current
      const elapsedNow = current.elapsed + Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000))
      return { running: false, elapsed: elapsedNow, startedAt: null }
    })
  }

  const resetTimer = () => {
    setTimer(EMPTY_TIMER)
    setLaps([])
  }

  const addLap = () => {
    if (elapsedSeconds <= 0) return
    setLaps((current) => [...current, elapsedSeconds])
  }

  const ringAlarm = () => {
    setAlarmShaking(true)
    window.setTimeout(() => setAlarmShaking(false), 2000)
  }

  const completeSet = (id: string) => {
    setExercises((previous) => previous.map((exercise) => {
      if (exercise.id !== id) return exercise
      const nextSets = Math.min(exercise.sets, (exercise.completedSets ?? 0) + 1)
      return {
        ...exercise,
        completedSets: nextSets,
        completed: nextSets >= exercise.sets,
      }
    }))
  }

  const nextExercise = () => {
    if (activeIndex < exercises.length - 1) {
      setActiveIndex((index) => index + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const finishWorkout = async () => {
    if (!workout || saving) return
    setSaving(true)

    try {
      // Capture the exact elapsed value before stopping so the saved duration
      // and the displayed timer are always consistent.
      const finalElapsedSeconds = elapsedSeconds
      if (timer.running) stopTimer()

      await completeWorkout({
        workout_id: workout.id,
        workout_name: workout.name,
        focus: workout.focus,
        duration_minutes: finalElapsedSeconds ? Math.max(1, Math.ceil(finalElapsedSeconds / 60)) : workout.durationMinutes,
        exercise_count: completedCount,
        total_sets: totalSets,
        completed_sets: completedSets,
        completed_exercises: exercises.map((exercise) => ({
          exercise_id: exercise.id,
          name: exercise.name,
          planned_sets: exercise.sets,
          completed_sets: exercise.completedSets ?? 0,
          planned_reps: exercise.reps,
          completed: Boolean(exercise.completed),
        })),
      })

      setFinished(true)
      showToast(t('Workout saved to your training history.'), 'success')
    } catch {
      showToast(t('Workout could not be saved. Please try again.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // CHANGE 4: the reminder email deep-links here; restore today's unfinished plan
  // (only exists if the user already pressed Generate Plan today).
  useEffect(() => {
    if (!user) return
    let active = true
    getActiveWorkout()
      .then((restored) => {
        if (!active || !restored) return
        setWorkout((current) => current ?? restored)
        setExercises((current) => (current.length ? current : restored.exercises.map((exercise) => ({ ...exercise, completed: false, completedSets: 0 }))))
      })
      .catch(() => undefined) // no active plan / offline: show the generator as usual
    return () => { active = false }
  }, [user])

  if (!user) return null

  const handleGenerated = (generated: WorkoutType) => {
    setWorkout(generated)
    setExercises(generated.exercises.map((exercise) => ({ ...exercise, completed: false, completedSets: 0 })))
    setActiveIndex(0)
    setFinished(false)
    showToast(t('AI workout generated successfully.'), 'success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const planner = <AIWorkoutPlanner user={user} onGenerated={handleGenerated} />

  // Nothing but the coach is shown until the user presses "Generate Plan".
  if (!workout) {
    return (
      <AppShell>
        <PageHeader
          eyebrow={t('Workout')}
          title={t('AI Workout Coach')}
          description={t('Generate a session tailored to your profile.')}
        />
        <div className="mx-auto max-w-4xl">{planner}</div>
      </AppShell>
    )
  }

  if (finished) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-16 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10 text-emerald"
          >
            <CheckCircle2 size={30} />
          </motion.div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t('Workout complete')}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {completedCount} {t('of')} {exercises.length} {t('exercises')} · {completedSets}/{totalSets} {t('sets')}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {elapsedMinutes} {t('minutes recorded')}
          </p>
          <Button className="mt-8" onClick={() => window.location.assign('/dashboard')}>
            {t('Back to dashboard')}
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={translatedFocus}
        title={workout.name}
        description={`${workout.durationMinutes} ${t('min')} · ${t(workout.difficulty)}`}
        action={timerStarted ? (
          <div className="flex items-center gap-2 rounded-xl border border-orange/40 bg-orange/10 px-4 py-2 shadow-[0_0_20px_-8px_rgba(255,90,0,.8)]">
            <Clock3 size={16} className={timer.running ? 'animate-pulse text-orange' : 'text-ink-faint'} />
            <span className="font-mono text-lg font-semibold text-ink">{timerLabel}</span>
          </div>
        ) : undefined}
      />

      <div className="mx-auto mb-6 max-w-7xl">
        {planner}
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <WorkoutProgress completed={completedCount} total={exercises.length} />

          {/* Workout timer controls — Start, Stop, Lap and Reset are all preserved. */}
          <section className="card-surface p-4 sm:p-5">
            {timerStarted && (
              <div className="mb-4 flex items-baseline gap-3">
                <span className="font-mono text-5xl font-semibold tabular-nums text-ink">{timerLabel}</span>
                <span className={`text-xs font-medium uppercase tracking-wider ${timer.running ? 'text-orange' : 'text-ink-faint'}`}>{timer.running ? 'Running' : 'Stopped'}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={startTimer} disabled={timer.running}>
                <Play size={15} />
                {timer.elapsed > 0 && !timer.running ? t('Resume') : t('Start timer')}
              </Button>
              <Button variant="secondary" onClick={stopTimer} disabled={!timer.running}>
                <Square size={14} />
                {t('Stop')}
              </Button>
              <Button variant="secondary" onClick={addLap} disabled={elapsedSeconds === 0}>
                <Flag size={15} />
                {t('Lap')}
              </Button>
              <Button variant="ghost" onClick={resetTimer}>
                <RotateCcw size={15} />
                {t('Reset')}
              </Button>

              <button
                type="button"
                onClick={ringAlarm}
                aria-label={t('Alarm')}
                title={t('Alarm')}
                className={`ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange/30 bg-orange/10 text-orange hover:bg-orange hover:text-charcoal ${alarmShaking ? 'gymai-alarm-shake' : ''}`}
              >
                <AlarmClock size={19} />
              </button>
            </div>

            {laps.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label={t('Lap')}>
                {laps.map((lap, index) => (
                  <span
                    key={`${lap}-${index}`}
                    className="rounded-full border border-surface-borderStrong bg-surface-raised px-3 py-1.5 text-xs text-ink-muted"
                  >
                    {t('Lap')} {index + 1}:{' '}
                    <b className="text-ink">{formatTime(lap)}</b>
                  </span>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-ink-faint">
              {t('The timer keeps counting across refreshes and resets to 00:00 every time you log in.')}
            </p>
          </section>

          {active && (
            <motion.section
              key={active.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-surface overflow-hidden p-6 sm:p-7"
            >
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                {/* CHANGE: name-matched photo, with the demo video card when no photo can load */}
                <ExerciseMedia exercise={active} />

                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant="emerald" className="mb-3">
                        {t('Exercise')} {activeIndex + 1} {t('of')} {exercises.length}
                      </Badge>
                      <h2 className="font-display text-2xl font-semibold text-ink">{active.name}</h2>
                      <p className="mt-1 text-sm text-ink-faint">
                        {t(active.muscleGroup)} · {t(active.equipment)}
                      </p>
                    </div>
                    {active.completed && <CheckCircle2 size={22} className="shrink-0 text-emerald" />}
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2 border-y border-surface-border py-5">
                    <Stat value={active.sets} label={t('Sets')} />
                    <Stat value={active.reps} label={t('Reps')} />
                    <Stat value={`${active.restSeconds}s`} label={t('Rest')} />
                  </div>

                  <div className="mt-5 rounded-lg border border-surface-border bg-surface-raised p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">{t('Set progress')}</span>
                      <span className="font-semibold text-ink">{active.completedSets ?? 0}/{active.sets}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-border">
                      <div
                        className="h-full rounded-full bg-emerald transition-all"
                        style={{ width: `${Math.min(100, ((active.completedSets ?? 0) / active.sets) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm leading-relaxed text-ink-muted">{active.description}</p>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{t('Form cues')}</p>
                  <ul className="mt-3 space-y-2">
                    {active.cues.map((cue) => (
                      <li key={cue} className="flex gap-2 text-sm text-ink-muted">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-emerald" />
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>

                {active.commonMistakes.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{t('Common mistakes')}</p>
                    <ul className="mt-3 space-y-2">
                      {active.commonMistakes.map((mistake) => (
                        <li key={mistake} className="flex gap-2 text-sm text-ink-muted">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-orange" />
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => { setVideoOpen(true); setVideoLevel(active.difficulty) }}>
                  <Play size={16} />
                  {t('View Demo')}
                </Button>

                <Button disabled={Boolean(active.completed)} onClick={() => completeSet(active.id)}>
                  <CheckCircle2 size={16} />
                  {active.completed ? t('Exercise complete') : `${t('Complete set')} ${(active.completedSets ?? 0) + 1}`}
                </Button>

                <Button variant="ghost" onClick={nextExercise} disabled={activeIndex >= exercises.length - 1}>
                  <SkipForward size={16} />
                  {t('Next')}
                </Button>
              </div>

              {videoOpen && (
                <ExerciseInlineVideo
                  exercise={active}
                  level={videoLevel}
                  onClose={() => setVideoOpen(false)}
                />
              )}
            </motion.section>
          )}

          <Button variant="secondary" fullWidth loading={saving} onClick={finishWorkout}>
            {t('Finish workout')}
          </Button>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-eyebrow">{t('Workout plan')}</p>
                <h2 className="mt-2 text-lg font-semibold text-ink">{t('Exercises')}</h2>
              </div>
              <span className="text-xs text-ink-faint">{completedCount}/{exercises.length}</span>
            </div>

            <div className="mt-5 space-y-1">
              {exercises.map((exercise, index) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-current={index === activeIndex ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors ${index === activeIndex ? 'border-emerald bg-emerald/[0.06]' : 'border-transparent hover:bg-surface-raised'}`}
                >
                  {exercise.completed ? (
                    <CheckCircle2 size={17} className="shrink-0 text-emerald" />
                  ) : (
                    <Circle size={17} className="shrink-0 text-ink-faint" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{exercise.name}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {exercise.completedSets ?? 0}/{exercise.sets} {t('sets')} · {exercise.reps} {t('reps')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

    </AppShell>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="data-figure text-lg font-semibold text-ink">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
    </div>
  )
}
