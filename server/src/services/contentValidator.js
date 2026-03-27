import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Valida si el texto contiene contenido político argentino verificable.
 * Si Gemini falla, devuelve valid: true para no bloquear contenido legítimo.
 * @param {string} text
 * @returns {{ valid: boolean, reason: string }}
 */
export async function validateContent(text) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

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
    const cleaned = raw.replace(/^```(?:json)?\n?|\n?```$/gm, '').trim()
    const parsed = JSON.parse(cleaned)

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
