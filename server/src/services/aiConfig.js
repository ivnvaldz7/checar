import { GEMINI_MODEL } from './geminiConfig.js'

const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase()

// Groq es la opción predeterminada cuando se configuró su clave. Esto permite
// desplegar ChecAR sin depender de una cuenta de Gemini con facturación.
export const AI_PROVIDER = configuredProvider || (process.env.GROQ_API_KEY?.trim() ? 'groq' : 'gemini')
export const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b'
export const ACTIVE_MODEL = AI_PROVIDER === 'groq' ? GROQ_MODEL : GEMINI_MODEL

export function validateAiConfiguration() {
  if (!['groq', 'gemini'].includes(AI_PROVIDER)) {
    throw new Error('AI_PROVIDER debe ser "groq" o "gemini".')
  }

  if (AI_PROVIDER === 'groq' && !process.env.GROQ_API_KEY?.trim()) {
    throw new Error('Falta GROQ_API_KEY para usar el proveedor Groq.')
  }

  if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY?.trim()) {
    throw new Error('Falta GEMINI_API_KEY para usar el proveedor Gemini.')
  }
}
