import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, ExternalLink, MapPin, Settings2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { LocationPicker } from '@/components/ui/LocationPicker'
import { getNotifications, getPreferences, getMarathonAvailability, markRead, savePreferences, type AppNotification, type NotificationPreference } from '@/services/notificationService'

const POLL_MS = 60_000

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export function NotificationBell() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [pref, setPref] = useState<NotificationPreference | null>(null)
  const [form, setForm] = useState<NotificationPreference>({ notification_email: user?.email ?? '', country: '', state: '', area: '', email_enabled: true })
  const [saving, setSaving] = useState(false)
  const [marathonMessage, setMarathonMessage] = useState('')

  const refresh = useCallback(async () => {
    try { const feed = await getNotifications(); setItems(feed.items); setUnread(feed.unread_count); const availability = await getMarathonAvailability(); setMarathonMessage(availability.message) } catch { /* bell stays quiet on network errors */ }
  }, [])

  useEffect(() => {
    if (!user) return
    getPreferences().then((p) => { if (p) { setPref(p); setForm(p) } else setForm((f) => ({ ...f, notification_email: user.email })) }).catch(() => undefined)
    refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(id)
  }, [user, refresh])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = async () => {
    const opening = !open
    setOpen(opening)
    if (opening) {
      setEditing(!pref)
      await refresh()
    } else if (unread > 0) {
      // Opening shows the feed with unread items highlighted; closing marks them all read.
      setUnread(0)
      setItems((list) => list.map((n) => ({ ...n, is_read: true })))
      markRead().catch(() => refresh())
    }
  }

  const readOne = (n: AppNotification) => {
    if (!n.is_read) {
      setItems((list) => list.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)))
      setUnread((c) => Math.max(0, c - 1))
      markRead([n.notification_id]).catch(refresh)
    }
    if (n.target_url) window.open(n.target_url, '_blank', 'noopener,noreferrer')
  }

  const save = async () => {
    if (!form.country.trim() || !form.state.trim() || !form.area.trim() || !/^\S+@\S+\.\S+$/.test(form.notification_email)) return showToast('Enter a valid email, state and area.', 'error')
    setSaving(true)
    try { const p = await savePreferences(form); setPref(p); setEditing(false); await refresh(); showToast('Event alerts saved.', 'success') }
    catch { showToast('Could not save your location.', 'error') }
    finally { setSaving(false) }
  }

  if (!user) return null
  const field = 'w-full rounded-xl border border-surface-borderStrong bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-orange'

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-muted transition hover:border-orange/50 hover:text-orange">
        <Bell size={17} className={unread ? 'animate-[wiggle_1s_ease-in-out_1]' : ''} />
        {unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange px-1 font-mono text-[10px] font-bold text-white shadow-[0_0_12px_rgba(255,90,0,.8)]">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="glow-card absolute right-0 z-[70] mt-3 w-[min(92vw,380px)] rounded-2xl border border-surface-borderStrong bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <div><p className="text-sm font-semibold text-ink">Marathon & fitness alerts</p>
              {pref && <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted"><MapPin size={11} className="text-orange" />{pref.area}, {pref.state}, {pref.country}</p>}</div>
            <button type="button" onClick={() => setEditing((v) => !v)} aria-label="Location settings" className="rounded-lg p-2 text-ink-faint hover:bg-surface-raised hover:text-orange"><Settings2 size={16} /></button>
          </div>

          {editing ? (
            <div className="space-y-3 p-4">
              <p className="text-xs text-ink-muted">Choose where you want event alerts from. We also email you when a new event is added there.</p>
              <input className={field} type="email" placeholder="Email for alerts" value={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.value })} />
              {/* CHANGE: searchable country list, then that country's states */}
              <LocationPicker country={form.country} state={form.state} area={form.area} onChange={(country, state, area) => setForm({ ...form, country, state, area: area ?? "" })} />
              <label className="flex items-center gap-2 text-xs text-ink-muted"><input type="checkbox" checked={form.email_enabled} onChange={(e) => setForm({ ...form, email_enabled: e.target.checked })} className="accent-orange" /> Also send alerts by email</label>
              <button type="button" onClick={save} disabled={saving} className="w-full rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-dark disabled:opacity-60">{saving ? 'Saving…' : 'Save location'}</button>
            </div>
          ) : (
            <ul className="max-h-[360px] divide-y divide-surface-border overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-muted">{marathonMessage || 'No marathon available here.'}</li>}
              {items.map((n) => (
                <li key={n.notification_id}>
                  <button type="button" onClick={() => readOne(n)} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface-raised ${n.is_read ? '' : 'bg-orange/[0.06]'}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-orange'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2"><span className="text-sm font-medium text-ink">{n.title}</span>{n.target_url && <ExternalLink size={12} className="mt-1 shrink-0 text-ink-faint" />}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{n.message_text}</span>
                      <span className="mt-1 block font-mono text-[10px] text-ink-faint">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
