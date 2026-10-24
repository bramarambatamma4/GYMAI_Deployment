import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Flame, ShieldCheck, UserPlus, Users, CheckCircle2, Clock3, Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { getAdminUsers, type AdminSummary, type AdminUser } from '@/services/adminService'

const STATUS_STYLE: Record<AdminUser['workout_status'], string> = {
  'Completed today': 'border-emerald/40 bg-emerald/10 text-emerald',
  'Pending today': 'border-orange/40 bg-orange/10 text-orange',
  'Not generated today': 'border-surface-borderStrong bg-surface-raised text-ink-muted',
}
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export default function Admin() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminSummary | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user?.is_admin) return
    getAdminUsers().then(setData).catch((e) => setError(e?.response?.status === 403 ? 'Admin access required.' : 'Could not load users.'))
  }, [user?.is_admin])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.users ?? []).filter((u) => !q || u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q) || (u.goal ?? '').toLowerCase().includes(q))
  }, [data, query])

  // The server enforces this too; this only hides the page from non-admins.
  if (user && !user.is_admin) return <Navigate to="/dashboard" replace />

  const stats = data && [
    { icon: <Users size={16} />, label: 'Registered users', value: data.total_users },
    { icon: <UserPlus size={16} />, label: 'New this week', value: data.new_this_week },
    { icon: <CheckCircle2 size={16} />, label: 'Completed today', value: data.completed_today },
    { icon: <Clock3 size={16} />, label: 'Pending today', value: data.pending_today },
    { icon: <Flame size={16} />, label: 'Active streaks', value: data.active_streaks },
  ]

  return (
    <AppShell>
      <PageHeader eyebrow="Admin" title="Registered users" description="Goals, today's workout status and streaks for every member." />
      <div className="mx-auto max-w-7xl space-y-6">
        {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="card-surface p-4">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-faint"><span className="text-orange">{s.icon}</span>{s.label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="card-surface p-4 sm:p-5">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or goal" aria-label="Search users"
              className="w-full rounded-xl border border-surface-borderStrong bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-orange" />
          </label>

          {!data && !error && <p className="py-10 text-center text-sm text-ink-muted">Loading users…</p>}

          {/* Desktop table */}
          {data && (
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-ink-faint">
                  <tr>{['Member', 'Goal', 'Workout status', 'Streak', 'Workouts', 'Last workout', 'Joined'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {rows.map((u) => (
                    <tr key={u.id} className="align-top">
                      <td className="px-3 py-3"><p className="flex items-center gap-1.5 font-medium text-ink">{u.full_name}{u.is_admin && <ShieldCheck size={13} className="text-orange" aria-label="Admin" />}</p><p className="text-xs text-ink-muted">{u.email}</p></td>
                      <td className="px-3 py-3 text-ink-muted"><p>{u.goal ?? '—'}</p><p className="text-xs text-ink-faint">{u.fitness_level ?? ''}</p></td>
                      <td className="px-3 py-3"><span className={`inline-block rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLE[u.workout_status]}`}>{u.workout_status}</span></td>
                      <td className="px-3 py-3 font-mono text-ink"><span className="inline-flex items-center gap-1"><Flame size={13} className={u.current_streak ? 'text-orange' : 'text-ink-faint'} />{u.current_streak}d</span><p className="text-xs text-ink-faint">best {u.longest_streak}d</p></td>
                      <td className="px-3 py-3 font-mono text-ink">{u.total_workouts}</td>
                      <td className="px-3 py-3 text-ink-muted">{fmt(u.last_workout_at)}</td>
                      <td className="px-3 py-3 text-ink-muted">{fmt(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards */}
          {data && (
            <ul className="mt-4 space-y-3 md:hidden">
              {rows.map((u) => (
                <li key={u.id} className="rounded-xl border border-surface-border bg-surface-raised p-4">
                  <p className="flex items-center gap-1.5 font-medium text-ink">{u.full_name}{u.is_admin && <ShieldCheck size={13} className="text-orange" />}</p>
                  <p className="break-all text-xs text-ink-muted">{u.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full border px-2.5 py-1 ${STATUS_STYLE[u.workout_status]}`}>{u.workout_status}</span>
                    <span className="inline-flex items-center gap-1 font-mono text-ink"><Flame size={12} className={u.current_streak ? 'text-orange' : 'text-ink-faint'} />{u.current_streak}d streak</span>
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">{u.goal ?? 'No goal'} · {u.total_workouts} workouts · last {fmt(u.last_workout_at)}</p>
                </li>
              ))}
            </ul>
          )}
          {data && rows.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">No users match your search.</p>}
        </div>
      </div>
    </AppShell>
  )
}
