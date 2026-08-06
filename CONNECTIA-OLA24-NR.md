# Ola 24 — Paridad por cliente · no-regresión (`NR.*`) · seguimiento tema a tema

| Campo | Valor |
|-------|--------|
| **Spec** | Particularidades por empresa — consolidado §0b |
| **IDs** | `NR.CLARO` · `NR.GRIDO` · `NR.ECR` · `NR.EPEC` · `NR.EMP60` |
| **Estado ola** | ✗ no hecha |
| **Prioridad** | **IMPRESCINDIBLE** · retención de clientes legacy (tablero `CONNECTIA-OLAS.md`) |
| **DoD pack** | UAT firmada por owner de negocio del cliente |
| **Premisa** | Sin hardcode `Emp_Id` · capabilities + metadata + menús por tenant |
| **Fuente** | `ECRMOBILE-FUNCIONES-CONSOLIDADO.md` §0b · inventario NR en `CONNECTIA-STATUS.md` |

> **Absorbido desde §30 / ex-Ola 28 (2026-07-30):** `30.01`–`30.07` (ECR Salud, GeoVictoria, custom ECR/Claro/EPEC/Emp60/Grido). El **centro de comunicaciones de plataforma** (plantillas IA · email/WA/SMS · outbox) vive en **Ola 28** `28.COM.*` — no en esta ola. WTA operativo del pack EPEC sigue acá en `NR.EPEC`.

> **Leyenda:** ✗ no hecho · ◐ en curso · ✓ hecho  
> Al cerrar un tema, cambiar ✗ → ✓ (y opcionalmente fecha).

---

## ¿Qué es esta ola? ¿Paridad o “superador”?

**Ola 24 no es “hacer lo mismo peor en stack nuevo”.** El encargo es:

1. **Paridad operativa (no-regresión):** el cliente no pierde login, integraciones, menú, pantallas ni flujos que hoy usa. Si Claro/Grido/ECR no pueden operar como hoy → la reingeniería **no está lista**.
2. **Arquitectura moderna:** todo vía **pack/capability** (no `if Emp_Id === N`). Eso sí es superador respecto al legacy: configurable, aislado, testeable, reusable.
3. **Algunos temas sí generalizan y mejoran el producto** (ej. links YoClaro → **§46 Hub de accesos** genérico; Emp60 → labels vía **ola 39**; panel ECR local → API live + Track I).
4. **Modernización de UX de plataforma** (sensación “de esta década”) vive sobre todo en **§45** y el núcleo Connectia ya entregado; ola 24 **no** reinventar skins por cliente, sino **no romper** lo crítico.

En corto: **mismo poder operativo (o mejor vía genérico) + plataforma moderna; no un fork visual por cliente.**

---

## Gridonet — ¿está?

**Sí.** En el legacy es **Grido / Gridonet** (Emp_Id **18**, código **113**, hosts `grido` / `*gridonet*`).  
En Connectia el pack es **`NR.GRIDO`** (`pack.grido`). Incluye AD, menú `appMobile`, deep links cifrados, branding/WebView y UI propia. Ver sección 2.

---

## Resumen packs

| Pack | Cliente | Emp legacy | Prioridad retención | Estado |
|------|---------|------------|---------------------|--------|
| `NR.CLARO` | Claro / YoClaro | 17 · código 110 | Crítica | ✗ |
| `NR.GRIDO` | Grido / Gridonet | 18 · código 113 | Crítica | ✗ |
| `NR.ECR` | ECR Group + asociadas | 4, 52, 58, 59 | Crítica | ✗ |
| `NR.EPEC` | EPEC | 26 | Alta | ✗ |
| `NR.EMP60` | Emp 60 (labels) | 60 | Alta | ✗ |
| Transversal | Capabilities, seeds, smoke, aislamiento | — | Obligatoria | ✗ |

---

## 1. `NR.CLARO` — Claro / YoClaro

**Capability sugerida:** `pack.claro`  
**DoD:** UAT firmada Claro (SSO + YoClaro + consultas).

| # | Tema funcional | Qué debe quedar | Capas | Spec | Estado |
|---|----------------|-----------------|-------|------|--------|
| 1.1 | SSO Azure (U + Admin) | Login MSAL / OAuth2 PKCE; mensaje claro si Azure off; sin sesión a medias | U A S | §1 | ✗ |
| 1.2 | AD por código 110 | Validación proxy AD Claro con Emp_Codigo 110 | S | §1 | ✗ |
| 1.3 | Logout limpio | Sesión local + caché MSAL / force login | U A S | checklist Claro | ✗ |
| 1.4 | Home YoClaro | Home operador (`MainClaro`) solo con el pack | U | §18 / §30.04 | ✗ |
| 1.5 | Hub de links (§46) | Paridad `LinksClaro` vía launchpad genérico; sin hardcode 17 | U A S | §46 | ✗ |
| 1.6 | Beneficios / rewards Claro | Partners + URL Claro / catálogo YoClaro | U S | §18.05 → pack | ✗ |
| 1.7 | Bandeja consultas estado 8 | Admin abre por defecto en BandejaEntrada (8) | A | §9 | ✗ |
| 1.8 | UI muro / beneficios Claro | Cards, speech, botonera, pubs tipo beneficio | U | UI Emp 17 | ✗ |
| 1.9 | Aislamiento YoClaro | Otros tenants no ven pantallas YoClaro; sí pueden usar §46 | U A | checklist | ✗ |
| 1.10 | Seed + smoke Claro | Datos demo + checklist smoke del pack | S | NR | ✗ |
| 1.11 | UAT Claro firmada | Owner de negocio firma paridad | — | gate go-live | ✗ |

### Pack Claro · Beneficios / partners (grupo D — backlog ola 24)

Pendiente de implementación en esta ola (no en núcleo genérico de §18):

| # | Tema | Notas | Estado |
|---|------|-------|--------|
| D.1 | Catálogo YoClaro / partners Claro | URLs y audiencias del pack; capability `pack.claro` + `beneficios.partners` | ✗ |
| D.2 | Home / speech / cards Emp 17 | UI operador Claro sobre catálogo genérico | ✗ |
| D.3 | Deep links muro → beneficio Claro | Publicaciones tipo beneficio con deep-link al ficha | ✗ |
| D.4 | Seed + smoke pack Claro beneficios | Datos demo + checklist NR | ✗ |

> **Fuera de ola 24 (grupo C — no hacer acá):** PSP, retiro bancario real, KYC, efectivo, multi-moneda. Eso sigue diferido a Ola 40 CAPRICHO / billetera bancaria.

**Checklist legacy (referencia):**

- [ ] ✗ Colaborador Claro autentica con Azure AD (PWA) y Admin con OAuth2 PKCE
- [ ] ✗ Si Azure off → mensaje claro, sin sesión a medias
- [ ] ✗ Login código 110 valida AD Claro en API
- [ ] ✗ Logout limpia local + MSAL
- [ ] ✗ Home/links/beneficios solo en este tenant (o paridad §46 + beneficios)
- [ ] ✗ Links en §46 con mismas URLs/audiencias críticas
- [ ] ✗ No-Claro no ve YoClaro hardcodeado
- [ ] ✗ Bandeja Admin default estado 8
- [ ] ✗ Beneficios/rewards vía URL Claro operativo (o plan de paridad)
- [ ] ✗ UI muro/beneficios no cae al layout genérico por error

---

## 2. `NR.GRIDO` — Grido / Gridonet

**Capability sugerida:** `pack.grido`  
**DoD:** UAT firmada Grido (AD + appMobile + deep links + branding).

| # | Tema funcional | Qué debe quedar | Capas | Spec | Estado |
|---|----------------|-----------------|-------|------|--------|
| 2.1 | Login AD Grido | Código 113 / Emp 18 vía gateway Geopop → sesión local | U A S | §1 / §30.07 | ✗ |
| 2.2 | Resolución de host | `grido` / `*gridonet*` → tenant correcto (dev/prod) | S | branding | ✗ |
| 2.3 | Menú `appMobile` | Publicar/consumir como `appMobile` (no solo `appPwa`) | A S | menú ABM | ✗ |
| 2.4 | Deep links cifrados | Token AES `Usu_Usuario#Emp_Codigo` al abrir URLs (`App_YOGrido`) | U S | deep links | ✗ |
| 2.5 | Roles Admin (apps 2 y 6) | Ocultar apps Id 2 y 6 (o equivalencia por config) | A | roles | ✗ |
| 2.6 | Branding / PWA / WebView | Manifest Gridonet, packages nativos, matriz PWA+WebView+desktop | U | §31 | ✗ |
| 2.7 | UI feed Grido | Cards/comentarios/Firebase si aplica en subdomain `grido` | U | UI Emp 18 | ✗ |
| 2.8 | Seed + smoke Grido | Datos demo + checklist smoke del pack | S | NR | ✗ |
| 2.9 | UAT Grido / Gridonet firmada | Owner firma paridad | — | gate go-live | ✗ |

**Checklist legacy (referencia):**

- [ ] ✗ Login 113 / Emp 18 valida AD Grido y crea sesión
- [ ] ✗ Hosts `grido` / `gridonet` resuelven tenant
- [ ] ✗ Menú como `appMobile`
- [ ] ✗ Deep links con token cifrado esperado por destinos Gridonet
- [ ] ✗ Roles Admin ocultan apps 2 y 6 (o config equivalente)
- [ ] ✗ Manifest/branding/packages instalables
- [ ] ✗ Matriz: PWA + WebView Gridonet + desktop si `allowDesktop`
- [ ] ✗ UI/feed no pierde comportamientos propios

---

## 3. `NR.ECR` — ECR Group + asociadas (4, 52, 58, 59)

**Capability sugerida:** `pack.ecr` (+ `supervision.ecr` donde aplique)  
**DoD:** UAT firmada ECR (salud, GeoVictoria, ausentismo, supervisores, menú/encuestas).  
**Nota:** Sync Geopop live · API ECR externa · GeoVictoria absorbidos desde ola 18 (2026-07-30). Credenciales → **Ola 42** cuando exista el adapter.

| # | Tema funcional | Qué debe quedar | Capas | Spec | Estado |
|---|----------------|-----------------|-------|------|--------|
| 3.1 | Familia ECR (pack único) | Mismas reglas para 4/52/58/59 vía capability (ex-`isECR`) | U A S | §30 ECR | ✗ |
| 3.2 | ECR Salud | Portal salud: JWT corta vida + URL allowlist | U S | `30.01` | ✗ |
| 3.3 | GeoVictoria live | Adapter S2S: token, marcas idempotentes, correlación | U S | `30.02` | ✗ |
| 3.4 | Sync Geopop productivo | Prefichada real (reemplaza mock `11.03` con pack) | S | ex-ola 18 | ✗ |
| 3.5 | API ECR externa | Novedades/panel sobre API real (hoy local `AttendancePunch`) | S | ex-ola 18 | ✗ |
| 3.6 | Ausentismo ECR | Alta/historial/aprobación vs API ausentismo ECR | U A S | §12 | ✗ |
| 3.7 | Panel supervisores | Marcas fuera de rango, justificar, amonestar, anexo, domingos | U A S | `11.11` / `23.ECR.*` | ✗ |
| 3.8 | Menú / encuestas ECR | Split Programadas / Sin Ruta / Espontáneas; Agenda Laboral | U A | UI ECR | ✗ |
| 3.9 | Login externo solo encuestas | Modo restringido (escenarios ECR) | U | §1 | ✗ |
| 3.10 | Lookup multi-empresa | Búsqueda login en asociadas | S | API | ✗ |
| 3.11 | Campo Emp 58 (`Usu_Dato3`) | Visible/editable solo en ese tenant (metadata) | U A | ECR103 | ✗ |
| 3.12 | Cruce Ola 31 Track I | Panel ECR cuando tenant tenga `supervision.ecr` | U A S | Ola 31 | ✗ |
| 3.13 | Env / vault (cuando haya código) | Vars alineadas → filas Ola 42 | S | Ola 42 | ✗ |
| 3.14 | Seed + smoke ECR | Demo + smoke familia + asociadas | S | NR | ✗ |
| 3.15 | UAT ECR firmada | Owner firma paridad | — | gate go-live | ✗ |

**Checklist legacy (referencia):**

- [ ] ✗ Login/menú operan para 4, 52, 58, 59 con reglas de familia
- [ ] ✗ ECR Salud abre con token/URL válidos
- [ ] ✗ GeoVictoria responde / no rompe asistencia
- [ ] ✗ Ausentismo API ECR (alta, historial, aprobación)
- [ ] ✗ Panel supervisores / fuera de rango / domingos
- [ ] ✗ Split encuestas + Agenda Laboral
- [ ] ✗ Asociadas no pierden customizaciones
- [ ] ✗ Emp 58: `Usu_Dato3` visible/editable

---

## 4. `NR.EPEC` — EPEC (Emp 26)

**Capability sugerida:** `pack.epec`  
**DoD:** Visitas + pubs + WTA operativos vía config (sin hardcode 26).

| # | Tema funcional | Qué debe quedar | Capas | Spec | Estado |
|---|----------------|-----------------|-------|------|--------|
| 4.1 | Monitor de visitas | Admin visitas casi tiempo real (long-polling / equivalente) · **incluye** ex-`32.06` visitas por menú | A S | §29 · ex-ola 30 | ✗ |
| 4.2 | Reglas pubs en home | Pre-home / recordatorio / `Pub_MostrarEnHome` propios | A S | pubs | ✗ |
| 4.3 | UI PWA EPEC | Variantes cards/comentarios del tenant (vía pack, no Emp_Id) | U | UI Emp 26 | ✗ |
| 4.4 | WTA / bot / IA EPEC | Flujos WhatsApp de operación EPEC no se apagan por error genérico | S | §31 | ✗ |
| 4.5 | Seed + smoke EPEC | Demo + smoke del pack | S | NR | ✗ |
| 4.6 | UAT EPEC firmada | Owner firma paridad | — | gate | ✗ |

**Checklist legacy (referencia):**

- [ ] ✗ Monitor `#/visitas` (o equivalente Connectia) actualiza casi en tiempo real
- [ ] ✗ Reglas pubs home/pre-home iguales
- [ ] ✗ Flujos WTA/bot EPEC activos cuando el pack está on

---

## 5. `NR.EMP60` — Emp 60 (labels / renombres)

**Capability sugerida:** `pack.labels` (o seed de overrides ola 39)  
**DoD:** Mismos módulos genéricos con copy distinto vía metadata (sin hardcode 60).  
**Cruza:** motor de textos **Ola 39** (`39.LOC.10` seed pack Emp60).

| # | Tema funcional | Qué debe quedar | Capas | Spec | Estado |
|---|----------------|-----------------|-------|------|--------|
| 5.1 | Renombre alarmas | “Feedback de vecinos” vía labels | U A | §19 + ola 39 | ✗ |
| 5.2 | Copy encuestas espontáneas | “acción / ruta / comercio / pedido” | U | §15 | ✗ |
| 5.3 | Filtros espontáneos | Comportamientos de filtro donde apliquen (config) | U S | Emp 60 | ✗ |
| 5.4 | Seed diccionario Emp60 | Overrides al activar pack (`39.LOC.10`) | S | ola 39 | ✗ |
| 5.5 | Smoke Emp60 | Ver labels correctos vs tenant genérico | U A | NR | ✗ |
| 5.6 | UAT Emp60 (si aplica) | Owner valida copy | — | gate | ✗ |

---

## 6. Transversal (todos los packs)

| # | Tema | Qué | Estado |
|---|------|-----|--------|
| T.1 | Capabilities por pack | `pack.claro` · `pack.grido` · `pack.ecr` · `pack.epec` · `pack.labels` | ✗ |
| T.2 | Menús por cliente | Seed menú U/A según pack activo | ✗ |
| T.3 | Anti-hardcode | Cero ramas `Emp_Id === N` en vistas; flags tipados | ✗ |
| T.4 | Matriz regresión mínima | ECR (+ asociadas) · Claro · Grido · EPEC · Emp60 · 1 genérico branding | ✗ |
| T.5 | Aislamiento multi-tenant | Datos de un tenant no visibles en otro | ✗ |
| T.6 | Smoke NR automatizable | Placeholders → tests reales (`connectia/docs/NO-REGRESION-PACKS.md`) | ✗ |
| T.7 | Owners + UAT | Owner de negocio por cliente estratégico | ✗ |
| T.8 | Rollback / coexistencia | Plan si falla Azure / AD Grido / APIs ECR en go-live | ✗ |

**Gate go-live (consolidado — no negociable):**

- [ ] ✗ UAT Claro (SSO + YoClaro + consultas)
- [ ] ✗ UAT Grido (AD + appMobile + deep links + branding)
- [ ] ✗ UAT ECR (salud, GeoVictoria, ausentismo, supervisores, menú/encuestas)
- [ ] ✗ Smoke aislamiento multi-tenant
- [ ] ✗ Matriz móvil + desktop (`allowDesktop`) en al menos un tenant crítico

---

## Fuera de ola 24 (legacy lo menciona, no es pack NR)

| Caso | Motivo | Estado tracking |
|------|--------|-----------------|
| Superadmin Emp 1 | Plataforma, no cliente NR | n/a |
| Skin YOMOB / SOOFIA | Branding producto (ola 36 / skins) | n/a |
| Belgrano (`testBelgrano`) | Hardcode soporte — **no migrar** (§44) | n/a · no hacer |
| CODESAC | Retirado — no reimplementar | n/a · no hacer |
| Resto (AGD, Chilexpress, …) | Solo branding/host/metadata | n/a en NR |

---

## Orden de arranque (pendiente de decisión)

Aún no definido. Candidatos naturales (prioridad comercial / gate):

1. `NR.CLARO` — SSO + hub + bandeja (gate go-live #1)
2. `NR.GRIDO` — AD + appMobile + deep links (gate #2)
3. `NR.ECR` — integraciones live + panel (gate #3 · más pesado)
4. `NR.EPEC` — visitas + WTA
5. `NR.EMP60` — labels (puede ir en paralelo con ola 39)

> Cuando decidan el orden, anotar acá el pack elegido y la fecha de kickoff.

| Decisión | Valor |
|----------|--------|
| Pack de arranque | _TBD_ |
| Fecha kickoff | _TBD_ |
| Owner técnico | _TBD_ |
| Owner negocio por cliente | _TBD_ |

---

## Changelog del documento

| Fecha | Cambio |
|-------|--------|
| 2026-07-30 | Alta: desglose funcional por cliente desde §0b + inventario NR; todos los temas en ✗ |
