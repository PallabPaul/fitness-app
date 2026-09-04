export type ExerciseEstimate = {
  presetName: string
  duration: number
  distance: number | null
}

export async function analyzeExerciseDescription(description: string): Promise<ExerciseEstimate> {
  const response = await fetch('/api/analyze-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-password': 'pallab' },
    body: JSON.stringify({ description: description.trim() }),
  })
  const data = await response.json() as ExerciseEstimate & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Exercise analysis failed')
  return data
}