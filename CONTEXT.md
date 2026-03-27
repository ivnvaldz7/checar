# CONTEXT.md — ChecAR

## Estado actual del proyecto

Proyecto nuevo. No hay código previo. Este archivo es la fuente de verdad técnica.

---

## Stack

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Frontend | React + Vite + Zustand + React Router | Vercel |
| Backend | Node.js + Express + Socket.io | Railway |
| LLM + búsqueda | Gemini 2.0 Flash + Google Search Grounding | API (Google AI Studio) |
| Extracción de artículos | `@mozilla/readability` + `node-fetch` + `jsdom` | — |
| Base de datos | ❌ No hay | — |

Sin MongoDB. Sin Groq. Sin yt-dlp. Sin ffmpeg.
El estado de cada sesión vive en memoria del servidor mientras dura el análisis.

---

## Estructura de carpetas

```
checar/
├── client/                        # Frontend React
│   ├── src/
│   │   ├── components/            # Componentes reutilizables
│   │   ├── pages/                 # Páginas (una por ruta)
│   │   ├── store/                 # Zustand stores
│   │   ├── hooks/                 # Custom hooks
│   │   ├── services/
│   │   │   ├── socket.js          # Wrapper Socket.io-client (connect, disconnect, on*)
│   │   │   └── api.js             # Llamadas HTTP REST (analyzeContent)
│   │   ├── tokens.js              # Design tokens (colores, tipografía)
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/                        # Backend Node.js
│   ├── src/
│   │   ├── routes/                # Rutas Express
│   │   ├── services/              # Lógica de negocio
│   │   │   ├── articleExtractor.js   # Extracción de artículos desde URL
│   │   │   ├── claimDetector.js      # Detección de claims con Gemini
│   │   │   ├── claimVerifier.js      # Verificación con Search Grounding
│   │   │   └── historicalContext.js  # Contexto histórico de datos numéricos
│   │   ├── pipeline.js            # Orquestador del flujo completo
│   │   └── index.js               # Entry point
│   └── .env.example
│
├── CLAUDE.md
├── CONTEXT.md
├── PRD.md
├── README.md
└── DECISIONS.md
```

---

## Flujo de datos

```
POST /api/analyze
  → sessionId generado en server
  → client hace join_session vía Socket.io
  → server emite pipeline_step por cada etapa
  → server emite transcript_chunk durante emisión progresiva del texto
  → server emite claim_verified por cada claim (uno a uno)
  → server emite analysis_complete con el briefing completo
```

---

## Eventos Socket.io

| Evento | Dirección | Payload |
|--------|-----------|---------|
| `join_session` | client → server | `{ sessionId }` |
| `pipeline_step` | server → client | `{ step, label }` |
| `transcript_chunk` | server → client | `{ chunk }` |
| `claim_detected` | server → client | `{ claim, index, total }` |
| `claim_verified` | server → client | `{ claim, verdict, explanation, sources, historicalData? }` |
| `analysis_complete` | server → client | `{ claims, articleTitle, articleText }` |
| `analysis_error` | server → client | `{ message, step }` |

---

## Variables de entorno

### server/.env
```
GEMINI_API_KEY=
PORT=3001
CLIENT_URL=http://localhost:5173
```

### client/.env
```
VITE_SERVER_URL=http://localhost:3001
```

---

## Design tokens (client/src/tokens.js)

Todos los colores y tipografía se importan desde `tokens.js`. Nunca hardcodear valores en componentes.

```js
export const verdicts = {
  acertado: '#22c55e',
  dudoso:   '#f59e0b',
  falso:    '#ef4444',
  sin_datos:'#6b7280',
}
```

---

## Convenciones de código

- Comentarios en **español**
- Variables, funciones y archivos en **inglés**
- Estados obligatorios en todo componente con datos asincrónicos: `idle`, `loading`, `streaming`, `error`, `empty`, `success`
- Code splitting por ruta con `React.lazy()`
- No usar `any` implícito — si algo puede fallar, manejarlo explícitamente

---

## Dependencias principales

### server
```
express
socket.io
cors
dotenv
@mozilla/readability
jsdom
node-fetch
@google/generative-ai
```

### client
```
react
react-dom
react-router-dom
zustand
socket.io-client
vite
```

---

## Limitaciones conocidas

- Artículos con paywall duro (Clarín) no son soportados — fallan silenciosamente o devuelven contenido parcial
- El Search Grounding de Gemini tiene límite de uso en el free tier — no hay retry automático en el MVP
- El estado de sesión no persiste si el servidor se reinicia
