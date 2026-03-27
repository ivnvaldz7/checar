# DECISIONS.md — Log de decisiones

Cada decisión incluye: qué se decidió, por qué, y qué alternativas se descartaron.

---

## [001] Pivot de YouTube a artículos periodísticos

**Decisión:** El input principal es texto de artículos periodísticos (URL o texto pegado), no video de YouTube.

**Por qué:**
- Las restricciones anti-bot de YouTube bloquean yt-dlp de forma impredecible
- La dependencia de yt-dlp + ffmpeg es frágil en deploys serverless y free tier
- El comportamiento es inconsistente — inaceptable para una demo laboral

**Alternativas descartadas:**
- Seguir con YouTube y acumular workarounds → descartado por fragilidad estructural
- YouTube como feature opcional en el MVP → descartado por scope, puede sumarse después

---

## [002] Sin base de datos

**Decisión:** No hay MongoDB ni ninguna base de datos persistente.

**Por qué:**
- El flujo es stateless desde la perspectiva del usuario: entra, analiza, copia y sale
- No hay historial de análisis en el MVP
- Elimina una dependencia de infraestructura y una fuente de errores

**Alternativas descartadas:**
- MongoDB Atlas free tier → descartado por complejidad innecesaria en el MVP
- SQLite en memoria → descartado por la misma razón

**Qué se pierde:** historial de análisis anteriores, posibilidad de volver a un reporte por URL. Ambos se pueden sumar en una iteración posterior.

---

## [003] Sin Groq

**Decisión:** No se usa Groq en este proyecto.

**Por qué:**
- Groq se usaba para transcripción de audio con Whisper
- Sin ingesta de video/audio, Groq no tiene rol en el pipeline
- Gemini 2.0 Flash maneja detección y verificación de claims

**Alternativas descartadas:**
- Groq para inferencia de texto (más rápido que Gemini) → descartado por simplicidad; Gemini con Search Grounding es una sola integración

---

## [004] Gemini 2.0 Flash con Search Grounding

**Decisión:** Gemini 2.0 Flash es el único LLM del stack. Se usa para detección de claims, verificación y contexto histórico. Search Grounding está activado para las llamadas de verificación.

**Por qué:**
- Free tier generoso (1500 requests/día en Google AI Studio)
- Search Grounding integrado nativo — no requiere una API de búsqueda separada
- Una sola integración cubre todo el pipeline de análisis

**Alternativas descartadas:**
- GPT-4o + búsqueda propia → descartado por costo
- Claude API → descartado por costo en free tier
- Gemini + Serper/Tavily para búsqueda → descartado, Search Grounding cubre el caso

---

## [005] Railway sobre Render para el backend

**Decisión:** El backend se deploya en Railway.

**Por qué:**
- Render free tier tiene cold starts de ~30 segundos
- Un cold start durante una demo de recruiter es inaceptable
- Railway free tier (500hs/mes) no tiene cold start

**Alternativas descartadas:**
- Render → descartado por cold start
- Fly.io → viable pero Railway tiene mejor DX para proyectos Node.js simples

---

## [006] Máximo 7 claims por análisis

**Decisión:** El pipeline detecta y verifica hasta 7 afirmaciones por artículo.

**Por qué:**
- Balance entre completitud y tiempo de respuesta
- Un análisis de 7 claims a ~8 segundos por claim = ~56 segundos total (dentro del objetivo de 60s)
- Para una demo, 5-7 claims bien verificados son más impactantes que 15 superficiales

**Alternativas descartadas:**
- Sin límite → descartado por tiempo de respuesta impredecible y costo de API
- 5 claims → posible iteración si el tiempo promedio supera los 60s en producción

---

## [007] Contexto histórico solo en claims numéricos

**Decisión:** La línea de tiempo histórica se incluye únicamente en claims que contienen datos numéricos (cifras, porcentajes, fechas).

**Por qué:**
- El contexto histórico solo es útil cuando hay una métrica que evolucionó en el tiempo
- Para afirmaciones cualitativas, no hay dato histórico que mostrar
- Simplifica el pipeline: solo se hace la llamada adicional a INDEC cuando hay un número

**Alternativas descartadas:**
- Contexto histórico en todos los claims → descartado por costo de API y complejidad innecesaria

---

## [008] Tailwind CSS v4 con configuración CSS-first

**Decisión:** Se usa Tailwind CSS v4. El sistema de colores y tipografía se define en `src/index.css` vía `@theme {}`. La fuente de verdad para colores en JS sigue siendo `src/tokens.js` — los valores se duplican intencionalmente en el CSS.

**Por qué:**
- Tailwind v4 es la versión actual instalada por npm (`npm install tailwindcss`)
- En v4, el tema se configura en CSS (`@theme {}`) en lugar de `tailwind.config.js`
- `tailwind.config.js` existe pero solo declara `content` — el tema vive en CSS

**Alternativas descartadas:**
- Downgrade a Tailwind v3 → descartado por innecesario, v4 funciona correctamente
- Poner todo en `tailwind.config.js` (v3 style) → no compatible con v4

**Trade-off conocido:** Los valores de color viven en dos lugares (`tokens.js` para JS/inline styles, `index.css` para Tailwind). Si se cambia un color hay que actualizarlo en ambos archivos.

---

## [009] Mock data local en AnalysisPage y BriefingPage

**Decisión:** Las páginas de análisis y briefing usan datos mock hardcodeados en el componente mientras no está conectado Socket.io. La estructura de los mock replica exactamente los payloads de los eventos de CONTEXT.md.

**Por qué:**
- Permite desarrollar y validar el diseño sin backend
- Los mock tienen la misma shape que los eventos reales → el reemplazo por Socket.io es un swap directo

**Próximo paso:** Eliminar mock y conectar vía `services/socket.js` cuando el backend esté listo.

---

## [010] Pipeline arranca en join_session, no en POST /api/analyze

**Decisión:** `POST /api/analyze` ya no llama a `runPipeline()` directamente. En cambio, guarda el job en `pendingPipelines` (un `Map` en módulo). El pipeline arranca cuando el cliente emite `join_session` con ese `sessionId`.

**Por qué:**
- El flujo anterior tenía una race condition: el pipeline podía emitir `pipeline_step` y `transcript_chunk` antes de que el cliente hiciera `join_session` y se uniera a la room. Esos eventos se perdían permanentemente.
- La solución garantiza que el cliente está escuchando antes de que llegue el primer evento.

**Implementación:**
- `pendingPipelines`: `Map<sessionId, { input, type }>` exportado desde `analyze.js`
- TTL de 30 segundos: si el cliente no hace `join_session`, la entrada se limpia con `setTimeout`
- `index.js` importa `pendingPipelines` y `runPipeline`; el handler de `join_session` consume el job y llama al pipeline

**Alternativas descartadas:**
- Guardar el job con EventEmitter o en una variable global → más complejo sin ventaja real
- Hacer que el pipeline bufferea los primeros eventos y los replaye → dos fuentes de estado, propenso a bugs

---

## [011] Verificación de claims en paralelo con Promise.all()

**Decisión:** La verificación de claims pasó de secuencial (un claim a la vez con `for...await`) a paralela (`Promise.all()`). Cada claim emite `claim_verified` apenas termina, sin esperar a los demás. El orden de llegada puede variar.

**Por qué:**
- Con billing activado, los rate limits de Gemini no son una restricción práctica para 7 llamadas simultáneas
- La verificación secuencial tardaba ~8s por claim → hasta 56s para 7 claims
- En paralelo el tiempo total se acerca al del claim más lento (~8-12s), no a la suma
- Los `claim_detected` se emiten todos al inicio para que el frontend muestre inmediatamente los skeletons de carga

**Alternativas descartadas:**
- Mantener secuencial → descartado: con billing habilitado no hay razón para serializar
- Paralelo con límite de concurrencia (p-limit) → descartado por innecesario en el MVP con 7 claims máximo

---

## [012] Validación de contenido político como paso de pipeline

**Decisión:** Se agrega un paso `validation` al pipeline (antes de `claim_detection`) que llama a Gemini sin Search Grounding para verificar si el texto contiene contenido político argentino. Si el contenido no es válido, el pipeline se corta y se emite `analysis_error`.

**Por qué:**
- ChecAR está diseñado exclusivamente para contenido político argentino; procescar otro tipo de texto produce resultados sin valor y desperdicia cuota de API
- La validación temprana evita gastar llamadas de Search Grounding en contenido irrelevante
- Si Gemini falla durante la validación, se deja pasar (valid: true por defecto) para no bloquear contenido legítimo

**Alternativas descartadas:**
- Validar solo en el frontend → insuficiente, se puede saltear
- Validar como parte del prompt de detección de claims → no permite cortar el pipeline limpiamente antes de gastar la cuota de Search Grounding

---

## [013] Sanitización contra prompt injection en el extractor

**Decisión:** `articleExtractor.js` sanitiza el texto antes de retornarlo: limita a 8000 caracteres y remueve patrones de injection comunes con regex case-insensitive. Los prompts de `claimDetector`, `claimVerifier` e `historicalContext` envuelven el contenido del usuario con delimitadores `<<<INICIO_CONTENIDO>>>` / `<<<FIN_CONTENIDO>>>`. El frontend valida el límite de 8000 caracteres con contador visible.

**Por qué:**
- El contenido de artículos externos es input no confiable que pasa directamente a prompts de LLM
- Los delimitadores reducen la superficie de ataque de injection sin modificar la lógica de los prompts
- La validación cliente + servidor es defensa en profundidad: el cliente da feedback inmediato, el servidor es la barrera real

**Alternativas descartadas:**
- Sanitizar solo en el frontend → el endpoint también acepta URLs cuyo contenido se extrae server-side
- Encodear el contenido en base64 antes de incluirlo en el prompt → oscurece el texto y puede degradar la calidad de las respuestas de Gemini

---

## [014] Fuentes desde groundingMetadata en vez del texto del response

**Decisión:** `claimVerifier.js` extrae las fuentes del campo `response.candidates[0].groundingMetadata.groundingChunks` de la respuesta de Gemini. El formato de `sources` pasó de `string[]` a `{ url: string, label: string }[]`. El `label` usa el `title` del chunk o el dominio extraído del `uri` si no hay título. Si `groundingMetadata` no está disponible, se cae al fallback (fuentes del JSON del response). `ClaimCard` normaliza ambos formatos para compatibilidad con el mock data de `BriefingPage`.

**Por qué:**
- Las URLs que Gemini incluye en el texto del response son de `vertexaisearch.cloud.google.com` — ilegibles e inútiles para el usuario
- `groundingMetadata` contiene las URLs reales de las fuentes consultadas con sus títulos
- Mostrar "INDEC" o "chequeado.com" como label es más accionable que una URL interna de Google

**Alternativas descartadas:**
- Parsear y reemplazar las URLs internas con regex → frágil, depende del formato interno de Google
- Pedir explícitamente las URLs en el prompt → Gemini igualmente devuelve sus URLs internas cuando Search Grounding está activo
