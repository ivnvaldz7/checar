# ChecAR

ChecAR es una herramienta de asistencia para verificación periodística de contenido político argentino.

El usuario ingresa una nota (por URL o texto pegado). ChecAR extrae las afirmaciones verificables, las contrasta contra fuentes oficiales en tiempo real y devuelve un briefing estructurado con veredictos, explicaciones, fuentes y contexto histórico de los datos numéricos.

No es un detector de fake news. Es un asistente para periodistas e investigadores.

---

## Qué hace

- Acepta URLs de artículos o texto pegado directamente
- Emite el contenido del artículo progresivamente mientras analiza
- Detecta hasta 3 afirmaciones verificables por nota (límite pensado para la cuota gratuita)
- Verifica cada claim contra fuentes oficiales argentinas (INDEC, InfoLeg, Chequeado, Boletín Oficial)
- Agrega contexto histórico a claims con datos numéricos (evolución de los últimos 12 meses)
- Presenta un briefing final copiable

---

## Stack

- Frontend: React + Vite + Zustand + React Router — Vercel
- Backend: Node.js + Express + Socket.io — Render
- LLM y búsqueda: Groq con GPT-OSS 20B y Browser Search (clave gratuita con cuota). Gemini queda como alternativa opcional.
- Extracción de artículos: `@mozilla/readability`

Sin base de datos. Sin transcripción de audio. El estado vive en memoria mientras dura la sesión.

---

## Por qué este enfoque

La primera dirección del proyecto fue automatizar la ingesta de video de YouTube: URL → transcripción automática → verificación. Esa dirección se descartó por restricciones reales de infraestructura (bloqueos anti-bot de YouTube, dependencia de yt-dlp, comportamiento frágil en deploys gratuitos).

El pivot al contenido periodístico textual no es una renuncia técnica. Es una decisión de producto: el valor real de ChecAR es la verificación, no la transcripción. El texto de una nota periodística es una fuente más directa y controlada que el audio de un video.

La decisión también cambia el usuario objetivo. Un periodista que verifica datos antes de publicar es un caso de uso más preciso y más útil que un ciudadano que consume noticias.

---

## Fuentes oficiales integradas

| Fuente | URL |
|--------|-----|
| INDEC | https://www.indec.gob.ar |
| InfoLeg | https://www.infoleg.gob.ar |
| Chequeado | https://chequeado.com |
| Boletín Oficial | https://www.boletinoficial.gob.ar |
| Memoria Abierta | https://memoriaabierta.org.ar |

ChecAR solo conserva un veredicto distinto de `sin_datos` cuando la respuesta incluye una fuente de esta lista o de otro organismo público argentino habilitado (por ejemplo, BCRA o Congreso).

## Privacidad y límites

- Los textos y URLs enviados para analizar se procesan con el proveedor configurado en el backend (Groq por defecto). No ingreses información personal o confidencial.
- ChecAR no guarda artículos ni resultados en una base de datos; las sesiones viven en memoria mientras dura el análisis.
- La herramienta asiste la verificación: no reemplaza la revisión editorial de las fuentes originales.

---

## Próximos pasos naturales

- Modo comparativo: analizar la cobertura del mismo hecho en distintos medios
- Exportación estructurada del briefing
- Modo experimental de ingesta desde YouTube (feature opcional)

---

## Variables de entorno

### Desarrollo local

Copiá los ejemplos y completá una clave gratuita de Groq:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

El frontend usa `VITE_SERVER_URL=http://localhost:3001`. El backend requiere `GROQ_API_KEY`, usa `AI_PROVIDER=groq` y escucha en el puerto indicado por `PORT`. Creá la clave en [Groq Console](https://console.groq.com/keys) y guardala solo en tu archivo `.env` o en las variables de Render.

La cuota gratuita no es un servicio garantizado: si se alcanza el límite, ChecAR informa el problema y la verificación de esa solicitud queda sin datos. Para protegerla, el backend limita por defecto a 10 análisis por IP cada 15 minutos (`MAX_ANALYSES_PER_15_MIN`), un análisis simultáneo por IP (`MAX_CONCURRENT_ANALYSES_PER_IP`) y 50 trabajos pendientes (`MAX_PENDING_PIPELINES`). Para evitar resultados sin evidencia, las fuentes se muestran como enlaces en cada veredicto.

### Deploy

El proyecto se divide en dos servicios:

1. **Vercel:** frontend Vite. El Root Directory debe ser la raíz del repositorio. Configurá `VITE_SERVER_URL` con la URL HTTPS pública de Render y redeployá, porque Vite la incrusta durante el build.
2. **Render Web Service:** backend Express + Socket.io. Usá Root Directory `server`, Build Command `npm install` y Start Command `npm start`. Configurá `AI_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b` y `CLIENT_URL` con el dominio de Vercel. No pegues la clave en el frontend ni en Git.

También se incluye `render.yaml` como Blueprint para crear el Web Service con esa configuración.

Comprobación mínima después del deploy:

```text
GET https://<backend>.onrender.com/health → {"status":"ok"}
```

No configures `VITE_SERVER_URL` con el dominio de Vercel: allí vive el frontend, no el backend.
