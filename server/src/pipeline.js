import { extractArticle } from './services/articleExtractor.js'
import { validateContent } from './services/contentValidator.js'
import { detectClaims } from './services/claimDetector.js'
import { verifyClaim } from './services/claimVerifier.js'
import { getHistoricalContext } from './services/historicalContext.js'

const PAUSA_TRANSCRIPT_MS = 12 // pausa entre palabras para dar sensación de streaming

/**
 * Orquesta el pipeline completo de análisis.
 * Emite eventos Socket.io a la sesión correspondiente.
 *
 * @param {{ io: object, sessionId: string, input: string, type: 'url'|'text' }}
 */
export async function runPipeline({ io, sessionId, input, type }) {
  const emit = (event, payload) => io.to(sessionId).emit(event, payload)

  console.log(`[pipeline] inicio — sessionId: ${sessionId}, type: ${type}`)

  try {
    // ── Paso 1: extracción del artículo ──────────────────────────────────────
    console.log(`[pipeline] pipeline_step: extraction`)
    emit('pipeline_step', { step: 'extraction', label: 'Extrayendo artículo...' })

    let title, text
    try {
      ;({ title, text } = await extractArticle(input, type))
    } catch (err) {
      console.error('[pipeline] error en extraction:', err.message, err)
      emit('analysis_error', {
        message: err.message || 'No pudimos acceder al artículo.',
        step: 'extraction',
      })
      return
    }

    // ── Paso 2: emisión progresiva del texto (streaming visual) ──────────────
    console.log(`[pipeline] pipeline_step: transcript — título: "${title}"`)
    emit('pipeline_step', { step: 'transcript', label: 'Leyendo artículo...' })

    const words = text.split(/\s+/)
    for (const word of words) {
      emit('transcript_chunk', { chunk: word + ' ' })
      await sleep(PAUSA_TRANSCRIPT_MS)
    }

    // ── Paso 3: validación de contenido ─────────────────────────────────────
    console.log(`[pipeline] pipeline_step: validation`)
    emit('pipeline_step', { step: 'validation', label: 'Verificando tipo de contenido...' })

    const validation = await validateContent(text)
    console.log(`[pipeline] validación: valid=${validation.valid} — ${validation.reason}`)

    if (!validation.valid) {
      emit('analysis_error', {
        message: 'Este contenido no parece ser político argentino. ChecAR está diseñado para verificar declaraciones de funcionarios, datos económicos oficiales y contenido institucional argentino.',
        step: 'validation',
      })
      return
    }

    // ── Paso 4: detección de claims ──────────────────────────────────────────
    console.log(`[pipeline] pipeline_step: claim_detection`)
    emit('pipeline_step', { step: 'claim_detection', label: 'Detectando afirmaciones verificables...' })

    let claims
    try {
      claims = await detectClaims(text)
    } catch (err) {
      console.error('[pipeline] error en claim_detection:', err.message, err)
      emit('analysis_error', {
        message: err.message || 'No pudimos detectar afirmaciones en el artículo.',
        step: 'claim_detection',
      })
      return
    }

    console.log(`[pipeline] claims detectados: ${claims.length}`)

    if (claims.length === 0) {
      console.log(`[pipeline] analysis_complete — sin claims`)
      emit('analysis_complete', {
        claims: [],
        articleTitle: title,
        articleText: text,
      })
      return
    }

    // ── Paso 5: verificación paralela de claims ──────────────────────────────
    console.log(`[pipeline] pipeline_step: claim_verification`)
    emit('pipeline_step', { step: 'claim_verification', label: 'Verificando afirmaciones...' })

    // Emitir todos los claim_detected de inmediato antes de arrancar la verificación
    claims.forEach((claim, i) => {
      emit('claim_detected', { claim: claim.text, index: i, total: claims.length })
    })

    const verifiedClaims = await Promise.all(
      claims.map(async (claim, i) => {
        // Verificación del claim
        let verification
        try {
          verification = await verifyClaim(claim.text)
        } catch (err) {
          console.error(`[pipeline] error verificando claim ${i}:`, err.message, err)
          emit('analysis_error', {
            message: err.message || 'Gemini no pudo verificar este claim.',
            step: 'claim_verification',
          })
          // Continuar con sin_datos para no cortar el pipeline
          verification = {
            verdict: 'sin_datos',
            explanation: 'No se pudo verificar este claim.',
            sources: [],
          }
        }

        // Contexto histórico (solo para claims numéricos, fallo silencioso)
        let historicalData
        if (claim.isNumerical) {
          const ctx = await getHistoricalContext(claim.text)
          if (ctx.available) historicalData = ctx.data
        }

        const verifiedClaim = {
          claim: claim.text,
          verdict: verification.verdict,
          explanation: verification.explanation,
          sources: verification.sources,
          ...(historicalData !== undefined && { historicalData }),
        }

        console.log(`[pipeline] claim_verified [${i + 1}/${claims.length}] — veredicto: ${verifiedClaim.verdict}`)
        emit('claim_verified', verifiedClaim)

        return verifiedClaim
      })
    )

    // ── Paso 6: análisis completo ────────────────────────────────────────────
    console.log(`[pipeline] analysis_complete — ${verifiedClaims.length} claims verificados`)
    emit('analysis_complete', {
      claims: verifiedClaims,
      articleTitle: title,
      articleText: text,
    })
  } catch (err) {
    console.error('[pipeline] error no manejado:', err.message, err)
    emit('analysis_error', {
      message: err.message || 'Error inesperado en el análisis.',
      step: err.step || 'unknown',
    })
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
