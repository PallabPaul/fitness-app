import { createClient } from '@supabase/supabase-js'

export type DailyGoal = {
  id: string
  title: string
  createdAt: string
}

export type GoalCompletion = {
  goalId: string
  completedOn: string
}

export type FastingSettings = {
  fastingHours: number
  eatingHours: number
}

export type FastingRecord = FastingSettings & {
  fastDate: string
  lastMealAt: string
}

export type WellnessData = {
  goals: DailyGoal[]
  completions: GoalCompletion[]
  fasting: FastingSettings
  fastingRecords: FastingRecord[]
}

const storageKey = 'power-log-wellness'
const defaultFasting: FastingSettings = {
  fastingHours: 16,
  eatingHours: 8,
}
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

function loadLocal(): WellnessData {
  const saved = localStorage.getItem(storageKey)
  const data = saved ? JSON.parse(saved) as Partial<WellnessData> & {
    fasting?: FastingSettings & { lastMealAt?: string | null }
  } : {}
  const legacyRecord = data.fasting?.lastMealAt ? [{
    fastDate: data.fasting.lastMealAt.slice(0, 10),
    lastMealAt: data.fasting.lastMealAt,
    fastingHours: data.fasting.fastingHours,
    eatingHours: data.fasting.eatingHours,
  }] : []
  return {
    goals: data.goals || [],
    completions: data.completions || [],
    fasting: { ...defaultFasting, ...data.fasting },
    fastingRecords: data.fastingRecords || legacyRecord,
  }
}

function saveLocal(data: WellnessData) {
  localStorage.setItem(storageKey, JSON.stringify(data))
}

export async function loadWellnessData(): Promise<WellnessData> {
  if (!supabase) return loadLocal()
  const [goalsResult, completionsResult, fastingResult, recordsResult] = await Promise.all([
    supabase.from('daily_goals').select('*').order('created_at'),
    supabase.from('goal_completions').select('*'),
    supabase.from('fasting_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('fasting_records').select('*').order('fast_date', { ascending: false }),
  ])
  const error = goalsResult.error || completionsResult.error || fastingResult.error || recordsResult.error
  if (error) throw error
  return {
    goals: (goalsResult.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
    })),
    completions: (completionsResult.data || []).map((row) => ({
      goalId: row.goal_id,
      completedOn: row.completed_on,
    })),
    fasting: fastingResult.data ? {
      fastingHours: fastingResult.data.fasting_hours,
      eatingHours: fastingResult.data.eating_hours,
    } : defaultFasting,
    fastingRecords: (recordsResult.data || []).map((row) => ({
      fastDate: row.fast_date,
      lastMealAt: row.last_meal_at,
      fastingHours: row.fasting_hours,
      eatingHours: row.eating_hours,
    })),
  }
}

export async function addDailyGoal(goal: DailyGoal, current: WellnessData) {
  if (!supabase) return saveLocal({ ...current, goals: [...current.goals, goal] })
  const { error } = await supabase.from('daily_goals').insert({
    id: goal.id,
    title: goal.title,
    created_at: goal.createdAt,
  })
  if (error) throw error
}

export async function removeDailyGoal(id: string, current: WellnessData) {
  if (!supabase) return saveLocal({
    ...current,
    goals: current.goals.filter((goal) => goal.id !== id),
    completions: current.completions.filter((completion) => completion.goalId !== id),
  })
  const { error } = await supabase.from('daily_goals').delete().eq('id', id)
  if (error) throw error
}

export async function setGoalCompletion(goalId: string, completedOn: string, completed: boolean, current: WellnessData) {
  if (!supabase) {
    const withoutCurrent = current.completions.filter(
      (item) => !(item.goalId === goalId && item.completedOn === completedOn),
    )
    return saveLocal({
      ...current,
      completions: completed ? [...withoutCurrent, { goalId, completedOn }] : withoutCurrent,
    })
  }
  const query = supabase.from('goal_completions')
  const { error } = completed
    ? await query.upsert({ goal_id: goalId, completed_on: completedOn })
    : await query.delete().eq('goal_id', goalId).eq('completed_on', completedOn)
  if (error) throw error
}

export async function saveFastingSettings(fasting: FastingSettings, current: WellnessData) {
  if (!supabase) return saveLocal({ ...current, fasting })
  const { error } = await supabase.from('fasting_settings').upsert({
    id: 1,
    fasting_hours: fasting.fastingHours,
    eating_hours: fasting.eatingHours,
  })
  if (error) throw error
}

export async function saveFastingRecord(record: FastingRecord, current: WellnessData) {
  const records = [record, ...current.fastingRecords.filter((item) => item.fastDate !== record.fastDate)]
  if (!supabase) return saveLocal({ ...current, fastingRecords: records })
  const { error } = await supabase.from('fasting_records').upsert({
    fast_date: record.fastDate,
    last_meal_at: record.lastMealAt,
    fasting_hours: record.fastingHours,
    eating_hours: record.eatingHours,
  })
  if (error) throw error
}

export async function removeFastingRecord(fastDate: string, current: WellnessData) {
  if (!supabase) return saveLocal({
    ...current,
    fastingRecords: current.fastingRecords.filter((item) => item.fastDate !== fastDate),
  })
  const { error } = await supabase.from('fasting_records').delete().eq('fast_date', fastDate)
  if (error) throw error
}