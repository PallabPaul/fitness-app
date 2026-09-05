import { useEffect, useState } from 'react'
import { Check, Circle, Flame, Pencil, Play, Plus, Target, Timer, Trash2 } from 'lucide-react'
import {
  addDailyGoal,
  loadWellnessData,
  removeFastingSession,
  removeDailyGoal,
  saveFastingSession,
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
  fasting: { fastingHours: 16, eatingHours: 8 },
  fastingSessions: [],
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
    : <FastingPage key={localDay(selectedDay)} data={data} setData={setData} selectedDay={selectedDay} onToast={onToast} />
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

function FastingPage({ data, setData, selectedDay, onToast }: {
  data: WellnessData
  setData: React.Dispatch<React.SetStateAction<WellnessData>>
  selectedDay: Date
  onToast: (message: string) => void
}) {
  const [now, setNow] = useState(() => new Date())
  const dayStart = new Date(selectedDay)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(selectedDay)
  dayEnd.setHours(23, 59, 59, 999)
  const session = [...data.fastingSessions]
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
    .find((item) => {
      const start = new Date(item.startedAt)
      const end = item.endedAt ? new Date(item.endedAt) : now
      return start <= dayEnd && end >= dayStart
    })
  const [windowDraft, setWindowDraft] = useState({
    fastingHours: session?.fastingHours ?? data.fasting.fastingHours,
    eatingHours: session?.eatingHours ?? data.fasting.eatingHours,
  })
  const [startDraft, setStartDraft] = useState(() => toDateTimeLocal(session ? new Date(session.startedAt) : onSelectedDay(selectedDay)))
  const [targetDraft, setTargetDraft] = useState(() => toDateTimeLocal(session ? new Date(session.targetEndAt) : new Date(onSelectedDay(selectedDay).getTime() + data.fasting.fastingHours * 3_600_000)))
  const [endDraft, setEndDraft] = useState(() => session?.endedAt ? toDateTimeLocal(new Date(session.endedAt)) : '')
  const [editingTimes, setEditingTimes] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const activeWindow = session || data.fasting
  const startedAt = session ? new Date(session.startedAt) : null
  const target = session ? new Date(session.targetEndAt) : null
  const endedAt = session?.endedAt ? new Date(session.endedAt) : null
  const timerReference = endedAt || now
  const remainingMs = target ? target.getTime() - timerReference.getTime() : 0
  const elapsedMs = startedAt ? Math.max(0, timerReference.getTime() - startedAt.getTime()) : 0
  const durationMs = activeWindow.fastingHours * 60 * 60 * 1000
  const progress = startedAt ? Math.min((elapsedMs / durationMs) * 100, 100) : 0
  const goalReached = Boolean(target && remainingMs <= 0)
  const active = Boolean(session && !session.endedAt)

  async function persistWindow(fasting: FastingSettings, message: string) {
    try {
      await saveFastingSettings(fasting, data)
      const updatedSession = session ? {
        ...session,
        ...fasting,
        targetEndAt: new Date(new Date(session.startedAt).getTime() + fasting.fastingHours * 3_600_000).toISOString(),
      } : null
      if (updatedSession) {
        await saveFastingSession(updatedSession, { ...data, fasting })
      }
      setData((current) => ({
        ...current,
        fasting,
        fastingSessions: updatedSession
          ? [updatedSession, ...current.fastingSessions.filter((item) => item.id !== updatedSession.id)]
          : current.fastingSessions,
      }))
      setWindowDraft(fasting)
      onToast(message)
    } catch {
      onToast('Fasting settings could not be saved')
    }
  }

  function saveWindow(event: React.FormEvent) {
    event.preventDefault()
    void persistWindow(windowDraft, 'Fasting window updated')
  }

  async function startFast(event: React.FormEvent) {
    event.preventDefault()
    if (data.fastingSessions.some((item) => !item.endedAt)) {
      onToast('End your active fast before starting another')
      return
    }
    const start = new Date(startDraft)
    if (Number.isNaN(start.getTime())) return
    const nextSession = {
      id: crypto.randomUUID(),
      startedAt: start.toISOString(),
      targetEndAt: new Date(start.getTime() + windowDraft.fastingHours * 3_600_000).toISOString(),
      endedAt: null,
      fastingHours: windowDraft.fastingHours,
      eatingHours: windowDraft.eatingHours,
    }
    try {
      await saveFastingSession(nextSession, data)
      setData((current) => ({
        ...current,
        fastingSessions: [nextSession, ...current.fastingSessions],
      }))
      onToast('Fast started')
    } catch {
      onToast('Fast could not be saved')
    }
  }

  async function endFast() {
    if (!session) return
    const updated = { ...session, endedAt: new Date().toISOString() }
    try {
      await saveFastingSession(updated, data)
      setData((current) => ({
        ...current,
        fastingSessions: [updated, ...current.fastingSessions.filter((item) => item.id !== session.id)],
      }))
      onToast('Fast completed')
    } catch {
      onToast('Fast could not be ended')
    }
  }

  async function saveTimes(event: React.FormEvent) {
    event.preventDefault()
    if (!session) return
    const start = new Date(startDraft)
    const targetEnd = new Date(targetDraft)
    const end = endDraft ? new Date(endDraft) : null
    if (Number.isNaN(start.getTime()) || Number.isNaN(targetEnd.getTime()) || targetEnd <= start || (end && end < start)) {
      onToast('Check the session times')
      return
    }
    const fastingHours = Math.max(1, Math.min(23, Math.round((targetEnd.getTime() - start.getTime()) / 3_600_000)))
    const updated = {
      ...session,
      startedAt: start.toISOString(),
      targetEndAt: targetEnd.toISOString(),
      endedAt: end?.toISOString() || null,
      fastingHours,
      eatingHours: 24 - fastingHours,
    }
    try {
      await saveFastingSession(updated, data)
      setData((current) => ({
        ...current,
        fastingSessions: [updated, ...current.fastingSessions.filter((item) => item.id !== session.id)],
      }))
      setEditingTimes(false)
      onToast('Fast times updated')
    } catch {
      onToast('Fast could not be updated')
    }
  }

  async function deleteSession() {
    if (!session || !window.confirm('Delete this fasting session?')) return
    try {
      await removeFastingSession(session.id, data)
      setData((current) => ({
        ...current,
        fastingSessions: current.fastingSessions.filter((item) => item.id !== session.id),
      }))
      onToast('Fasting session deleted')
    } catch {
      onToast('Fast could not be deleted')
    }
  }

  function selectPreset(fastingHours: number) {
    setWindowDraft({ ...windowDraft, fastingHours, eatingHours: 24 - fastingHours })
  }

  return <main className="wellness-page fasting-page">
    <section className="wellness-hero fasting-hero">
      <div><p className="eyebrow">Intermittent fasting · {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDay)}</p><h1>Own the window.</h1><p>One session continues across midnight. Move between dates to review every day it spans.</p></div>
      <div className="fast-badge"><Flame size={23} /><strong>{activeWindow.fastingHours}:{activeWindow.eatingHours}</strong></div>
    </section>

    <section className="fast-grid">
      <article className="wellness-panel timer-panel">
        <div className="timer-ring" style={{ '--fast-progress': `${progress * 3.6}deg` } as React.CSSProperties}>
          <div><Timer size={27} /><strong>{session ? (endedAt ? formatDuration(elapsedMs) : goalReached ? formatDuration(elapsedMs) : formatDuration(remainingMs)) : '--:--:--'}</strong><span>{session ? (endedAt ? 'total fasting time' : goalReached ? 'fasting · goal reached' : 'remaining to goal') : 'Ready when you are'}</span></div>
        </div>
        {session && <div className="fast-times"><span><small>Started</small><strong>{startedAt && formatDateTime(startedAt)}</strong></span><span><small>Goal</small><strong>{target && formatDateTime(target)}</strong></span></div>}
        {!session && <form className="last-meal-form fast-start-form" onSubmit={startFast}>
          <label>Fast starts<input type="datetime-local" value={startDraft} max={toDateTimeLocal(new Date())} onChange={(event) => setStartDraft(event.target.value)} required /></label>
          <div><button type="button" onClick={() => setStartDraft(toDateTimeLocal(onSelectedDay(selectedDay)))}>{localDay(selectedDay) === localDay(new Date()) ? 'Start now' : 'Use selected day'}</button><button type="submit"><Play size={17} /> Start {windowDraft.fastingHours}-hour fast</button></div>
        </form>}
        {active && <div className="fast-actions"><button onClick={() => setEditingTimes(true)}><Pencil size={16} /> Edit times</button><button className="end-fast" onClick={() => void endFast()}>End fast now</button></div>}
        {session && !active && <div className="fast-actions"><button onClick={() => setEditingTimes(true)}><Pencil size={16} /> Edit session</button><button className="delete-fast" onClick={() => void deleteSession()}><Trash2 size={16} /> Delete</button></div>}
        {session && editingTimes && <form className="session-edit-form" onSubmit={saveTimes}>
          <div><label>Start time<input type="datetime-local" value={startDraft} onChange={(event) => setStartDraft(event.target.value)} required /></label><label>Goal time<input type="datetime-local" value={targetDraft} onChange={(event) => setTargetDraft(event.target.value)} required /></label></div>
          {endedAt && <label>Actual end time<input type="datetime-local" value={endDraft} onChange={(event) => setEndDraft(event.target.value)} required /></label>}
          <div className="session-edit-actions"><button type="button" onClick={() => setEditingTimes(false)}>Cancel</button><button type="submit">Save changes</button></div>
        </form>}
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

function onSelectedDay(day: Date) {
  const value = new Date(day)
  const now = new Date()
  value.setHours(now.getHours(), now.getMinutes(), 0, 0)
  return value > now ? now : value
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
  }).format(date)
}