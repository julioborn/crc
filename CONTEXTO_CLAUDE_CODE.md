# CRC — Centro Recreativo Calchaquí
## Contexto para Claude Code

Este documento es la fuente de verdad del proyecto. Leelo entero antes de escribir código.

---

## 1. Qué estamos construyendo

Sistema de gestión para un club social y deportivo. Tres superficies, **una sola base de código**:

- **Web pública** — información institucional del club.
- **Panel de administración** — comisión directiva, subcomisiones, gestión de socios, cobranzas, reportes.
- **App móvil (Android/iOS)** — socios: cuota, pago, turnos, avisos. Y administración en movilidad: escanear carnet, cobrar, aprobar turnos.

El proyecto debe poder **clonarse para otro club** en el futuro. Por eso: nada de "CRC" hardcodeado. Nombre, colores, logo y feature flags viven en un único archivo de configuración.

---

## 2. Stack — NO NEGOCIABLE

| Pieza | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Web + admin + app, todo de acá |
| Lenguaje | **TypeScript** estricto | |
| Estilos | **Tailwind + shadcn/ui** | |
| Backend | **Supabase** | Postgres, Auth, RLS, Storage |
| Auth | **Supabase Auth** (`@supabase/ssr`) | **NUNCA NextAuth. Ver §3.** |
| Push | **Firebase Cloud Messaging** | Solo push. Nada más de Firebase. |
| Empaquetado móvil | **Capacitor** | |
| Hosting | **Vercel** | |
| Pagos | **Mercado Pago** (Checkout Pro + webhook) | |

---

## 3. ⚠️ AUTH: leer esto dos veces

**Usamos Supabase Auth. NO usamos NextAuth. NO usamos Firebase Auth.**

Razón: las políticas RLS de la base de datos leen `auth.uid()`, que sale del JWT que emite Supabase. Si la identidad la maneja otro sistema, **toda la seguridad del proyecto deja de funcionar**. No hay workaround. No lo intentes.

Firebase entra **únicamente** para mandar notificaciones push (FCM). El token FCM se guarda en la tabla `dispositivo`, asociado al `usuario_id` de Supabase.

Implementación: `@supabase/ssr` con clientes separados para browser, server component y middleware. El middleware refresca la sesión.

---

## 4. Convenciones de código

- **Entidades de dominio en español**: `socio`, `comision`, `cuota`, `turno`, `movimiento`.
- **Términos técnicos en inglés**: `createClient`, `useState`, `handleSubmit`.
- **Commits en español, presente**: "agrega alta de socios", "corrige emisión de cuotas".
- **Montos**: siempre `numeric(12,2)` en base y manejo cuidadoso en front. Nunca float.
- **Fechas de período**: siempre día 1 del mes (`2026-07-01` = "julio 2026").

---

## 5. El modelo de datos

El schema completo está en `supabase/migrations/`. **NO lo reescribas, NO lo "mejores".** Aplicalo tal cual. Los constraints que parecen raros están ahí para evitar bugs concretos.

### Las cinco reglas del dominio

**1. Usuario ≠ Socio.**
Todo el mundo es usuario (sin usuario no se entra). "Socio" es una **condición** que la administración habilita sobre un usuario existente. Alguien reserva pádel hoy sin ser socio, se asocia el año que viene, y no pierde su historial.

**2. El permiso no es un campo, es una consulta.**
No hay columna `rol`. El permiso se calcula: `cargo_comision` (usuario + comisión + cargo + **vigencia propia**) cruzado con `comision_area` (qué áreas maneja esa comisión).

> **El cargo dice QUÉ podés hacer. El área dice DÓNDE.**
> Tesorero de Básquet registra movimientos **solo de básquet**.

La **Comisión Directiva General** (`es_directiva = true`) es la excepción: alcance global, ve y maneja todo. Está **por encima** de las áreas, no al lado.

Funciones: `es_directiva()` y `puede_gestionar_area(area_id)`. Toda la RLS se apoya en ellas.

Si la vigencia de alguien venció, **pierde el acceso solo**. No hay que desactivar a nadie a mano.

**3. La plata: fondo común, registro desagregado.**
Hay **una sola caja** del club. Pero cada `movimiento` guarda dos dimensiones:
- `comision_id` → **quién** lo registró
- `area_id` → **a qué** se imputa (`NULL` = es del club: cuota social, luz, contador, sueldos)

Eso da tres reportes gratis: por área, del club, y consolidado (la CD ve todo, sin filtro).

**Nadie carga ingresos a mano.** Un trigger sobre `pago` genera el `movimiento` solo: cuota de básquet pagada → ingreso al área básquet; turno de pádel cobrado → ingreso al área pádel; cuota social → directo a la CD.

**4. Los montos se congelan.**
`cuota` guarda **pesos**, no un `arancel_id`. Si suben el arancel en agosto, las cuotas de julio impagas **no pueden cambiar de monto solas**. Con inflación argentina esto se rompe en el mes 2.
Lo mismo con `turno.precio`: se congela al reservar.

**5. La fecha de alta manda.**
Te dan de alta en julio → pagás julio (completo, sin prorratear). ¿No quieren cobrarle julio? Le ponen fecha de alta 1 de agosto. **El criterio vive en la secretaría, no en el código.**
La fecha de alta puede ser futura: el socio existe pero no genera cuota hasta que llegue.

### Grupo familiar
Tarifa **plana**. Se emite **UNA SOLA cuota social a nombre del grupo** (no 4 con descuento). Los 4 integrantes la ven, cualquiera la paga, se paga una vez, todos quedan al día.
Los **adicionales por actividad son individuales** y no entran en el descuento.
Todos los integrantes de un grupo son socios.

### Turnos
El **recurso es la cancha entera**, no el cupo. Uno reserva pádel y juegan 4; uno reserva fútbol 5 y juegan 10. Al sistema no le importan los otros.

Dos estados que **no hay que confundir**:
- `estado` → la reserva (`pendiente_aprobacion` / `confirmado` / `rechazado` / `cancelado`)
- `cobrado` → la plata (se paga **presencial al llegar**)

`recurso.aprobacion_automatica` es un **switch por recurso** (no global): el pádel puede ser automático y el quincho manual. Lo togglea quien administra esa área.

Precio dual visible: al socio se le muestra su precio con el otro tachado; al no socio, cuánto le saldría siendo socio.

---

## 6. Idempotencia — los tres lugares donde se rompe todo

**Estos no son opcionales. Ya están en el schema. No los saques.**

1. **Cuotas** — índices únicos parciales. El cron del día 1 y el alta a mitad de mes escriben en la misma tabla. Sin esto: cuotas duplicadas garantizadas.

2. **Pagos de Mercado Pago** — `mp_payment_id` unique. **MP manda el webhook dos veces, siempre.** Sin esto: el socio paga una vez y el ingreso aparece dos veces en la contabilidad. Alguien lo va a preguntar en asamblea.
   Además: la cuota necesita el estado `pendiente` (el socio ya pagó, el webhook todavía no llegó).

3. **Turnos** — constraint `EXCLUDE USING gist`. Dos socios tocan "reservar" en el mismo segundo → la base rechaza el segundo. **Validar solo en el frontend NO alcanza.**

---

## 7. Fases de desarrollo

Construir **en este orden**. No saltear.

**Fase 0 — Cimientos**
Next 15 + TS + Tailwind + shadcn. Supabase conectado. Auth con `@supabase/ssr` (login, registro, middleware, recuperar contraseña). Migraciones versionadas. Layout base y navegación por rol.

**Fase 1 — Estructura y socios**
Áreas. Comisiones con mandato. Cargos con vigencia propia. Alta/baja de socios. Grupos familiares. Inscripción a actividades. **Sin esto no hay permisos, y sin permisos no hay nada.**

**Fase 2 — Cuotas y pagos**
Aranceles con vigencia. Emisión automática (cron + al alta). Mercado Pago (Checkout Pro + webhook idempotente). Registro presencial de efectivo/transferencia. Trigger de movimientos. Reportes por área / club / consolidado.

**Fase 3 — Turnos**
Recursos, disponibilidad, bloqueos. Reserva con precio dual. Aprobación automática o manual. Cobro presencial. Panel de turnos por área.

**Fase 4 — Avisos y push**
Firebase FCM. Tabla `dispositivo` (un usuario, varios dispositivos). Avisos globales (CD) y por área (subcomisión).

**Fase 5 — App**
Capacitor. Builds. Tiendas.

---

## 8. Reglas de trabajo

- **Una fase a la vez.** No arranques la siguiente sin que la anterior ande.
- **Migraciones siempre versionadas** en `supabase/migrations/`. Nunca cambies el schema desde el dashboard.
- **RLS activa desde el día uno.** Nunca uses la `service_role key` en el cliente. Solo en Edge Functions y webhooks.
- **Si algo del schema te parece mal, preguntá antes de cambiarlo.** Cada constraint raro está resolviendo un problema real.
- **Nada de "CRC" hardcodeado.** Todo lo del club va en `config/club.ts`.
