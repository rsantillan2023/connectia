# Ola 43 — Portal de servicios (§42)

> **Estado:** cerrada núcleo + gaps (2026-07-30) · **Prioridad:** NECESARIO  
> **Inventario:** `42.01` · `42.02` · `42.QA` · `42.SEC` · `42.UX` · `42.ADM` · `42.DOC`  
> **≠** Ola 42 (secrets/env) · **≠** Ola 23 (seguridad §43) · **≠** Pedidos §20 · **≠** Solicitudes §9

---

## ADR-D43-1 — Frontera `41.M3` cerrada

| Módulo | Crea |
|--------|------|
| **§9 Solicitudes** | Ticket consulta / CRM |
| **§20 Pedidos** | Pedido (artículos / campo) |
| **§42 Portal** | `ServiceRequest` (catálogo + agente + SLA) |

`41.M3` = **cerrado**.

---

## Caps

| Cap | Canal |
|-----|--------|
| `servicios` | U `/servicios` |
| `admin.servicios` | A `/servicios` |

Seed: `node src/scripts/seedOla43ForTenant.js DEMO`

---

## Entrega

- [x] Catálogo + portal U + bandeja A + SLA
- [x] Enrutamiento heurístico (`POST /servicios/suggest`)
- [x] CSAT 1–5 post-cierre (`POST /servicios/:id/csat`)
- [x] Reportes A (`GET /admin/servicios/reportes`) — volumen · SLA · CSAT
- [x] Audiencia por ítem (`audience` en catálogo)
- [x] Aprobaciones §41 (`requireApproval` → `startWorkflowForOrigin` module `servicios`)
- [x] Feedback / sugerencias (`ServiceFeedback`)
- [x] Jira opcional (`createJiraIssue` + `jiraConfig` / `JIRA_*` env)
- [ ] QA smoke / OpenAPI — postdev
