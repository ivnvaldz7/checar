import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildJsonGenerationConfig, parseGeminiJsonResponse } from './geminiJson.js'
import { GEMINI_MODEL, classifyGeminiError } from './geminiConfig.js'
import { AI_PROVIDER } from './aiConfig.js'
import { classifyGroqError, generateGroqJson } from './groqClient.js'

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
  // Usamos los primeros 2000 caracteres para no gastar tokens innecesarios
  const sample = text.slice(0, 2000)

  const prompt = `Analizá el siguiente texto y determiná si contiene contenido político argentino verificable: declaraciones de funcionarios, datos económicos oficiales, políticas públicas, legislación, elecciones o instituciones del estado argentino.

Respondé ÚNICAMENTE con JSON:
{"valid": true/false, "reason": "explicación breve en español"}

TEXTO: ${sample}`

  let raw
  try {
    if (AI_PROVIDER === 'groq') {
      raw = await generateGroqJson({ prompt })
    } else {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: buildJsonGenerationConfig(CONTENT_VALIDATION_SCHEMA),
      })
      const result = await model.generateContent(prompt)
      raw = result.response.text()
    }
  } catch (err) {
    const details = AI_PROVIDER === 'groq' ? classifyGroqError(err) : classifyGeminiError(err)
    console.error('[contentValidator] validación no disponible:', details)
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
    console.error('[contentValidator] respuesta sin formato esperado:', err.message)
    return { valid: true, reason: 'Validación no disponible.' }
  }
}
