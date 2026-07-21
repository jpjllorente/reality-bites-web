export function Footer() {
  return (
    <footer className="border-t border-primary-foreground/10 bg-primary py-10 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs uppercase tracking-widest text-primary-foreground/70 sm:flex-row sm:px-6 lg:px-10">
        <p>© {new Date().getFullYear()} 144 Reality Bites & Coffee</p>
        <p className="font-mono">Hecho con harina, café y acero.</p>
        <div className="flex gap-6">
          <a href="#catalogo" className="hover:text-secondary">Catálogo</a>
          <a href="#encargos" className="hover:text-secondary">Encargos</a>
          <a href="#contacto" className="hover:text-secondary">Contacto</a>
        </div>
      </div>
    </footer>
  );
}
