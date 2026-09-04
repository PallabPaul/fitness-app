import { createClient } from '@supabase/supabase-js'
import type { Meal, WeightEntry, Workout } from './App'
import { defaultProfile, type Profile } from './fitness'

export type FitnessData = { meals: Meal[]; workouts: Workout[]; weights: WeightEntry[]; profile: Profile }
const storageKey = 'daily-form-data'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

function localData(): FitnessData {
  const saved = localStorage.getItem(storageKey)
  const data = saved ? JSON.parse(saved) as Partial<FitnessData> : {}
  return { meals: data.meals || [], workouts: (data.workouts || []).map((workout) => ({ ...workout, caloriesBurned: workout.caloriesBurned || 0 })), weights: data.weights || [], profile: { ...defaultProfile, ...data.profile } }
}

function saveLocal(data: FitnessData) {
  localStorage.setItem(storageKey, JSON.stringify(data))
}

export async function loadFitnessData(): Promise<FitnessData> {
  if (!supabase) return localData()
  const [mealResult, workoutResult, weightResult, profileResult] = await Promise.all([
    supabase.from('meals').select('*').order('eaten_at', { ascending: false }),
    supabase.from('workouts').select('*').order('completed_at', { ascending: false }),
    supabase.from('weight_entries').select('*').order('recorded_at', { ascending: false }),
    supabase.from('profiles').select('*').limit(1).maybeSingle(),
  ])
  const error = mealResult.error || workoutResult.error || weightResult.error || profileResult.error
  if (error) throw error
  return {
    meals: (mealResult.data || []).map((row) => ({ id: row.id, name: row.name, calories: row.calories, protein: row.protein, carbs: row.carbs, fat: row.fat, eatenAt: row.eaten_at })),
    workouts: (workoutResult.data || []).map((row) => ({ id: row.id, type: row.type, name: row.name, duration: row.duration, distance: row.distance || undefined, notes: row.notes || undefined, caloriesBurned: row.calories_burned || 0, completedAt: row.completed_at })),
    weights: (weightResult.data || []).map((row) => ({ id: row.id, weight: Number(row.weight), recordedAt: row.recorded_at })),
    profile: profileResult.data ? { weightLb: Number(profileResult.data.weight_lb), heightFt: profileResult.data.height_ft, heightIn: profileResult.data.height_in, age: profileResult.data.age, sex: profileResult.data.sex, activity: profileResult.data.activity, weeklyLossLb: Number(profileResult.data.weekly_loss_lb) as Profile['weeklyLossLb'], customGoals: profileResult.data.goal_calories == null ? null : { calories: profileResult.data.goal_calories, protein: profileResult.data.macro_protein, carbs: profileResult.data.macro_carbs, fat: profileResult.data.macro_fat } } : defaultProfile,
  }
}

export async function saveMeal(meal: Meal, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, meals: [meal, ...current.meals] })
  const { error } = await supabase.from('meals').insert({ id: meal.id, name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, eaten_at: meal.eatenAt })
  if (error) throw error
}

export async function updateMeal(meal: Meal, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, meals: current.meals.map((item) => item.id === meal.id ? meal : item) })
  const { error } = await supabase.from('meals').update({ name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat }).eq('id', meal.id)
  if (error) throw error
}

export async function deleteMeal(id: string, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, meals: current.meals.filter((item) => item.id !== id) })
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
}

export async function saveWorkout(workout: Workout, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, workouts: [workout, ...current.workouts] })
  const { error } = await supabase.from('workouts').insert({ id: workout.id, type: workout.type, name: workout.name, duration: workout.duration, distance: workout.distance, notes: workout.notes, calories_burned: workout.caloriesBurned, completed_at: workout.completedAt })
  if (error) throw error
}

export async function updateWorkout(workout: Workout, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, workouts: current.workouts.map((item) => item.id === workout.id ? workout : item) })
  const { error } = await supabase.from('workouts').update({ type: workout.type, name: workout.name, duration: workout.duration, distance: workout.distance, notes: workout.notes, calories_burned: workout.caloriesBurned }).eq('id', workout.id)
  if (error) throw error
}

export async function deleteWorkout(id: string, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, workouts: current.workouts.filter((item) => item.id !== id) })
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}

export async function saveWeight(entry: WeightEntry, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, weights: [entry, ...current.weights] })
  const { error } = await supabase.from('weight_entries').insert({ id: entry.id, weight: entry.weight, recorded_at: entry.recordedAt })
  if (error) throw error
}

export async function updateWeight(entry: WeightEntry, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, weights: current.weights.map((item) => item.id === entry.id ? entry : item) })
  const { error } = await supabase.from('weight_entries').update({ weight: entry.weight }).eq('id', entry.id)
  if (error) throw error
}

export async function saveProfile(profile: Profile, current: FitnessData) {
  if (!supabase) return saveLocal({ ...current, profile })
  const { error } = await supabase.from('profiles').upsert({ id: 1, weight_lb: profile.weightLb, height_ft: profile.heightFt, height_in: profile.heightIn, age: profile.age, sex: profile.sex, activity: profile.activity, weekly_loss_lb: profile.weeklyLossLb, goal_calories: profile.customGoals?.calories ?? null, macro_protein: profile.customGoals?.protein ?? null, macro_carbs: profile.customGoals?.carbs ?? null, macro_fat: profile.customGoals?.fat ?? null })
  if (error) throw error
}

export const isSupabaseConfigured = Boolean(supabase)