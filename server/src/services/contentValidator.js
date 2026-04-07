import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildJsonGenerationConfig, parseGeminiJsonResponse } from './geminiJson.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const CONTENT_VALIDATION_SCHEMA = {
  type: 'object',
  required: ['valid', 'reason'],
  properties: {
    valid: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

/**
 * Valida si el texto contiene contenido político argentino verificable.
 * Si Gemini falla, devuelve valid: true para no bloquear contenido legítimo.
 * @param {string} text
 * @returns {{ valid: boolean, reason: string }}
 */
export async function validateContent(text) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: buildJsonGenerationConfig(CONTENT_VALIDATION_SCHEMA),
  })

  // Usamos los primeros 2000 caracteres para no gastar tokens innecesarios
  const sample = text.slice(0, 2000)

  const prompt = `Analizá el siguiente texto y determiná si contiene contenido político argentino verificable: declaraciones de funcionarios, datos económicos oficiales, políticas públicas, legislación, elecciones o instituciones del estado argentino.

Respondé ÚNICAMENTE con JSON:
{"valid": true/false, "reason": "explicación breve en español"}

TEXTO: ${sample}`

  let raw
  try {
    const result = await model.generateContent(prompt)
    raw = result.response.text()
  } catch (err) {
    console.error('[contentValidator] error llamando a Gemini:', err)
    return { valid: true, reason: 'Validación no disponible.' }
  }

  try {
    const parsed = parseGeminiJsonResponse(raw)

    if (typeof parsed.valid !== 'boolean') throw new Error('Campo valid ausente')

    return {
      valid: parsed.valid,
      reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
    }
  } catch (err) {
    console.error('[contentValidator] respuesta sin formato esperado. Raw:', raw)
    return { valid: true, reason: 'Validación no disponible.' }
  }
}
