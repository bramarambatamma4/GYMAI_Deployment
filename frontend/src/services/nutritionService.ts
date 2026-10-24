import api from '@/lib/api'

export interface NutritionInputs {
  workout_name: string | null
  workout_focus: string | null
  workout_duration_minutes: number | null
  workout_exercise_count: number | null
  water_need_ml: number | null
  location: string | null
  ready: boolean
  message: string | null
}
export interface FoodItem { name: string; serving: string; grams: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number }
export interface Meal { slot: string; time_hint: string; items: FoodItem[]; kcal: number; protein_g: number; carbs_g: number; fat_g: number }
export interface NutritionPlan {
  date: string; location: string; cuisine_note: string; workout_name: string; workout_focus: string
  water_need_ml: number; water_glasses: number; target_kcal: number; target_protein_g: number
  meals: Meal[]; total_kcal: number; total_protein_g: number; total_carbs_g: number; total_fat_g: number; tips: string[]
}
export type Diet = 'any' | 'vegetarian'

/** Read-only preview of the generator inputs - never creates a plan. */
export const getNutritionInputs = async () => (await api.get<NutritionInputs>('/nutrition/inputs')).data
/** Called only from the "Generate Plan" button. */
export const generateNutritionPlan = async (location: string, diet: Diet) =>
  (await api.post<NutritionPlan>('/nutrition/plan', { location, diet })).data
