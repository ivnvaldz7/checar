import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="h-14 bg-bg1 flex items-center justify-between px-5">
      <div className="flex items-center gap-2.5">
        <span className="material-icons text-accent text-[20px]">fact_check</span>
        <span className="font-grotesk font-bold text-[18px] tracking-tight text-ink-1">
          Chec<span className="text-accent">AR</span>
        </span>
      </div>
      <Link
        to="/privacidad"
        className="font-mono text-[10px] text-outline hover:text-ink-1 tracking-[0.1em] transition-colors"
      >
        PRIVACIDAD
      </Link>
    </header>
  )
}
