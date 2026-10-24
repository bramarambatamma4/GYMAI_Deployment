import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, ChevronLeft, ChevronRight, Dumbbell, Gauge, Ruler, Scale, Target, Timer, UserRound, Users, X, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import type { Equipment, FitnessLevel, Goal, User } from '@/types'

export const GOALS: Goal[] = ['Build Muscle', 'Lose Fat', 'Gain Strength', 'Improve Endurance', 'General Fitness']
export const LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced']
export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
export const EQUIPMENT: Equipment[] = ['None', 'Dumbbell', 'Barbell', 'Machine', 'Full Gym', 'Cable', 'Kettlebell', 'Bands']
export const FREQUENCY = [
  { value: 2, label: '1–2 days', helper: 'Flexible' },
  { value: 4, label: '3–4 days', helper: 'Balanced' },
  { value: 5, label: '5+ days', helper: 'Frequent' },
]

const AVATARS = [
  { skin: '#B97852', hair: '#241A17', shirt: '#FF5A00' }, { skin: '#8D5B3E', hair: '#111111', shirt: '#334155' },
  { skin: '#D39A72', hair: '#5B3528', shirt: '#7C3AED' }, { skin: '#6E4937', hair: '#171717', shirt: '#059669' },
].map((a) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#111827"/><circle cx="128" cy="104" r="54" fill="${a.skin}"/><path d="M74 99c2-46 36-68 62-68 36 0 57 27 49 72-14-16-32-24-53-25-18 0-38 7-58 21z" fill="${a.hair}"/><path d="M52 236c5-51 35-78 76-78s71 27 76 78z" fill="${a.shirt}"/><circle cx="108" cy="106" r="5" fill="#241A17"/><circle cx="148" cy="106" r="5" fill="#241A17"/><path d="M111 131c10 7 22 7 32 0" fill="none" stroke="#6B3D2B" stroke-width="5" stroke-linecap="round"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
})

export interface WizardResult {
  full_name: string; avatar_url: string | null; age: number; gender: string; height_cm: number; weight_kg: number
  equipment: Equipment[]; goal: Goal; fitness_level: FitnessLevel; training_frequency: number
}

/** `onlyStep`: edit a single question (0 name, 1 age, 2 gender, 3 height, 4 weight, 5 equipment, 6 goal, 7 level, 8 days) and save. */
interface Props { user: User; onClose: () => void; onSave: (result: WizardResult) => Promise<void>; onlyStep?: number }

export function ProfileWizard({ user, onClose, onSave, onlyStep }: Props) {
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const single = onlyStep !== undefined
  const [step, setStep] = useState(onlyStep ?? 0)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(user.full_name ?? '')
  const [avatar, setAvatar] = useState<string | null>(user.avatar_url ?? null)
  const [age, setAge] = useState(user.age?.toString() ?? '')
  const [gender, setGender] = useState<string | null>(user.gender ?? null)
  const [height, setHeight] = useState(user.height_cm?.toString() ?? '')
  const [weight, setWeight] = useState(user.weight_kg?.toString() ?? '')
  const [equipment, setEquipment] = useState<Equipment[]>(user.equipment ?? [])
  const [goal, setGoal] = useState<Goal | null>(user.goal ?? null)
  const [level, setLevel] = useState<FitnessLevel | null>(user.fitness_level ?? null)
  const [days, setDays] = useState<number | null>(user.training_frequency ?? null)

  // CHANGE: every level can train with or without equipment; just pick one option ("No equipment" counts).
  const equipmentOk = equipment.length > 0

  const steps = useMemo(() => [
    { icon: <UserRound size={22} />, title: 'What should we call you?', sub: 'Your name shows up across GymAI.', ok: name.trim().length > 1 },
    { icon: <CalendarDays size={22} />, title: 'How old are you?', sub: 'Helps us keep training safe for you.', ok: Number(age) >= 13 && Number(age) <= 120 },
    { icon: <Users size={22} />, title: 'What is your gender?', sub: 'Pick the option that fits you best.', ok: Boolean(gender) },
    { icon: <Ruler size={22} />, title: 'What is your height?', sub: 'In centimetres.', ok: Number(height) >= 50 && Number(height) <= 300 },
    { icon: <Scale size={22} />, title: 'What is your weight?', sub: 'In kilograms.', ok: Number(weight) >= 20 && Number(weight) <= 500 },
    { icon: <Dumbbell size={22} />, title: 'What equipment do you have?', sub: 'Pick any. Your plan uses these plus no-equipment moves.', ok: equipmentOk },
    { icon: <Target size={22} />, title: 'What is your main goal?', sub: 'The outcome you want to train toward.', ok: Boolean(goal) },
    { icon: <Gauge size={22} />, title: 'What is your experience level?', sub: 'Be honest — we adapt the starting point.', ok: Boolean(level) && equipmentOk },
    { icon: <Timer size={22} />, title: 'How many days a week can you train?', sub: 'Choose what you can realistically keep up.', ok: Boolean(days) },
  ], [name, age, gender, height, weight, equipmentOk, goal, level, days])

  const last = single || step === steps.length - 1
  const current = steps[step]

  const toggleEquipment = (item: Equipment) => setEquipment((cur) => {
    if (item === 'None') return ['None']
    const base = cur.filter((e) => e !== 'None')
    return base.includes(item) ? base.filter((e) => e !== item) : [...base, item]
  })

  // CHANGE: Enter works on every question (typing or choosing) and the Continue button still works too.
  const nextRef = useRef<() => void>(() => undefined)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Enter' || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-nav]')) return // Back / Close / Upload / Continue keep their own Enter behaviour
      e.preventDefault()
      nextRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return showToast('Choose an image under 5 MB.', 'error')
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 320
        const ctx = c.getContext('2d'); if (!ctx) return
        const k = Math.max(320 / img.width, 320 / img.height)
        ctx.drawImage(img, (320 - img.width * k) / 2, (320 - img.height * k) / 2, img.width * k, img.height * k)
        setAvatar(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const next = async () => {
    if (!current.ok || saving) return
    if (!last) return setStep(step + 1)
    setSaving(true)
    try {
      await onSave({ full_name: name.trim(), avatar_url: avatar, age: Number(age), gender: gender!, height_cm: Number(height), weight_kg: Number(weight),
        equipment, goal: goal!, fitness_level: level!, training_frequency: days! })
    } catch {
      showToast('Could not save your profile. Please try again.', 'error')
    } finally { setSaving(false) }
  }

  nextRef.current = () => { void next() }

  const choice = (selected: boolean) => `flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${selected ? 'border-orange bg-orange/10 text-orange shadow-[0_0_22px_-8px_rgba(255,90,0,.8)]' : 'border-surface-borderStrong bg-charcoal-soft text-ink-muted hover:border-orange/40 hover:text-ink'}`
  const pick = <T extends string>(items: T[], sel: string | null, set: (v: T) => void, cols = 'sm:grid-cols-2') => (
    <div className={`grid gap-3 ${cols}`}>{items.map((i) => <button key={i} type="button" onClick={() => set(i)} className={choice(sel === i)}>{i}{sel === i && <Check size={16} />}</button>)}</div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: .94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glow-card relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-surface-border bg-surface p-6 shadow-card sm:p-8">
        <button type="button" data-nav onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-ink-faint hover:bg-surface-raised hover:text-ink"><X size={18} /></button>
        <div className={`mb-6 flex gap-1.5 pr-8 ${single ? "hidden" : ""}`}>{steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-orange' : 'bg-charcoal-soft'}`} />)}</div>
        <p className="label-eyebrow">{single ? "Edit one detail" : `Question ${step + 1} of ${steps.length}`}</p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .18 }}>
            <div className="mb-6 mt-3 flex items-start gap-3"><span className="icon-tile !h-11 !w-11">{current.icon}</span><div><h2 className="text-xl font-semibold text-ink sm:text-2xl">{current.title}</h2><p className="mt-1 text-sm text-ink-muted">{current.sub}</p></div></div>

            {step === 0 && (<div className="space-y-5">
              <Input autoFocus label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              <div className="flex flex-wrap items-center gap-3">
                {AVATARS.map((src, i) => <button key={i} type="button" onClick={() => setAvatar(src)} className={`rounded-full p-1 transition ${avatar === src ? 'ring-2 ring-orange ring-offset-2 ring-offset-surface' : 'hover:scale-105'}`}><img src={src} className="h-11 w-11 rounded-full" alt={`Avatar ${i + 1}`} /></button>)}
                <button type="button" data-nav onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-orange/50 px-3 py-2 text-xs font-medium text-orange hover:bg-orange/10"><Camera size={14} /> Upload</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div></div>)}
            {step === 1 && <Input autoFocus label="Age" type="number" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 21" />}
            {step === 2 && pick(GENDERS, gender, setGender)}
            {step === 3 && <Input autoFocus label="Height (cm)" type="number" min={50} max={300} step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 170" />}
            {step === 4 && <Input autoFocus label="Weight (kg)" type="number" min={20} max={500} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 65" />}
            {step === 5 && (<div><div className="grid gap-3 sm:grid-cols-2">{EQUIPMENT.map((i) => <button key={i} type="button" onClick={() => toggleEquipment(i)} className={choice(equipment.includes(i))}>{i === 'None' ? 'No equipment' : i}{equipment.includes(i) && <Check size={16} />}</button>)}</div>
              <p className="mt-3 text-xs text-ink-faint">Your generated plan combines the equipment you pick with no-equipment exercises.</p></div>)}
            {step === 6 && pick(GOALS, goal, setGoal)}
            {step === 7 && (<div>{pick(LEVELS, level, setLevel, 'sm:grid-cols-3')}</div>)}
            {step === 8 && (<div className="grid gap-3">{FREQUENCY.map((f) => <button key={f.value} type="button" onClick={() => setDays(f.value)} className={choice(days === f.value)}><span>{f.label}<span className="ml-2 text-xs opacity-60">{f.helper}</span></span>{days === f.value && <Check size={16} />}</button>)}</div>)}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t border-surface-border pt-5">
          <Button variant="ghost" data-nav onClick={() => setStep(step - 1)} disabled={step === 0 || single} className={single ? 'invisible' : ''}><ChevronLeft size={16} /> Back</Button>
          <Button data-nav onClick={next} loading={saving} disabled={!current.ok}>{last ? <><Check size={16} /> {single ? 'Save' : 'Finish'}</> : <>Continue <ChevronRight size={16} /></>}</Button>
        </div>
      </motion.div>
    </div>
  )
}
