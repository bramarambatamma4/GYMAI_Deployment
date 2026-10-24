import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, Dumbbell, Droplets, Flame, MapPin, Sparkles, Utensils } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { LocationPicker } from '@/components/ui/LocationPicker'
import { useToast } from '@/context/ToastContext'
import { generateNutritionPlan, getNutritionInputs, type Diet, type NutritionInputs, type NutritionPlan } from '@/services/nutritionService'

export default function Nutrition() {
  const { showToast } = useToast()
  const [inputs, setInputs] = useState<NutritionInputs | null>(null)
  const [country, setCountry] = useState('')
  const [stateName, setStateName] = useState('')
  const location = [stateName.trim(), country.trim()].filter(Boolean).join(', ')
  const [diet, setDiet] = useState<Diet>('any')
  const [plan, setPlan] = useState<NutritionPlan | null>(null) // stays null until the button is pressed
  const [loading, setLoading] = useState(false)

  // Loads a read-only preview of the inputs. It does NOT generate a plan.
  useEffect(() => {
    getNutritionInputs().then((data) => { setInputs(data); {
      // saved location is "State, Country" - split on the last comma
      const saved = data.location ?? ''
      const i = saved.lastIndexOf(',')
      setCountry((cur) => cur || (i >= 0 ? saved.slice(i + 1).trim() : saved))
      setStateName((cur) => cur || (i >= 0 ? saved.slice(0, i).trim() : ''))
    } }).catch(() => undefined)
  }, [])

  const generate = async () => {
    if (!country.trim() || !stateName.trim()) return showToast('Choose your country and state first.', 'error')
    setLoading(true)
    try {
      setPlan(await generateNutritionPlan(location, diet))
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      showToast(detail ?? 'Could not generate your meal plan.', 'error')
    } finally { setLoading(false) }
  }

  const chip = 'rounded-xl border border-surface-border bg-surface-raised px-4 py-3'
  return (
    <AppShell>
      <PageHeader eyebrow="Nutrition" title="Food for today" description="One day of meals built from your workout, your location and your water need." />
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="card-surface p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={chip}><p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-faint"><Dumbbell size={14} className="text-orange" /> Workout plan</p>
              <p className="mt-1.5 text-sm font-medium text-ink">{inputs?.ready ? `${inputs.workout_name} · ${inputs.workout_focus}` : '—'}</p>
              {inputs?.ready && <p className="text-xs text-ink-muted">{inputs.workout_duration_minutes} min · {inputs.workout_exercise_count} exercises</p>}</div>
            <div className={chip}><p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-faint"><MapPin size={14} className="text-orange" /> Location</p>
              <div className="mt-2"><LocationPicker country={country} state={stateName} onChange={(c, st) => { setCountry(c); setStateName(st) }} /></div>
            </div>
            <div className={chip}><p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-faint"><Droplets size={14} className="text-orange" /> Water need</p>
              <p className="mt-1.5 font-mono text-sm font-medium text-ink">{inputs?.water_need_ml ? `${(inputs.water_need_ml / 1000).toFixed(1)} L` : '—'}</p></div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(['any', 'vegetarian'] as Diet[]).map((d) => (
              <button key={d} type="button" onClick={() => setDiet(d)} disabled={loading}
                className={`rounded-full border px-4 py-2 text-xs font-medium capitalize transition ${diet === d ? 'border-orange bg-orange/10 text-orange' : 'border-surface-borderStrong bg-surface-raised text-ink-muted hover:border-orange/40'}`}>
                {d === 'any' ? 'Veg + non-veg' : 'Vegetarian'}</button>
            ))}
          </div>

          {inputs && !inputs.ready && (
            <p className="mt-4 text-sm text-orange">{inputs.message} {inputs.message?.startsWith('Generate') && <Link to="/workout" className="underline">Go to Workout</Link>}</p>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={generate} loading={loading} disabled={loading || !inputs?.ready}><Sparkles size={16} /> {loading ? 'Generating…' : 'Generate Plan'}</Button>
          </div>
        </section>

        {plan && (
          <>
            <section className="card-surface p-5 sm:p-7">
              <p className="text-xs text-ink-muted">{plan.cuisine_note}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={<Flame size={14} />} label="Calories" value={`${plan.total_kcal}`} sub={`target ${plan.target_kcal}`} />
                <Stat icon={<Utensils size={14} />} label="Protein" value={`${Math.round(plan.total_protein_g)} g`} sub={`target ${plan.target_protein_g} g`} />
                <Stat icon={<Utensils size={14} />} label="Carbs / Fat" value={`${Math.round(plan.total_carbs_g)} / ${Math.round(plan.total_fat_g)} g`} />
                <Stat icon={<Droplets size={14} />} label="Water" value={`${(plan.water_need_ml / 1000).toFixed(1)} L`} sub={`${plan.water_glasses} glasses`} />
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              {plan.meals.map((meal) => (
                <section key={meal.slot} className="card-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-base font-semibold text-ink">{meal.slot}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint"><Clock3 size={12} /> {meal.time_hint}</p></div>
                    <span className="rounded-full bg-orange/10 px-3 py-1 font-mono text-xs text-orange">{meal.kcal} kcal</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {meal.items.map((item) => (
                      <li key={item.name} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 text-ink">{item.name}</span>
                        <span className="shrink-0 font-mono text-xs text-ink-muted">{item.serving}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-surface-border pt-3 font-mono text-[11px] text-ink-faint">P {Math.round(meal.protein_g)} g · C {Math.round(meal.carbs_g)} g · F {Math.round(meal.fat_g)} g</p>
                </section>
              ))}
            </div>

            <section className="card-surface p-5 sm:p-7">
              <h3 className="text-base font-semibold text-ink">Hydration &amp; timing</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">{plan.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="mt-4 text-xs text-ink-faint">Estimates based on typical food values. This is general guidance, not medical advice.</p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-faint"><span className="text-orange">{icon}</span>{label}</p>
      <p className="mt-1.5 font-mono text-lg font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  )
}
