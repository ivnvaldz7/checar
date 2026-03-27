# PRD — ChecAR

## Qué es

ChecAR es una herramienta de asistencia para verificación periodística de contenido político argentino.

El usuario ingresa una nota periodística (por URL o texto pegado) y recibe un briefing estructurado: qué afirmaciones son verificables, cuáles tienen respaldo en fuentes oficiales, cuáles son opinión sin datos, y cómo evolucionan históricamente los datos numéricos citados.

No es un detector de fake news. Es un asistente para periodistas e investigadores que necesitan verificar rápido.

---

## Usuario objetivo

Periodista, editor o investigador que trabaja con contenido político argentino y necesita:
- Verificar datos citados en una nota antes de publicar o replicar
- Entender si los números que usa un político tienen respaldo oficial
- Tener contexto histórico de una cifra (no solo si es correcta hoy)

---

## Flujo principal

```
[Input: URL o texto] → [Extracción del artículo] → [Emisión progresiva del texto]
→ [Detección de claims verificables] → [Verificación claim por claim con Search Grounding]
→ [Contexto histórico en claims numéricos] → [Briefing final]
```

### Paso 1 — Input
El usuario puede:
- Pegar una URL de un artículo (Infobae, La Nación, Ámbito, Chequeado, Perfil, Télam, etc.)
- Pegar el texto directamente

Si es URL: el backend extrae el contenido con `@mozilla/readability` + `node-fetch`.
Si es texto: se usa directamente.

No hay soporte para artículos con paywall duro. Clarín queda fuera del alcance del MVP.

### Paso 2 — Emisión progresiva del texto
El texto del artículo se emite palabra por palabra vía Socket.io antes de que empiece la verificación.
Esto evita tiempos muertos y da la sensación de que el sistema "está leyendo".

### Paso 3 — Detección de claims
Gemini 2.0 Flash analiza el texto y extrae hasta **7 afirmaciones verificables**.

Criterios de selección:
- Afirmaciones de hecho, no de opinión
- Preferencia por afirmaciones con datos numéricos (cifras, porcentajes, fechas)
- Preferencia por afirmaciones atribuidas a una fuente política o institucional
- Se descartan afirmaciones vagas o no comprobables

### Paso 4 — Verificación con Search Grounding
Cada claim se verifica individualmente contra:
- INDEC (datos estadísticos oficiales)
- InfoLeg (legislación vigente)
- Chequeado (fact-checking periodístico)
- Boletín Oficial (decretos, resoluciones)
- Memoria Abierta (datos históricos)

La verificación usa Google Search Grounding integrado en Gemini.
Los claims se verifican y emiten de a uno vía Socket.io (streaming real).

### Paso 5 — Contexto histórico (solo claims numéricos)
Para cada claim con datos numéricos, se incluye una línea de tiempo compacta mostrando la evolución del indicador en los últimos 12 meses.

Fuente primaria: INDEC. Si no hay datos disponibles, el campo se omite silenciosamente.

### Paso 6 — Briefing final
Una vez verificados todos los claims, se presenta el reporte completo con:
- Texto del artículo con claims resaltados inline
- Panel lateral con cada claim, su veredicto, explicación y fuentes
- Contexto histórico donde aplica
- Botón de copia del reporte completo

---

## Verdicts

| Veredicto | Descripción | Color |
|-----------|-------------|-------|
| `acertado` | Verificado como correcto con fuentes | `#22c55e` |
| `dudoso` | Parcialmente correcto, sin consenso, o datos desactualizados | `#f59e0b` |
| `falso` | Verificado como incorrecto con fuentes | `#ef4444` |
| `sin_datos` | No hay información suficiente para verificar | `#6b7280` |

---

## Estados de UI obligatorios

Cada pantalla y componente debe manejar explícitamente:
- `idle` — estado inicial, sin actividad
- `loading` — procesando
- `streaming` — recibiendo datos progresivos
- `error` — error con mensaje accionable
- `empty` — sin resultados (con mensaje explicativo)
- `success` — resultado disponible

---

## Exportación

El briefing final se puede copiar al portapapeles en formato texto plano estructurado.
No hay PDF, no hay link compartible en el MVP.

Formato del texto copiado:
```
ChecAR — Briefing de verificación
Fuente: [título del artículo o "Texto pegado"]
Fecha: [fecha del análisis]

CLAIMS VERIFICADOS

[1] "[texto del claim]"
Veredicto: ACERTADO / DUDOSO / FALSO / SIN DATOS
Explicación: [texto]
Fuentes: [lista]
Contexto histórico: [si aplica]

[2] ...
```

---

## Fuentes oficiales integradas

| Fuente | URL | Uso |
|--------|-----|-----|
| INDEC | https://www.indec.gob.ar | Datos estadísticos |
| InfoLeg | https://www.infoleg.gob.ar | Legislación vigente |
| Chequeado | https://chequeado.com | Fact-checking periodístico |
| Boletín Oficial | https://www.boletinoficial.gob.ar | Decretos y resoluciones |
| Memoria Abierta | https://memoriaabierta.org.ar | Datos históricos |

---

## Límites del MVP

- Máximo 7 claims por análisis
- Solo texto en español
- No soporta audio, video ni PDFs
- No soporta Clarín (paywall) ni artículos que requieran login
- No hay historial de análisis anteriores
- No hay autenticación de usuarios
- No hay persistencia de datos entre sesiones

---

## Criterios de éxito para la demo

- El flujo completo (URL → briefing) funciona en menos de 60 segundos
- Los claims se emiten progresivamente (no aparecen todos juntos al final)
- La demo no falla en condiciones normales de uso
- El resultado es legible y accionable sin explicación adicional
