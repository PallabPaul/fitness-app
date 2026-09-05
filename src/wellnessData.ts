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

export type FastingSession = FastingSettings & {
  id: string
  startedAt: string
  targetEndAt: string
  endedAt: string | null
}

export type WellnessData = {
  goals: DailyGoal[]
  completions: GoalCompletion[]
  fasting: FastingSettings
  fastingSessions: FastingSession[]
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
    fastingRecords?: Array<FastingSettings & { fastDate: string; lastMealAt: string }>
  } : {}
  const legacyRecords = data.fastingRecords || (data.fasting?.lastMealAt ? [{
    fastDate: data.fasting.lastMealAt.slice(0, 10), lastMealAt: data.fasting.lastMealAt,
    fastingHours: data.fasting.fastingHours, eatingHours: data.fasting.eatingHours,
  }] : [])
  const migratedSessions = legacyRecords.map((record) => ({
    id: crypto.randomUUID(),
    startedAt: record.lastMealAt,
    targetEndAt: new Date(new Date(record.lastMealAt).getTime() + record.fastingHours * 3_600_000).toISOString(),
    endedAt: new Date(new Date(record.lastMealAt).getTime() + record.fastingHours * 3_600_000).toISOString(),
    fastingHours: record.fastingHours,
    eatingHours: record.eatingHours,
  }))
  return {
    goals: data.goals || [],
    completions: data.completions || [],
    fasting: { ...defaultFasting, ...data.fasting },
    fastingSessions: data.fastingSessions || migratedSessions,
  }
}

function saveLocal(data: WellnessData) {
  localStorage.setItem(storageKey, JSON.stringify(data))
}

export async function loadWellnessData(): Promise<WellnessData> {
  if (!supabase) return loadLocal()
  const [goalsResult, completionsResult, fastingResult, sessionsResult] = await Promise.all([
    supabase.from('daily_goals').select('*').order('created_at'),
    supabase.from('goal_completions').select('*'),
    supabase.from('fasting_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('fasting_sessions').select('*').order('started_at', { ascending: false }),
  ])
  const error = goalsResult.error || completionsResult.error || fastingResult.error || sessionsResult.error
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
    fastingSessions: (sessionsResult.data || []).map((row) => ({
      id: row.id,
      startedAt: row.started_at,
      targetEndAt: row.target_end_at,
      endedAt: row.ended_at,
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

export async function saveFastingSession(session: FastingSession, current: WellnessData) {
  const sessions = [session, ...current.fastingSessions.filter((item) => item.id !== session.id)]
  if (!supabase) return saveLocal({ ...current, fastingSessions: sessions })
  const { error } = await supabase.from('fasting_sessions').upsert({
    id: session.id,
    started_at: session.startedAt,
    target_end_at: session.targetEndAt,
    ended_at: session.endedAt,
    fasting_hours: session.fastingHours,
    eating_hours: session.eatingHours,
  })
  if (error) throw error
}

export async function removeFastingSession(id: string, current: WellnessData) {
  if (!supabase) return saveLocal({
    ...current,
    fastingSessions: current.fastingSessions.filter((item) => item.id !== id),
  })
  const { error } = await supabase.from('fasting_sessions').delete().eq('id', id)
  if (error) throw error
}