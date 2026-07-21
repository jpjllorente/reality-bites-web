
## Objetivo

Convertir el sitio de una sola página a una web multi-página, dejando la home como escaparate visual y llevando catálogo, encargos y contacto a rutas propias con navegación compartida.

## Nueva estructura de rutas

```text
src/routes/
  __root.tsx        → añade Header (nav) + Footer alrededor del <Outlet />
  index.tsx         → Home: Hero (carrusel) + teasers visuales
  tienda.tsx        → Catálogo completo + carrito + envío por WhatsApp
  encargos.tsx      → Formulario de encargos a medida
  contacto.tsx      → Info de contacto + mapa
```

## Cambios por archivo

- **`src/routes/__root.tsx`**: crear un `<Header>` con logo y nav (`Inicio`, `Tienda`, `Encargos`, `Contacto`) usando `<Link>` de TanStack con `activeProps`. Renderizar `<Header /> <Outlet /> <Footer />` dentro de `RootComponent`. Mantener `head()` genérico del sitio (sin `og:image` en root).
- **`src/routes/index.tsx`**: dejar solo `<Hero />` + secciones nuevas de presentación (destacados de productos con enlaces a `/tienda`, bloque "Encargos a medida" con CTA a `/encargos`, bloque "Visítanos" con CTA a `/contacto`). Sin catálogo ni formularios embebidos.
- **`src/routes/tienda.tsx`** (nuevo): `head()` propio (`title`, `description`, `og:*`). Renderiza `<Catalog />`.
- **`src/routes/encargos.tsx`** (nuevo): `head()` propio. Renderiza `<CustomOrders />`.
- **`src/routes/contacto.tsx`** (nuevo): `head()` propio. Renderiza `<Contact />`.
- **`src/components/site/Hero.tsx`**: los CTAs que hoy hacen scroll a `#catalogo`/`#encargos` pasan a `<Link to="/tienda">` / `<Link to="/encargos">`.
- **`src/components/site/Footer.tsx`**: enlaces internos a las nuevas rutas.
- **`src/components/site/Catalog.tsx`**, **`CustomOrders.tsx`**, **`Contact.tsx`**: sin cambios de contenido; se reutilizan tal cual dentro de sus nuevas rutas (se puede quitar el `id="..."` ancla ya que dejan de usarse).

## Detalles técnicos

- Rutas planas con `createFileRoute("/tienda")` etc. (respetar la convención de TanStack; `routeTree.gen.ts` se regenera solo).
- Cada ruta define `head()` con `title`, `description`, `og:title`, `og:description` únicos. Sin `og:image` por ahora (no hay imagen dedicada); se puede añadir después.
- El carrito (`use-cart`) ya persiste en `localStorage`, así que funciona igual aunque el catálogo viva en otra ruta.
- Navegación siempre con `<Link to="/ruta">`, nunca `<a href>`.

## Fuera de alcance

- No se toca el diseño visual ni los tokens de estilo.
- No se añade backend ni se cambia el flujo de pedido por WhatsApp.
