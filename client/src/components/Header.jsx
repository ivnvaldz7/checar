// Header compartido — solo logo + ícono.
// Sin navegación, sin avatar, sin links.

export default function Header() {
  return (
    <header className="h-14 bg-bg1 flex items-center px-5">
      <div className="flex items-center gap-2.5">
        <span className="material-icons text-accent text-[20px]">fact_check</span>
        <span className="font-grotesk font-bold text-[18px] tracking-tight text-ink-1">
          Chec<span className="text-accent">AR</span>
        </span>
      </div>
    </header>
  )
}
