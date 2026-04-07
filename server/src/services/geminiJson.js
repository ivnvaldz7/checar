function stripCodeFences(raw) {
  return raw.replace(/^```(?:json)?\s*|\s*```$/gim, '').trim()
}

function extractFirstJsonBlock(raw) {
  const start = raw.search(/[\[{]/)
  if (start === -1) return null

  const stack = []
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        continue
      }

      if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{' || char === '[') {
      stack.push(char)
      continue
    }

    if (char === '}' || char === ']') {
      const last = stack.at(-1)
      const matches =
        (char === '}' && last === '{') ||
        (char === ']' && last === '[')

      if (!matches) return null

      stack.pop()
      if (stack.length === 0) return raw.slice(start, i + 1)
    }
  }

  return null
}

export function buildJsonGenerationConfig(responseSchema) {
  return {
    responseMimeType: 'application/json',
    responseSchema,
    temperature: 0.1,
  }
}

export function parseGeminiJsonResponse(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('La respuesta de Gemini llegó vacía.')
  }

  const cleaned = stripCodeFences(raw)
  const candidates = [cleaned]
  const extracted = extractFirstJsonBlock(cleaned)

  if (extracted && extracted !== cleaned) {
    candidates.push(extracted)
  }

  let lastError

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('No se pudo parsear JSON.')
}
