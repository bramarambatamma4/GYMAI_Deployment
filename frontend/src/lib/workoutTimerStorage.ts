/** Shared storage keys for the workout timer + a helper that wipes them. */
export const TIMER_KEY = 'gymai_workout_timer_v2'
export const LAP_KEY = 'gymai_workout_laps_v1'

/** CHANGE: the timer starts fresh every time the user logs in (or out). */
export function clearWorkoutTimer(): void {
  try {
    localStorage.removeItem(TIMER_KEY)
    localStorage.removeItem(LAP_KEY)
  } catch { /* storage unavailable: nothing to clear */ }
}
