import { Link } from 'react-router-dom'
import Header from '../components/Header'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface text-ink-1 font-inter">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-14">
        <p className="font-mono text-[10px] text-primary tracking-[0.18em] mb-3">TRANSPARENCIA</p>
        <h1 className="font-grotesk font-bold text-4xl tracking-tight mb-5">Privacidad y límites</h1>
        <div className="space-y-6 text-sm text-ink-2 leading-relaxed">
          <section>
            <h2 className="font-grotesk font-semibold text-lg text-ink-1 mb-2">Qué se procesa</h2>
            <p>ChecAR recibe la URL o el texto que enviás para extraer afirmaciones y contrastarlas. El contenido se procesa en el backend y mediante el proveedor de IA configurado. No ingreses datos personales, privados o confidenciales.</p>
          </section>
          <section>
            <h2 className="font-grotesk font-semibold text-lg text-ink-1 mb-2">Qué no se guarda</h2>
            <p>La aplicación no tiene cuentas de usuario ni una base de datos de análisis. Las sesiones se mantienen temporalmente en memoria para completar cada consulta y no se conservan como un historial personal.</p>
          </section>
          <section>
            <h2 className="font-grotesk font-semibold text-lg text-ink-1 mb-2">Cómo leer un resultado</h2>
            <p>Los veredictos son una ayuda editorial y se apoyan solo en fuentes públicas permitidas. <strong className="text-ink-1">Sin datos</strong> significa que no se halló evidencia suficiente dentro de esas fuentes; no prueba que una afirmación sea falsa.</p>
          </section>
          <section>
            <h2 className="font-grotesk font-semibold text-lg text-ink-1 mb-2">Contacto y correcciones</h2>
            <p>Para reportar un error, sugerir una fuente o pedir una corrección, abrí un reporte en el <a className="text-primary underline underline-offset-4 hover:text-ink-1" href="https://github.com/ivnvaldz7/checar/issues" target="_blank" rel="noreferrer">repositorio público de ChecAR</a>.</p>
          </section>
        </div>
        <Link to="/" className="inline-flex mt-10 font-mono text-[10px] text-outline hover:text-ink-1 tracking-[0.12em]">← VOLVER AL INICIO</Link>
      </main>
    </div>
  )
}
