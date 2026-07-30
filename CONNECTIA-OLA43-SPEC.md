# Ola 43 — Portal de servicios (§42)

> **Estado:** en desarrollo (2026-07-30) · **Prioridad:** NECESARIO  
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

`41.M3` = **cerrado**. No bloquea implementación de esta ola.

---

## ADR-D43-2 — Dominio propio (no reusa Pedido ni Enquiry)

**Decisión:** entidad `ServiceRequest` + catálogo `ServiceCatalogItem` + área `ServiceArea` (categoría de servicio: RRHH/TI/Ops/…).

No reutilizar `Pedido` (fulfillment de artículos) ni el modelo de consultas §9 (bandeja CRM de tipologías). Comparte **patrones** (caps, menú, history, idempotency, estados) con Ola 25.

---

## Modelo mínimo

```
ServiceArea { tenantId, name, color, active, order, receptorUserIds[] }
ServiceCatalogItem {
  tenantId, areaId, label, description, active, order,
  slaMinutes,                          // 0 = sin SLA
  fields: [{ key, label, type, required, options[] }]
}
ServiceRequest {
  tenantId, number, areaId, catalogItemId,
  status: recibido | en_curso | resuelto | cancelado,
  formAnswers: [{ key, value }],
  note, internalNotes, attachments[],
  assigneeId, createdBy,
  slaMinutes, slaDueAt?, slaBreached?,
  history[], idempotencyKey
}
```

---

## Caps / menú

| Cap | Canal |
|-----|--------|
| `servicios` | U — portal |
| `admin.servicios` | A — catálogo + bandeja agentes |

---

## DoD MVP

- [ ] U: buscar catálogo → formulario → número + estados
- [ ] A: ABM áreas/ítems · bandeja · asignar · notas internas · SLA visible (due / breached)
- [ ] Caps on/off · aislamiento tenant · seed DEMO
- [ ] Tests helpers (transiciones · SLA · menú · seed gate)
- [ ] Docs OLAS/STATUS actualizados
