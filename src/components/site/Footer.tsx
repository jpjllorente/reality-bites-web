import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-primary-foreground/10 bg-primary py-10 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs uppercase tracking-widest text-primary-foreground/70 sm:flex-row sm:px-6 lg:px-10">
        <p>© {new Date().getFullYear()} 144 Reality Bites & Coffee</p>
        <p className="font-mono">
          Hecho con harina, café y acero. ·{" "}
          <Link to="/dashboard" className="opacity-50 hover:opacity-100 hover:text-secondary">
            Panel
          </Link>
        </p>
        <div className="flex gap-6">
          <Link to="/tienda" className="hover:text-secondary">Tienda</Link>
          <Link to="/galeria" className="hover:text-secondary">Galería</Link>
          <Link to="/encargos" className="hover:text-secondary">Encargos</Link>
          <Link to="/contacto" className="hover:text-secondary">Contacto</Link>
          <a
            href="https://instagram.com/144reality_bitesandcoffee"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-secondary"
          >
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
