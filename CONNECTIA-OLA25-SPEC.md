# Ola 25 — Pedidos de campo + canal Alarma (spec)

> **Estado:** cerrada (2026-07-30) · **Prioridad:** DESEABLE · *Bajo demanda*  
> **Creada / ADR:** 2026-07-30  
> **Inventario:** §19 Alarmas · §20 Pedidos internos · mapa admin (§32.A referenciado → **incluido en MVP**)  
> **IDs STATUS:** `19.*` · `20.*` (+ mapa como entrega A de esta ola)  
> **≠** Supervisión comercial (**Ola 31**) · ≠ Emp60 labels (**Ola 24** `NR.EMP60` + **Ola 39**) · ≠ Portal servicios (**Ola 43**)

---

## ADR-D25-1 — Un solo dominio

**Decisión:** la **Alarma no es una entidad paralela**. Es un **canal de captura rápida** (pánico / reporte de campo) que **crea un Pedido** (`source=alarm`).

| Antes (riesgo) | Ahora |
|----------------|--------|
| Alarma + “pedido asociado” (dos hechos) | **Un Pedido**, un número, un historial |
| Módulo §19 con CRM propio | Cap `pedidos.alarma` + UX pánico sobre §20 |
| Mapa “de alarmas” separado | Mapa admin de **pedidos con geo**, filtro por categoría |

**Paridad legacy §19:** crear/actualizar/cancelar · listado/seguimiento · GPS/observación · journey “queda pedido” → cubiertos.  
**No migrar:** Belgrano / `testBelgrano`, `alarmas.uxshows.com` token en query, SQL/proxy inseguro (deuda §44).

---

## ADR-D25-2 — Frontera `41.M3` (parte Pedidos / Alarma)

| Módulo | Pregunta del miembro | Crea |
|--------|----------------------|------|
| **§9 Solicitudes** | Trámite / formulario / aprobación formal | Ticket CRM / workflow |
| **§20 Pedidos** | Actuar en campo / entregar ítem / atender incidente | **Pedido** |
| **Canal Alarma (§19)** | “Ahora, acá, urgente” (1–2 toques) | **El mismo Pedido** (`source=alarm`) |
| **§42 Portal (Ola 43)** | Servicio deskless con agente/SLA | Ticket de servicio (otro dominio) |

**Regla:** un incidente de campo = **un Pedido**. La alarma no abre un segundo caso.

> Portal vs §9: cerrado en [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md) **D43-1** (ADR-GAPS §E). Esta ola cierra la frontera **Alarma ↔ Pedido**.

---

## ADR-D25-3 — Mapa en MVP (obligatorio)

**Decisión:** el **mapa admin es DoD de Ola 25** (no diferido).

- Pins = pedidos con `geo` (típicamente `source=alarm`; también catálogo si tienen coords).
- Filtros: categoría (color), estado, rango de fechas, opcional `source`.
- ACL: solo roles/caps de operador/admin; coords = dato sensible (retención/auditoría).
- Sin geo: el pedido existe en bandeja; **no** aparece en mapa (no inventar coords).

Revoca el default ADR-GAPS “sin mapa admin en MVP” **para tenants con canal alarma / pedidos on**.

---

## ADR-D25-4 — Fuera de alcance: Emp60

**Decisión:** renombres “Feedback de vecinos” / diccionario Emp60 **no** son de esta ola.

| Qué | Dónde |
|-----|--------|
| Labels / overrides Emp60 | **Ola 24** `NR.EMP60` + motor **Ola 39** |
| Ola 25 | Menú default (“Reportes” / “Pedidos” / “Alarmas”) vía keys i18n genéricas; sin pack 60 |

---

## Modelo de datos (mínimo)

```
Pedido {
  tenantId, number,
  source: 'alarm' | 'catalog' | 'api',
  categoryId,
  priority: 'urgent' | 'normal',   // alarm ⇒ urgent por default
  status: 'abierta' | 'en_curso' | 'cerrada' | 'cancelada',
  closeReason?: 'resuelto' | 'falsa_alarma' | 'otro',
  note?, attachments[],
  geo?: { lat, lng, accuracy, capturedAt, permission },
  items[]?,                        // vacíos o sintéticos en alarm
  assigneeId?,
  createdBy, history[]
}

CategoriaPedido {
  tenantId, name, colorMap, receptors[],
  requireGps?, requirePhoto?, defaultForAlarm?, active
}
```

---

## Caps / menú

| Cap | Qué habilita |
|-----|----------------|
| `pedidos` | Dominio + listado U + crear desde catálogo |
| `pedidos.alarma` | Botón pánico / canal rápido (requiere `pedidos`) |
| `admin.pedidos` | ABM categorías/artículos, bandeja operador, **mapa** |

Menú U: ítem Alarma/Reportes si `pedidos.alarma`; ítem Pedidos si `pedidos`.  
Default caps: **off** (vertical opcional).

---

## Tracks / entrega

### Track A — Dominio Pedido
1. Modelo + API `/api/pedidos` · `/api/admin/pedidos`
2. Estados + historial inmutable + idempotencia create
3. Categorías ABM + receptores → push/email al crear/cambiar estado
4. Catálogo simple (artículos) → `source=catalog`

### Track B — Canal Alarma
1. UX U 1–2 toques: categoría (o default pánico) → nota/foto opcional → GPS → confirmación con **#número**
2. Cancelar / actualizar solo con transiciones válidas + motivo
3. Listado U “mis reportes/alarmas” = pedidos propios filtrables `source=alarm`
4. Sin señal: no fingir éxito; cola offline mínima (default ADR-GAPS) o bloqueo claro

### Track C — Mapa admin (**MVP**)
1. Mapa con pins por categoría/color
2. Click → detalle pedido + acciones (tomar / cerrar / falsa alarma)
3. Filtros categoría · estado · fechas
4. Empty states: sin geo / sin pedidos

---

## DoD

- [x] Pánico U crea Pedido `source=alarm` con geo (si permiso) y número visible
- [x] Seguimiento U = mismos estados que pedido de catálogo
- [x] Admin: bandeja unificada + **mapa por categoría** operativo
- [x] Caps on/off; cero `Emp_Id` hardcode
- [x] Belgrano / admin externo frágil **no** portados
- [x] Tests: create alarm→pedido, transición, mapa geo filter, tenant isolation
- [x] Smoke DEMO: alarma → aparece en mapa A → cierre

> **Cerrada código 2026-07-30.** Seed: `node src/scripts/seedOla25ForTenant.js DEMO`.

---

## Diferido (postdev / otra ola)

- Stock/ERP, SLA fino, escalamiento por tiempo, IA clasificación
- Integración 911 / emergencias externas
- Labels Emp60 → **24/39**
- Portal agentes → **43**

## Postdev cerrado 2026-07-30 (gaps menores)

- Foto obligatoria en canal alarma
- ABM receptores por categoría (push + **email**)
- Mapa/bandeja: filtro **categoría** + **desde/hasta**
- Cola offline alarma (geo+foto → sync al recuperar red)
- Email **además** de push en create/cambio de estado
