import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

const MAX_CHARS = 8000

// Patrones de prompt injection comunes — se reemplazan antes de enviar a Gemini
const INJECTION_PATTERNS = [
  /ignor[aá]\s+las\s+instrucciones/gi,
  /ignore\s+previous\s+instructions/gi,
  /olvida\s+todo\s+lo\s+anterior/gi,
  /forget\s+everything/gi,
  /you\s+are\s+now/gi,
  /ahora\s+sos/gi,
  /nuevo\s+rol/gi,
  /system\s+prompt/gi,
]

function sanitizeText(text) {
  let sanitized = text.slice(0, MAX_CHARS)
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[contenido removido]')
  }
  return sanitized
}

/**
 * Extrae el contenido de un artículo a partir de una URL o texto plano.
 * @param {string} input - URL o texto del artículo
 * @param {'url'|'text'} type
 * @returns {{ title: string, text: string }}
 */
export async function extractArticle(input, type) {
  if (type === 'text') {
    const text = input.trim()
    if (text.length < 50) {
      const err = new Error('El texto es demasiado corto para analizarlo.')
      err.step = 'extraction'
      throw err
    }
    return { title: 'Texto pegado', text: sanitizeText(text) }
  }

  // type === 'url'
  let html
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    const response = await fetch(input, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChecAR/1.0; +https://checar.ar)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)

    if (response.status === 403 || response.status === 401) {
      const err = new Error('No pudimos acceder al artículo. ¿Está detrás de un paywall?')
      err.step = 'extraction'
      throw err
    }
    if (!response.ok) {
      const err = new Error(`No pudimos acceder al artículo (HTTP ${response.status}). Verificá que la URL sea correcta.`)
      err.step = 'extraction'
      throw err
    }

    html = await response.text()
  } catch (err) {
    if (err.step) throw err
    if (err.name === 'AbortError') {
      const e = new Error('El análisis tardó demasiado. Intentá de nuevo.')
      e.step = 'extraction'
      throw e
    }
    const e = new Error('No pudimos acceder al artículo. Verificá que la URL sea correcta y accesible.')
    e.step = 'extraction'
    throw e
  }

  let article
  try {
    const dom = new JSDOM(html, { url: input })
    const reader = new Readability(dom.window.document)
    article = reader.parse()
  } catch (err) {
    console.error('[articleExtractor] error parseando HTML:', err)
    const e = new Error('No pudimos procesar el contenido del artículo.')
    e.step = 'extraction'
    throw e
  }

  if (!article || !article.textContent || article.textContent.trim().length < 100) {
    const e = new Error('El artículo no tiene suficiente contenido para analizar. ¿Está detrás de un paywall?')
    e.step = 'extraction'
    throw e
  }

  return {
    title: article.title?.trim() || 'Sin título',
    text: sanitizeText(article.textContent.trim()),
  }
}
