import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, Dumbbell, Gauge, Pencil, Ruler, Scale, Sparkles, Target, Timer, Users, Wand2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ProfileWizard, type WizardResult } from '@/components/profile/ProfileWizard'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { updateProfile } from '@/services/profileService'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  // wizard: closed | full flow | a single field (`only` = question index)
  const [wizard, setWizard] = useState<{ open: boolean; only?: number }>({ open: !user?.profile_completed })
  const setOpen = (open: boolean) => setWizard({ open })
  const editOnly = (only: number) => setWizard({ open: true, only })

  if (!user) return null

  const checks = [user.full_name?.trim().length > 1, user.age, user.gender, user.height_cm, user.weight_kg, user.goal, user.fitness_level, user.equipment?.length, user.training_frequency]
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  const equipment = user.equipment ?? []
  const circ = 2 * Math.PI * 34

  const save = async (r: WizardResult) => {
    const res = await updateProfile({ age: r.age, gender: r.gender, height_cm: r.height_cm, weight_kg: r.weight_kg, goal: r.goal, fitness_level: r.fitness_level, equipment: r.equipment, training_frequency: r.training_frequency })
    await updateUser({ full_name: r.full_name, avatar_url: r.avatar_url, gender: r.gender, age: res.age ?? undefined, height_cm: res.height_cm ?? undefined, weight_kg: res.weight_kg ?? undefined,
      goal: res.goal ?? undefined, fitness_level: res.fitness_level ?? undefined, equipment: res.equipment ?? undefined, training_frequency: res.training_frequency ?? undefined, profile_completed: res.profile_completed })
    setOpen(false)
    showToast('Your GymAI profile is ready.', 'success')
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <section className="profile-hero card-surface overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-full p-1 ring-2 ring-orange/60 ring-offset-4 ring-offset-transparent shadow-[0_0_40px_-8px_rgba(255,90,0,.7)]"><Avatar name={user.full_name} src={user.avatar_url} size="xl" /></div>
              <div>
                <p className="label-eyebrow">Training identity</p>
                <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold text-ink">{user.full_name}<button type="button" onClick={() => editOnly(0)} aria-label="Edit name" className="rounded-lg p-1.5 text-ink-faint hover:bg-orange/10 hover:text-orange"><Pencil size={15} /></button></h1>
                <p className="text-sm text-ink-muted">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">{user.goal && <Pill>{user.goal}</Pill>}{user.fitness_level && <Pill>{user.fitness_level}</Pill>}</div>
              </div>
            </div>
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90"><circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--surface-border) / .12)" strokeWidth="7" />
                <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#FF5A00" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} animate={{ strokeDashoffset: circ * (1 - completion / 100) }} transition={{ duration: .8 }} /></svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-mono text-xl font-semibold text-ink">{completion}%</span><span className="text-[10px] uppercase tracking-wider text-ink-faint">Complete</span></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat onEdit={() => editOnly(1)} icon={<CalendarDays size={18} />} label="Age" value={user.age?.toString()} unit="yrs" />
          <Stat onEdit={() => editOnly(2)} icon={<Users size={18} />} label="Gender" value={user.gender ?? undefined} />
          <Stat onEdit={() => editOnly(3)} icon={<Ruler size={18} />} label="Height" value={user.height_cm?.toString()} unit="cm" />
          <Stat onEdit={() => editOnly(4)} icon={<Scale size={18} />} label="Weight" value={user.weight_kg?.toString()} unit="kg" />
          <Stat onEdit={() => editOnly(8)} icon={<Timer size={18} />} label="Days / week" value={user.training_frequency ? `${user.training_frequency}` : undefined} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card-surface p-5"><EditBtn onClick={() => editOnly(6)} label="goal" /><div className="flex items-center gap-3"><span className="icon-tile"><Target size={18} /></span><div><p className="text-xs uppercase tracking-wider text-ink-faint">Goal</p><p className="font-semibold text-ink">{user.goal ?? 'Not set'}</p></div></div></div>
          <div className="card-surface p-5"><EditBtn onClick={() => editOnly(7)} label="experience" /><div className="flex items-center gap-3"><span className="icon-tile"><Gauge size={18} /></span><div><p className="text-xs uppercase tracking-wider text-ink-faint">Experience</p><p className="font-semibold text-ink">{user.fitness_level ?? 'Not set'}</p></div></div></div>
          <div className="card-surface p-5"><EditBtn onClick={() => editOnly(5)} label="equipment" /><div className="flex items-center gap-3"><span className="icon-tile"><Dumbbell size={18} /></span><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-ink-faint">Equipment</p><div className="mt-1 flex flex-wrap gap-1.5">{equipment.length ? equipment.map((e) => <Pill key={e}>{e === 'None' ? 'No equipment' : e}</Pill>) : <span className="text-sm text-ink">Not set</span>}</div></div></div></div>
        </div>

        <div className="card-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><span className="icon-tile !h-12 !w-12"><Wand2 size={22} /></span><div><h2 className="text-lg font-semibold text-ink">{user.profile_completed ? 'Ready for your AI workout plan?' : 'Finish your profile'}</h2><p className="text-sm text-ink-muted">{user.profile_completed ? 'Your plan mixes your equipment with no-equipment moves. Nothing shows until you press generate.' : 'Answer a few quick questions so the AI coach can plan for you.'}</p></div></div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setOpen(true)}><Pencil size={15} /> {user.profile_completed ? 'Edit all details' : 'Start'}</Button>
            {user.profile_completed && <Link to="/workout"><Button><Sparkles size={15} /> Generate plan</Button></Link>}</div>
        </div>
      </div>
      {wizard.open && <ProfileWizard key={wizard.only ?? 'all'} user={user} onClose={() => setOpen(false)} onSave={save} onlyStep={wizard.only} />}
    </AppShell>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs font-medium text-orange">{children}</span>
}

function EditBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} aria-label={`Edit ${label}`} className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-ink-faint transition hover:bg-orange/10 hover:text-orange"><Pencil size={14} /></button>
}

function Stat({ icon, label, value, unit, onEdit }: { icon: React.ReactNode; label: string; value?: string; unit?: string; onEdit?: () => void }) {
  return <div className="card-surface p-5">{onEdit && <EditBtn onClick={onEdit} label={label} />}<span className="icon-tile">{icon}</span><p className="mt-4 text-xs uppercase tracking-wider text-ink-faint">{label}</p><p className="mt-1 font-mono text-2xl font-semibold text-ink">{value || '—'}{value && unit && <span className="ml-1.5 text-xs font-normal text-ink-muted">{unit}</span>}</p></div>
}
