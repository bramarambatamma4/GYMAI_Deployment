import api from '@/lib/api'
import type { Equipment, FitnessLevel, Goal, Workout } from '@/types'

interface AIWorkoutRequest {
  height_cm: number
  weight_kg: number
  goal: Goal | string
  fitness_level: FitnessLevel | string
  equipment: Equipment[]
  workout_time_minutes: number
  age?: number
  gender?: string
  training_frequency?: number
}

interface WorkoutExerciseApi {
  id: string
  slug: string
  name: string
  muscle_group: Workout['exercises'][number]['muscleGroup']
  equipment: Workout['exercises'][number]['equipment']
  difficulty: Workout['exercises'][number]['difficulty']
  sets: number
  reps: string
  rest_seconds: number
  description: string
  cues: string[]
  common_mistakes: string[]
  goal_tags: string[]
  image_url: string
  image_urls?: string[]
  pose_supported: boolean
  pose_type?: string | null
}

interface AIWorkoutResponse {
  id: string
  name: string
  focus: string
  duration_minutes: number
  difficulty: Workout['difficulty']
  exercises: WorkoutExerciseApi[]
  profile_summary?: Record<string, string>
}

function mapWorkout(data: AIWorkoutResponse): Workout {
  return {
    id: data.id,
    name: data.name,
    focus: data.focus,
    durationMinutes: data.duration_minutes,
    difficulty: data.difficulty,
    aiSource: data.profile_summary?.source, // 'gemini' = real AI, 'local_fallback' = built-in planner
    aiNote: data.profile_summary?.ai_note || undefined,
    exercises: data.exercises.map((exercise) => ({
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      muscleGroup: exercise.muscle_group,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.rest_seconds,
      description: exercise.description
        .replace(/\ba advanced\b/gi, 'an advanced')
        .replace(/\ban intermediate\b/gi, 'an intermediate')
        .replace(/\ba beginner\b/gi, 'a beginner'),
      cues: exercise.cues,
      commonMistakes: exercise.common_mistakes,
      goalTags: exercise.goal_tags,
      imageUrl: exercise.image_url,
      imageUrls: exercise.image_urls ?? [exercise.image_url],
      poseSupported: exercise.pose_supported,
      poseType: exercise.pose_type,
      completed: false,
      completedSets: 0,
    })),
  }
}

export async function generateAIWorkout(payload: AIWorkoutRequest): Promise<Workout> {
  const { data } = await api.post<AIWorkoutResponse>('/workouts/generate-ai', payload)
  return mapWorkout(data)
}

/** CHANGE 4: today's generated-but-unfinished plan (target of the reminder email link), or null. */
export async function getActiveWorkout(): Promise<Workout | null> {
  const { data } = await api.get<AIWorkoutResponse | null>('/workouts/active')
  return data ? mapWorkout(data) : null
}
