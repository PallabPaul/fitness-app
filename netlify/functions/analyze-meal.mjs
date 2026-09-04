const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  if (event.headers['x-app-password'] !== (process.env.APP_PASSWORD || 'pallab')) return json(401, { error: 'Unauthorized' })
  if (!process.env.OPENAI_API_KEY) return json(500, { error: 'OPENAI_API_KEY is not configured in Netlify' })

  try {
    const { image, description } = JSON.parse(event.body || '{}')
    const hasImage = typeof image === 'string' && image.startsWith('data:image/')
    const hasDescription = typeof description === 'string' && description.trim().length >= 3 && description.length <= 2000
    if (!hasImage && !hasDescription) return json(400, { error: 'A meal photo or description is required' })

    const userContent = hasImage
      ? [
          { type: 'text', text: 'Identify the food and estimate the total calories and macros for the visible portion.' },
          { type: 'image_url', image_url: { url: image, detail: 'high' } },
        ]
      : `Estimate the total calories and macros for this meal and portion: ${description.trim()}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'Estimate food nutrition realistically. Return only the requested JSON. All nutrition values must be non-negative whole numbers.' },
          { role: 'user', content: userContent },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'meal_estimate', strict: true, schema: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, calories: { type: 'integer' }, protein: { type: 'integer' }, carbs: { type: 'integer' }, fat: { type: 'integer' } }, required: ['name', 'calories', 'protein', 'carbs', 'fat'] } },
        },
      }),
    })
    const result = await response.json()
    if (!response.ok) return json(response.status, { error: result.error?.message || 'OpenAI could not analyze this meal' })
    return json(200, JSON.parse(result.choices[0].message.content))
  } catch (error) {
    console.error('Meal analysis failed', error)
    return json(500, { error: 'The meal could not be analyzed' })
  }
}