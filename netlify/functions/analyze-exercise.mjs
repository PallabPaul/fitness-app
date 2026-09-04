const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const exerciseNames = [
  'Running · easy pace',
  'Running · steady pace',
  'Running · fast pace',
  'Weight training · moderate',
  'Weight training · vigorous',
  'Walking · relaxed',
  'Walking · brisk',
  'Cycling · moderate',
  'HIIT',
]

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  if (event.headers['x-app-password'] !== (process.env.APP_PASSWORD || 'pallab')) return json(401, { error: 'Unauthorized' })
  if (!process.env.OPENAI_API_KEY) return json(500, { error: 'OPENAI_API_KEY is not configured in Netlify' })

  try {
    const { description } = JSON.parse(event.body || '{}')
    if (typeof description !== 'string' || description.trim().length < 3 || description.length > 2000) return json(400, { error: 'A valid exercise description is required' })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'Convert an exercise description into the closest supported exercise preset, duration in minutes, and distance in miles. Infer reasonable values only when needed. Return only the requested JSON.' },
          { role: 'user', content: description.trim() },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'exercise_estimate', strict: true, schema: { type: 'object', additionalProperties: false, properties: { presetName: { type: 'string', enum: exerciseNames }, duration: { type: 'integer', minimum: 1 }, distance: { type: ['number', 'null'], minimum: 0 } }, required: ['presetName', 'duration', 'distance'] } },
        },
      }),
    })
    const result = await response.json()
    if (!response.ok) return json(response.status, { error: result.error?.message || 'OpenAI could not analyze this exercise' })
    return json(200, JSON.parse(result.choices[0].message.content))
  } catch (error) {
    console.error('Exercise analysis failed', error)
    return json(500, { error: 'The exercise could not be analyzed' })
  }
}