import api from '@/lib/api'

export interface AdminUser {
  id: string; full_name: string; email: string; goal: string | null; fitness_level: string | null
  training_frequency: number | null; created_at: string | null
  workout_status: 'Completed today' | 'Pending today' | 'Not generated today'
  total_workouts: number; last_workout_at: string | null; current_streak: number; longest_streak: number; is_admin: boolean
}
export interface AdminSummary {
  total_users: number; new_this_week: number; completed_today: number; pending_today: number; active_streaks: number; users: AdminUser[]
}

export const getAdminUsers = async () => (await api.get<AdminSummary>('/admin/users')).data
