export type MealEstimate = { name: string; calories: number; protein: number; carbs: number; fat: number }

async function requestEstimate(payload: { image?: string; description?: string }): Promise<MealEstimate> {
  const response = await fetch('/api/analyze-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-password': 'pallab' },
    body: JSON.stringify(payload),
  })
  const data = await response.json() as MealEstimate & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Meal analysis failed')
  return data
}

async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export async function analyzeMealPhoto(file: File): Promise<MealEstimate> {
  const image = await resizeImage(file)
  return requestEstimate({ image })
}

export function analyzeMealDescription(description: string): Promise<MealEstimate> {
  return requestEstimate({ description: description.trim() })
}