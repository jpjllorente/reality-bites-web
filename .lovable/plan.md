# Portal de clientes profesionales (B2B)

Nueva sección para clientes profesionales (restaurantes, cafeterías, etc.) con panel propio, pedidos al por mayor, facturación legal vía Stripe Invoicing y método de pago guardado de forma segura.

## 1. Alta de clientes (solo administradores)

Nueva pestaña **"Clientes PRO"** en el dashboard admin (`/dashboard`) para dar de alta empresas con todos los datos fiscales necesarios:

- Razón social, nombre comercial
- NIF / CIF / VAT ID
- Dirección fiscal completa (calle, CP, ciudad, provincia, país)
- Email de facturación, teléfono, persona de contacto
- Condiciones de pago (contado, 15 días, 30 días)
- Descuento por defecto (%)
- Email de acceso al portal

Al crear el cliente:
1. Se crea un **Stripe Customer** con los datos fiscales (`tax_id`, `address`, `email`).
2. Se crea (o invita) el usuario en Supabase Auth con ese email y se envía enlace de establecer contraseña.
3. Se guarda la relación `user_id ↔ stripe_customer_id ↔ datos_fiscales` en una nueva tabla `pro_customers`.
4. Se asigna el rol `pro` (nuevo en `app_role`) en `user_roles`.

## 2. Portal del cliente profesional (`/pro`)

Ruta protegida bajo `_authenticated/pro/` con guard por rol `pro` o `admin`:

- **Inicio**: resumen (pedidos abiertos, facturas pendientes, saldo).
- **Nuevo pedido**: catálogo con precios PRO (aplica descuento del cliente) y carrito específico B2B, sin pago en línea (se factura).
- **Mis pedidos**: histórico con estado (nuevo, confirmado, preparando, entregado).
- **Facturas pendientes**: listado desde Stripe Invoices (`status: open`) con botón **"Pagar ahora"** (usa el método guardado o Stripe Hosted Invoice Page).
- **Facturas pagadas**: histórico con enlace al PDF oficial de Stripe.
- **Método de pago**: alta/edición mediante **Stripe SetupIntent + Payment Element** (guardado como `default_payment_method` del Customer; nunca tocamos datos de tarjeta).

## 3. Flujo de pedidos y facturación

1. El cliente PRO crea un pedido desde su panel → se guarda en nueva tabla `pro_orders` con estado `nuevo`.
2. El administrador lo revisa desde su dashboard, ajusta importes/líneas si hace falta y marca **"Confirmar y facturar"**.
3. Al confirmar: se crea una **Stripe Invoice** con líneas (`invoice items`), se finaliza (`finalize_invoice`) y se envía por email.
4. Según las condiciones de pago:
   - **Contado con método guardado**: se cobra automáticamente (`collection_method: charge_automatically`).
   - **A crédito (15/30 días)**: se envía como `send_invoice` con `due_date`; el cliente puede pagarla desde su panel.
5. Webhook Stripe (`invoice.paid`, `invoice.payment_failed`, `invoice.finalized`) actualiza el estado del pedido y notifica por email.

## 4. Cambios técnicos

### Base de datos (migración)
- Nuevo valor `pro` en enum `app_role`.
- Tabla `pro_customers` (datos fiscales + `stripe_customer_id` + `user_id`).
- Tabla `pro_orders` (items JSONB, total, estado, `stripe_invoice_id`, notas).
- Enum `pro_order_status`: `nuevo`, `confirmado`, `facturado`, `pagado`, `entregado`, `cancelado`.
- RLS: el cliente PRO solo ve sus propios registros; admins ven todo. GRANTs a `authenticated` y `service_role`.

### Server functions (`src/lib/pro-*.functions.ts`)
- `createProCustomer` (admin): crea Stripe Customer + usuario Auth + fila `pro_customers`.
- `listProCustomers`, `updateProCustomer`, `deactivateProCustomer` (admin).
- `createProOrder` (cliente pro): crea pedido pendiente.
- `listProOrders` (cliente pro: propios / admin: todos).
- `confirmAndInvoiceProOrder` (admin): crea `invoice items` + `invoice` en Stripe.
- `listProInvoices` (cliente pro): lista desde Stripe filtrando por su `customer_id`.
- `payProInvoice` (cliente pro): dispara `stripe.invoices.pay()` con método guardado.
- `createSetupIntent` / `setDefaultPaymentMethod` (cliente pro): guardar tarjeta.

### Rutas nuevas
- `src/routes/_authenticated/pro/route.tsx` (guard rol pro/admin)
- `src/routes/_authenticated/pro/index.tsx` (resumen)
- `src/routes/_authenticated/pro/pedidos.tsx`
- `src/routes/_authenticated/pro/facturas.tsx`
- `src/routes/_authenticated/pro/metodo-pago.tsx`
- `src/routes/_authenticated/pro/nuevo-pedido.tsx`
- Nueva pestaña **"Clientes PRO"** en `src/routes/_authenticated/dashboard.tsx`.

### Webhook
- Extender `src/routes/api/public/payments/webhook.ts` para manejar `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`, `invoice.sent` → actualizar `pro_orders` y enviar email.

### Emails
- Nuevo template: notificación de nueva factura, recordatorio de vencimiento, confirmación de pago de factura.

## Preguntas antes de implementar

1. **Precios PRO**: ¿aplicamos un **descuento único por cliente** (%) sobre los precios del catálogo actual, o quieres una **lista de precios separada** para B2B por producto?
2. **Cantidades mínimas / pedido mínimo**: ¿existe un importe o cantidad mínima por pedido profesional?
3. **IVA**: los clientes PRO llevan IVA español estándar y en su factura aparece su NIF, ¿o hay que soportar también intracomunitario (VAT reverse charge para clientes UE con VIES)?
4. **Método de pago obligatorio**: ¿obligamos a guardar tarjeta antes del primer pedido, o permitimos pedidos a crédito sin tarjeta y pago manual desde la factura?
