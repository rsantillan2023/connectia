# Ola 43 — Portal de servicios (§42)

> **Estado:** cerrada núcleo (2026-07-30) · **Prioridad:** NECESARIO  
> **Inventario:** `42.01` · `42.02` · `42.QA` · `42.SEC` · `42.UX` · `42.ADM` · `42.DOC`  
> **≠** Ola 42 (secrets/env) · **≠** Ola 23 (seguridad §43) · **≠** Pedidos §20 · **≠** Solicitudes §9

---

## ADR-D43-1 — Frontera `41.M3` cerrada (Solicitudes · Pedidos · Portal)

**Fuente:** consolidado ADR-GAPS §E + ADR-D25-2 (Alarma↔Pedido) · sincronizado 2026-07-30.

| Módulo | Pregunta del miembro | Crea |
|--------|----------------------|------|
| **§9 Solicitudes** | Trámite / formulario / aprobación formal (CRM interno) | Ticket consulta |
| **§20 Pedidos** | Actuar en campo / entregar artículo / incidente | **Pedido** |
| **Canal Alarma** | “Ahora, acá, urgente” | El mismo **Pedido** (`source=alarm`) |
| **§42 Portal (esta ola)** | Pedir un **servicio** del catálogo deskless con agente/SLA | **ServiceRequest** (dominio propio) |

**Reglas:**
1. Tres dominios coexisten; el tenant apaga los que no usa (caps).
2. El mismo hecho operativo **no** genera dos tickets (anti-duplicado de producto: un tipo vive en un solo módulo).
3. `32.04` gestión de atenciones legado → **portal §42** (o tipo §9 si el tenant no habilita portal).
4. Jira / ITSM externo sigue siendo integración (§9 Mis tickets / alta opcional desde portal); no mezcla el CRM de solicitudes con el de servicios.

`41.M3` = **cerrado**.

---

## ADR-D43-2 — Dominio propio (no reusa Pedido ni Enquiry)

**Decisión:** entidad `ServiceRequest` + catálogo `ServiceCatalogItem` + área `ServiceArea`.

Comparte patrones (caps, menú, history, idempotency, estados) con Ola 25; no reutiliza `Pedido` ni consultas §9.

---

## Caps / menú

| Cap | Canal |
|-----|--------|
| `servicios` | U — portal `/servicios` |
| `admin.servicios` | A — `/servicios` catálogo + bandeja |

Seed: `node src/scripts/seedOla43ForTenant.js DEMO`

---

## DoD MVP

- [x] U: buscar catálogo → formulario → número + estados
- [x] A: ABM áreas/ítems · bandeja · asignar · notas internas · SLA visible
- [x] Caps on/off · aislamiento tenant · seed DEMO
- [x] Tests helpers (`servicios.test.js`)
- [x] Docs OLAS/STATUS
- [ ] QA smoke / OpenAPI — postdev
