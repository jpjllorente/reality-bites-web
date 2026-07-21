import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo-144reality.jpeg.asset.json";

export function Header({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const isOverlay = variant === "overlay";
  const base = isOverlay
    ? "absolute inset-x-0 top-0 z-20 text-primary-foreground"
    : "relative z-20 border-b border-foreground/10 bg-background text-foreground";

  return (
    <header className={base}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-background/95 ring-2 ring-secondary/70">
            <img
              src={logoAsset.url}
              alt="144 Reality Bites & Coffee"
              className="h-9 w-9 rounded-full object-cover"
            />
          </span>
          <span
            className={`hidden font-display text-2xl tracking-widest sm:inline ${
              isOverlay ? "text-primary-foreground" : "text-primary"
            }`}
          >
            144 REALITY
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-widest md:flex">
          <NavItem to="/" overlay={isOverlay} exact>
            Inicio
          </NavItem>
          <NavItem to="/tienda" overlay={isOverlay}>
            Tienda
          </NavItem>
          <NavItem to="/galeria" overlay={isOverlay}>
            Galería
          </NavItem>
          <NavItem to="/encargos" overlay={isOverlay}>
            Encargos
          </NavItem>
          <NavItem to="/contacto" overlay={isOverlay}>
            Contacto
          </NavItem>
        </nav>

        <Link
          to="/tienda"
          className="hidden rounded-sm border border-secondary bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90 md:inline-block"
        >
          Pedir online
        </Link>
      </div>
    </header>
  );
}

function NavItem({
  to,
  children,
  overlay,
  exact,
}: {
  to: string;
  children: React.ReactNode;
  overlay: boolean;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      activeProps={{ className: "text-secondary" }}
      inactiveProps={{
        className: overlay
          ? "text-primary-foreground hover:text-secondary"
          : "text-foreground hover:text-secondary",
      }}
    >
      {children}
    </Link>
  );
}
