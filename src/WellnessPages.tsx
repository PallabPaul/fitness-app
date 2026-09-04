import { useEffect, useState } from 'react'
import { Check, Circle, Flame, Plus, Target, Timer, Trash2 } from 'lucide-react'
import {
  addDailyGoal,
  loadWellnessData,
  removeDailyGoal,
  saveFastingSettings,
  setGoalCompletion,
  type DailyGoal,
  type FastingSettings,
  type WellnessData,
} from './wellnessData'

type WellnessView = 'goals' | 'fast'

type Props = {
  view: WellnessView
  selectedDay: Date
  onToast: (message: string) => void
}

const emptyData: WellnessData = {
  goals: [],
  completions: [],
  fasting: { fastingHours: 16, eatingHours: 8, lastMealAt: null },
}

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function WellnessPages({ view, selectedDay, onToast }: Props) {
  const [data, setData] = useState<WellnessData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWellnessData()
      .then(setData)
      .catch(() => onToast('Could not load goals and fasting data'))
      .finally(() => setLoading(false))
  }, [onToast])

  if (loading) {
    return <main className="wellness-page"><p className="wellness-loading">Loading your power plan…</p></main>
  }

  return view === 'goals'
    ? <GoalsPage data={data} setData={setData} selectedDay={selectedDay} onToast={onToast} />
    : <FastingPage data={data} setData={setData} onToast={onToast} />
}

function GoalsPage({ data, setData, selectedDay, onToast }: {
  data: WellnessData
  setData: React.Dispatch<React.SetStateAction<WellnessData>>
  selectedDay: Date
  onToast: (message: string) => void
}) {
  const day = localDay(selectedDay)
  const completedIds = new Set(
    data.completions.filter((item) => item.completedOn === day).map((item) => item.goalId),
  )
  const completedCount = completedIds.size
  const progress = data.goals.length ? (completedCount / data.goals.length) * 100 : 0

  async function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const title = String(form.get('title') || '').trim()
    if (!title) return
    const goal: DailyGoal = { id: crypto.randomUUID(), title, createdAt: new Date().toISOString() }
    try {
      await addDailyGoal(goal, data)
      setData((current) => ({ ...current, goals: [...current.goals, goal] }))
      formElement.reset()
      onToast('Daily goal added')
    } catch {
      onToast('Goal could not be added')
    }
  }

  async function toggleGoal(goal: DailyGoal) {
    const completed = !completedIds.has(goal.id)
    try {
      await setGoalCompletion(goal.id, day, completed, data)
      setData((current) => {
        const withoutCurrent = current.completions.filter(
          (item) => !(item.goalId === goal.id && item.completedOn === day),
        )
        return {
          ...current,
          completions: completed ? [...withoutCurrent, { goalId: goal.id, completedOn: day }] : withoutCurrent,
        }
      })
    } catch {
      onToast('Goal could not be updated')
    }
  }

  async function deleteGoal(goal: DailyGoal) {
    if (!window.confirm(`Remove “${goal.title}” from your daily goals?`)) return
    try {
      await removeDailyGoal(goal.id, data)
      setData((current) => ({
        ...current,
        goals: current.goals.filter((item) => item.id !== goal.id),
        completions: current.completions.filter((item) => item.goalId !== goal.id),
      }))
      onToast('Goal removed')
    } catch {
      onToast('Goal could not be removed')
    }
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(selectedDay)

  return <main className="wellness-page goals-page">
    <section className="wellness-hero">
      <div><p className="eyebrow">Daily goals · {dateLabel}</p><h1>Build your streak.</h1><p>Every goal resets unchecked each day. Check it off when the work is done.</p></div>
      <div className="goal-score"><strong>{completedCount}/{data.goals.length}</strong><span>complete</span></div>
    </section>

    <section className="wellness-panel goal-builder">
      <div className="wellness-panel-heading"><span><Target size={21} /></span><div><p className="eyebrow">Your habits</p><h2>Daily power list</h2></div></div>
      <div className="habit-progress"><div style={{ width: `${progress}%` }} /></div>
      <form onSubmit={addGoal} className="add-goal-form">
        <label htmlFor="new-goal">Add a daily goal</label>
        <div><input id="new-goal" name="title" maxLength={120} placeholder="Walk 10,000 steps" required /><button type="submit"><Plus size={18} /> Add</button></div>
      </form>
      <div className="habit-list">
        {!data.goals.length && <div className="wellness-empty"><Target size={31} /><strong>No daily goals yet</strong><span>Add the first habit you want to repeat.</span></div>}
        {data.goals.map((goal) => {
          const completed = completedIds.has(goal.id)
          return <div className={completed ? 'habit-row completed' : 'habit-row'} key={goal.id}>
            <button className="habit-check" onClick={() => void toggleGoal(goal)} aria-pressed={completed} aria-label={`${completed ? 'Uncheck' : 'Complete'} ${goal.title}`}>
              {completed ? <Check size={22} /> : <Circle size={22} />}
            </button>
            <strong>{goal.title}</strong>
            <button className="habit-delete" onClick={() => void deleteGoal(goal)} title={`Remove ${goal.title}`}><Trash2 size={17} /></button>
          </div>
        })}
      </div>
    </section>
  </main>
}

function FastingPage({ data, setData, onToast }: {
  data: WellnessData
  setData: React.Dispatch<React.SetStateAction<WellnessData>>
  onToast: (message: string) => void
}) {
  const [now, setNow] = useState(() => new Date())
  const [windowDraft, setWindowDraft] = useState(data.fasting)
  const [lastMealDraft, setLastMealDraft] = useState(
    data.fasting.lastMealAt ? toDateTimeLocal(new Date(data.fasting.lastMealAt)) : toDateTimeLocal(new Date()),
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const lastMeal = data.fasting.lastMealAt ? new Date(data.fasting.lastMealAt) : null
  const target = lastMeal ? new Date(lastMeal.getTime() + data.fasting.fastingHours * 60 * 60 * 1000) : null
  const remainingMs = target ? target.getTime() - now.getTime() : 0
  const elapsedMs = lastMeal ? Math.max(0, now.getTime() - lastMeal.getTime()) : 0
  const durationMs = data.fasting.fastingHours * 60 * 60 * 1000
  const progress = lastMeal ? Math.min((elapsedMs / durationMs) * 100, 100) : 0
  const complete = Boolean(target && remainingMs <= 0)

  async function persist(fasting: FastingSettings, message: string) {
    try {
      await saveFastingSettings(fasting, data)
      setData((current) => ({ ...current, fasting }))
      setWindowDraft(fasting)
      onToast(message)
    } catch {
      onToast('Fasting settings could not be saved')
    }
  }

  function saveWindow(event: React.FormEvent) {
    event.preventDefault()
    void persist(windowDraft, 'Fasting window updated')
  }

  function setLastMeal(event: React.FormEvent) {
    event.preventDefault()
    const value = new Date(lastMealDraft)
    if (Number.isNaN(value.getTime())) return
    void persist({ ...data.fasting, lastMealAt: value.toISOString() }, 'Fast started')
  }

  function selectPreset(fastingHours: number) {
    setWindowDraft({ ...windowDraft, fastingHours, eatingHours: 24 - fastingHours })
  }

  return <main className="wellness-page fasting-page">
    <section className="wellness-hero fasting-hero">
      <div><p className="eyebrow">Intermittent fasting</p><h1>Own the window.</h1><p>Set your last meal and Power Log will count down to your next eating window.</p></div>
      <div className="fast-badge"><Flame size={23} /><strong>{data.fasting.fastingHours}:{data.fasting.eatingHours}</strong></div>
    </section>

    <section className="fast-grid">
      <article className="wellness-panel timer-panel">
        <div className="timer-ring" style={{ '--fast-progress': `${progress * 3.6}deg` } as React.CSSProperties}>
          <div><Timer size={27} /><strong>{lastMeal ? (complete ? 'Complete' : formatDuration(remainingMs)) : '--:--:--'}</strong><span>{lastMeal ? (complete ? 'Eating window is open' : 'until your next meal') : 'Set your last meal to begin'}</span></div>
        </div>
        {lastMeal && <div className="fast-times"><span><small>Last meal</small><strong>{formatDateTime(lastMeal)}</strong></span><span><small>Next meal</small><strong>{target && formatDateTime(target)}</strong></span></div>}
        <form className="last-meal-form" onSubmit={setLastMeal}>
          <label>When was your last meal?<input type="datetime-local" value={lastMealDraft} max={toDateTimeLocal(new Date())} onChange={(event) => setLastMealDraft(event.target.value)} required /></label>
          <div><button type="button" onClick={() => setLastMealDraft(toDateTimeLocal(new Date()))}>Use now</button><button type="submit">Start / update fast</button></div>
        </form>
        {lastMeal && <button className="clear-fast" onClick={() => void persist({ ...data.fasting, lastMealAt: null }, 'Fast cleared')}>Clear current fast</button>}
      </article>

      <article className="wellness-panel window-panel">
        <div className="wellness-panel-heading"><span><Timer size={21} /></span><div><p className="eyebrow">Schedule</p><h2>Fasting window</h2></div></div>
        <div className="fast-presets">
          {[14, 16, 18, 20].map((hours) => <button key={hours} className={windowDraft.fastingHours === hours ? 'active' : ''} onClick={() => selectPreset(hours)}>{hours}:{24 - hours}</button>)}
        </div>
        <form className="window-form" onSubmit={saveWindow}>
          <div><label>Fasting hours<input type="number" min="1" max="23" value={windowDraft.fastingHours} onChange={(event) => { const fastingHours = Number(event.target.value); setWindowDraft({ ...windowDraft, fastingHours, eatingHours: 24 - fastingHours }) }} /></label><label>Eating hours<input type="number" min="1" max="23" value={windowDraft.eatingHours} onChange={(event) => { const eatingHours = Number(event.target.value); setWindowDraft({ ...windowDraft, eatingHours, fastingHours: 24 - eatingHours }) }} /></label></div>
          <button type="submit">Save window</button>
        </form>
        <p className="window-note">Your countdown uses the fasting hours. The eating window is shown for planning.</p>
      </article>
    </section>
  </main>
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
  }).format(date)
}