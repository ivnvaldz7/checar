# CLAUDE.md — Instrucciones para Claude Code

## Antes de tocar código

1. Leer `CONTEXT.md` completo
2. Leer `PRD.md` completo
3. Si hay ambigüedad sobre el comportamiento esperado, consultar `PRD.md` antes de decidir
4. Si la decisión tiene consecuencias arquitectónicas, registrarla en `DECISIONS.md`

---

## Reglas de trabajo

### Preguntar antes de improvisar
Si algo no está especificado y la decisión importa, preguntar. No inventar comportamiento.
Ejemplos de cuándo preguntar:
- El PRD no define qué pasa en un edge case específico
- Hay dos formas de implementar algo con tradeoffs reales
- Una dependencia nueva no está en `CONTEXT.md`

### No acumular workarounds
Si una solución requiere más de un workaround para funcionar, parar y replantear.
Un workaround encima de otro es deuda técnica, no una solución.

### Un problema a la vez
No refactorizar mientras se implementa una feature.
No agregar features mientras se corrige un bug.

### El estado siempre es explícito
Todo componente con datos asincrónicos maneja: `idle`, `loading`, `streaming`, `error`, `empty`, `success`.
No asumir que algo está disponible si no fue confirmado.

---

## Lo que nunca hacer

- No instalar dependencias que no estén en `CONTEXT.md` sin avisar primero
- No crear archivos fuera de la estructura definida en `CONTEXT.md`
- No hardcodear colores, fuentes ni espaciados — siempre usar `tokens.js`
- No ignorar errores — todo `catch` debe hacer algo útil (log + emit de `analysis_error`)
- No implementar features que no están en el PRD sin confirmación explícita
- No persistir datos en MongoDB ni en ninguna base de datos externa (no hay DB en este proyecto)

---

## Cómo manejar errores

Cada error en el pipeline debe:
1. Loggearse en el servidor con contexto suficiente para debuggear
2. Emitir un evento `analysis_error` vía Socket.io con `{ message, step }`
3. Mostrar un mensaje accionable en el frontend (no "ocurrió un error")

Mensajes de error útiles:
- "No pudimos acceder al artículo. ¿Está detrás de un paywall?"
- "El análisis tardó demasiado. Intentá de nuevo."
- "Gemini no pudo verificar este claim. Puede ser por límites de uso."

---

## Cómo manejar el streaming

Los claims se emiten uno a uno. El frontend no espera a que termine el análisis para mostrar resultados.
El orden de emisión es: `pipeline_step` → `transcript_chunk` (múltiples) → `claim_detected` + `claim_verified` (intercalados) → `analysis_complete`.

No emitir `analysis_complete` hasta que todos los claims estén verificados.

---

## Cómo trabajar con Gemini

- Siempre incluir instrucciones explícitas sobre el formato de respuesta esperado
- Pedir JSON cuando necesites estructura — incluir un ejemplo del schema en el prompt
- Si la respuesta de Gemini no tiene el formato esperado, loggear el raw response antes de fallar
- El Search Grounding se activa pasando `tools: [{ googleSearch: {} }]` en la llamada

---

## Checklist antes de dar una tarea por terminada

- [ ] ¿Maneja los estados `loading`, `error`, `empty`, `success`?
- [ ] ¿Los errores emiten `analysis_error` y muestran mensaje útil?
- [ ] ¿Usa `tokens.js` para colores?
- [ ] ¿El código nuevo está dentro de la estructura de `CONTEXT.md`?
- [ ] ¿Hay alguna decisión arquitectónica que registrar en `DECISIONS.md`?
