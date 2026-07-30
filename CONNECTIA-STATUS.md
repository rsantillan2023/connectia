# Connectia — Tablero de avance (local)

> Actualizado: **2026-07-29** · Fuente funcional: `ECRMOBILE-FUNCIONES-CONSOLIDADO.md` · Spec Supervisor: `CONNECTIA-OLA31-OLA32-SPEC.md` · Stack ref: `HIRYX-SAAS`
>
> **Repo Git:** después. Ahora todo el trabajo queda en `C:\Users\lenovo\Documents\SUPERVISoRVIRTUAL`.

## Cómo usar este tablero

1. Trabajá **punto por punto** (ID `E0.01`, `01.03`, …).
2. Actualizá columnas en **`CONNECTIA-STATUS.csv`** (Excel/Sheets) o en las tablas de este MD.
3. Recalculá el resumen (sección siguiente) cuando cierres un lote.
4. Al pedirle a Cursor: *Implementá el punto `ID` … marcá estados al terminar*.

### Leyenda de estados

| Campo | Valores | Significado |
|-------|---------|-------------|
| **estado_dev** | `pendiente` · `en_curso` · `desarrollado` · `bloqueado` · `diferido` · `descartado` | Código U/A/S del punto |
| **estado_config** | `n/a` · `pendiente` · `en_curso` · `configurado` · `diferido` | Datos/admin/capabilities/env listos |
| **estado_global** | ver abajo | Estado que usás para medir avance |

**estado_global (semáforo de avance):**

| Valor | Cuándo marcarlo |
|-------|-----------------|
| `pendiente` | No empezó |
| `en_curso` | Hay PR/rama o sesión activa |
| `desarrollado` | Código listo; config aún no (o n/a pendiente de verificar) |
| `configurado` | Solo config (raro; suele ir con desarrollado) |
| `desarrollado_y_configurado` | Dev OK + seed/admin/capability OK en local |
| `review` | Esperando prueba humana |
| `cerrado` | DoD OK: criterios § + sin hardcode Emp_Id + probado en local |
| `bloqueado` | Falta dependencia externa / decisión |
| `diferido` | Fuera de MVP (fase 2+) |
| `descartado` | No se hace (Belgrano, etc.) |
| `transversal` / `meta` | Se cumple en todos los módulos / inventario |

> **Ola `cerrada` vs inventario:** una ola puede estar **cerrada** (no falta desarrollo de núcleo) aunque queden ítems de **postdesarrollo** (QA smoke, config fina, docs). Esos van al final del doc, sección *Postdesarrollo*.

### Regla DoD de un punto `cerrado`

- [ ] `estado_dev=desarrollado`
- [ ] `estado_config=configurado` **o** `n/a`
- [ ] Criterios de aceptación del § aplicables al punto
- [ ] Sin `if Emp_Id` hardcode
- [ ] Probado en local (U y/o A según capa)
- [ ] Entonces `estado_global=cerrado`

### Stack a copiar (después / local)

| De Hiryx (`HIRYX-SAAS/aitalent-saas`) | En Connectia local |
|--------------------------------------|--------------------|
| `frontend/` Vue 3 + Vite + Pinia + Vue Router + Tailwind | App **U** (PWA) |
| (mismo patrón) | App **A** admin (segundo front o mode) |
| `backend/` Node.js + MongoDB | API **S** |
| Patrones auth JWT, estructura services/routes | Misma familia; **dominio Connectia**, no pantallas Talent |

> **Importante:** no modificar Hiryx. Solo copiar patrones/deps al crear carpetas bajo SUPERVISoRVIRTUAL.

---

## Resumen de avance

**Total de puntos:** 598

| estado_global | Cantidad | % |
|---------------|----------|---|
| `pendiente` | 470 | 78.6% |
| `diferido` | 49 | 8.2% |
| `cerrado` | 29 | 5.5% |
| `desarrollado_y_configurado` | 26 | 4.3% |
| `meta` | 10 | 1.9% |
| `desarrollado` | 8 | 1.5% |
| `en_curso` | 5 | 0.9% |


| Módulo | Puntos | Pendientes | Cerrados | Diferidos | % cerrado* |
|--------|--------|------------|----------|-----------|------------|
| 0. Fundación local (stack Hiryx) | 20 | 0 | 20 | 0 | 100% |
| 1. Acceso, sesión e identidad | 22 | 0 | 9 | 7 | 60% |
| 2. Plataforma multi-empresa y seguridad | 13 | 1 | 0 | 0 | 0% |
| 3. Perfil y cuenta | 13 | 13 | 0 | 0 | 0% |
| 4. Contenido corporativo (muro, publicaciones, stories) | 22 | 0 | 0 | 10 | 0% |
| 5. Saludos automáticos | 7 | 0 | 0 | 0 | ~100%* |
| 6. Eventos y calendario | 12 | 0 | 0 | 12 | 100% |
| 7. Notificaciones push | 11 | 11 | 0 | 0 | 0% |
| 8. Chat y comunicación | 12 | 2 | 1 | 5 | ~58% |
| 9. Consultas / tickets | 16 | 16 | 0 | 0 | 0% |
| 10. Comentarios (moderación) | 8 | 0 | 5 | 3 | 38% |
| 11. Asistencia, turnos y marcación | 16 | 16 | 0 | 0 | 0% |
| 12. Ausentismos | 9 | 0 | 7 | 0 | 89% |
| 13. Licencias y vacaciones | 10 | 1 | 0 | 9 | 90% |
| 14. RRHH / legajo digital (PeopleCare) | 15 | 1 | 0 | 14 | ~93% |
| 15. Encuestas e inspecciones | 17 | 17 | 0 | 0 | 0% |
| 16. Onboarding | 9 | 1 | 0 | 8 | ~89% |
| 17. Documentos | 11 | 11 | 0 | 0 | 0% |
| 18. Beneficios, billetera y recompensas | 11 | 1 | 0 | 10 | ~91% |
| 19. Alarmas | 8 | 8 | 0 | 0 | 0% |
| 20. Pedidos internos | 7 | 7 | 0 | 0 | 0% |
| 21. Datos útiles / directorio / teléfonos | 9 | 9 | 0 | 0 | 0% |
| 22. Farmacias y horarios de terminal | 7 | 0 | 0 | 7 | — |
| 23. Supervisor comercial | 76 | 76 | 0 | 0 | 0% |
| 24. IA y QR | 12 | 6 | 0 | 6 | ~50%* |
| 25. Modo TV | 9 | 0 | 9 | 0 | 100% |
| 26. FAQs y tutoriales (centro de ayuda) | 8 | 1 | 0 | 0 | 88% |
| 27. ABM de configuración | 15 | 1 | 0 | 0 | ~93% |
| 28. Menú dinámico | 9 | 1 | 0 | 0 | 0% |
| 29. Reportes e informes | 19 | 3 | 15 | 1 | ~83%* |
| 30. Integraciones especiales | 15 | 15 | 0 | 0 | 0% |
| 31. WhatsApp / WTA, email, archivos y plataforma | 10 | 10 | 0 | 0 | 0% |
| 32. Gaps / no implementado o incompleto | 15 | 5 | 0 | 0 | 0% |
| 33. Mapa de integraciones con sistemas externos | 5 | 5 | 0 | 0 | 0% |
| 34. Reserva de salas, espacios y cocheras | 16 | 0 | 0 | 0 | ~100%* |
| 35. Coworking y puestos de trabajo | 19 | 0 | 0 | 0 | ~100%* |
| 36. Live streaming y broadcasts | 8 | 0 | 8 | 0 | 100% |
| 37. Organigrama | 7 | 2 | 5 | 0 | ~71%* |
| 38. Desarrollo de talento | 10 | 0 | 0 | 0 | ~90%* |
| 39. Cultura empresarial | 9 | 0 | 0 | 0 | ~90%* |
| 40. Políticas corporativas | 6 | 1 | 0 | 0 | 83% |
| 41. Workflows y motor de aprobaciones | 7 | 2 | 0 | 5 | ~70% |
| 42. Gestión de servicios (portal) | 7 | 7 | 0 | 0 | 0% |
| 43. Seguridad, privacidad y cumplimiento | 6 | 6 | 0 | 0 | 0% |
| 44. Deuda técnica a no migrar | 5 | 5 | 0 | 0 | 0% |
| 45. Modernización del producto | 5 | 5 | 0 | 0 | 0% |
| 46. Hub de accesos / enlaces (launchpad) | 10 | 10 | 0 | 0 | 0% |
| NR. Packs no-regresión clientes estratégicos | 5 | 5 | 0 | 0 | 0% |


\* % cerrado = cerrados / (puntos del módulo − diferidos/descartados/meta/transversal).

---

## Olas (estado)

> **Solo 3 estados de ola** (para no mezclar “hecho / hecha / núcleo cerrado”):
>
> | Estado | Significado |
> |--------|-------------|
> | **cerrada** | No falta desarrollo de núcleo. Si solo queda QA / smoke / documentación → **cerrada** (postdev → sección final) |
> | **parcial** | Hay avance usable, pero **falta desarrollo de núcleo** (no solo QA/smoke/docs) |
> | **no hecha** | Todavía no se empezó esa ola / módulo de ola |
>
> **Regla (2026-07-29):** QA, smoke o docs **no** mantienen una ola en `parcial`.

| Ola | Estado | Nota / pendiente |
|-----|--------|------------------|
| **0** Fundación | **cerrada** | 2026-07-27 · todos `E0.*` → `cerrado` |
| **1** Acceso | **cerrada** | 2026-07-28 · núcleo login/sesión OK; sin más desarrollo. Postdev → sección final |
| **+** Tema | **cerrada** | 2026-07-28 · `themeMode` + branding login/splash en núcleo §2. Postdev → sección final |
| **2** Tenant+menú | **cerrada** | 2026-07-28 · PLATFORM + CRUD tenants + menú dinámico. Sin más desarrollo de núcleo. Postdev → final |
| **3** Muro | **cerrada** | 2026-07-28 · feed/UGC/moderación IA. Stories/comentarios = diferidos. Postdev → final |
| **4** Solicitudes | **cerrada** | 2026-07-28 · núcleo + notif (§9.08). Jira/SAP/GeoPop → **Ola 40** (`40.c`–`40.g`). Postdev → final |
| **5** Encuestas+docs+hub | **cerrada** | 2026-07-27 · núcleo OK; CODESAC retirado; admin externo campo → **Ola 37** (add-on Relevamientos) |
| **6** Perfil (§3) | **cerrada** | 2026-07-28 · núcleo U/A/S: `03.01`–`03.08` (perfil, foto, password, campos extra, baja, dispositivos, actividad, PeopleCare stub). Postdev QA/DOC → sección final |
| **7** Push / avisos (§7) | **cerrada** | 2026-07-28 · núcleo U/A/S OK (bandeja, campañas, IA, programar día/hora, CSV, Web Push). Postdev QA/DOC → sección final. Push nativo descartado |
| **8** Saludos (§5) | **cerrada** | 2026-07-29 · Admin Usuarios: fechas nacimiento/ingreso + hitos customDates; seeds DEMO/ARCOR. Postdev QA/DOC |
| **9** Comentarios (§10) | **cerrada** | 2026-07-28 · núcleo U/A/S: comentarios en pub + bandeja A + IA sugiere + config tenant. Postdev QA/DOC. Análisis imagen/GIF + apelación → **Ola 40** |
| **10** Chat (§8) | **cerrada** | 2026-07-29 · núcleo texto 1:1 + grupos + moderación/retención + reacciones/menciones/anclados + buscador. Voz/video + resúmenes IA → **Ola 40** (`40.i`–`40.k`). Postdev QA/DOC |
| **11** Workflows (§41) | **cerrada** | 2026-07-29 · núcleo A/U/S: diseñador + IA (3 ejemplos) + bandeja unificada + enganche solicitudes/docs. Postdev QA/DOC |
| **12** Chatbot IA + KB + trámites (§24) | **cerrada** | 2026-07-29 · diálogos MVP A–E + booking + recibo→consulta RRHH. Recibos módulo → **Ola 40** `40.l` (docs naming DNI) |
| **13** Ayuda + Políticas (§26 · §40) | **cerrada** | 2026-07-28 · FAQs/tutoriales U+A + políticas con acuse + sync KB (`KbArticle`). Postdev DOC |
| **14** Perfil completo + Directorio (§3 · §21) | **cerrada** | 2026-07-29 · Legajo local + Directorio `21.*` (U/A/S). HRIS externo → **Ola 40** `40.m`. Sync persona → **41.A2**. Postdev smoke/DoD |
| **15** Eventos y calendario (§6) | **cerrada** | 2026-07-28 · núcleo U/A/S OK. Env calendario live → **Ola 42**. Postdev QA/DOC |
| **16** ABM configuración (§27) | **cerrada** | 2026-07-29 · núcleo A/S OK. Vault IdP por tenant → **Ola 42**. Postdev QA/DOC |
| **17** Licencias / vacaciones / ausentismos (§13 · §12) | **cerrada** | 2026-07-28 · núcleo + adapter ECR mock. Live ECR → **Ola 42** |
| **18** Asistencia, turnos y marcación (§11) | **cerrada** | 2026-07-30 · núcleo + QR cámara · gaps producto = — (sync live → **24** `NR.ECR`) |
| **19** Legajo PeopleCare + Onboarding (§14 · §16) | **cerrada** | 2026-07-29 · núcleo OK · UX/UI claridad U+A hecha 2026-07-30 · Sammy onboarding solo en **40.n** |
| **20** Beneficios / billetera / recompensas (§18) | **cerrada** | 2026-07-28 · admin tipología/wizard + **Cómo llegar** (Maps Directions) 2026-07-30. Gaps producto = —. PSP/retiro/KYC → **40.u–w** CAPRICHO · Claro → **24** |
| **21** Reservas + coworking (§34 · §35) | **cerrada** | 2026-07-29 · núcleo OK. **2026-07-30:** activos reservables genéricos + UX U/A (gaps = —). Plano `40.s` · bundle `40.t` → Ola 40. Postdev QA/DOC |
| **22** Organigrama + Reportes (§37 · §29) | **cerrada** | Estructura + informes núcleo |
| **23** Seguridad / privacidad (§43) | **no hecha** | **IMPRESCINDIBLE** · gate go-live (consentimientos, retención, export/borrado, logs) |
| **24** Paridad por cliente (no-regresión) | **no hecha** | **IMPRESCINDIBLE** · Claro, Grido/Gridonet, ECR, EPEC, Emp60 · detalle [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md) |
| **25** Operaciones campo (§19 · §20) | **cerrada** | 2026-07-30 · Pedido único + canal alarma + mapa MVP · Emp60 → **24/39** · [`CONNECTIA-OLA25-SPEC.md`](./CONNECTIA-OLA25-SPEC.md) |
| **31** Supervisión comercial (testigo completo) | **cerrada** | Postdev 2026-07-29 · offline/XLSX/taxonomía/permisos/IA |
| **32** Supervisor Virtual de equipo | **cerrada** | 2026-07-29 · TeamScope + composer muro/evento/notif/chat |
| **33** Integración Rendi / DocuFlow (viáticos) | **no hecha** | Ola especial · producto hermano Sooft · no reimplementar motor |
| **34** Puente Hiryx → Connectia (ingreso) | **no hecha** | Ola especial · seleccionado en Hiryx nace en Connectia |
| **26** TV + Live (§25 · §36) | **cerrada** | 2026-07-30 · Track A+B · DoD TV + live URL · ingest nativo diferido · ≠ Ola 36 |
| **27** Talento + Cultura (§38 · §39) | **cerrada** | 2026-07-29 · núcleo U/A/S: OKR, desempeño, carrera, LMS, vacantes, reconocimientos, marketplace, referidos, pulso. Postdev QA/DOC |
| **28** Centro de comunicaciones (`28.COM.*`) | **cerrada** | 2026-07-30 · tipos/plantillas IA/wizard/outbox email·WA·SMS · testigo Hiryx · packs → **24** · secretos → **42** |
| **29** Chat conversacional (`29.CONV`) | **cerrada** | 2026-07-30 · trámites 100% hablados. Sammy/contenido/carga/QR → **Ola 40** (`40.n`–`40.r`) |
| **30** Modernización UX residual (§45) | **parcial** | Spec Fases 0–4 · piloto Admin sticky lila · faltan primitivas + companion + resto A/`*.UX` |
| **35** Licenciamiento modular (PLATFORM) | **cerrada** | 2026-07-30 · selector packs + `licensedCapabilities` + candado Comunidad |
| **36** Mejoras referenciadas (backlog) | **cerrada** | 2026-07-30 · MVP a–n + **36.p** Connectyx |
| **37** Relevamientos de campo (add-on) | **cerrada** | 2026-07-30 · núcleo + `.14` · `.12` fuera · pregunta-API → **Ola 40** (`40.h`) |
| **38** Padrón IdP (miembros) | **no hecha** | Origen Google/Entra + dominio/grupo + sync/JIT · reusa ola 1+16 |
| **39** Textos por comunidad (locale + labels) | **parcial** | Stub `uiLocale`/modismos · falta motor keys/overrides · ex-40 · `39.LOC.*` |
| **40** Deseables / caprichos (otro MVP) | **no hecha** | `40.a`–`40.z` · Sammy `40.n` · plano/bundle `40.s`/`40.t` · billet. `40.u`–`40.w` CAPRICHO · quiet hours `40.x` DESEABLE · historial/org `40.y`/`40.z` CAPRICHO · `40.o`–`40.r` CAPRICHO |
| **41** Coherencia entre módulos | **no hecha** | `41.A1`–`41.B2` · base canvas coherencia · retomar cuando se priorice |
| **42** Secrets / env / vault (ops) | **no hecha** | Checklist env/vault de integraciones ya hechas · **no** es desarrollo de producto |
| **43** Portal de servicios (§42) | **cerrada** (núcleo) | Catálogo + agentes + SLA · postdev QA/docs · [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md) |

### Reciente (2026-07-30 · Ola 25 en seeds)

- `seedPedidosForTenant` en DEMO (`seed.js`), ARCOR y alta de comunidad (`seedGenericTenant` si pack/caps incluyen `pedidos`, p. ej. pack **todo**).
- Script: `node src/scripts/seedOla25ForTenant.js [CODE]`.

### Reciente (2026-07-30 · Ola 28 cerrada)

- Centro de comunicaciones (`28.COM.*`): Admin `/comunicaciones` · API `/api/admin/communications` · WA webhook · tests OK.
- Spec legado enlazada (§31 email · §30.08 WTA · §44 D09).
- Secretos prod → **Ola 42**.

### Reciente (2026-07-30 · Ola 28 = Centro de comunicaciones)

- **Ola 28** redefinida: ya no es “integraciones mezcladas §30/§31/§33”.
- Núcleo = **`28.COM.*`** centro de comunicaciones de plataforma (paridad Hiryx: tipos, plantillas + IA, wizard, email/WA/SMS, outbox).
- Testigo: `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas`.
- **Fuera de 28:** `30.01`–`30.07` packs/custom → **Ola 24** `NR.*` · `30.10` SAP → **Ola 40** `40.f` · Jira ya en `40.c`–`40.e` · Maps residual no bloquea · inventario §33 = doc · secretos → **42**.
- Prioridad sube a **IMPRESCINDIBLE**.

### Reciente (2026-07-30 · Ola 25 postdev gaps)

- Foto obligatoria en `/alarma`.
- Categorías A: multi-select **receptores** (quién recibe aviso).
- Mapa/bandeja: filtros categoría + fechas desde/hasta.
- Cola offline: captura GPS+foto y envía al volver online.
- Notify: **email + push** (no solo fallback).

### Reciente (2026-07-30 · Ola 25 cerrada)

- Pedidos de campo: dominio único `Pedido` + canal alarma (`source=alarm`) + catálogo.
- U: `/alarma` (pánico GPS) · `/pedidos` (catálogo).
- A: `/pedidos` bandeja + **mapa Leaflet por categoría** + ABM categorías/artículos.
- Caps `pedidos` / `pedidos.alarma` / `admin.pedidos`. Seed: `node src/scripts/seedOla25ForTenant.js DEMO`.
- Tests `pedidos.test.js`. Spec: [`CONNECTIA-OLA25-SPEC.md`](./CONNECTIA-OLA25-SPEC.md). Emp60 labels → **24/39**.

### Reciente (2026-07-30 · Ola 25 spec)

- **ADR:** Alarma = canal de Pedido (`source=alarm`); un solo dominio §20.
- **Mapa admin por categoría = DoD MVP** (no diferido).
- **Emp60 labels fuera** de esta ola → **24** `NR.EMP60` + **39**.
- Spec: [`CONNECTIA-OLA25-SPEC.md`](./CONNECTIA-OLA25-SPEC.md). `41.M3` Alarma↔Pedido cerrado; §9 vs Portal → D43-1.

### Reciente (2026-07-30 · Ola 43 Portal de servicios)

- Núcleo MVP: `ServiceArea` · `ServiceCatalogItem` · `ServiceRequest` + caps `servicios` / `admin.servicios`.
- U `/servicios` · A `/servicios` (bandeja + ABM áreas/catálogo + SLA).
- Seed: `node src/scripts/seedOla43ForTenant.js DEMO`. Tests `servicios.test.js`.
- Spec: [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md). `41.M3` cerrado (D43-1).

### Reciente (2026-07-30 · `41.M3` cerrado + Ola 43)

- Frontera Solicitudes · Pedidos · Portal **cerrada** (ADR-GAPS §E + D25-2 + D43-1). Spec: [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md).
- **Ola 43** desbloqueada (portal §42 · en desarrollo).

### Reciente (2026-07-30 · Split ola 23 → 23 seguridad + 43 portal)

- **Ola 23** queda solo **§43** Seguridad/privacidad (**IMPRESCINDIBLE** · gate go-live).
- Portal / catálogo / agentes (**§42**) → **Ola 43** (NECESARIO · según demanda).

### Reciente (2026-07-30 · Ola 42 secrets/env)

- Credenciales / env / vault (Outlook·Google Calendar, Directory Workspace/Entra, ECR ausentismos/supervisores, Serper, SSO, mail, VAPID, IA, vault IdP) **salen de gaps de producto** de olas **15·16·17·31**.
- Nueva **Ola 42** (ops): cablear prod/staging; código ya existe. Olas 15/16/17/31 gaps producto = —.

> **Cobertura:** olas **12–32** = catálogo restante · **33–34** = Rendi/Hiryx · **37** = Relevamientos · **38** = padrón IdP · **39** = textos · **40** = deseables · **41** = coherencia · **42** = secrets/env ops · **43** = portal servicios. Spec: *Olas 12–43*. Transversales §44/§45 en todas.

### Roadmap post–Ola 12 (orden · actualizado 2026-07-30)

| # | Ola | Tema | Spec | Prioridad |
|---|-----|------|------|-----------|
| 1 | **22** | Organigrama + Reportes | §37 · §29 | Alta |
| 2 | **23** | Seguridad / privacidad (gate) | §43 | **IMPRESCINDIBLE** |
| 3 | **43** | Portal de servicios | §42 · OLA43-SPEC | NECESARIO · `41.M3` ✓ |
| 4 | **24** | Paridad por cliente (NR) | NR.* · [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md) | **IMPRESCINDIBLE** |
| 5 | **25** | Pedidos + canal alarma + mapa | [`CONNECTIA-OLA25-SPEC.md`](./CONNECTIA-OLA25-SPEC.md) | Bajo demanda · spec lista |
| 6 | **31** | Supervisión comercial (testigo) | §23 + ECR | Vertical · `sooft-*-supervisores` |
| 7 | **32** | Supervisor Virtual de equipo | `23.SV.*` | Producto Connectia |
| 8 | **26** | TV + Live | §25 · §36 | Bajo demanda |
| 9 | **27** | Talento + Cultura | §38 · §39 | ~~Bajo demanda~~ **cerrada** |
| 10 | **28** | Centro de comunicaciones | `28.COM.*` · testigo Hiryx | **IMPRESCINDIBLE** |
| 11 | **29** | Chat conversacional asistente | `29.CONV` | **cerrada** 2026-07-30 |
| 12 | **30** | Modernización §45 | §45 residual | Continuo |
| 13 | **33** | Integración Rendi (viáticos/rendiciones) | `33.RENDI.*` | Especial · bajo demanda comercial |
| 14 | **34** | Puente Hiryx → Connectia (ingreso) | `34.HIRYX.*` | Especial · bajo demanda · reusa ola 19 |
| 15 | **37** | Relevamientos de campo (add-on) | `37.REL.*` | Add-on · bajo demanda ECR/campo · ≠ ola 5 |
| 16 | **38** | Padrón IdP (miembros) | `38.PAD.*` | UX unificada · filtro grupo · reusa 1+16 |
| 17 | **39** | Textos por comunidad (locale + labels) | `39.LOC.*` | Multi-país · Emp60 · stub uiLocale/modismos · ex-40 |
| 18 | **40** | Deseables / caprichos | `40.a`–`40.z` | Otro MVP · Sammy DESEABLE · billet. `40.u`–`w` · quiet `40.x` · org `40.y`/`z` |
| 19 | **41** | Coherencia entre módulos | `41.*` · canvas coherencia | Deuda de fronteras/sync · NECESARIO |
| 20 | **42** | Secrets / env / vault (ops) | `42.cal.*` · `.env.example` | Config productiva · no desarrollo |

> Olas **8** y **12–17 / 19–21** · **35** cerradas — tablero: `CONNECTIA-OLAS.md`.

### Pendiente inmediato (prioridad)

1. **Ola 23** — **IMPRESCINDIBLE:** seguridad/privacidad §43 (gate go-live). Portal → **43**.
2. **Ola 24** — **IMPRESCINDIBLE:** paridad por cliente (NR) · [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md).
3. **Ola 43** — Portal de servicios (§42) · `41.M3` cerrado · [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md).
4. Según demanda: **37** Relevamientos · **39** textos/labels · **41** coherencia (resto) · **42** secrets/env.
5. **Ola 33** — Integración Rendi (viáticos) cuando haya demanda comercial / cliente con gastos a rendir.
6. **Ola 34** — Puente Hiryx → Connectia cuando el cliente recluta con Hiryx y opera la comunidad en Connectia.
7. **Ola 39** — Locale + labels (AR/CL/BR y/o Emp60) cuando haya expansión multi-país o NR.
8. **Ola 41** — Coherencia restante (A1–A4 · M2 · M4 · B2); **41.M3** cerrado.
9. **Ola 42** — Cablear env/vault (calendario, Directory, ECR, SSO, mail, push, IA) en prod/staging.
9. **Postdesarrollo** (QA/smoke/docs) olas cerradas — sección final · incluye Ola 18 vertical · Ola 35.

### Reciente (2026-07-30 · Sync Geopop/ECR/GeoVictoria → Ola 24 `NR.ECR`)

- Sync productivo Geopop, API ECR externa y adapter GeoVictoria salen de gaps de ola **18**; pasan a **Ola 24** pack `NR.ECR`.
- Ola 18 gaps producto = — · vertical local (mock/local) sigue cerrado. Credenciales live → **Ola 42** cuando exista el adapter.

### Reciente (2026-07-30 · Ola 20 Cómo llegar / Maps Directions)

- **Google Maps Directions** implementado: `directionsUrl` / `mapsUrl` en serialize · botón **Cómo llegar** en ficha (con geoloc origen) · link en mapa Leaflet y cards.
- Gaps producto ola **20** = —.

### Reciente (2026-07-30 · Ola 20 gaps → 40 CAPRICHO / 24 NR)

- **PSP bancario** · **retiro productivo** · **KYC/conciliación** → **Ola 40** `40.u` / `40.v` / `40.w` (**CAPRICHO**).
- **Pack NR Claro** → **Ola 24** `NR.CLARO`.
- Smoke/DOC **no** son gaps de producto (postdev operativo).

### Reciente (2026-07-30 · Ola 20 Admin UX + tipología)

- Gap admin beneficios entregado: **previews de imagen**, alta **paso a paso**, **tipos legado** (`offerType`).
- Spec: `CONNECTIA-OLAS.md` → *Ola 20 — Admin beneficios…*.

### Reciente (2026-07-30 · Ola 19 UX implementada)

- Claridad U+A: Tu ingreso, siguiente paso, labels ES, sin §15; menú legacy renovado vía `ensureOla19Menu`.
- Gaps ola 19 = — · Sammy no se lista en ola 19 (solo **40.n**).

### Reciente (2026-07-30 · Ola 19 UX review)

- Chatbot onboarding confirmado en **Ola 40** `40.n`.
- Diagnóstico UX/UI U+A: copy técnico, Bienvenida+egreso mezclados, admin con jerga/`§15`/estados EN. Spec: `CONNECTIA-OLAS.md` → *Ola 19 — Revisión UX/UI*.

### Reciente (2026-07-30 · Ola 21 gaps · activos + UX — **hechos**)

- Implementado: `SpaceResourceType` + `SpaceAttributeDef` · recursos con `typeId`/`attributes` · seed proyector/herramienta/locker · filtros U por atributo.
- UX: U `/espacios`·`/oficina` · A `/reservas` (wizard tipos/recursos + recorrido Sedes→…→Pendientes).
- Gaps producto ola **21** = **—**. Plano `40.s` · bundle `40.t` siguen en Ola 40.

### Reciente (2026-07-30 · Ola 30 · vistas admin tema oscuro/claro)

- Barrido de ~49 vistas/componentes: hex claros (`#fff`/`#64748b`/borders slate) → tokens `--panel`/`--ink`/`--line`.
- CSS global `.admin-main` ampliado (cards, tabs, tables, modales).
- Shell header + modal Funciones + login respetan `data-theme`.

### Reciente (2026-07-30 · Ola 30 · pantallas = prototipo Hiryx · oscuro default)

- Tokens del prototipo `hiryx-prototipo.html` en `admin/src/style.css` (oscuro default · claro opt-in).
- Tipografía Space Grotesk + IBM Plex; toggle Claro/Oscuro en header Admin.
- MainLayout no se rediseña acá: solo el estilo de **pantallas** / área `.admin-main`.

### Reciente (2026-07-30 · Ola 30 · Reportes = patrón Resumen)

- `/reportes` alineado al Dashboard Resumen: `AdminPageHeader` · tabs sticky · franja alertas · lectura rápida · donut/pipeline · tablas en paneles · tokens oscuro/claro. Lógica de export/boost/live intacta.

### Reciente (2026-07-30 · Ola 30 · Dashboard = Resumen testigo)

- `DashboardView` rediseñado al patrón Resumen Hiryx: franja de alertas con barra de color · panel «Novedades operativas» · donut composición · pipeline de trámites · CTA header · tokens oscuro/claro.

### Reciente (2026-07-30 · Ola 30 · chatbot Admin respeta tema oscuro)

- Rail / FAB / modal maximizado usan tokens `--panel` · `--ink` · `--brand` (sin `bg-white`/`gray-*` fijos).

### Reciente (2026-07-30 · Ola 30 · KB producto Admin JSON = contexto Hiryx)

- Paridad Hiryx `aitalentKnowledgeBase`: JSON `backend/src/data/connectiaAdminKnowledgeBase.json` + `connectiaAdminKnowledge.js` (búsqueda/equivalencias/contexto LLM).
- Canal `a`: respuestas “cómo/dónde” usan product KB (+ artículos tenant `/asistente-kb`); `polishAssistantAnswer` recibe `productKb` como contexto.

### Reciente (2026-07-30 · Ola 30 · chatbot Admin UX = Hiryx)

- Controles paridad Soofia: header blanco · reiniciar · maximizar (modal Teleport) · reducir/colapsar · rail vertical «ASISTENTE — ¿Necesitás ayuda?» · FAB abre maximizado · Escape/click fuera cierra modal.
- Ayudas rápidas + burbujas con avatar; KB sigue en `channel=a`.

### Reciente (2026-07-30 · Ola 30 · chatbot Admin = KB real)

- `AdminShellChatbot` deja de ser stub: llama `/api/assistant` con `channel=a` (hilos separados del asistente U).
- Backend: `assistantAdminHints` (navegación Admin + remap `/docs`→`/documentos`, etc.) · saludo/hints Admin · sin mutaciones U desde el panel.
- Seed KB: guías Admin (usuarios, KB, solicitudes). ABM sigue en `/asistente-kb`.

### Reciente (2026-07-30 · Ola 30 · AdminShell = MainLayout Hiryx)

- Admin deja el aside oscuro fijo: header blanco · chatbot izquierdo colapsable · sidebar derecho hover · modal Funciones · FAB ayuda.
- Componentes: `AdminShellChatbot`, `AdminFunctionsModal`; Font Awesome CDN; sticky lila de página se mantiene.
- Spec Fase 1 actualizada: layout completo ≠ solo barra de título.

### Reciente (2026-07-30 · Ola 30 · spec Fases 0–4 + piloto Admin Hiryx)

- Spec en `CONNECTIA-OLAS.md` → *Ola 30 — Definiciones*: Fase 0 contrato visual · Fase 1 Admin sticky lila · Fase 2 primitivas · Fase 3 companion U · Fase 4 `*.UX` reales.
- Código piloto Fase 1: `AdminPageHeader` / `AdminPage` · shell Hiryx · migradas Dashboard/Usuarios/Solicitudes/Beneficios/Eventos/Legajos/Datos útiles.
- Orden: header Admin → primitivas → top vistas A → companion U → resto `*.UX`.

### Reciente (2026-07-30 · Ola 30 · solo §45 · carnet hecho)

- Sacados de ola **30**: §44 y “cierre de diferidos” (no útiles como ítems de ola).
- `32.03` Turno carnet → tipo solicitud `turno_carnet` (seed DEMO/genérico/ARCOR + script `seedTurnoCarnetType.js`).
- Ola **30** = únicamente modernización UX residual (§45).

### Reciente (2026-07-30 · Ola 30 · §32 vaciada)

- `32.05` → **25** (mapa) · `32.09` → **20** · `32.03` → **4** · `32.07`/`32.10` → **42** · `32.04` → **43** · `32.06` → **24** `NR.EPEC`.
- Ola **30** queda solo §45 · §44 · diferidos.

### Reciente (2026-07-30 · Ola 30 · grupo A fuera)

- Sacados del alcance ola **30** (siguen en su ola destino): recibos `40.l` · Jira/SAP/GeoPop `40.c`–`40.g` · voz/video/IA `40.i`–`40.k` · stories → muro §4 · packs → **24**.
- Ola 30 queda higiene: sustituir/descartar huérfanos §32 · §45 · §44 · diferidos.

### Reciente (2026-07-30 · Ola 29 · `29.CONV` cerrada)

- Trámites 100% hablados: sin confirm-card ni chips mid-thread; slot-filling vacaciones/ausencias; confirmación “sí/no” en el chat.
- Fix post-cierre: intent “quiero hacer un trámite”; **sin polish LLM** en turnos de borrador/confirmación (no reescribe el diálogo); cancelar/confirmar hablados sin pending.
- Sammy/contenido/carga/QR siguen en **Ola 40**.

### Reciente (2026-07-30 · Sammy/contenido/QR → Ola 40)

- Modos Sammy (`40.n`) = **DESEABLE**; asistente contenido (`40.o`), carga (`40.p`), QR vista (`40.q`), QR DNI (`40.r`) = **CAPRICHO** (por debajo de deseable).
- Salen de ola **29**; ola 29 queda solo `29.CONV` (IMPRESCINDIBLE).

### Reciente (2026-07-30 · Ola 29 · chat conversacional IMPRESCINDIBLE)

- Feedback demo: el asistente (ola 12) obliga a chips/confirm-card; target = trámite **hablado** multi-turno (`29.CONV`).
- Ola **29** prioridad **IMPRESCINDIBLE** · alcance = solo conversacional (Sammy/QR movidos a 40).

### Reciente (2026-07-30 · PeopleCare/HRIS → Ola 40 `40.m`)

- Conector HTTP a PeopleCare / HRIS externo sale de gaps de ola **14**; pasa a **deseable Ola 40** `40.m` (otro MVP).
- Ola 14 gaps producto = — · núcleo sigue **legajo 100% local**. Sync Perfil·Legajo·Directorio → **41.A2**; naming `peopleCareEnabled` → **41.B2**. Postdev = smoke/`21.QA`/`21.DOC`.

### Reciente (2026-07-30 · Recibos → Ola 40 `40.l`)

- Decisión: recibos de sueldo = **Documentos §17** con naming `{dni}_{clave}_{periodo}.pdf` (ej. `30111222_dsad_2026-03.pdf`); no greenfield de nómina.
- Sale de gaps ola **12** y de alcance ola **30**; `32.01` → deseable **Ola 40** `40.l`. Chatbot hoy sigue con fallback consulta RRHH.

### Reciente (2026-07-30 · Ola 10 → Ola 40 deseables)

- Chat voz (`08.02`→`40.i`), video (`08.03`→`40.j`) y resúmenes/transcripción IA (`08.07` IA→`40.k`) salen de gaps de ola 10; pasan a **deseables Ola 40** (otro MVP).
- Ola 10 gaps = — · `08.07` buscador queda en núcleo.

### Reciente (2026-07-29 · Ola 8 Saludos — cierre)

- Admin `/usuarios`: paso **Fechas / hitos** (nacimiento, ingreso, cargo, `customDates`).
- Seeds DEMO + ARCOR: `seedOla8ForTenant` (reglas + tipos `promocion`/`fin_prueba` + fechas en usuarios).
- Ola **8** → **cerrada**.

### Reciente (2026-07-29 · Ola 21 Reservas + coworking — tablero)

- Confirmado en código: U `/espacios`·`/oficina`, A `/reservas`, APIs `spaces`/`admin/spaces`, seed, tests.
- Ola **21** marcada **cerrada** (el inventario §34/§35 estaba desactualizado en `no hecha`).

### Reciente (2026-07-29 · Ola 32 postdev)

- Admin equipos: selectores área/grupo/cliente/personas + intersección área∩cliente + edición.
- Composer: `POST /team/compose/survey` y `/doc` reales (Survey con mode users; DocItem al equipo).
- Ficha + timeline: ausencias, licencias y tareas abiertas del alcance.
- Survey schema admite `audience.mode=users`.

### Reciente (2026-07-29 · Ola 32 Supervisor Virtual de equipo)

- Cap `supervision.equipo*` + menú U `/mi-equipo` + admin `/equipos`.
- Modelo `TeamScope` (área/grupo/personas/cliente, N equipos, refresh miembros).
- Composer: muro, evento, aviso push, chat; encuesta/docs → audience `users` precargada.
- Hub + ficha + timeline. Seed: `node src/scripts/seedOla32ForTenant.js DEMO`. Tests `teamScope.test.js`.

### Reciente (2026-07-29 · Ola 31 acciones masivas UI)

- U `/supervision/tareas`: modo Masivas — asignar, prioridad, plazo, iniciar, completar, cancelar (confirmación).
- S `POST /api/supervision/tareas/bulk` + filtros q/prioridad/sala. Tests bulk en `supervisionTasks.test.js`.

### Reciente (2026-07-29 · Ola 31 postdev completo)

- Taxonomía: categorías, pilares, mediciones, items, pilares-mediciones, subcadenas, templates-estados, geo.
- Imports XLSX ABM + plantillas descarga; `permisos_config` por rol en admin.
- Offline: cache GET + cola + `/sync`; config i18n es/en + install PWA; hub KPIs + IA heurística.
- Adjuntos CRUD + observaciones por medición. Tests `supervisionPostdev.test.js`. Ola 31 → **cerrada**.

### Reciente (2026-07-29 · Ola 31 núcleo supervisión)

- U: `/supervision` hub, tareas, mis tareas, crear, detalle (checklist+foto), ECR marcas/domingos (mock si no hay env).
- A: `/supervision` ABM cadenas/clientes/salas/asignaciones/plantillas/roles.
- S: modelos `Sup*`, APIs `/api/supervision/*` + `/api/admin/supervision/*` + BFF ECR; notify push+email.
- Caps: `supervision.comercial`, `supervision.ecr`, `admin.supervision`. Seed: `node src/scripts/seedOla31ForTenant.js DEMO`.
- Tests: `supervisionTasks.test.js` + smoke. Postdev: offline, XLSX, pilares.

### Reciente (2026-07-29 · ADR Supervisor Virtual cerrados)

- **Ola 31:** Operario=4 · push+email · dominio en Connectia (BFF solo ECR) · móvil primero · aviso al empleado en ECR.
- **Ola 32:** equipo armable por **área / área+cliente / grupo / personas a mano** (combinable) · N equipos · MVP muro+notif+eventos · supervisado solo recibe · sin RRHH sensible · **en paralelo** a 31.
- Spec: `CONNECTIA-OLA31-OLA32-SPEC.md` (ADR-D31-* / ADR-D32-* resueltos).

### Reciente (2026-07-29 · Ola 34 Puente Hiryx — spec)

- Nueva **ola especial**: al **seleccionar / confirmar ingreso** en Hiryx, el candidato nace como miembro Connectia (invite, legajo, onboarding).
- IDs `34.HIRYX.*` · repo Hiryx: `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas`.
- Reusa ola 19 (onboarding/PeopleCare); **no** clona el ATS.

### Reciente (2026-07-29 · Ola 33 Integración Rendi — spec)

- Nueva **ola especial** de integración con producto hermano **Rendi (DocuFlow)** (`C:\Users\lenovo\Documents\docuflow`).
- Objetivo: viáticos/rendiciones de gastos con IA desde Connectia **sin reimplementar** el motor; IDs `33.RENDI.*`.
- Tablero: `CONNECTIA-OLAS.md` fila 33 · spec: sección Ola 33 en este doc.

### Reciente (2026-07-29 · Spec exhaustiva Ola 31+32)

- Doc: **`CONNECTIA-OLA31-OLA32-SPEC.md`** — dominio, APIs, offline, ECR, audiencia, TeamScope, checklist paridad.

### Reciente (2026-07-29 · Ola 32 Supervisor Virtual de equipo — spec)

- Nueva ola: el supervisor genera **elementos de la app Connectia** (pubs, eventos, agenda, notificaciones, etc.) **solo para sus supervisados** y **sigue su actividad**.
- IDs `23.SV.*` (capa de alcance / “mi equipo”); no reemplaza Ola 31 (tareas de campo).

### Reciente (2026-07-29 · Ola 31 Supervisión — spec)

- Clonados testigos `sooft-frontend-supervisores` + `sooft-backend-supervisores` (gitignored).
- §23 expandido (tareas, ABM, templates, roles, offline, push, panel ECR + `23.SV.*`).
- **Ola 25** queda solo alarmas/pedidos; supervisión comercial = **Ola 31**; equipo/alcance = **Ola 32**.

### Reciente (2026-07-29 · Ola 12 Asistente · cierre MVP)

- Diálogos A–E: recibo→consulta RRHH (módulo recibos → **Ola 40** `40.l`), saldo, vacaciones, combinado `saldo_y_solicitar_vacaciones`, KB.
- Booking conversacional sala/cochera/puesto + confirmación (`assistantBooking`).
- Seed DEMO: licencias + espacios + KB; chips U vacaciones/recibo/sala.
- Tests `assistantBooking.test.js`. Ola **cerrada**.

### Reciente (2026-07-28 · Ola 16 ABM configuración · núcleo)

- A: Roles, Parámetros, Categorías de pubs; Usuarios con Import CSV + sync Google/Entra (JSON).
- S: modelos `Role` / `TenantParam` / `PostCategory`; import CSV; directory sync; auditoría ABM; `User.roleIds`.
- Caps: `admin.roles`, `admin.parametros`. Tests `ola16Abm.test.js`.
- Estado ola **cerrada** (2026-07-29 · solo postdev QA/DOC · IdP vault).

### Reciente (2026-07-28 · Ola 12 Asistente · núcleo)

- U `/asistente`: chatbot con chips (solicitudes en curso, docs, KB); confirmación de trámites.
- S: `KbArticle`, `AssistantConversation`, intents + tools (requests/docs/KB/posts), IA opcional.
- A `/asistente-kb`: ABM base de conocimientos (`admin.ia`).
- API: `/api/assistant/*`, `/api/admin/kb`. Seed KB DEMO + menú Asistente.
- Tests: `assistantAi.test.js`.

### Reciente (2026-07-28 · Roadmap olas 12–30)

- Confirmado: olas 0–11 **no** cubren el consolidado completo.
- Agregadas **olas 12–30** (chatbot KB, ayuda/políticas, RRHH, reservas, NR, verticales, IA extendida, gaps).
- Spec de requisitos detallada en sección *Olas 12–30 — especificación de requisitos*.
- Sync: `CONNECTIA-ROADMAP.md` + `CONNECTIA-BUILD.md`. *(Ola 12 cerrada 2026-07-29.)*

### Reciente (2026-07-28 · Chat §8 · núcleo)

- U `/chat` + `/chat/:id`: bandeja, 1:1, grupos, adjuntos, polling, reacciones, anclar, denuncia, bloqueo.
- A `/chat-moderacion`: retención, denuncias (resolver/cerrar chat), stats.
- S: modelos `Chat`/`ChatMessage`/`ChatBlock`/`ChatReport`, `notifyChat` (in-app+push), upload, seed DEMO.
- Deseables → **Ola 40**: voz (`40.i`/`08.02`), video (`40.j`/`08.03`), resúmenes/transcripción IA (`40.k` / parte de `08.07`).
- Tests: `src/tests/chat.test.js`.

### Reciente (2026-07-28 · Comentarios §10 · núcleo)

- U: comentarios en detalle de publicación (`POST/GET /api/comments`), soft-delete propio.
- A: `/moderacion-comentarios` bandeja (riesgo, sugerencia, aprobar/ocultar/responder, aceptar/ignorar IA, export CSV) + config IA tenant.
- S: modelo `Comment`, `commentModerationAi` (heurística + OpenAI/Anthropic), `commentsModeration` en Tenant, cap `admin.comentarios`, seed DEMO.
- Tests: `src/tests/commentsModeration.test.js`.

### Reciente (2026-07-28 · Saludos §5 · núcleo)

- Admin `/saludos`: reglas cumpleaños / aniversario ingreso / aniversario laboral / fecha fija.
- Generador de reglas con IA (`POST /api/admin/greetings/ai-draft`); humano confirma.
- Motor + scheduler: crea **Post tipo `celebracion`** (idempotente por `greeting.runKey`).
- User: campos `fechaNacimiento`, `fechaIngreso`, `cargo` para plantillas `{{nombre}}` etc.

### Reciente (2026-07-28 · Workflows §41 · núcleo)

- Admin **Workflows** (`/workflows`): diseñador con wizard + **Crear con IA** desde caso de uso.
- Tres prompts de ejemplo canónicos: vacaciones, acceso a sistemas, publicar documento.
- App U **Aprobaciones** (`/aprobaciones`): bandeja unificada aprobar/rechazar + historial + deep link.
- Motor S: definiciones/instancias, enganche al alta de solicitudes y docs draft; capability `admin.workflows`.
- Seed DEMO: menú + 3 workflows ejemplo. Tests `workflow.test.js` OK.

### Reciente (2026-07-28 · Push §7 · cierre núcleo)

- Admin campañas: modal 20/80, crear con prompt IA, audiencia como publicaciones (todos / áreas-grupos / particulares).
- Programar por **día y/o hora** + atajos; confirmación antes de enviar/cancelar/programar.
- Seed notificaciones DEMO/ARCOR/THEFORK; menú Avisos + Notificaciones.
- Ola 7 marcada **cerrada** (núcleo). Fuera de alcance: OpenAPI formal. Push nativo FCM/Huawei descartado (no será útil).

### Reciente (2026-07-28 · Push §7 · `07.03`/`07.04`)

- Admin **Notificaciones** (`/notificaciones`): crear/editar/enviar/programar/cancelar campañas; audiencia o inactivos; in-app + push; mejorar copy con IA.
- Import CSV (plantilla) + export historial filtrado.
- Scheduler backend cada 60s para envíos programados; `lastLoginAt` en login.

### Reciente (2026-07-28 · Push §7 · `07.01`)

- App U `/avisos`: bandeja con filtros (todas / no leídas / leídas), paginación, marcar leída / todas, descartar, deep link al `href`.
- Campana en topbar + badge de no leídas; ítem **Avisos** en menú.
- API: `GET /api/notifications` (paginado + `unreadCount`), `GET /unread-count`.

### Reciente (2026-07-28 · Legajo RRHH local autónomo)

- **Decisión:** no hay API PeopleCare externa; expediente en `EmployeeLegajo`.
- **Modelo:** miembro (User) ≠ empleado (legajo opcional; legajo puede existir sin cuenta).
- **Admin:** pantalla `/legajos` + capability `admin.legajos`; ficha completa (domicilios, familiares, OS, bancarios, médica, contratos, carrera).
- **U:** `GET /me/peoplecare` lee legajo local; sin legajo muestra aviso y no bloquea perfil.
- **Comunidad:** toggle “Expediente RRHH en perfil” (sin baseUrl).

### Reciente (2026-07-28 · Perfil §3 · cierre núcleo `03.04`–`03.08`)

- **03.04** Campos adicionales: ABM admin `/organizacion` → Campos de perfil; U los completa en Mi perfil.
- **03.05** Baja: soft-disable + solicitud de eliminación (anonimización diferida); password + confirm.
- **03.06** Dispositivos: listar/blanquear push U + panel Cuenta en Usuarios A.
- **03.07** Actividad: login/logout/perfil/password/dispositivos; historial U y A.
- **03.08** PeopleCare stub: toggle en Comunidad; sección en perfil si enabled (sin HTTP externo).

### Reciente (2026-07-28 · Perfil §3)

- App U `/perfil` (Mi perfil): ver/editar nombre, apellido, teléfono.
- Foto/avatar: subir (crop 512), quitar.
- Cambio de contraseña (actual + nueva); cierra otras sesiones.
- Si cambia el email: código de 6 dígitos al mail nuevo antes de aplicarlo.

### Reciente (2026-07-27/28 · Ola 3 Muro)

- UGC desde app (`origin=member`) con cola admin.
- Análisis IA previo (solo UGC; políticas: media, groserías, spam, etc.).
- Rechazo con **motivo obligatorio** + notificación **email + push + in-app**.
- Admin `/publicaciones`: botón **Actualizar**; filtro **Activas**; UX lista; clonar; badges estado/tipo/formato; prioridad inline; cards UGC celeste/amarillo.

## Inventario exhaustivo por módulo

> Copia editable: **`CONNECTIA-STATUS.csv`** (separador `;`, UTF-8). Abrilo en Excel y filtrá por `modulo` / `estado_global`.

### 0. Fundación local (stack Hiryx)

*Fase: Epic 0 — Fundación*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `E0.01` | Scaffolding local Connectia (copiar stack Hiryx/Talent: Vue3+Vite+Pinia+Router+Tailwind… | U A S | `desarrollado` | `configurado` | `cerrado` |
| `E0.02` | Estructura monorepo local: /frontend (U), /admin (A), /backend (S), /docs — sin tocar H… | — | `desarrollado` | `n/a` | `cerrado` |
| `E0.03` | README local: cómo levantar U/A/S + Mongo en Docker | — | `desarrollado` | `n/a` | `cerrado` |
| `E0.04` | Variables de entorno ejemplo (.env.example) y secrets locales | S | `desarrollado` | `configurado` | `cerrado` |
| `E0.05` | Conexión MongoDB + índices base multi-tenant (empId) | S | `desarrollado` | `configurado` | `cerrado` |
| `E0.06` | Modelo Tenant/Empresa mínimo + seed tenant demo | S A | `desarrollado` | `configurado` | `cerrado` |
| `E0.07` | Modelo Usuario + roles/capabilities base | S | `desarrollado` | `configurado` | `cerrado` |
| `E0.08` | Middleware auth JWT access+refresh (ADR-GAPS §A) | S | `desarrollado` | `configurado` | `cerrado` |
| `E0.09` | Shell PWA U: layout móvil + desktop companion + router guards | U | `desarrollado` | `configurado` | `cerrado` |
| `E0.10` | Shell Admin A: layout + guards por capability | A | `desarrollado` | `configurado` | `cerrado` |
| `E0.11` | Design tokens base Connectia (CSS variables) + tipografía default | U A | `desarrollado` | `n/a` | `cerrado` |
| `E0.12` | Service worker / manifest PWA mínimo | U | `desarrollado` | `n/a` | `cerrado` |
| `E0.13` | Capa API client (axios) + manejo 401 refresh | U A | `desarrollado` | `configurado` | `cerrado` |
| `E0.14` | Feature flags / capabilities por tenant (premisa anti-hardcode) | S A | `desarrollado` | `configurado` | `cerrado` |
| `E0.15` | Menú dinámico stub + selector de funciones stub | U A S | `desarrollado` | `configurado` | `cerrado` |
| `E0.16` | Observabilidad local: request-id + logs estructurados | S | `desarrollado` | `n/a` | `cerrado` |
| `E0.17` | Script de progreso: contar estados en CONNECTIA-STATUS.csv | — | `desarrollado` | `n/a` | `cerrado` |
| `E0.18` | Checklist no-regresión: placeholders Claro/Grido/ECR/EPEC (sin implementar aún) | — | `desarrollado` | `configurado` | `cerrado` |
| `E0.19` | OpenAPI/Swagger interno CI (sin try-it público) — esqueleto | S | `desarrollado` | `n/a` | `cerrado` |
| `E0.20` | Política allowDesktop en shell (bloqueo total si false) | U S | `desarrollado` | `configurado` | `cerrado` |
### 1. Acceso, sesión e identidad

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `01.01` | Acceso por ID (sin mail corporativo) | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.02` | Login estándar | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.03` | Pre-login / validación previa | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.04` | Login Azure AD / Microsoft | U A S | `desarrollado` | `parcial` | `desarrollado` |
| `01.04b` | Login SSO Google | U A S | `desarrollado` | `parcial` | `desarrollado` |
| `01.04c` | Login SSO Okta (y similares OIDC) | U A S | `desarrollado` | `parcial` | `desarrollado` |
| `01.05` | Login por token | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `01.06` | Login externo (solo encuestas) | — | `fuera` | `fuera` | `fuera` | Descartado · no útil |
| `01.07` | Login legacy por empresa | U A S | `desarrollado` | `parcial` | `desarrollado` |
| `01.08` | Verificación en dos pasos (email) | U A S | `desarrollado` | `parcial` | `desarrollado` |
| `01.09` | Verificación SMS (Twilio) | U A S | `desarrollado` | `parcial` | `desarrollado` |
| `01.10` | Recuperación de contraseña | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `01.11` | Recordar / reanudar sesión | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.12` | Cierre de sesión | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.13` | Aceptar términos y condiciones | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.14` | Detección multi-tenant por host/usuario | U A S | `desarrollado` | `pendiente` | `desarrollado` |
| `01.15` | Selector de empresa | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `01.16` | Políticas de privacidad | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.17` | Términos y condiciones (consulta) | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `en_curso` |
| `01.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `cerrado` |
| `01.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `01.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `01.DOC` | OpenAPI / notas de contrato del módulo | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
### 2. Plataforma multi-empresa y seguridad

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `02.01` | CRUD empresas | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.02` | Dashboard estándar | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.03` | Dashboard Super Admin | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.04` | Guards de acceso | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.05` | Branding YOMOB / SOOFIA | U A S | `desarrollado` | `configurado` | `desarrollado` |
| `02.06` | Personalización visual del tenant (app móvil) — mejora de reingeniería | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.07` | Splash / bienvenida de marca al abrir la URL del tenant | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.08` | Imagen de fondo login | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `02.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` |
| `02.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `02.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `02.DOC` | OpenAPI / notas de contrato del módulo | U A S | `desarrollado` | `n/a` | `desarrollado` |
### 3. Perfil y cuenta

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `03.01` | Ver / editar perfil | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.02` | Foto de perfil | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.03` | Cambiar contraseña | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.04` | Datos adicionales de usuario | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.05` | Deshabilitar / eliminar cuenta | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.06` | Dispositivos registrados | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.07` | Historial de actividad | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.08` | Integración expediente en perfil (legajo local) | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `03.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` |
| `03.UX` | UX moderna móvil-primero revisada (§45) | U A S | `parcial` | `n/a` | `parcial` |
| `03.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `03.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 4. Contenido corporativo (muro, publicaciones, stories)

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `04.01` | Feed / muro de publicaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.02` | Ver publicación | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.03` | Búsqueda de publicaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.04` | Publicación por menú dinámico | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.05` | Tipos de publicación | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.06` | CRUD publicaciones (admin) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.07` | Publicar / mejorar contenido con IA | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.08` | Importación masiva de publicaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.09` | Layouts de card | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.10` | Comentarios en publicaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.11` | Votación / reacciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.12` | Stories | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.13` | Gestión del conocimiento | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.14` | Pre-home | U A S | `descartado` | `n/a` | `descartado` |
| `04.15` | Deep links / filtros externos | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.16` | Botonera inferior dinámica | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.17` | Calendario de publicaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.18` | Publicación de colaboradores (UGC) + moderación admin | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.19` | Análisis IA previo de UGC (sugerencia al admin) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.20` | Rechazo UGC con motivo + mail/push/in-app; filtro Activas; refresh admin | A S U | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `desarrollado` | `n/a` | `cerrado` |
| `04.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `04.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `04.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `en_curso` |
### 5. Saludos automáticos

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `05.01` | Saludos automáticos | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Motor + Post `celebracion` + scheduler |
| `05.02` | Configuración de saludos | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Admin `/saludos` + IA draft |
| `05.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `05.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | `admin.saludos` |
| `05.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` | Admin Usuarios fechas/hitos + muro celebración |
| `05.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/saludos` + Usuarios fechas |
| `05.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 6. Eventos y calendario

*Fase: Núcleo MVP · Ola 15 cerrada 2026-07-28*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `06.01` | Calendario corporativo | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | U `/agenda` lista + **vista mes** |
| `06.02` | Conectar calendario personal (Outlook / Google) — verlo en la app | U A S | `desarrollado` | `parcial` | `parcial` | OAuth PKCE listo; env live → **Ola 42** `42.cal.*` |
| `06.03` | Política tenant — habilitar Outlook / Google | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `calendar.outlook/google.enabled` |
| `06.04` | Vista unificada de agenda | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | capas + resumen “qué tengo hoy” |
| `06.05` | Confirmar / consultar asistencia | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | RSVP + push a personal |
| `06.06` | Eliminar asistencia | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | + borra copia externa |
| `06.07` | Reporte de confirmaciones | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | listado + email + **CSV** |
| `06.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `06.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | tenantId + audience + admin.eventos |
| `06.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` | Agenda mes/lista + detalle RSVP |
| `06.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/eventos` + upload imagen + IA draft |
| `06.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 7. Notificaciones push

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `07.01` | Centro de notificaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | U `/avisos` + badge; A `/notificaciones` |
| `07.02` | Registro de token push | U A S | `hecho` | `hecho` | `parcial` | Web Push + VAPID (no FCM/Huawei nativo) |
| `07.03` | Envío de notificaciones (admin) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Campañas + IA prompt + programar día/hora + audiencia |
| `07.04` | Importación / exportación push | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | CSV avanzado (opcional); flujo principal = IA |
| `07.05` | Proxy / envío push backend | U A S | `hecho` | — | `hecho` | `pushService` + dispatcher + scheduler 60s |
| `07.06` | Permisos y recepción in-app | U A S | `hecho` | — | `hecho` | Modal/banner + SW push |
| `07.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `07.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | Tenant + `admin.notificaciones` |
| `07.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` | U avisos + A modal 20/80 + confirmaciones |
| `07.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/notificaciones` |
| `07.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 8. Chat y comunicación

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `08.01` | Chat interno | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | U `/chat` 1:1 + adjuntos + push |
| `08.02` | Chat por voz | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.i` (WebRTC) |
| `08.03` | Chat por video | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.j` (WebRTC) |
| `08.04` | Chat grupal | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Crear grupo + historial |
| `08.05` | Moderación / retención de chat | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | A políticas + denuncias + bloqueo |
| `08.06` | Menciones, reacciones, mensajes anclados | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | @usuario + 👍 + pin |
| `08.07` | Buscador + resúmenes/transcripción IA | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Buscador OK; IA → **Ola 40** `40.k` |
| `08.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `08.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | tenantId + participante |
| `08.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` | Lista + hilo estilo WhatsApp |
| `08.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/chat-moderacion` |
| `08.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 9. Consultas / tickets

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `09.01` | Mis consultas | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.02` | Crear consulta | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.03` | Hilo de mensajes | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.04` | Bandeja CRM / admin | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.05` | Tipos, áreas y campos de consulta | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.06` | Novedades GeoPop | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.g` |
| `09.07` | Jobs SAP/ECR sobre consultas | S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.f` |
| `09.08` | Notificaciones de consulta | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.09` | Mis tickets Jira — soporte pendiente en la app | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.c` |
| `09.10` | Configurar integración Jira (admin tenant) + vínculo de usuario | A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.d` |
| `09.11` | Crear issue en Jira desde Connectia (opcional) | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.e` |
| `09.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `desarrollado` | `n/a` | `cerrado` |
| `09.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `09.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `09.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `09.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `en_curso` |
### 10. Comentarios (moderación)

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `10.01` | Moderación de comentarios | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `10.02` | Análisis automático con IA + sugerencias al administrador | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `10.03` | Configuración de moderación IA (admin tenant) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `10.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `10.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `10.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado_y_configurado` |
| `10.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `10.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 11. Asistencia, turnos y marcación

*Fase: Vertical opcional · **Ola 18** (cerrada 2026-07-29) · Spec ampliada en sección Olas*

> **Objetivo núcleo:** el colaborador **marca su geolocalización** (entrada/salida / presencia) para que el empleador sepa que está en el **lugar de trabajo asignado** (geocerca del turno/instalación).  
> **No confundir** con check-in de oficina/coworking (ola 21 / `OfficeDay`), RSVP de eventos (ola 15) ni `geopoint` de encuestas (ola 5).

| ID | Punto | Capa | Dev | Config | Global | Nota |
|----|-------|------|-----|--------|--------|------|
| `11.01` | Mis turnos / mi asistencia | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Turno + lugar esperado |
| `11.02` | Marcación libre / en lugar / temporal | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Punch GPS + modos + vigencia temporal |
| `11.03` | Prefichada Geopop | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Mock local desde turnos |
| `11.04` | Objetivos y servicios | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Multi-instalación / servicio |
| `11.05` | Turnos supervisados | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | managerId + TeamScope |
| `11.06` | Escaneo DNI / QR para marcación | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Cámara (BarcodeDetector/jsQR) + token |
| `11.07` | Novedades e historial de asistencia | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Núcleo + CSV admin |
| `11.08` | Marcas fuera de rango | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Geocerca + política + notif |
| `11.09` | Domingos adicionales | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Agregación local + panel ECR |
| `11.10` | CRUD turnos (API) | A S | `hecho` | `hecho` | `desarrollado_y_configurado` | + lugares/geocerca |
| `11.11` | Panel supervisores ECR | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` | Datos AttendancePunch locales |
| `11.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev smoke |
| `11.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` | |
| `11.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `11.ADM` | Pantallas/admin (lugares, turnos, políticas geocerca) | A S | `hecho` | `hecho` | `desarrollado_y_configurado` | |
| `11.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 12. Ausentismos

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `12.01` | Solicitar ausentismo | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `12.02` | Aprobar / rechazar ausentismo | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `12.03` | Reporte de ausentismos | A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `12.04` | Integración ausentismo ECR | S | `hecho` | `parcial` | `parcial` | Adapter + mock (pack ECR); live con `ECR_AUSENTISMO_API` |
| `12.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `12.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `12.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `12.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `12.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` |
### 13. Licencias y vacaciones

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `13.01` | Solicitar licencia | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `13.02` | Aprobar / rechazar / editar licencia | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `13.03` | Consultar saldos y licencias devengadas | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `13.04` | Reportes de licencias | A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `13.05` | Módulo vacaciones | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `13.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `13.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `13.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `13.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `n/a` | `desarrollado_y_configurado` |
| `13.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` |
### 14. RRHH / legajo digital (PeopleCare)

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `14.01` | Ficha de colaborador | U A S | `hecho` | `hecho` | `hecho` | EmployeeLegajo |
| `14.02` | Domicilios | U A S | `hecho` | `hecho` | `hecho` | |
| `14.03` | Familiares | U A S | `hecho` | `hecho` | `hecho` | |
| `14.04` | Obra social | U A S | `hecho` | `hecho` | `hecho` | |
| `14.05` | Datos bancarios | U A S | `hecho` | `hecho` | `hecho` | |
| `14.06` | Ficha médica | U A S | `hecho` | `hecho` | `hecho` | |
| `14.07` | Contratos / monotributo | U A S | `hecho` | `hecho` | `hecho` | |
| `14.08` | Carrera y habilidades | U A S | `hecho` | `hecho` | `hecho` | |
| `14.09` | Estados, líderes y clasificaciones | U A S | `hecho` | `hecho` | `hecho` | |
| `14.10` | Catálogos RRHH | U A S | `hecho` | `hecho` | `hecho` | `/api/admin/hr-catalogs` |
| `14.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `14.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `14.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `14.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `n/a` | `hecho` | Legajos + catálogos |
| `14.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 15. Encuestas e inspecciones

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `15.01` | Armar cuestionario con IA | U A S | `hecho` | `hecho` | `hecho` | `POST /admin/surveys/generate` |
| `15.02` | Publicar encuesta a empleados | U A S | `hecho` | `hecho` | `hecho` | Mail + push + in-app al publicar |
| `15.03` | Medición de participación completa | U A S | `hecho` | `hecho` | `hecho` | Stats temporales + snapshot audiencia |
| `15.04` | Agenda / ejecución de encuestas | U A S | `hecho` | `hecho` | `hecho` | `startsAt`/`endsAt` admin + UI |
| `15.05` | Tipos de pregunta | U A S | `hecho` | `hecho` | `hecho` | Incluye geopoint check-in |
| `15.06` | Check-in / check-out facility | U A S | `hecho` | `hecho` | `hecho` | Tipo pregunta `geopoint` (GPS) |
| `15.07` | Sincronización offline de encuestas | U A S | `hecho` | — | `hecho` | Cola localStorage + flush online |
| `15.08` | Resultados de encuestas | U A S | `hecho` | `hecho` | `hecho` | Persona/grupo/segmento + informe IA |
| `15.09` | Encuestas embebidas en publicaciones | U A S | `hecho` | `hecho` | `hecho` | `linkedSurveyId` + CTA muro |
| `15.10` | Envío respuesta encuesta (API) | S | — | — | `hecho` | `POST /surveys/:id/respond` |
| `15.11` | Admin de encuestas externo (legado) | A S | `retirado` | `n/a` | `retirado` | No reabrir · funcionalidad de campo → **Ola 37** Relevamientos |
| `15.12` | Variantes CODESAC / pedidos en encuesta | U A S | `retirado` | `n/a` | `retirado` | No usar · pedidos = sistema ad hoc (no encuesta) |
| `15.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Smoke pendiente humano |
| `15.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Caps `admin.encuestas` |
| `15.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `15.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | — | `hecho` | `hecho` | |
| `15.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Contratos en rutas |
### 16. Onboarding

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `16.01` | Offboarding | U A S | `hecho` | `hecho` | `hecho` | revoke-access |
| `16.02` | Procesos de onboarding | U A S | `hecho` | `hecho` | `hecho` | plantillas + instancias |
| `16.03` | Encuestas de onboarding | U A S | `hecho` | `hecho` | `hecho` | **Reusa §15** + `purpose` + hook respond |
| `16.04` | Incorporaciones (admin) | A S | `hecho` | `hecho` | `hecho` | iniciar proceso |
| `16.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `16.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `16.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | `/bienvenida` |
| `16.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `n/a` | `hecho` | `/onboarding` |
| `16.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 17. Documentos

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `17.01` | Mis documentos | U A S | `hecho` | — | `hecho` | |
| `17.02` | Gestión documental (admin) | A S | — | `hecho` | `hecho` | |
| `17.03` | Firma de documentos | U A S | `hecho` | `hecho` | `hecho` | Firma tipada + evidencia (no PKI) |
| `17.04` | Descarga / proxy de documentos | U A S | `hecho` | — | `hecho` | Contador + log descargas |
| `17.05` | Integración documentos SAP | S | — | `hecho` | `hecho` | Stub adapter + sync admin |
| `17.06` | Reporte de descargas | A S | — | `hecho` | `hecho` | Ranking + CSV |
| `17.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | |
| `17.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `17.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `17.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | — | `hecho` | `hecho` | |
| `17.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | |
### 18. Beneficios, billetera y recompensas

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `18.01` | Catálogo de beneficios | U A S | `hecho` | `hecho` | `hecho` | Listado, filtros, favoritos, geo, detalle |
| `18.02` | Billetera | U A S | `hecho` | `hecho` | `hecho` | Saldo + movimientos; capability `beneficios.billetera` |
| `18.03` | Pagos y transferencias | U A S | `hecho` | `hecho` | `hecho` | Transfer pts + canje local; PSP → **40.u** CAPRICHO |
| `18.04` | Premios / rewards | U A S | `hecho` | `hecho` | `hecho` | `kind=reward` / `offerType=premio` |
| `18.05` | Integración Claro / YoClaro | S | `hecho` | `hecho` | `hecho` | Partners genéricos; pack → **Ola 24** `NR.CLARO` |
| `18.06` | Beneficios como tipo de publicación | U A S | `hecho` | `hecho` | `hecho` | `Post.tipo=beneficio` (ya en muro) |
| `18.07` | Reglas de puntos por comunidad | U A S | `hecho` | `hecho` | `hecho` | `PointsRule` + hooks muro/comentarios; admin en `/beneficios` |
| `18.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Postdev (no gap producto) |
| `18.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `18.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | U OK · A: wizard + previews 2026-07-30 |
| `18.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | Tipología legado + preview imagen |
| `18.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Postdev (no gap producto) |
### 19. Alarmas

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `19.01` | Crear / actualizar / cancelar alarma | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Canal `source=alarm` → Pedido |
| `19.02` | Listado y pedidos de alarmas | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Misma bandeja Pedido |
| `19.03` | Renombre por empresa | U A S | `diferido` | `diferido` | `diferido` | Emp60 → **Ola 24/39** |
| `19.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Postdev |
| `19.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `19.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | `/alarma` |
| `19.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | Mapa + bandeja A |
| `19.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Spec Ola 25 |
### 20. Pedidos internos

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `20.01` | Pedidos del usuario | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `20.02` | ABM pedidos (admin) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Cat + arts + mapa |
| `20.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Postdev |
| `20.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `20.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `20.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | |
| `20.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Spec Ola 25 |
### 21. Datos útiles / directorio / teléfonos

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `21.01` | Datos útiles / agenda laboral | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `21.02` | Directorio de contactos API | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `21.03` | Teléfonos (admin) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `21.04` | Mapa / ubicación de contactos | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `21.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `21.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `21.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `21.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `21.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 22. Farmacias y horarios de terminal

*Fase: Diferido / no núcleo*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `22.01` | Farmacias de turno | U A S | `diferido` | `diferido` | `diferido` |
| `22.02` | Horarios de terminal | U A S | `diferido` | `diferido` | `diferido` |
| `22.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `diferido` | `n/a` | `diferido` |
| `22.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `diferido` | `n/a` | `diferido` |
| `22.UX` | UX moderna móvil-primero revisada (§45) | U A S | `diferido` | `n/a` | `diferido` |
| `22.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `diferido` | `n/a` | `diferido` |
| `22.DOC` | OpenAPI / notas de contrato del módulo | U A S | `diferido` | `n/a` | `diferido` |
### 23. Supervisor comercial

*Fase: Vertical opcional · **Ola 31** (comercial/campo) + **Ola 32** (equipo/alcance app) · Testigos comerciales: `sooft-*-supervisores` + `views/{Supervisors,supervisor-mod}`*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `23.00` | Capability `supervision.comercial` + ítem menú Connectia (SSO/roles) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Ola 31 núcleo |
| `23.01` | Home / dashboard KPIs supervisión | U A | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Hub U `/supervision` |
| `23.02` | Historial de tareas (lista, filtros, búsqueda, paginación) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | + acciones masivas UI |
| `23.03` | Detalle de tarea | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.04` | Crear tarea libre (título, desc, sala, prioridad, plazo, tipo, foto?) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.05` | Crear tarea desde template/checklist | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Snapshot |
| `23.06` | Asignar / reasignar tarea a operario | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | + bulk assign |
| `23.07` | Completar tarea (modal + evidencia foto si `requiere_foto`) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.08` | Catálogo + transiciones de estados de tarea | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.09` | Catálogo de prioridades | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | alta/media/baja |
| `23.10` | Comentarios en tarea (CRUD + count) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | create+list |
| `23.11` | Adjuntos (upload, metadata, proxy, counts por tarea/medición/comentario) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | CRUD + counts |
| `23.12` | Respuestas de tarea (`tareas-respuestas`) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | en tarea |
| `23.13` | Observaciones de mediciones (CRUD + counts) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | en respuesta |
| `23.14` | Ejecución de mediciones en checklist de una tarea | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.15` | Templates / plantillas checklist (CRUD) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.16` | Mediciones-template (ítems del checklist por template) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | embebidas |
| `23.17` | Categorías de template | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.18` | Pilares | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.19` | Pilares-mediciones | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.20` | Items de medición | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.21` | Mediciones (catálogo CRUD) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.22` | ABM Cadenas (+ import XLSX) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | import XLSX |
| `23.23` | ABM Subcadenas (+ import XLSX) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.24` | ABM Clientes (+ import XLSX) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.25` | ABM Salas (+ import XLSX + ubicación) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.26` | ABM Cliente–Sala | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.27` | ABM Asignaciones / colaboradores en cliente-sala (+ import) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.28` | Ubicaciones geo (países / regiones / comunas) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | seed Chile |
| `23.29` | Roles del dominio supervisión (CRUD) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `supervisionRole` |
| `23.30` | Permisos por pantalla/acción (`permisos_config`) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.31` | Usuario↔rol (asignar, verificar relaciones, bulk, import/delete XLSX) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | assign + import |
| `23.32` | Usuarios del dominio (listado, con-roles, rol por id) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.33` | Push: creación por gestor → Supervisores + Plataforma Comercial | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.34` | Push: asignación de tarea → Operario | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.35` | Fallback email + auditoría de notificaciones | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | email si falla push |
| `23.36` | Offline: cache GET + cola mutaciones + sync al recuperar red | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.37` | PWA (manifest, SW, install prompt) del módulo | U | `desarrollado` | `configurado` | `desarrollado_y_configurado` | VitePWA + install |
| `23.38` | Configuración app (i18n es/en, preferencias) | U A | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.39` | Paridad móvil embebida Connectia (`supervisor-mod`: hub, mis actividades, tareas sala, desde template) | U | `desarrollado` | `configurado` | `desarrollado_y_configurado` | hub+vistas |
| `23.40` | BFF Connectia: proxy APIs + secretos server-side + `emp_id`→tenant | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | ECR BFF |
| `23.41` | Admin Connectia A: espejo ABM / roles / templates | A | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/supervision` |
| `23.42` | Estados templates (`templates-estados`) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.01` | Hub Panel supervisores ECR | U | `desarrollado` | `configurado` | `desarrollado_y_configurado` | mock si no env |
| `23.ECR.02` | Marcas fuera de rango (lista + filtro fecha) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.03` | Detalle marca (mapa, foto, datos trabajador) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | sheet detalle |
| `23.ECR.04` | Justificar marca fuera de rango | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.05` | Anexo de contrato fuera de rango | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.06` | Amonestar fuera de rango | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.07` | Proyectos/PDV cercanos a la marca | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.08` | Domingos adicionales (reporte supervisor) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.ECR.09` | BFF ECR: proxy `x-api-key` server-side (nunca en cliente) | S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.IA` | IA: priorizar visitas, resumir día, detectar outliers (humano confirma) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | heurística |
| `23.SV.00` | Capability `supervision.equipo` + modelo de alcance (mis supervisados) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Ola 32 |
| `23.SV.01` | Hub U «Mi equipo» (lista supervisados + accesos rápidos) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/mi-equipo` |
| `23.SV.02` | Definir / sync equipo: área, área+cliente, grupo, personas a mano (combinable); N equipos | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | TeamScope |
| `23.SV.03` | Publicaciones del muro con audiencia = solo mi equipo | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | compose/post |
| `23.SV.04` | Eventos / agenda con audiencia = solo mi equipo | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | compose/event |
| `23.SV.05` | Notificaciones / avisos push solo a mis supervisados | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | compose/notif |
| `23.SV.06` | Encuestas / consultas rápidas solo a mi equipo | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | compose/survey |
| `23.SV.07` | Documentos / avisos de lectura acotados al equipo | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | compose/doc |
| `23.SV.08` | Chat / canal de equipo (crear grupo con supervisados) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | compose/chat |
| `23.SV.09` | Seguir actividad de supervisados (timeline unificada) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | + ausencias/licencias/tareas |
| `23.SV.10` | Ficha de supervisado (perfil + actividad + tareas + ausencias visibles) | U S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | sin RRHH sensible |
| `23.SV.11` | Composer unificado «Crear para mi equipo» (elige tipo de elemento) | U | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.SV.12` | Authz: el supervisor nunca ve/publica fuera de su alcance | S | `desarrollado` | `n/a` | `desarrollado` | force audience |
| `23.SV.13` | El supervisado solo recibe lo dirigido a él / su equipo | U S | `desarrollado` | `n/a` | `desarrollado` | hub member |
| `23.SV.QA` | Criterios Ola 32 verificados | U A S | `desarrollado` | `n/a` | `desarrollado` | tests teamScope |
| `23.SV.UX` | UX hub + composer móvil-primero (§45) | U | `desarrollado` | `n/a` | `desarrollado` | |
| `23.SV.DOC` | Notas de contrato alcance / audiencia supervisor | S | `desarrollado` | `n/a` | `desarrollado` | Spec + STATUS |
| `23.QA` | Criterios de aceptación del módulo verificados (checklist § + testigo) | U A S | `desarrollado` | `n/a` | `desarrollado` | tests + smoke núcleo |
| `23.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | caps + tenantId |
| `23.UX` | UX moderna móvil-primero revisada (§45) · paridad pantallas testigo | U A S | `desarrollado` | `n/a` | `desarrollado` | hub U |
| `23.ADM` | Pantallas/admin de configuración del módulo listas | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | |
| `23.DOC` | OpenAPI / notas de contrato del módulo + mapa endpoints testigo | U A S | `desarrollado` | `n/a` | `desarrollado` | Spec OLA31 + STATUS |
### 24. IA y QR

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `24.01` | Chatbot IA con base de conocimientos | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | MVP A–E + booking conversacional (ola 12) |
| `24.02` | Gestión de base de conocimientos del bot | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | A `/asistente-kb` · `KbArticle` |
| `24.03` | Búsqueda por IA | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | KB + docs + posts en tools |
| `24.04` | Asistente de contenido | U A S | `capricho` | `n/a` | `capricho` | → **Ola 40** `40.o` |
| `24.05` | Asistente de carga de datos | U A S | `capricho` | `n/a` | `capricho` | → **Ola 40** `40.p` |
| `24.06` | Escaneo QR a vista | U A S | `capricho` | `n/a` | `capricho` | → **Ola 40** `40.q` |
| `24.07` | Lectura QR DNI | U A S | `capricho` | `n/a` | `capricho` | → **Ola 40** `40.r` |
| `24.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `24.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | tenant + `admin.ia` |
| `24.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` | Chat + chips vacaciones/recibo/sala |
| `24.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/asistente-kb` |
| `24.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 25. Modo TV

*Fase: Vertical opcional · Ola 26 Track A · **cerrada** 2026-07-30*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `25.01` | Reproducción modo TV | U A S | `hecho` | `hecho` | `hecho` | Kiosk `/tv` · ADR-GAPS §H |
| `25.02` | Emparejamiento móvil ↔ TV | U A S | `hecho` | `hecho` | `hecho` | Código 6 dig · TTL 5 min · HTTP poll |
| `25.03` | Configuración TV | A S | `hecho` | `hecho` | `hecho` | A `/modo-tv` |
| `25.04` | Feed TV | U A S | `hecho` | `hecho` | `hecho` | Manifiesto + ETag |
| `25.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Tests unitarios; smoke humano |
| `25.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Cap `tv.mode` / `admin.tv` |
| `25.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `25.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | |
| `25.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 26. FAQs y tutoriales (centro de ayuda)

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `26.01` | Consultar FAQs | U A S | `hecho` | — | `hecho` | `/ayuda` + `/api/help/faqs` |
| `26.02` | ABM FAQs | A S | — | `hecho` | `hecho` | Admin `/ayuda` · cap `admin.ayuda` |
| `26.03` | Apartado Tutoriales (U) + ABM (A) — obligatorio en Connectia | A S | `hecho` | `hecho` | `hecho` | Tabs FAQs/Tutoriales |
| `26.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `hecho` | `n/a` | `hecho` | |
| `26.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Cap `admin.ayuda` |
| `26.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `26.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | — | `hecho` | `hecho` | |
| `26.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 27. ABM de configuración

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `27.01` | Grupos de usuarios | U A S | `hecho` | `hecho` | `hecho` | `/api/admin/org/groups` + tab Organización |
| `27.02` | Categorías de publicaciones | U A S | `hecho` | `hecho` | `hecho` | `PostCategory` + A `/categorias-publicaciones` |
| `27.03` | Parámetros del sistema | U A S | `hecho` | `hecho` | `hecho` | `TenantParam` + A `/parametros` |
| `27.04` | Áreas organizacionales | U A S | `hecho` | `hecho` | `hecho` | `/api/admin/org/areas` + organigrama |
| `27.05` | Datos adicionales (campos) | U A S | `hecho` | `hecho` | `hecho` | `ProfileFieldDef` + tab Organización |
| `27.06` | CRUD usuarios (admin) | A S | `hecho` | `hecho` | `hecho` | `/api/admin/users` + A `/usuarios` |
| `27.07` | Importar usuarios desde archivo (Excel / CSV) — adicional | U A S | `hecho` | `hecho` | `hecho` | CSV + XLSX (xlsx); plantillas |
| `27.08` | Tomar usuarios desde Google (Workspace Directory) — adicional | U A S | `hecho` | `parcial` | `hecho` | Directory API real si env; JSON fallback |
| `27.09` | Sync directorio Microsoft Entra ID (opcional, mismo patrón) | U A S | `hecho` | `parcial` | `hecho` | Graph real si ENTRA_*; JSON fallback |
| `27.10` | CRUD roles y permisos | A S | `hecho` | `hecho` | `hecho` | `Role` + A `/roles`; caps en runtime |
| `27.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Tests `ola16Abm.test.js`; falta smoke humano |
| `27.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Caps + tenant scope |
| `27.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | Admin pantallas nuevas |
| `27.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | — | `hecho` | `hecho` | |
| `27.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 28. Menú dinámico

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `28.01` | Menú dinámico del usuario | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `28.02` | ABM de menú móvil/web | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `28.03` | Asignación menú ↔ roles | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `28.04` | Invalidar caché de menú | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `28.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `28.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` |
| `28.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` |
| `28.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `28.DOC` | OpenAPI / notas de contrato del módulo | U A S | `desarrollado` | `n/a` | `desarrollado` |
### 29. Reportes e informes

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `29.01` | Tablero de adopción / uso de la app | U A S | `hecho` | `hecho` | `hecho` |
| `29.02` | Campañas de impulso al uso | U A S | `hecho` | `hecho` | `hecho` |
| `29.03` | Confirmaciones de eventos | U A S | `hecho` | `hecho` | `hecho` |
| `29.04` | Visitas en publicaciones | U A S | `hecho` | `hecho` | `hecho` |
| `29.05` | Contenido más consumido (ranking) | U A S | `hecho` | `hecho` | `hecho` |
| `29.06` | Últimas conexiones / historial | U A S | `parcial` | `parcial` | `parcial` | → Ola 40 `40.y` CAPRICHO (fino); adopción usa `lastLoginAt` + canal |
| `29.07` | Sentimientos en publicaciones | U A S | `hecho` | `hecho` | `hecho` |
| `29.08` | Resultados de encuestas | U A S | `hecho` | `hecho` | `hecho` |
| `29.09` | Publicaciones por período / grupo | U A S | `hecho` | `hecho` | `hecho` |
| `29.10` | Usuarios blanqueados | U A S | `hecho` | `hecho` | `hecho` |
| `29.11` | Descargas de documentos | U A S | `hecho` | `hecho` | `hecho` |
| `29.12` | Solicitudes de ausentismo | U A S | `hecho` | `hecho` | `hecho` |
| `29.13` | Visitas en tiempo real (EPEC) | U A S | `hecho` | `hecho` | `hecho` |
| `29.14` | Exportación Excel / filtros | U A S | `hecho` | `hecho` | `hecho` |
| `29.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `29.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` |
| `29.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` |
| `29.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `n/a` | `hecho` |
| `29.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 30. Integraciones especiales

*Fase: Vertical / no-regresión · **packs de cliente → Ola 24** (2026-07-30); canal WA de plataforma → Ola 28 `28.COM.07`; SAP → Ola 40*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `30.01` | ECR Salud | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.ECR` |
| `30.02` | GeoVictoria | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.ECR` |
| `30.03` | Customizaciones ECR | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.ECR` |
| `30.04` | Customizaciones Claro / YoClaro | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.CLARO` |
| `30.05` | Customizaciones EPEC | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.EPEC` |
| `30.06` | Customizaciones Emp_Id 60 | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.EMP60` / **39** |
| `30.07` | Customizaciones Grido / Gridonet | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 24** `NR.GRIDO` |
| `30.08` | WhatsApp Business / WTA | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 28** `28.COM.07` (canal plataforma) |
| `30.09` | Google Maps | U A S | `parcial` | `parcial` | `parcial` | Ya en beneficios/eventos; residual no bloquea 28 |
| `30.10` | SAP | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.f` |
| `30.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Meta; packs en 24 |
| `30.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 31. WhatsApp / WTA, email, archivos y plataforma

*Fase: absorbido por **Ola 28** `28.COM.*` (2026-07-30) · PWA/archivos genéricos = soporte / residual*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `31.01` | Envío de email | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 28** `28.COM.06` (+ motor existente) |
| `31.02` | Gestión de archivos | U A S | `pendiente` | `pendiente` | `pendiente` | Adjuntos com. → `28.COM.09`; resto residual |
| `31.03` | Logging y health check | U A S | `pendiente` | `pendiente` | `pendiente` | → **Ola 28** `28.COM.10` |
| `31.04` | Capacidades PWA | U A S | `parcial` | `parcial` | `parcial` | Ya hay install/SW; endurecer ≠ núcleo 28 |
| `31.05` | Soporte (admin) | A S | `pendiente` | `pendiente` | `pendiente` | Residual / portal **43** |
| `31.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 32. Gaps / no implementado o incompleto

*Fase: Meta / backlog decisión*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `32.01` | Recibos de sueldo | U A S | `deseable` | `n/a` | `deseable` | **Fuera ola 30** → **Ola 40** `40.l` |
| `32.02` | Videollamadas | U A S | `deseable` | `n/a` | `deseable` | **Fuera ola 30** → **Ola 40** `40.j` (`40.i` audio) |
| `32.03` | Solicitud turno carnet | U A S | `desarrollado` | `desarrollado` | `cerrado` | Tipo `turno_carnet` en §9 (seed DEMO/genérico) · 2026-07-30 |
| `32.04` | Gestión de atenciones | U A S | `pendiente` | `pendiente` | `pendiente` | **Fuera ola 30** → **Ola 43** portal |
| `32.05` | Mapa de alarmas (admin) | A S | `desarrollado` | `desarrollado` | `cerrado` | **Fuera ola 30** → **Ola 25** (mapa admin pedidos) |
| `32.06` | Visitas por menú (reporte) | A S | `pendiente` | `pendiente` | `pendiente` | **Fuera ola 30** → **Ola 24** `NR.EPEC` |
| `32.07` | Documentación / tutoriales dashboard | A S | `pendiente` | `pendiente` | `pendiente` | **Fuera ola 30** → **Ola 42** (ops/docs deploy; producto ayuda = §26 ola 13) |
| `32.08` | Stories (API) | S | `pendiente` | `pendiente` | `pendiente` | **Fuera ola 30** → muro §4 / backlog |
| `32.09` | Admin de beneficios | A S | `desarrollado` | `desarrollado` | `cerrado` | **Fuera ola 30** → **Ola 20** (ABM/wizard) |
| `32.10` | Swagger interactivo | U A S | `descartado` | `n/a` | `descartado` | **Fuera ola 30** → **Ola 42** (OpenAPI CI · sin try-it) |
| `32.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 33. Mapa de integraciones con sistemas externos

*Fase: Inventario documental (consolidado §33) · **no** es el producto Ola 28 · health de canales de comunicación = `28.COM.10`*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `33.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Doc-only / ops |
| `33.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 34. Reserva de salas, espacios y cocheras

*Fase: Vertical opcional · **Ola 21 cerrada** 2026-07-29*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `34.01` | Catálogo de salas / espacios | U A S | `hecho` | `hecho` | `hecho` | U `/espacios` · A `/reservas` · tipos fijos hoy; genéricos → gap Ola 21 |
| `34.02` | Catálogo de cocheras / plazas | U A S | `hecho` | `hecho` | `hecho` | |
| `34.03` | Disponibilidad y calendario | U A S | `hecho` | `hecho` | `hecho` | Availability API + UI |
| `34.04` | Reservar sala / espacio | U A S | `hecho` | `hecho` | `hecho` | |
| `34.05` | Reservar cochera | U A S | `hecho` | `hecho` | `hecho` | Patente / vehículo |
| `34.06` | Mis reservas | U A S | `hecho` | `hecho` | `hecho` | Cancelar |
| `34.07` | Aprobación de reservas | U A S | `hecho` | `hecho` | `hecho` | A cola pending |
| `34.08` | Check-in / liberación | U A S | `hecho` | `hecho` | `hecho` | OfficeDay + release |
| `34.09` | Notificaciones de reserva | U A S | `hecho` | `hecho` | `hecho` | `notifySpaces` |
| `34.10` | Reportes de uso | A S | `hecho` | `hecho` | `hecho` | Ocupación admin |
| `34.11` | Reserva vía chatbot | U A S | `hecho` | `hecho` | `hecho` | Booking conversacional + confirm |
| `34.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Tests `spaces.test.js`; smoke humano |
| `34.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Caps `espacios.*` / `admin.reservas` |
| `34.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | Rediseño U+A 2026-07-30 |
| `34.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | `/reservas` |
| `34.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Postdev |
### 35. Coworking y puestos de trabajo

*Fase: Vertical opcional · **Ola 21 cerrada** 2026-07-29*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `35.01` | Catálogo de sedes / plantas / zonas | U A S | `hecho` | `hecho` | `hecho` | `SpaceSite` + floor/zone |
| `35.02` | Catálogo de puestos | U A S | `hecho` | `hecho` | `hecho` | desk / zona_cupo |
| `35.03` | Mapa / plano de planta | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.s` (hoy zonas/lista) |
| `35.04` | Reservar puesto / hot desk | U A S | `hecho` | `hecho` | `hecho` | U `/oficina` |
| `35.05` | “Voy a la oficina” / día en sede | U A S | `hecho` | `hecho` | `hecho` | `OfficeDay` |
| `35.06` | Mis días / mis puestos | U A S | `hecho` | `hecho` | `hecho` | |
| `35.07` | Check-in / check-out en sede | U A S | `hecho` | `hecho` | `hecho` | |
| `35.08` | Quién está hoy (opcional) | U A S | `hecho` | `hecho` | `hecho` | |
| `35.09` | Políticas híbridas y aforo | U A S | `hecho` | `hecho` | `hecho` | `SpacePolicy` |
| `35.10` | Amenities / atributos + tipos de activo | U A S | `hecho` | `hecho` | `hecho` | `SpaceResourceType` + `SpaceAttributeDef` · filtros U |
| `35.11` | Encadenar con sala / cochera | U A S | `deseable` | `n/a` | `deseable` | → **Ola 40** `40.t` (bundle 1-click) |
| `35.12` | Notificaciones coworking | U A S | `hecho` | `hecho` | `hecho` | |
| `35.13` | Reportes de ocupación coworking | A S | `hecho` | `hecho` | `hecho` | |
| `35.14` | Coworking vía chatbot | U A S | `hecho` | `hecho` | `hecho` | `create_office_day` conversacional |
| `35.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Smoke humano |
| `35.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `35.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | Rediseño U+A 2026-07-30 |
| `35.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | |
| `35.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Postdev |
### 36. Live streaming y broadcasts

*Fase: Ola 26 Track B = URL externa · **cerrada** 2026-07-30 · ingest nativo diferido · ≠ Ola 36 backlog*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `36.01` | Crear / programar live | U A S | `hecho` | `hecho` | `hecho` | Metadata + `streamUrl` externa |
| `36.02` | Transmitir / ver live | U A S | `hecho` | `hecho` | `hecho` | U `/en-vivo` · badge muro · sin ingest |
| `36.03` | Interacción y métricas | U A S | `hecho` | `hecho` | `hecho` | Views simples; chat → fase 2 |
| `36.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Tests + seed |
| `36.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Cap `live.stream` / `admin.live` |
| `36.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `36.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | A `/live` |
| `36.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 37. Organigrama

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `37.01` | Vista de organigrama | U A S | `hecho` | `hecho` | `hecho` |
| `37.02` | Mantener jerarquía | U A S | `hecho` | `hecho` | `hecho` |
| `37.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `37.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` |
| `37.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` |
| `37.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `n/a` | `hecho` |
| `37.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 38. Desarrollo de talento

*Fase: Núcleo MVP · Ola 27 (2026-07-29)*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `38.01` | OKRs / objetivos | U A S | `hecho` | `hecho` | `hecho` | Ciclos + KR + progreso auditado · cap `talento.okr` |
| `38.02` | Evaluación de desempeño | U A S | `hecho` | `hecho` | `hecho` | Ciclos formales + feedback continuo · `talento.desempeno` |
| `38.03` | Plan de carrera | U A S | `hecho` | `hecho` | `hecho` | Rol actual/objetivo, gaps, hitos · `talento.carrera` |
| `38.04` | Aprendizaje (LMS) | U A S | `hecho` | `hecho` | `hecho` | Cursos, asignación, quiz, certificado · `talento.lms` |
| `38.05` | Búsquedas internas | U A S | `hecho` | `hecho` | `hecho` | Vacantes + postulación · `talento.vacantes` |
| `38.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Tests unitarios; smoke humano → postdev |
| `38.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Caps + `admin.talento` |
| `38.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | Hub `/mi-desarrollo` |
| `38.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | `/talento` admin |
| `38.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Postdev |
### 39. Cultura empresarial

*Fase: Núcleo MVP · Ola 27 (2026-07-29)*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `39.01` | Programa de referidos | U A S | `hecho` | `hecho` | `hecho` | Cap `cultura.referidos` · premio post-hito |
| `39.02` | People Experience / pulso | U A S | `hecho` | `hecho` | `hecho` | eNPS + umbral anonimato · `cultura.pulso` |
| `39.03` | Marketplace interno | U A S | `hecho` | `hecho` | `hecho` | Clasificados + moderación · `cultura.marketplace` |
| `39.04` | Reconocimientos | U A S | `hecho` | `hecho` | `hecho` | Peer/líder + valores · `cultura.reconocimientos` |
| `39.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Tests unitarios; smoke → postdev |
| `39.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Caps + `admin.cultura` |
| `39.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | Hub `/cultura` |
| `39.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | `/cultura` admin |
| `39.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Postdev |
### 40. Políticas corporativas

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `40.01` | Biblioteca + acuse | U A S | `hecho` | `hecho` | `hecho` | Acuse versionado + CSV cumplimiento |
| `40.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `hecho` | `n/a` | `hecho` | |
| `40.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | Cap `admin.politicas` |
| `40.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `40.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | — | `hecho` | `hecho` | |
| `40.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 41. Workflows y motor de aprobaciones

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `41.01` | Diseñador + instancias | U A S | `desarrollado` | `desarrollado_y_configurado` | `parcial` |
| `41.02` | Bandeja de aprobaciones unificada | A S | `desarrollado` | `desarrollado_y_configurado` | `parcial` |
| `41.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `41.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `parcial` |
| `41.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `parcial` |
| `41.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `desarrollado_y_configurado` | `parcial` |
| `41.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 42. Gestión de servicios (portal)

*Fase: Núcleo MVP · **Ola 43** (ex-ola 23 portal)*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `42.01` | Catálogo + portal | U A S | `desarrollado` | `parcial` | `parcial` |
| `42.02` | Panel de agentes | U A S | `desarrollado` | `parcial` | `parcial` |
| `42.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `42.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `parcial` |
| `42.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `parcial` |
| `42.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `parcial` | `parcial` |
| `42.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 43. Seguridad, privacidad y cumplimiento

*Fase: Núcleo MVP · **Ola 23** (IMPRESCINDIBLE)*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `43.01` | Controles clave | U A S | `pendiente` | `pendiente` | `pendiente` |
| `43.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `43.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `43.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `43.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `43.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 44. Deuda técnica a no migrar

*Fase: Transversal (cumplir siempre)*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `44.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `44.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `44.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `44.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `44.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 45. Modernización del producto

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `45.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `45.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `45.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `45.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `45.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 46. Hub de accesos / enlaces (launchpad)

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `46.01` | Pantalla launchpad (U) | U A S | `hecho` | — | `hecho` | |
| `46.02` | ABM de accesos + tarjetas (A) | A S | — | `hecho` | `hecho` | |
| `46.03` | Tipos / categorías | U A S | `hecho` | `hecho` | `hecho` | |
| `46.04` | Destinos tipados y SSO | U A S | `hecho` | `hecho` | `hecho` | kinds + stub SSO adapter |
| `46.05` | Favoritos + telemetría | U A S | `hecho` | `hecho` | `hecho` | Favoritos + clickCount |
| `46.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | |
| `46.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `46.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `46.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | — | `hecho` | `hecho` | |
| `46.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | |
### 33.RENDI — Integración Rendi / DocuFlow (viáticos y rendiciones)

*Fase: Ola especial · integración producto hermano · **Ola 33***  
*Fuente producto: `C:\Users\lenovo\Documents\docuflow` · `FUNCIONES-RENDI.md` · comercial [rendi.sooft.tech](https://rendi.sooft.tech/)*

> **Para qué sirve:** que el colaborador de una comunidad Connectia pueda **rendir viáticos y gastos** (foto de ticket/factura → IA → rendición → cuentas → ERP) **sin que Connectia reimplemente** el motor de Rendi. Connectia es la puerta de acceso y orquestación por tenant; Rendi es el sistema de rendiciones.

| ID | Punto | Capa | Dev | Config | Global | Nota |
|----|-------|------|-----|--------|--------|------|
| `33.RENDI.00` | Capability `integracion.rendi` / `rendiciones` + menú U | U A S | `pendiente` | `pendiente` | `pendiente` | On/off por tenant |
| `33.RENDI.01` | Config admin: URL instancia Rendi, credenciales, mapeo | A S | `pendiente` | `pendiente` | `pendiente` | Sin Emp_Id hardcode |
| `33.RENDI.02` | SSO o deep-link autenticado Connectia → Rendi | U S | `pendiente` | `pendiente` | `pendiente` | Núcleo |
| `33.RENDI.03` | Hub U “Mis rendiciones / Viáticos” (lista + CTA cargar) | U S | `pendiente` | `pendiente` | `pendiente` | Resumen o iframe/redirect |
| `33.RENDI.04` | Carga comprobante (foto) vía Rendi + extracción IA | U | `pendiente` | `pendiente` | `pendiente` | Motor en Rendi |
| `33.RENDI.05` | Estados de rendición visibles en Connectia (lectura) | U A S | `pendiente` | `pendiente` | `pendiente` | API/webhook Rendi |
| `33.RENDI.06` | Notificación Connectia al cambiar estado (aprobada/rechazada) | U S | `pendiente` | `pendiente` | `pendiente` | Push/in-app |
| `33.RENDI.07` | Enganche opcional aprobación §41 | U A S | `pendiente` | `pendiente` | `pendiente` | Diferible |
| `33.RENDI.08` | Mapeo usuario Connectia ↔ usuario Rendi | A S | `pendiente` | `pendiente` | `pendiente` | Email / externalId |
| `33.RENDI.09` | Tarjeta en hub/launchpad (§46) si cap on | U | `pendiente` | `pendiente` | `pendiente` | Reusa hub |
| `33.RENDI.10` | Camino a ERP (solo si Rendi lo expone; Connectia no es ERP) | S | `pendiente` | `pendiente` | `pendiente` | Vertical / diferible |
| `33.RENDI.QA` | Criterios Ola 33 verificados | U A S | `pendiente` | `n/a` | `pendiente` | |
| `33.RENDI.SEC` | Authz tenant + secretos Rendi en vault | S | `pendiente` | `n/a` | `pendiente` | |
| `33.RENDI.UX` | UX móvil-primero entrada a rendir (§45) | U | `pendiente` | `n/a` | `pendiente` | |
| `33.RENDI.DOC` | Contrato integración + notas OpenAPI | S | `pendiente` | `n/a` | `pendiente` | |

### 34.HIRYX — Puente Hiryx → Connectia (ingreso del seleccionado)

*Fase: Ola especial · integración producto hermano · **Ola 34***  
*Fuente producto: `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas` · anclas: `PostulanteContratado`, confirmaciones de ingreso, offer letter / inicio inteligente*

> **Para qué sirve:** cerrar el hueco entre **“te elegimos”** (Hiryx) y **“ya sos de la comunidad”** (Connectia). El candidato seleccionado recibe invite, legajo semilla y onboarding sin carga manual en Excel ni re-tipeo en admin.

| ID | Punto | Capa | Dev | Config | Global | Nota |
|----|-------|------|-----|--------|--------|------|
| `34.HIRYX.00` | Capability `integracion.hiryx` + config tenant (URL, secret, mapeo org) | A S | `pendiente` | `pendiente` | `pendiente` | Off por defecto |
| `34.HIRYX.01` | Webhook firmado `hire.confirmed` / `ingreso.confirmed` | S | `pendiente` | `pendiente` | `pendiente` | Idempotente |
| `34.HIRYX.02` | Emisor en Hiryx: al contratar / confirmar ingreso dispara evento | (Hiryx) S | `pendiente` | `pendiente` | `pendiente` | Cambio en ATS |
| `34.HIRYX.03` | Invite mágico (magic link) al email del candidato | U S | `pendiente` | `pendiente` | `pendiente` | Núcleo |
| `34.HIRYX.04` | Alta / merge User Connectia + IDs gemelos Hiryx | S | `pendiente` | `pendiente` | `pendiente` | email clave |
| `34.HIRYX.05` | Semilla PeopleCare / legajo desde payload Hiryx | A S | `pendiente` | `pendiente` | `pendiente` | Reusa ola 19 |
| `34.HIRYX.06` | Arranque plantilla onboarding (Day-0 / Day-1) | U A S | `pendiente` | `pendiente` | `pendiente` | Reusa `16.*` |
| `34.HIRYX.07` | Preboarding: acceso limitado pre-fecha ingreso | U S | `pendiente` | `pendiente` | `pendiente` | Docs/políticas |
| `34.HIRYX.08` | Bandeja A “Llegadas desde Hiryx” (aceptar / mapear área) | A | `pendiente` | `pendiente` | `pendiente` | Revisión humana |
| `34.HIRYX.09` | Notif push/email “Bienvenido a la comunidad” | U S | `pendiente` | `pendiente` | `pendiente` | Ola 7 |
| `34.HIRYX.10` | Ficha U/A: origen “Reclutado vía Hiryx · vacante” | U A | `pendiente` | `pendiente` | `pendiente` | Trazabilidad |
| `34.HIRYX.11` | Asignación a área/grupo desde metadata vacante | A S | `pendiente` | `pendiente` | `pendiente` | Opcional |
| `34.HIRYX.12` | Handshake: estado de vuelta a Hiryx (`connected` / `onboarding`) | S | `pendiente` | `pendiente` | `pendiente` | Diferible |
| `34.HIRYX.QA` | Criterios Ola 34 verificados | U A S | `pendiente` | `n/a` | `pendiente` | |
| `34.HIRYX.SEC` | Firma webhook, PII, sin Emp_Id hardcode | S | `pendiente` | `n/a` | `pendiente` | |
| `34.HIRYX.UX` | Flujo invite → primer login → /bienvenida | U | `pendiente` | `n/a` | `pendiente` | |
| `34.HIRYX.DOC` | Contrato evento + OpenAPI puente | S | `pendiente` | `n/a` | `pendiente` | |

### 37.REL — Relevamientos de campo (add-on)

*Fase: Add-on comercial · distinto de Encuestas §15 / ola 5 · creado 2026-07-30*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `37.REL.00` | Capability add-on + menú U/A (off por defecto) | U A S | `hecho` | `hecho` | `hecho` | Caps + activate/seed |
| `37.REL.01` | Diseñador de formularios + versionado publicado | A S | `hecho` | `hecho` | `hecho` | `FieldForm` ≠ Survey |
| `37.REL.02` | Tipos campo: multimedia, botón, API, geopunto, facility | U A S | `hecho` | `hecho` | `hecho` | |
| `37.REL.03` | Lógica condicional / saltos | U A S | `hecho` | `hecho` | `hecho` | show/hide/skip_to/require_if |
| `37.REL.04` | ABM rutas / recorridos / paradas | A S | `hecho` | `hecho` | `hecho` | `FieldRoute` |
| `37.REL.05` | Programación por día + asignación operador | A S | `hecho` | `hecho` | `hecho` | `FieldAssignment` |
| `37.REL.06` | Modalidades: programado / espontáneo / on-demand / en ruta / sin ruta | U A S | `hecho` | `hecho` | `hecho` | + spontaneous U |
| `37.REL.07` | Vista U “qué tengo hoy” (ruta del día) | U | `hecho` | `hecho` | `hecho` | `/relevamientos` |
| `37.REL.08` | Ejecución en campo + evidencias | U S | `hecho` | `hecho` | `hecho` | |
| `37.REL.09` | Offline cola + sync idempotente | U S | `hecho` | — | `hecho` | `clientMutationId` + `/sync` |
| `37.REL.10` | Facility check-in / check-out | U S | `hecho` | `hecho` | `hecho` | Tipos + GPS |
| `37.REL.11` | Tablero ops: completitud, pendientes, recordatorios, meta | A S | `hecho` | `hecho` | `hecho` | stats + remind |
| `37.REL.12` | Link restringido solo-relevamiento (ex-01.06) | — | `fuera` | `fuera` | `fuera` | Descartado con `01.06` · no útil |
| `37.REL.13` | Reportes / export CSV | A S | `hecho` | `hecho` | `hecho` | |
| `37.REL.14` | Enganche opcional supervisión ola 31/32 | U A S | `hecho` | `hecho` | `hecho` | Timeline/hub equipo + card supervisión |
| `37.REL.QA` | Criterios Ola 37 verificados | U A S | `parcial` | `n/a` | `parcial` | Smoke humano |
| `37.REL.SEC` | Authz tenant + sin Emp_Id + add-on candado | U A S | `hecho` | `n/a` | `hecho` | |
| `37.REL.UX` | UX móvil-primero campo (§45) | U A | `hecho` | `n/a` | `hecho` | |
| `37.REL.DOC` | OpenAPI / notas de contrato del módulo | S | `parcial` | `n/a` | `parcial` | |

### NR. Packs no-regresión clientes estratégicos

*Fase: Núcleo MVP · **Ola 24** (**IMPRESCINDIBLE**) · detalle [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md)*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `NR.CLARO` | Pack no-regresión Claro/YoClaro (SSO Azure, hub, beneficios, bandeja estado 8) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.GRIDO` | Pack no-regresión Grido/Gridonet (AD, appMobile, deep links, branding) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.ECR` | Pack no-regresión ECR + asociadas (salud, GeoVictoria, ausentismo, supervisores) · **ex-ola 18:** sync Geopop productivo · API ECR externa · adapter GeoVictoria (creds → Ola 42) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.EPEC` | Pack no-regresión EPEC (visitas, WTA, reglas home) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.EMP60` | Pack labels Emp 60 (Feedback vecinos / renombres vía metadata) | U A | `pendiente` | `pendiente` | `pendiente` |

---

## Olas 12–37 — especificación de requisitos

> Fuente: `ECRMOBILE-FUNCIONES-CONSOLIDADO.md` · Ola 33: `docuflow/FUNCIONES-RENDI.md` · Ola 34: `HIRYX-SAAS/aitalent-saas` · Ola 37: add-on Relevamientos (ex-§15.11 campo). Cada ola lista **objetivo**, **IDs**, **requisitos**, **reglas**, **criterios** y **fuera de alcance**.  
> Premisas transversales: tenant/`Emp_Id` sin hardcode · humano confirma mutaciones IA · UX §45 · capability por módulo · auditoría.

### Ola 12 — Chatbot IA + KB + trámites (`24.*` núcleo)

| Campo | Valor |
|-------|--------|
| **Spec** | §24 · *Chatbot con IA y base de conocimientos* |
| **IDs núcleo** | `24.01` `24.02` `24.03` + `24.SEC` `24.UX` `24.ADM` |
| **Capas** | U (chat) · A (KB/gobierno) · S (RAG, intents, orquestación) |
| **Estado** | `cerrada` (2026-07-29 · diálogos MVP + booking conversacional) |

**Objetivo:** Asistente 24/7 del suscriptor: orientar con KB, consultar datos del usuario (incl. **solicitudes en curso** y **documentos visibles**) e **iniciar trámites** con confirmación explícita (mismas reglas que la UI nativa).

**Requisitos funcionales:**
1. U abre asistente (entrada fija / menú); historial de hilo por usuario/tenant. ✅
2. S clasifica intent: orientación | consulta | trámite (+ entidades). ✅
3. Orientación: RAG sobre KB del tenant; respuesta con **citas** (enlace a FAQ/política/guía). ✅
4. Consulta: solo APIs del usuario autenticado — **solicitudes en curso**, estado, **documentos publicados visibles**, **saldo vacaciones real** (APIs §13 / ola 17). ✅
5. Trámite: borrador → resumen → **confirmación U** → `POST` solicitud **o licencia/ausencia** → comprobante. ✅
6. Sin confianza/permiso → FAQ, deep link o abrir consulta §9 (nunca inventar datos). ✅
7. A: ABM de fuentes KB (`/asistente-kb`); indexación desde help/policies cuando existan. ✅
8. Búsqueda por IA sobre KB + docs + posts autorizados (`24.03`). ✅

**Diálogos MVP obligatorios (criterio de producto):**
- Ayuda KB (“¿Cómo hago para…?”) ✅
- **Solicitudes en curso** / estado de trámites ✅
- **Documentos visibles** / buscar documento ✅
- Saldo vacaciones · solicitar vacaciones · saldo+solicitud (**APIs reales ola 17**) ✅ intent `saldo_y_solicitar_vacaciones`
- Recibo de sueldo (fallback a consulta RRHH) ✅ decisión: módulo completo → **Ola 40** `40.l` (docs `{dni}_{clave}_{periodo}.pdf`); hoy ticket RRHH
- Estado de consulta · “dónde está X módulo” · “cómo marcar” ✅
- Reservar sala / cochera / puesto ✅ booking conversacional multi-turno + confirmación (`assistantBooking`)

**Reglas:** mismo authz que UI · sin ampliar permisos · mutaciones solo con confirmación · aislamiento tenant · fallback si falla proveedor IA · auditoría de usos.

**Criterios de aceptación:**
- [x] Los diálogos MVP A–E (KB, saldo, vacaciones, combinado, recibo/fallback) funcionan en tenant DEMO.
- [x] Respuestas KB citan fuente; sin fuente → mensaje honesto + escalamiento.
- [x] Ningún trámite se ejecuta sin confirmación.
- [x] Capability `admin.ia` / menú Asistente configurables por tenant.

**Entrega (cierre 2026-07-29):**
- S: `assistantBookingDraft` + `assistantBooking` · intents combinados/recibo/cómo marcar/reservas · confirm `create_reservation*` / `create_office_day`
- Seed DEMO: licencias + espacios + KB recibo/reservas
- U: chips rápidos vacaciones / recibo / reservar sala
- Tests: `assistantBooking.test.js`

**Fuera de esta ola:** trámites 100% conversacionales (`29.CONV`) → **Ola 29** (IMPRESCINDIBLE). Modos Sammy → **Ola 40** `40.n` (DESEABLE). Contenido / carga / QR → **Ola 40** `40.o`–`40.r` (CAPRICHO). Recibos → **Ola 40** `40.l`.

---

### Ola 13 — Centro de ayuda + Políticas (`26.*` · `40.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §26 FAQs/tutoriales · §40 Políticas corporativas |
| **IDs** | `26.01`–`26.03` · `40.*` · QA/SEC/UX/ADM/DOC de ambos |
| **Estado** | `cerrada` (2026-07-28) |

**Objetivo:** Biblioteca “cómo hacer” + políticas versionadas que **alimentan la KB** del chatbot.

**Requisitos:**
1. U: listar/buscar/leer FAQs; apartado Tutoriales (obligatorio Connectia). ✅
2. A: ABM FAQs y tutoriales (categorías, audiencia, publicar/ocultar). ✅
3. A/U: políticas corporativas (alta, versión, acuse de lectura si aplica). ✅
4. Indexación hacia KB del bot (ola 12) al publicar/actualizar. ✅ `syncKbSource` → `KbArticle`
5. Deep links desde push/chatbot a artículo concreto. ✅ `/ayuda/faq|:tutorial/:id` · `/politicas/:id` · hub kinds

**Criterios:** U encuentra y lee FAQ/tutorial; A publica y se refleja en app; política con acuse queda auditada; tenant-scoped. ✅

**Entrega:**
- S: modelos `Faq` / `Tutorial` / `Policy` · rutas `/api/help` + `/api/admin/help` · `/api/policies` + `/api/admin/policies` · caps `admin.ayuda` / `admin.politicas`
- U: `/ayuda` (tabs FAQs/Tutoriales) + detalle · `/politicas` + acuse con “opened”
- A: `/ayuda` ABM · `/politicas` ABM + reporte CSV cumplimiento
- Seed DEMO con FAQs, tutoriales y políticas de ejemplo

---

### Ola 14 — Directorio + Legajo RRHH local (`21.*` · `03.08` / §14 local)

| Campo | Valor |
|-------|--------|
| **Spec** | §21 Datos útiles / directorio · §3.08 / §14 **local** (MVP sin API HRIS) |
| **IDs** | `21.*` · legajo autónomo Connectia · DoD |
| **Estado** | `cerrada` (2026-07-29) — núcleo `21.*` + legajo local hechos; DoD QA/DOC → postdev |
| **Decisión (2026-07-28)** | MVP: **no** hay conector HTTP a PeopleCare. El expediente vive en `EmployeeLegajo`. Un **miembro** puede **no** ser empleado (`userId` opcional / sin legajo). |
| **Diferido** | Conector HRIS / PeopleCare externo → **Ola 40** `40.m`. Coherencia Perfil·Legajo·Directorio → **41.A2**. Naming → **41.B2**. |

**Objetivo:** Directorio corporativo + expediente RRHH gestionado 100% en Connectia.

**Requisitos:**
1. Directorio / teléfonos / datos útiles U+A (`21.*`): búsqueda, fichas, visibilidad por política. ✅
2. ~~Reemplazar stub PeopleCare por conector HTTP~~ → **Legajo local** (`EmployeeLegajo` + Admin → Legajos RRHH + `GET /me/peoplecare`). Conector HRIS externo diferido → **Ola 40** `40.m`.
3. Distinción miembro vs empleado: alta de legajo con o sin cuenta; perfil no se bloquea si no hay legajo. ✅
4. Exponer fechas cargo/nacimiento/ingreso en ficha de legajo (y UI admin usuarios si aplica). ✅

**Implementado (2026-07-28):** `DirectoryEntry` + favoritos; U `/directorio` (chips, urgencias, acciones llamar/WA/email/mapa, favoritos, Leaflet); A `/directorio`; APIs `/api/directory` y `/api/admin/directory`.

**Criterios:** directorio solo muestra datos autorizados del tenant; expediente ausente o incompleto **no** bloquea perfil.

---

### Ola 15 — Eventos y calendario (`06.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §6 Eventos y calendario |
| **IDs** | `06.01`–`06.07` + DoD |
| **Estado** | `cerrada` (núcleo) · postdev QA/DOC |

**Objetivo:** Agenda corporativa en app + calendarios personales (Outlook/Google) con sync bidireccional.

**Requisitos:**
1. Calendario corporativo U (listar/detalle eventos del tenant). ✅
2. A: alta/edición eventos, audiencia, multimedia. ✅
3. Confirmar / consultar / eliminar asistencia; reporte de confirmaciones A. ✅
4. Política tenant para conectar Outlook / Google; vista unificada si habilitado. ✅
5. Timezone IANA del tenant; deep link desde push. ✅
6. Sync bidireccional: al confirmar RSVP se copia al calendario personal; crear/editar/borrar eventos personales desde la app. ✅

**Implementado (2026-07-28):** `Event` + `EventRsvp` + `CalendarConnection`; U `/agenda` + `/agenda/:id`; A `/eventos`; APIs `/api/events`, `/api/admin/events`, `/api/calendar`; OAuth PKCE Outlook/Google; tokens AES-GCM; params `calendar.*.enabled`.

**Extras (nice-to-have + IA §6):** upload imagen `/api/admin/events/upload`; vista mes en Agenda; export CSV RSVP; IA redactar/extraer evento + sugerir horarios + “qué tengo hoy” (`eventAi.js`, heurística + LLM opcional).

**Criterios:** eventos acotados a tenant+audiencia; tokens OAuth nunca al cliente; fallo de proveedor no tumba agenda corporativa.

---

### Ola 16 — ABM de configuración (`27.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §27 ABM (usuarios, grupos, áreas, import) |
| **IDs** | `27.*` |
| **Estado** | `cerrada` (2026-07-29) · núcleo 2026-07-28 · postdev QA/DOC / IdP vault |

**Objetivo:** Operar la comunidad sin tocar código: personas y estructuras.

**Requisitos:**
1. CRUD usuarios del tenant (alta, edición, estado, roles/capabilities). ✅
2. Grupos y áreas; membresías. ✅
3. Import masivo archivo + Google (según spec); plantilla + errores por fila. ✅ CSV/XLSX; Google/Entra Directory/Graph + JSON
4. Campos de perfil/hitos administrables (soporte ola 8/14). ✅
5. Auditoría de cambios sensibles. ✅

**Entrega:**
- S: `PostCategory`, `Role`, `TenantParam` · `/api/admin/post-categories` · `/api/admin/roles` · `/api/admin/params` · `/api/admin/users/{template,preview,commit,directory/*}` · caps `admin.roles` / `admin.parametros` · `User.roleIds` + merge caps en auth · auditoría ampliada · Excel `xlsx` · Google JWT+Directory · Entra client-credentials+Graph
- A: `/usuarios` (import CSV/XLSX + Google/Entra) · `/organizacion` · `/roles` · `/parametros` · `/categorias-publicaciones`
- Tests: `ola16Abm.test.js`

**Pendiente postdev:** smoke QA, OpenAPI (`27.DOC`), configurar vault/env por tenant en prod.

---

### Ola 17 — Licencias, vacaciones y ausentismos (`13.*` · `12.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §13 · §12 |
| **IDs** | `13.01`–`13.05` · `12.01`–`12.04` |
| **Estado** | `cerrada` · 2026-07-28 · *12.04 adapter ECR mock/live* |

**Objetivo:** Trámites RRHH clásicos consumibles desde U y aprobables (UI + §41 + chatbot).

**Requisitos:**
1. Solicitar licencia/vacaciones; consultar saldos/devengados. ✅
2. Aprobar/rechazar/editar (líder/RRHH); reportes A. ✅
3. Ausentismos: solicitar, aprobar/rechazar, reporte; integración ECR (`12.04` adapter + mock; live con credenciales). ✅
4. Enganche a bandeja §41; intents chatbot ola 12 contra estas APIs. ✅ (stub eliminado)
5. Validaciones: solape, saldo, feriados (según reglas tenant). ✅ (solape + saldo + feriados nacionales y calendario por comunidad)

---

### Ola 18 — Asistencia, turnos y marcación (`11.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §11 · detalle en `ECRMOBILE-FUNCIONES-CONSOLIDADO.md` §11 |
| **IDs** | `11.01`–`11.11` (núcleo: 11.01, 11.02, 11.07, 11.08, 11.10, 11.ADM; vertical: 11.03–11.06, 11.09, 11.11) |
| **Estado** | `cerrada` (2026-07-29) · núcleo U/A/S · *Vertical deskless / operaciones* · postdev QA/DOC + vertical Geopop/ECR/DNI |
| **Menú U** | **Mi asistencia** · A: Asistencia y turnos |
| **Caps** | `asistencia` · `asistencia.marcar` · `asistencia.turnos` · `admin.asistencia` · vertical: `asistencia.geopop` / `asistencia.ecr` |

#### Objetivos de producto (no confundir)

1. **Marcación con geolocalización en el lugar asignado (núcleo):** el colaborador registra entrada/salida (o marca de presencia) desde el móvil capturando GPS; el empleador/supervisor puede verificar que estaba en el **lugar de trabajo asignado** (instalación / sede / geocerca del turno o servicio) en ese momento.
2. **Consulta de turnos:** ver “qué turno tengo hoy / esta semana” y el estado de marcación (sin marcar, en rango, fuera de rango, justificada).
3. **Historial y novedades:** el colaborador ve su histórico; el supervisor ve novedades de su equipo.
4. **Planificación admin:** ABM de turnos / asignaciones / lugares (coordenadas + radio) por tenant.
5. **Excepciones:** marcas fuera de rango, justificación, y (vertical) panel ECR / domingos / Geopop / DNI·QR.

#### Qué NO es esta ola (evitar solapamiento)

| Concepto | Dónde vive | Diferencia |
|----------|------------|------------|
| “Voy a la oficina” / check-in sede / quién está hoy | **Ola 21** (`OfficeDay`, §34·§35) | Declaración de presencia en coworking/sede para aforo y reservas — **no** es fichaje laboral ni control de asistencia RRHH |
| RSVP a un evento (“confirmo asistencia”) | **Ola 15** (§6) | Asistencia a evento corporativo, no turno laboral |
| Pregunta `geopoint` en encuesta | **Ola 5** (§15.05–.06) | Check-in puntual de facility/encuesta, no motor de turnos |
| Ausentismos / vacaciones | **Ola 17** (§12·§13) | Pedir no ir; aquí se marca cuando sí se trabaja |

> Regla al implementar: **no reutilizar** `OfficeDay` ni APIs de `/api/spaces` para fichaje. Modelos y caps propios de asistencia.

#### Requisitos núcleo (DoD mínimo para cerrar ola)

1. **Lugares asignados (A):** ABM de instalaciones/lugares con `lat`, `lng`, `radioMetros` (geocerca), timezone, activo; asociables a turno/servicio/usuario según política del tenant. ✅
2. **Mis turnos (U · `11.01`):** listado del colaborador (hoy / rango); detalle con lugar esperado y ventana horaria; empty states claros. ✅
3. **Marcación (U · `11.02`):** modos libre / en lugar / temporal; GPS → validación servidor; idempotencia; feedback en/fuera de rango. ✅
4. **Fuera de rango (`11.08` núcleo ligero):** política `allow|block|justify`; justificación opcional. ✅
5. **Historial / novedades (`11.07`):** U propias; supervisor (managerId) equipo; admin novedades. ✅
6. **CRUD turnos A (`11.10` + `11.ADM`):** crear/editar/cancelar/reemplazar; asignar colaborador + lugar + horario. ✅
7. **Authz / multi-tenant (`11.SEC`):** filtrado por `tenantId`. ✅
8. **Trazabilidad:** GPS, distancia, geocerca, `idempotencyKey`, `serverReceivedAt`, timezone. ✅

**Implementado (2026-07-29):**
- Modelos: `AttendancePlace` · `AttendanceShift` · `AttendancePunch` · `AttendancePolicy`
- U: `/mi-asistencia` · APIs `/api/attendance/my-shifts` · `/punch` · `/history`
- A: `/asistencia` · `/api/admin/attendance/places|shifts|punches|policy` · seed-defaults
- Caps: `asistencia*` · `admin.asistencia` · menú `ensureOla18Menu`
- Seed DEMO: `seedAttendanceForTenant` · tests `attendance.test.js`

**Pendiente postdev:** smoke QA · `11.DOC`/`11.UX`.

**Vertical local (2026-07-29):** prefichada Geopop mock · multi-instalación/servicio · QR punch · domingos agregados · panel ECR con `AttendancePunch` (+ amonestación/anexo persistidos). Sync Geopop/ECR/GeoVictoria **productivos** → **Ola 24** `NR.ECR` (no gap de esta ola).

**Postdev producto (2026-07-29):** tolerancia horaria · vigencia modo temporal · cola offline U · notif fuera de rango/tarde · historial TeamScope+manager · export CSV · GPS en ABM lugares.

#### Criterios de aceptación (núcleo)

- [x] Colaborador con turno + lugar asignado marca “en lugar” **dentro** del radio → marca `in_range`.
- [x] Misma persona marca **fuera** del radio → según política block/allow/justify.
- [x] Sin permiso GPS / accuracy insuficiente → no se inventa coordenada.
- [x] Modo libre (si tenant lo habilita) permite marcar sin geocerca.
- [x] Admin define lugar (coords + radio) y lo asigna a un turno.
- [x] Reintento con misma `idempotencyKey` no duplica marca.
- [x] Usuario de otro tenant no lee ni marca datos ajenos (filtro `tenantId`).
- [x] No se usa `OfficeDay` ni pantallas `/oficina` para este flujo.
---

### Ola 19 — PeopleCare + Onboarding (`14.*` · `16.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §14 · §16 |
| **IDs** | `14.01`–`14.10` · `16.*` |
| **Estado** | `cerrada` (2026-07-29) · núcleo + mejoras UX 2026-07-28 · *Vertical* · QA/DOC → postdev |
| **Decisión (2026-07-28)** | **`16.03` reusa el motor de encuestas §15** — no hay un segundo constructor. Misma UI admin (tipos de pregunta, IA, audiencia, agenda, offline, resultados). Un hito de onboarding/offboarding referencia `surveyId` (mismo patrón que `linkedSurveyId` en muro). Campo opcional `purpose` / etiqueta (`general` \| `onboarding` \| `offboarding`) solo para filtrar y reportar; el CRUD sigue siendo Admin → Encuestas. |

**Objetivo:** Legajo digital + ciclo de vida ingreso/egreso.

**Requisitos:**
1. Ficha colaborador y bloques (domicilio, familia, OS, banco, médica, contratos, skills, líderes). ✅
2. Catálogos RRHH A. ✅ (`/api/admin/hr-catalogs` + Admin → Catálogos RRHH)
3. Onboarding: plantillas, hitos, progreso U; offboarding (checklist + revocación accesos). ✅
4. **Encuestas de onboarding/egreso (`16.03`):** configurar con el motor §15. ✅ `Survey.purpose` + gancho post-`respond` → cierra hito.
5. Onboarding asistido por chatbot → **Ola 40** `40.n` (no reabrir en 19).
6. **Revisión UX/UI** U+A — **hecha** 2026-07-30 (Bienvenida, Mi legajo, Admin ingreso/egreso, fichas, listas, menú).

**Implementado (2026-07-28):**
- U: `/mi-legajo` (lectura + **autoservicio** `PATCH /api/me/peoplecare`), `/bienvenida`
- A: `/legajos` (selects desde catálogos), `/catalogos-rrhh`, `/onboarding` (cap `admin.onboarding`)
- APIs: `/api/admin/hr-catalogs`, `/api/hr-catalogs`, `/api/onboarding`, `/api/admin/onboarding`
- Notificación in-app + push al asignar onboarding/egreso
- Seed DEMO / ARCOR / **THEFORK** / **GRIDO** vía `seedOla19ForTenant`

**Criterios `16.03`:**
- [x] Admin crea/edita/publica la encuesta solo en §15 (cap `admin.encuestas`).
- [x] Hito tipo “encuesta” exige `surveyId` del tenant; U responde vía `POST /surveys/:id/respond`.
- [x] Completar respuesta válida cierra el hito; progreso recalculado en servidor.
- [x] Resultados/participación visibles en analítica §15 (filtro por purpose).

---

### Ola 20 — Beneficios, billetera y recompensas (`18.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §18 |
| **IDs** | `18.*` |
| **Estado** | `cerrada` (núcleo 2026-07-28) |

**Objetivo:** Beneficios visibles en app; canje/billetera según tenant.

**Requisitos:**
1. Catálogo U (listado, filtros, favoritos, detalle/condiciones, geo). ✅
2. ABM A con audiencia (all / áreas·grupos / personas). ✅
3. Billetera/puntos si capability `beneficios.billetera` (ledger inmutable + idempotencia). ✅
4. Premios (`kind=reward`) + canje con código/QR local. ✅
5. Partners genéricos (`beneficios.partners`) — sin hardcode Emp_Id; NR Claro puede extender. ✅
6. Tipo publicación `beneficio` en muro (ya existía). ✅
7. **Reglas de puntos por uso de comunidad** (`PointsRule`: publicar / reaccionar / comentar / guardar / compartir; tope diario; admin). ✅

**Implementado (2026-07-28):**
- U: `/beneficios`, `/beneficios/:id` (catálogo, premios, favoritos, **mapa Leaflet**, **carrito multi-ítem**, billetera, partners)
- Billetera legado: transferencias, **cobro QR temporal**, **pago por QR**, **retiro pending** (alias/CBU)
- A: `/beneficios` (CRUD, audiencia, partners, puntos, **reglas de puntos por comunidad**, **upload imagen**, lat/lng)
- APIs: `/api/benefits` (+ `/map`, `/cart/checkout`), `/api/wallet` (+ `/qr/*`, `/withdraw*`), `/api/admin/benefits` (+ `/upload`), `/api/admin/points-rules`
- Caps tenant: `beneficios`, `beneficios.billetera`, `beneficios.partners`
- Cap admin: `admin.beneficios`
- Seed ARCOR: catálogo + Club Arcor+ + geo + 2000 pts + reglas de puntos comunidad

**Paridad legado:** cubierta la UI/flujo U de `sooft_newapp_lite_back` Benefits (Catalog, Cart, Geolocation, PaymentQR, RecievePaymentQR, WithdrawCash, Wallet).  

**Gap producto (queda en ola 20):** —  

**Cómo llegar (2026-07-30):** ✅ Google Maps Directions (`directionsUrl` en API; ficha U pide geoloc para origen; mapa/cards con link). Sin API key: abre Maps del dispositivo.

**Movidos fuera de gaps ola 20:**
- PSP bancario · retiro productivo · KYC/conciliación → **Ola 40** `40.u` / `40.v` / `40.w` (**CAPRICHO**).
- Pack Claro / YoClaro → **Ola 24** `NR.CLARO`.
- Smoke QA / OpenAPI fino → postdev (no gap producto).

**Admin UX (2026-07-30):** ✅ previews imagen · wizard paso a paso · tipología `offerType`.

---

### Ola 21 — Reservas + coworking (`34.*` · `35.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §34 · §35 |
| **IDs** | `34.*` · `35.*` |
| **Estado** | `cerrada` (2026-07-29) · núcleo U/A/S · postdev QA/DOC |

**Objetivo:** Reservar salas/cocheras y puestos/hot desk; check-in sede. Target producto: **cualquier activo reservable** configurable.

**Requisitos:**
1. Catálogo recursos; disponibilidad; crear/cancelar reserva; aprobación si política. ✅
2. Mis reservas; notificaciones. ✅
3. Coworking: zonas/cupos; “voy a la oficina”; check-in. ✅ (plano gráfico → **Ola 40** `40.s`)
4. Intents chatbot → booking conversacional + confirmación (`assistantBooking`, ola 12). ✅
5. Admin: sedes, recursos, políticas, ocupación. ✅

**Entrega:**
- S: `SpaceSite` / `SpaceResource` / `SpacePolicy` / `Reservation` / `OfficeDay` · `/api/spaces/*` · `/api/admin/spaces/*` · caps `espacios.*` / `admin.reservas` · `notifySpaces` · tests `spaces.test.js`
- U: `/espacios` · `/oficina`
- A: `/reservas`
- Seed: `spacesSeed` + `seedClaroEspacios` / `seedOla21ForTenant` · menú `ensureOla21Menu`

**Gaps producto:** — (activos + UX cerrados 2026-07-30).

**→ Ola 40:** plano planta `40.s` · bundle 1-click `40.t`.

**Pendiente postdev:** smoke QA, `34.DOC`/`35.DOC`. Booking conversacional vía chat = hecho en ola 12.

---

### Ola 22 — Organigrama + Reportes (`37.*` · `29.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §37 · §29 |
| **IDs** | `37.*` · núcleo `29.01` `29.04`–`29.09` `29.14` (+ `29.SEC`/`29.UX`/`29.ADM`) |
| **Estado** | `cerrada` (2026-07-29) · núcleo U/A/S · postdev QA/DOC |
| **Creada** | 2026-07-29 |

**Objetivo:** Ver la estructura organizacional (áreas + líneas de reporte) e informes núcleo de uso/participación de la comunidad, solo del tenant activo.

#### Alcance núcleo (cierra la ola)

| Bloque | Qué entrega |
|--------|-------------|
| **Organigrama (§37)** | Vista árbol U + A; nodos de **áreas** (`parentId`) y **personas** (`managerId` / reporta-a); búsqueda; tap → directorio; ABM reporta-a en Usuarios. ✅ |
| **Reportes (§29 núcleo)** | Tablero **adopción**; **muro / engagement**; **encuestas**; **RSVP** (`29.03`); **trámites**; **export CSV**; capability `admin.reportes`. ✅ |

#### Fuera de alcance / diferido (no bloquea cierre)

- Quiet hours / tope de frecuencia de campañas → **Ola 40** `40.x` (**DESEABLE**).
- Historial fino de conexiones (`29.06` parcial — adopción usa `lastLoginAt` + canal) → **Ola 40** `40.y` (**CAPRICHO**).
- Import HRIS, organigrama matricial, IA “completar organigrama” → **Ola 40** `40.z` (**CAPRICHO**).

#### DoD

- [x] IDs núcleo `37.*` + `29` listados arriba en `desarrollado` (diferidos documentados).
- [x] Cero `if Emp_Id`; aislamiento por `tenantId`.
- [x] Menú U **Organigrama** + menú A **Reportes e informes**.
- [x] Admin puede asignar `managerId` sin ciclos; chart U/A refleja el cambio.
- [x] Reportes filtrables por rango de fechas; export CSV/XLSX = misma grilla.
- [x] Campañas impulso (`29.02`), vistas pubs (`29.04`), blanqueados/docs/ausentismos/live (`29.10`–`13`).
- [x] Reporte dedicado RSVP (`29.03`) en Admin `/reportes` tab RSVP · `/api/admin/reports/rsvp`.
- [x] Tests de libs (jerarquía personas + métricas + xlsx + RSVP agg) + `ensureOla22Menu`.
- [ ] `37.QA`/`29.QA` + DOC OpenAPI fino (postdev humano).

#### Entrega

- S: `User.managerId` · `PostView` · `DocumentDownload` · `lib/orgPeopleHierarchy` · `lib/orgChartBuild` · `lib/reportsMetrics` · `lib/xlsxExport` · `/api/org/chart` · `/api/admin/reports/*` (adoption/boost/wall/surveys/rsvp/requests/documents/absences/wiped/live) · wipe dispositivos · `ensureOla22Menu`
- U: `/organigrama` (+ telemetría vista al abrir pub)
- A: `/reportes` (CSV+XLSX, convocar, RSVP, en vivo) · Organización Personas · Usuarios reporta-a / blanqueo
- Caps: `admin.reportes`
- Tests: `ola22OrgReports.test.js`

**Pendiente postdev:** smoke QA humano + OpenAPI fino.

---

### Ola 23 — Seguridad, privacidad y cumplimiento (`43.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §43 |
| **IDs** | `43.01` · `43.QA` · `43.SEC` · `43.UX` · `43.ADM` · `43.DOC` |
| **Prioridad** | **IMPRESCINDIBLE** |
| **Estado** | `no hecha` |

**Objetivo:** Gate de go-live — controles mínimos de privacidad/cumplimiento para operar y vender enterprise.

**Requisitos:** consentimientos; retención por módulo; export/borrado o anonimización mínimos; logs de acceso sensibles; revocación al baja; sin cruce de tenants.

**Fuera de esta ola:** portal / catálogo / agentes (§42) → **Ola 43**.

---

### Ola 24 — Paridad por cliente · no-regresión (`NR.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | Particularidades por empresa (consolidado 0b) · [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md) |
| **IDs** | `NR.CLARO` `NR.GRIDO` `NR.ECR` `NR.EPEC` `NR.EMP60` |
| **Prioridad** | **IMPRESCINDIBLE** |
| **Estado** | `no hecha` |

**Objetivo:** Paridad operativa de clientes estratégicos en Connectia (mismo poder que legacy, o mejor vía genérico) **sin hardcode** — packs/capabilities + UAT por cliente.

> **Absorbido desde §30 / ex-mezcla Ola 28 (2026-07-30):** `30.01`–`30.07` (Salud, GeoVictoria, custom ECR/Claro/EPEC/Emp60/Grido). Canal WA de **plataforma** queda en Ola 28 `28.COM.07` (EPEC WTA operativo del pack sigue en `NR.EPEC`).

**Requisitos / gaps tema a tema:** [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md). UAT firmada por cliente = DoD del pack.

**`NR.ECR` — asistencia live (absorbido desde ola 18, 2026-07-30):**
1. Sync productivo **Geopop** (reemplaza prefichada mock `11.03` cuando el tenant tenga el pack).
2. **API ECR externa** para novedades/panel (hoy `11.11` es local sobre `AttendancePunch`).
3. Adapter **GeoVictoria** (`30.02`) + mapeo de marcas/turnos; sin Emp_Id hardcode.
4. Credenciales / env → **Ola 42** cuando el código del adapter exista (`.env.example` alineado).
5. Cruza con **Ola 31** Track I (panel supervisores) y ausentismos live `12.04` / `42.ecr.*`.

---

### Ola 25 — Operaciones de campo (`19.*` · `20.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §19 · §20 · [`CONNECTIA-OLA25-SPEC.md`](./CONNECTIA-OLA25-SPEC.md) |
| **Estado** | `cerrada` (2026-07-30) · núcleo U/A/S |
| **ADR** | Alarma = canal de Pedido (`source=alarm`) · **mapa admin en MVP** · Emp60 **fuera** (→ **24** `NR.EMP60` / **39**) |

**Entrega:**
- S: `Pedido` / `PedidoCategory` / `PedidoArticle` · `/api/pedidos` · `/api/admin/pedidos` (+ `/map`) · `notifyPedidos` · `ensureOla25Menu` · seed `seedOla25ForTenant.js` · tests `pedidos.test.js`
- U: `/alarma` · `/pedidos`
- A: `/pedidos` (bandeja · mapa · categorías · artículos)
- Caps: `pedidos` · `pedidos.alarma` · `admin.pedidos`

> **Supervisor comercial** → **Ola 31**. **Labels Emp60** → **Ola 24/39**. **Portal** → **Ola 43**.

---

### Ola 26 — Modo TV + Live streaming (`25.*` · `36.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §25 · §36 · *Ola 26 — Definiciones* en `CONNECTIA-OLAS.md` · ADR-GAPS **§H** |
| **IDs** | `25.*` · `36.01`–`36.03` |
| **Prioridad** | DESEABLE |
| **Estado** | `cerrada` · código 2026-07-30 · DoD Track A + Track B |
| **≠** | **Ola 36** backlog (`36.a`–`36.p` Connectyx) — no confundir con §36 Live |

**Objetivo:** Pantallas de sede (playlist + pairing) y broadcasts por **URL externa**. Sin ingest RTMP/WebRTC propio.

**Requisitos:**
1. Cap `tv.mode` / `admin.tv` + menú. ✅
2. Reproducción kiosk `/tv` resiliente. ✅
3. Emparejamiento código 6 dígitos (TTL 5 min, 5 intentos) · credencial device. ✅
4. Admin dispositivos + playlist. ✅
5. Feed manifiesto + ETag. ✅
6. Cap `live.stream` / `admin.live` · URL externa · badge LIVE · views. ✅
7. Tests + seed DEMO. ✅

**Fuera / diferido:** MQTT · ingest nativo · chat del live · co-hosts · DVR · OpenAPI formal (postdev).

**Entrega:**
- S: `TvDevice` / `TvPairingSession` / `TvPlaylist` / `LiveBroadcast` · `/api/tv/*` · `/api/admin/tv/*` · `/api/live/*` · `/api/admin/live/*` · `ensureOla26Menu` · `seedOla26ForTenant.js` · tests `ola26TvLive.test.js`
- U: `/tv` (kiosk) · `/tv/emparejar` · `/en-vivo` · badge LIVE en muro
- A: `/modo-tv` · `/live`
- Caps: `tv.mode` · `admin.tv` · `live.stream` · `admin.live`

---

### Ola 27 — Desarrollo de talento + Cultura (`38.*` · `39.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §38 · §39 |
| **IDs** | `38.*` · `39.*` |
| **Estado** | `cerrada` (2026-07-29) · núcleo U/A/S · postdev QA/DOC |

**Objetivo:** Desarrollo del miembro (OKR, desempeño, carrera, LMS, vacantes) + cultura (reconocimientos, marketplace, referidos, pulso). Activable por capability.

**Requisitos:**
1. OKRs por ciclo con KR y progreso auditado. ✅
2. Evaluación formal + feedback continuo. ✅
3. Plan de carrera (rol, gaps, hitos). ✅
4. LMS: catálogo, asignación, progreso, quiz, certificado. ✅
5. Vacantes internas + postulación. ✅
6. Referidos vinculados a vacante; premio post-hito. ✅
7. Pulso/eNPS con umbral de anonimato. ✅
8. Marketplace interno + moderación. ✅
9. Reconocimientos peer/líder con valores de empresa + notif. ✅

**Entrega:**
- S: modelos `Talent.js` / `Culture.js` · `/api/talent` · `/api/admin/talent` · `/api/culture` · `/api/admin/culture` · caps `talento.*` / `cultura.*` / `admin.talento` / `admin.cultura` · `ensureOla27Menu` · `seedTalentCultureForTenant` · `notifyTalentCulture` · tests `talentCulture.test.js`
- U: `/mi-desarrollo` · `/cultura`
- A: `/talento` · `/cultura`
- Seed: `seedOla27ForTenant.js` + botón admin “Cargar datos demo”

**Pendiente postdev:** smoke QA, `38.DOC`/`39.DOC`, cascada OKR empresa→área, SCORM/xAPI, ATS externo.

**Gaps de producto cerrados (2026-07-29):** picker de personas (U/A) · reconocimiento → muro (`celebracion`) · puntos §18 (`recognition_received` + pts manuales) · marketplace → chat 1:1.

---

### Ola 28 — Centro de comunicaciones de plataforma (`28.COM.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | *Ola 28 — Definiciones* en `CONNECTIA-OLAS.md` · testigo Hiryx · consolidado §31/§30.08 |
| **IDs** | `28.COM.00`–`28.COM.10` · `28.COM.QA/SEC/UX/ADM/DOC` |
| **Prioridad** | **IMPRESCINDIBLE** |
| **Estado** | `cerrada` · código 2026-07-30 |
| **Testigo** | `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas` |

**Entrega:**
- Cap `admin.comunicaciones` + menú A `/comunicaciones`
- Tipos CRUD · plantillas multi-canal + placeholders · generar con IA
- Wizard envío masivo · outbox · health canales
- Email (`emailService` + DEV fallback) · WhatsApp Meta Cloud + webhook · SMS Twilio
- Adjuntos por URL en envío · tests `communications.test.js`

**Fuera de esta ola (2026-07-30):**
| Origen | Destino |
|--------|---------|
| `30.01`–`30.07` packs/custom Claro·Grido·ECR·EPEC·Emp60·Salud·GeoVictoria | **Ola 24** `NR.*` |
| `30.10` SAP | **Ola 40** `40.f` |
| Jira | **Ola 40** `40.c`–`40.e` (ya estaban) |
| `30.09` Maps | Parcial en módulos; no bloquea |
| Inventario §33 backends legacy | Doc · no UI 28 |
| Secretos mail/WA/Twilio prod | **Ola 42** |
| PWA endurecida / soporte admin genérico | Residual §31 · ≠ núcleo COM |

**Pendiente postdev:** smoke humano DEMO · OpenAPI fino · adjuntos SMTP binarios (hoy URL).

---

### Ola 29 — Chat conversacional del asistente (`29.CONV`)

| Campo | Valor |
|-------|--------|
| **Spec** | *Ola 29 — Definiciones* en `CONNECTIA-OLAS.md` |
| **IDs** | **`29.CONV`** solamente |
| **Prioridad** | **IMPRESCINDIBLE** |
| **Estado** | `cerrada` · código 2026-07-30 |

**Requisito único:**
1. **`29.CONV` — Trámites 100% conversacionales:** multi-turno hablado; slot-filling por diálogo; confirmación “sí/no” **en el chat**; sin depender de chips ni confirm-card con botones.

**Entrega:**
- UI: sin confirm-card Sí/No; chips solo en welcome (opcional); hint “confirmá con sí / cancelá con no”.
- Backend: `assistantLicenseDraft` (vacaciones/ausencias multi-turno fechas → motivo → confirmación hablada); copy sin “tocá Confirmar” en solicitudes/reservas; entrada vaga “quiero hacer un trámite” pregunta el tipo.
- Tests: `assistantLicenseDraft.test.js` · suite backend OK.

**Movido a Ola 40 (no es esta ola):**
| Id | Nivel | Qué |
|----|-------|-----|
| `40.n` | **DESEABLE** | Modos Sammy |
| `40.o` | **CAPRICHO** | Asistente de contenido (`24.04`) |
| `40.p` | **CAPRICHO** | Asistente de carga (`24.05`) |
| `40.q` | **CAPRICHO** | QR → vista (`24.06`) |
| `40.r` | **CAPRICHO** | QR DNI (`24.07`) |

---

### Ola 30 — Modernización UX residual (§45)

| Campo | Valor |
|-------|--------|
| **Spec** | §45 residual |
| **Estado** | `no hecha` · *Continuo* |
| **Prioridad** | NECESARIO |

**Alcance (único):**
1. **§45** modernización UX residual (microinteracciones / empty-loading-error / spinners donde piensa / companion desktop U / **admin A estilo Hiryx desktop** — MainLayout + títulos sticky lila en todas las pantallas / `*.UX` pendiente o parcial / auditoría flujos críticos).

**Fuera (no son esta ola):**
- ~~§44 deuda a no migrar~~ — guía permanente del consolidado; **no** trackear como ítem de ola.
- ~~Cierre de diferidos~~ — no útil como ola; cada diferido se decide en su ola destino.
- §32.* reubicados o hechos (ver tabla abajo / inventario).

| ID / tema | Dónde |
|-----------|--------|
| `32.01` Recibos | **40** `40.l` |
| `32.02` Videollamadas | **40** `40.i`–`40.k` |
| `32.03` Turno carnet | **Hecho** · tipo solicitud `turno_carnet` (§9 / ola 4) |
| `32.04` Atenciones | **43** |
| `32.05` Mapa alarmas | **25** |
| `32.06` Visitas | **24** `NR.EPEC` |
| `32.07` Docs dashboard | **42** `42.docs` |
| `32.08` Stories | muro §4 |
| `32.09` Admin beneficios | **20** |
| `32.10` Swagger | **42** `42.openapi` |

---

### Ola 31 — Supervisión comercial completa (`23.*` · panel ECR)

| Campo | Valor |
|-------|--------|
| **Spec** | §23 (ampliado) · cruza `11.11` / `NR.ECR` para panel ECR |
| **IDs** | `23.00`–`23.42` · `23.ECR.*` · `23.IA` · `23.QA/SEC/UX/ADM/DOC` |
| **Estado** | `cerrada` · Postdev completo 2026-07-29 (offline / XLSX / taxonomía / permisos / IA) |
| **Creada** | 2026-07-29 |
| **Spec detallada** | [`CONNECTIA-OLA31-OLA32-SPEC.md`](./CONNECTIA-OLA31-OLA32-SPEC.md) · Parte A |

#### Testigos (fuente de verdad de paridad)

| Repo / path | Rol |
|-------------|-----|
| [`sooft/sooft-frontend-supervisores`](https://github.com/sooft/sooft-frontend-supervisores) | App escritorio/PWA Next.js (ABM, gestión tareas, templates, roles, home, config) |
| [`sooft/sooft-backend-supervisores`](https://github.com/sooft/sooft-backend-supervisores) | API NestJS + Prisma (todos los módulos `api/*`) |
| `sooft_newapp_lite_back/src/views/supervisor-mod/` | Embebido móvil legado (tareas comerciales en YoMob) |
| `sooft_newapp_lite_back/src/views/Supervisors/` | Panel **ECR**: marcas fuera de rango + domingos adicionales |
| `sooft_newapp_lite_back` · `tareasService.js` / `tareasOffline.js` | Contrato offline + endpoints móviles |

> Clonados localmente bajo `SUPERVISoRVIRTUAL/` (gitignored). **No copiar** deuda §44; reimplementar en stack Connectia (Vue 3 / Node / Mongo) con **paridad funcional**.

#### Concepto de producto (igual que el testigo)

Sistema de **supervisión comercial de campo**: master data (cadenas → salas → clientes → asignaciones), **plantillas checklist** con mediciones/pilares, **ciclo de vida de tareas** (crear / asignar / ejecutar / completar con evidencia), **roles granulares por pantalla**, notificaciones push, **offline-first** en móvil, y (pack ECR) **herramientas de supervisión de marcas**.

**Roles canónicos del testigo:** Operario · Supervisor · Plataforma Comercial · Gestor · Administrador (`rol_id` 5 / nombre admin).

**Pantallas de menú (`permisos_config`):** Inicio · Historial de Tareas · Templates · ABM Cliente/Sala · ABM Cliente · ABM Sala · ABM Cadena · ABM Subcadena · ABM Asignaciones · Roles · Configuraciones.

#### DoD de la ola

- [x] Cada ID `23.*` / `23.ECR.*` en `desarrollado` (o `diferido` con justificación — `23.SV.*` = Ola 32)
- [x] Capability por tenant; **cero** `if Emp_Id`
- [x] Secretos ECR / FCM / files **solo en backend Connectia** (BFF)
- [x] Smoke U: crear tarea desde template → asignar → completar con foto + cola offline
- [x] Smoke A: ABM + import XLSX + roles/permisos
- [x] Smoke ECR (si capability): listar marcas → justificar / amonestar / anexo (mock sin env)
- [x] `23.QA` + `23.SEC` + `23.DOC` (tests + spec/STATUS)

---

#### Track 0 — Fundación Connectia

| ID | Qué entregar | Paridad testigo |
|----|--------------|-----------------|
| `23.00` | Cap `supervision.comercial` (+ subcaps: `supervision.abm`, `supervision.templates`, `supervision.roles`, `supervision.ecr`) · ítem menú U/A | Feature flag por tenant |
| `23.40` | BFF `/api/supervision/*` que proxyea o reimplementa dominio; `tenantId` obligatorio; sin API keys en front | Controllers Nest `api/*` |
| `23.SEC` (arranque) | Authz Connectia JWT + mapeo usuario↔roles supervisión | `usuarios/:id/rol` + `permisos_config` |

---

#### Track A — Home y gestión de tareas (U/A)

| ID | Función | Detalle / criterios |
|----|---------|---------------------|
| `23.01` | Home / dashboard | KPIs y accesos rápidos como `/home` del front testigo (charts si hay datos) |
| `23.02` | Historial de tareas | Lista filtrable: estado, prioridad, sala, asignado, fechas, búsqueda; paginación; empty/loading/error |
| `23.03` | Detalle tarea | `/gestion-tareas/[id]`: datos, estado, asignado, template, mediciones, comentarios, adjuntos, historial actividad |
| `23.04` | Crear tarea libre | Campos: `tarea_titulo`, `tarea_descripcion?`, `tarea_fecha_limite`, `tarea_nota?`, `tarea_tipo`, `usuario_asignado_id?`, `usuario_creador_id`, `sala_id`, `prioridad_id`, `tarea_estado_id?` (default Pendiente), `template_id?`, `tarea_requiere_foto?` |
| `23.05` | Crear desde template | Flujo `DesdeTemplate` / `CrearDesdeTemplate` / plantillas-checklist → instancia con snapshot de mediciones |
| `23.06` | Asignar / reasignar | Cambio `usuario_asignado_id`; conserva historial; dispara push `23.34` |
| `23.07` | Completar | Modal CompleteTask; bloquea si falta foto cuando `tarea_requiere_foto`; set `tarea_fecha_completado` |
| `23.08` | Estados | CRUD `tareas-estados`; solo transiciones autorizadas (auditoría) |
| `23.09` | Prioridades | CRUD `prioridades` |
| `23.39` | Hub móvil embebido | Paridad `supervisor-mod`: TareasComerciales, AsignacionTareas, MisActividades, CrearTarea, TareasSala, DetalleTarea |

**APIs testigo a cubrir:** `POST/GET/PATCH/DELETE /api/tareas`, `GET/POST… /api/tareas-estados`, `/api/prioridades`.

---

#### Track B — Ejecución en campo (evidencia)

| ID | Función | Detalle |
|----|---------|---------|
| `23.10` | Comentarios | CRUD + `count` + `count/tarea/:id` + listado por tarea |
| `23.11` | Adjuntos | `POST` binario + `POST metadata`; `GET` filtros; `GET proxy`; counts por comentario/tarea/medición; PATCH/DELETE |
| `23.12` | Respuestas de tarea | CRUD `tareas-respuestas` + get por tarea |
| `23.13` | Observaciones mediciones | CRUD + counts globales / por tarea / por medición |
| `23.14` | Mediciones en ejecución | Completar ítems del checklist de la tarea en curso |

---

#### Track C — Templates / checklist / taxonomía

| ID | Función | Detalle |
|----|---------|---------|
| `23.15` | Templates | CRUD `/api/templates` · UI `/plantillas-checklist` |
| `23.16` | Mediciones-template | Nested: create/list/get/put/delete mediciones de un template |
| `23.17` | Categorías | CRUD `/api/categorias` (color, nombre, emp) |
| `23.18` | Pilares | CRUD `/api/pilares` |
| `23.19` | Pilares-mediciones | CRUD + get por nombre de pilar |
| `23.20` | Items | CRUD `/api/items` |
| `23.21` | Mediciones catálogo | CRUD `/api/mediciones` |
| `23.42` | Templates-estados | CRUD `/api/templates-estados` |

**Regla de negocio (spec §23):** plantilla versionada / snapshot — editar template **no** muta tareas ya creadas.

---

#### Track D — Master data ABM (+ imports)

| ID | Pantalla testigo | Endpoints |
|----|------------------|-----------|
| `23.22` | `/abm/cadena` | CRUD + `POST importar-xlsx` `/api/cadenas` |
| `23.23` | `/abm/subcadena` | CRUD + import `/api/subcadenas` |
| `23.24` | `/abm/cliente` | CRUD + import `/api/clientes` |
| `23.25` | `/abm/sala` | CRUD + import `/api/salas` (+ mapa/coords si aplica) |
| `23.26` | `/abm/cliente-sala` | CRUD `/api/clientes-salas` + import |
| `23.27` | `/abm/asignaciones` | `agregar/editar/eliminar-colaborador` + `importar-asignaciones-xlsx` |
| `23.28` | Ubicaciones en forms | `GET /api/ubicaciones/paises|regiones|comunas` |
| `23.41` | Espejo Admin Connectia | Mismas operaciones bajo caps `admin.supervision.*` |

---

#### Track E — Roles, permisos y usuarios

| ID | Función | Detalle |
|----|---------|---------|
| `23.29` | Roles CRUD | `/api/roles` |
| `23.30` | Permisos pantalla/acción | `GET/PUT :id/permisos` · `permisos-config` · `con-permisos-config` · menú dinámico según keys |
| `23.31` | Usuario↔rol | assign, verificar-relaciones, delete rol, bulk `POST roles/bulk`, import/delete XLSX `usuarios-roles` |
| `23.32` | Usuarios | list, con-roles, get by id, get/put rol |

**Pantallas que deben respetar permisos parciales:** Inicio, Historial de Tareas, Templates, cada ABM*, Roles, Configuraciones. Admin (`rol_id=5` / nombre administrador) = acceso total.

---

#### Track F — Notificaciones

| ID | Función | Fuente |
|----|---------|--------|
| `23.33` | Push al crear tarea (rol Gestor) → Supervisores + Plataforma Comercial del tenant | `README_NOTIFICACIONES.md` |
| `23.34` | Push al asignar → Operario | idem |
| `23.35` | Auditoría + fallback email si no hay token FCM | tabla notificaciones; estados ENVIADO/FALLIDO/PENDIENTE |

Integrar con infraestructura push Connectia (§7) cuando exista; no duplicar FCM en el cliente.

---

#### Track G — Offline + PWA

| ID | Función | Paridad |
|----|---------|---------|
| `23.36` | Offline-first | Cache GET (clientes-salas, salas, etc.); cola POST/PATCH en store; sync ordenada; idempotencyKey; UI pendiente/fallido/conflicto |
| `23.37` | PWA | manifest + SW + install prompt (`/pwa`) |
| — | Criterios §23 offline del consolidado | No borrar cola hasta ACK; conflictos visibles |

---

#### Track H — Config / i18n / doc modelo

| ID | Función |
|----|---------|
| `23.38` | `/configuracion` + i18n es/en |
| `23.DOC` | OpenAPI Connectia + tabla de mapeo endpoint testigo → endpoint Connectia; nota MER (`/mer` del testigo = diagrama ER de referencia, no producto U) |

---

#### Track I — Panel ECR supervisores (pack `supervision.ecr` / NR.ECR)

| ID | Función | API externa (via BFF) |
|----|---------|----------------------|
| `23.ECR.01` | Hub: Marcas fuera de rango + Domingos adicionales | UI `Supervisors/supervisor.vue` |
| `23.ECR.02` | Lista marcas por `pernrSupervisor` + fecha | `GET …/getMarcasFueraRango` |
| `23.ECR.03` | Detalle: mapa, foto marca, datos trabajador | `MarksOutOfRangeDetail` + Map component |
| `23.ECR.04` | Justificar | `GET getJustificaciones` → `POST setJustificarFueraRangos` |
| `23.ECR.05` | Anexo contrato | `POST setAnexoContratoFueraRango` |
| `23.ECR.06` | Amonestar | `POST setAmonestarFueraRango` |
| `23.ECR.07` | PDV/proyectos cercanos | `GET getProyectos?division&latRef&lngRef` |
| `23.ECR.08` | Domingos adicionales | `GET getReporteDomingosAdicionales?pernrSupervisor=` |
| `23.ECR.09` | BFF: `VUE_APP_ECR_SUPERVISORS_API` + `API_KEY` **solo servidor** | Nunca `x-api-key` en PWA |

Cruza con `11.11` Panel supervisores ECR: al cerrar Track I, marcar también `11.11` según DoD asistencia.

---

#### Track J — IA (opcional por capability)

| ID | Elemento | Quién confirma |
|----|----------|----------------|
| `23.IA` | Priorizar visitas/tareas; resumir desempeño del día; detectar outliers de asignaciones | Supervisor (humano confirma) |

---

#### Matriz de endpoints backend testigo (checklist implementación)

```
/api/usuarios                  GET list | GET con-roles | GET :id | GET/PUT :id/rol
                               GET :id/rol/:rol_id/verificar-relaciones | DELETE :id/rol/:rol_id
                               POST roles/bulk
/api/usuarios-roles            POST importar-xlsx | DELETE eliminar-xlsx
/api/roles                     CRUD + permisos + permisos-config
/api/cadenas|subcadenas|clientes|salas   CRUD + importar-xlsx
/api/clientes-salas            CRUD + importar-xlsx + importar-asignaciones-xlsx
                               + agregar|editar|eliminar-colaborador
/api/ubicaciones               paises | regiones | comunas
/api/categorias|pilares|pilares-mediciones|items|mediciones   CRUD
/api/templates                 CRUD + mediciones-templates nested
/api/templates-estados         CRUD
/api/tareas                    CRUD + test-push
/api/tareas-estados|prioridades            CRUD
/api/tareas-respuestas         CRUD + get por tarea
/api/comentarios               CRUD + counts
/api/observacion-mediciones    CRUD + counts
/api/adjuntos                  POST | POST metadata | GET | proxy | counts | PATCH | DELETE
/api/health/database           health
```

#### Fuera de alcance / no migrar (§44)

- Hardcode `Emp_Id`, API keys en front, URLs de dev hardcodeadas en cliente.
- Copiar Nest/Next tal cual: **reimplementar** en Connectia.
- Página `/mer` como producto usuario (solo referencia de modelo).
- Storybook/scripts seed del testigo (herramientas internas).

#### Orden de implementación sugerido dentro de la ola

1. Track 0 (caps + BFF + authz)  
2. Track E (roles) mínimo viable + Track D (salas/clientes) mínimo  
3. Track C (1 template + mediciones)  
4. Track A + B (ciclo tarea completo)  
5. Track G offline  
6. Track F push  
7. Track I ECR (si tenant NR)  
8. Track J IA · QA/DOC  

---

### Ola 32 — Supervisor Virtual de equipo (`23.SV.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | Capa de **alcance organizacional** sobre módulos Connectia ya existentes (§4 muro · §6 eventos · §7 notificaciones · §8 chat · §9/§15 · §17) |
| **IDs** | `23.SV.00`–`23.SV.13` · `23.SV.QA/UX/DOC` |
| **Estado** | `cerrada` · 2026-07-29 · postdev: encuesta/doc E2E + UI alcance + ficha/timeline |
| **Creada** | 2026-07-29 |
| **Depende de** | Audiencias (áreas/grupos/personas) ya usadas en muro/notif/eventos · idealmente Ola 16 (org) · complementa **Ola 31** (tareas de campo) |
| **Spec detallada** | [`CONNECTIA-OLA31-OLA32-SPEC.md`](./CONNECTIA-OLA31-OLA32-SPEC.md) · Parte B |

#### Concepto de producto

El **Supervisor Virtual** no solo gestiona tareas comerciales: puede **generar elementos de la app Connectia** (publicaciones, eventos, agenda, notificaciones, encuestas/consultas, documentos, chat de equipo, etc.) **únicamente para sus supervisados**, y **seguir lo que hacen** (actividad, tareas, participación) dentro de su alcance.

| Actor | Qué puede |
|-------|-----------|
| **Supervisor** | Ver hub «Mi equipo»; crear contenido con audiencia fija = su equipo; ver timeline/ficha de cada supervisado |
| **Supervisado** | Recibe solo lo dirigido a él/su equipo; no ve el composer de supervisor ni datos de compañeros fuera de política |
| **Admin tenant** | Define quién es supervisor, cómo se arma el alcance (área / grupo / lista), y qué tipos de elemento puede crear |

> **No es** un admin completo: no opera el tenant entero. **Sí es** un rol con permisos de **creación acotada** + **lectura de seguimiento** sobre su equipo.

#### DoD de la ola

- [x] Capability `supervision.equipo` (independiente de `supervision.comercial`)
- [x] Alcance resuelto **en servidor** (nunca confiar solo en el cliente)
- [x] Un supervisor **no** puede publicar ni listar fuera de su equipo
- [x] Composer U: muro + evento/agenda + notificación + encuesta + documento + chat
- [x] Hub «Mi equipo» + ficha + timeline de actividad
- [x] Sin `if Emp_Id`; cruce con módulos existentes por **audiencia**, no forks de código por cliente
- [x] `23.SV.QA` + `23.SV.DOC` cerrados

---

#### Track 0 — Alcance y foundation

| ID | Qué entregar |
|----|--------------|
| `23.SV.00` | Cap `supervision.equipo` + menú U «Mi equipo» / «Supervisión» |
| `23.SV.02` | Modelo `TeamScope`: formas **combinables** área · área+cliente · grupo · personas a mano; N equipos por supervisor; recalc al cambiar org |
| `23.SV.12` | Middleware/authz: toda mutación y query filtra por `scope.memberIds` del actor |

---

#### Track A — Hub y seguimiento

| ID | Qué entregar |
|----|--------------|
| `23.SV.01` | Hub U: lista de supervisados, contadores (pendientes, avisos, tareas si Ola 31), CTA «Crear para mi equipo» |
| `23.SV.09` | Timeline unificada: pubs del equipo, eventos, notifs enviadas, tareas (si hay), ausencias/licencias visibles según caps |
| `23.SV.10` | Ficha de supervisado: perfil básico + actividad reciente + estado (tareas/asistencia si caps) |
| `23.SV.13` | Vista supervisado: bandeja/muro/agenda solo con ítems de su alcance; sin UI de gestión de equipo |

---

#### Track B — Generar elementos de la app (solo equipo)

| ID | Elemento Connectia | Comportamiento |
|----|--------------------|----------------|
| `23.SV.03` | **Publicaciones (muro)** | Crear post con audiencia forzada = mi equipo (no «toda la empresa») |
| `23.SV.04` | **Eventos / agenda** | Crear evento visible/RSVP solo para el equipo |
| `23.SV.05` | **Notificaciones / push** | Campaña o aviso in-app+push solo a memberIds del alcance |
| `23.SV.06` | **Encuestas / consultas** | Lanzar encuesta o consulta rápida al equipo (reusa §15 / §9) |
| `23.SV.07` | **Documentos / acuse** | Publicar doc o aviso de lectura solo al equipo (§17 si disponible) |
| `23.SV.08` | **Chat de equipo** | Crear/abrir grupo con los supervisados actuales (§8) |
| `23.SV.11` | **Composer unificado** | Una entrada U: elegir tipo → formulario del módulo → audiencia precargada e inmutable = equipo |

**Regla transversal:** la audiencia «mi equipo» es un **preset de alcance**, no un bypass de permisos del módulo. Si el tenant no tiene el módulo (ej. sin encuestas), esa opción no aparece.

---

#### Track C — Admin y gobierno

| Tema | Requisito |
|------|-----------|
| Quién es supervisor | Rol/cap Connectia; un usuario puede tener 0..N equipos |
| Cómo se arma el equipo | Preferir área/grupo org (Ola 16); permitir override lista de personas |
| Qué puede crear | Subcaps: `supervision.equipo.muro`, `.eventos`, `.notif`, `.encuestas`, `.docs`, `.chat` |
| Auditoría | Toda creación registra actor, alcance, tipo, correlationId |
| Privacidad | El supervisor no ve datos sensibles fuera de política (p. ej. recibos); solo señales habilitadas |

---

#### Criterios de aceptación (resumen)

- [ ] Supervisor A no ve ni notifica al equipo del supervisor B.
- [ ] Supervisado recibe pub/evento/notif del suyo y **no** las de otro equipo.
- [ ] Quitar a alguien del alcance deja de recibir nuevos ítems; los ya publicados conservan historial según política.
- [ ] Admin tenant sigue pudiendo publicar a «todos»; el supervisor **no** obtiene ese poder.
- [ ] Si Ola 31 está activa, la timeline puede incluir tareas de campo del equipo (unión, no duplicar UI).

#### Fuera de alcance de esta ola

- Reemplazar Ola 31 (tareas comerciales / ECR).
- Convertir al supervisor en admin de plataforma / ABM master data.
- Moderación global del muro o campañas a todo el tenant.
- Nuevos módulos de negocio que aún no existan en Connectia (solo **reusar** los que ya estén desarrollados).

#### Orden sugerido dentro de la ola

1. `23.SV.00` + `23.SV.02` + `23.SV.12` (alcance real en S)  
2. Hub + ficha (`23.SV.01`, `23.SV.10`)  
3. Composer + muro + notif (`23.SV.11`, `23.SV.03`, `23.SV.05`)  
4. Eventos/agenda (`23.SV.04`)  
5. Resto de tipos según caps del tenant  
6. Timeline (`23.SV.09`) + QA/DOC  

---

### Ola 33 — Integración Rendi / DocuFlow (`33.RENDI.*`) — ola especial

| Campo | Valor |
|-------|--------|
| **Tipo** | **Ola especial de integración** (producto hermano Sooft, no módulo greenfield del catálogo ECR) |
| **Spec producto** | `C:\Users\lenovo\Documents\docuflow` · `FUNCIONES-RENDI.md` · comercial https://rendi.sooft.tech/ |
| **IDs** | `33.RENDI.00`–`33.RENDI.10` · `33.RENDI.QA/SEC/UX/DOC` |
| **Estado** | `no hecha` · *bajo demanda comercial* |
| **Creada** | 2026-07-29 |
| **Menú U** | **Mis rendiciones** / **Viáticos** (default; renombrable §28) |
| **Caps** | `integracion.rendi` · `rendiciones` · sub: `rendiciones.cargar` · `admin.rendiciones` |
| **Depende de** | Tenant + menú (ola 2) · hub §46 (opcional) · notificaciones ola 7 (estados) · workflows ola 11 (aprobación opcional) |

#### Para qué sirve (objetivo de negocio)

Que la comunidad Connectia ofrezca a sus colaboradores un camino claro para **cargar y rendir gastos de viaje / viáticos / comprobantes**, apoyándose en **Rendi (DocuFlow)** — sistema ya existente de Sooft — en lugar de armar otro Excel o reescribir un motor de IA contable dentro de Connectia.

| Quién | Qué logra con esta ola |
|-------|------------------------|
| **Colaborador / viajero** | Desde la app Connectia entra a “Mis rendiciones”, sube la **foto del ticket**, la **IA de Rendi** lee y estructura el comprobante, lo asocia a su rendición y sigue el estado (borrador → revisión → aprobada/rechazada). |
| **Aprobador / jefe / admin gastos** | Revisa y aprueba en Rendi (o, si se configura, con bandeja §41); ve totales vs viáticos. |
| **Contabilidad** | En Rendi: plan de cuentas, reglas de imputación, asientos; export PDF/Word/Excel. Camino a **ERP** cuando Rendi lo tenga (Connectia **no** reemplaza el ERP). |
| **Admin de la comunidad Connectia** | Activa la capability, configura URL/credenciales de la instancia Rendi, mapea usuarios; no opera el plan de cuentas dentro de Connectia. |

#### Relación Connectia ↔ Rendi (arquitectura de producto)

```
[App Connectia U] --SSO/deep-link--> [Rendi / DocuFlow]
        |                                    |
   cap por tenant                     IA + comprobantes
   menú / hub / push                  rendiciones + cuentas
        |                                    |
        +---- webhook/API estados <----------+
                                             |
                                      [ERP] (futuro / vía Rendi)
```

**Regla de oro:** Connectia **orquesta acceso y experiencia de comunidad**; Rendi **posee** captura, IA, rendiciones, viáticos, plan de cuentas y asientos. **No** se clona el backend de Docuflow dentro del repo Connectia.

#### Qué NO es esta ola

| Confusión | Dónde va en realidad |
|-----------|----------------------|
| Biblioteca de documentos / políticas | §17 · ola 5/13 |
| Solicitudes / tickets genéricos | §9 · ola 4 |
| Check-in oficina / coworking | Ola 21 |
| Marcación GPS de asistencia laboral | Ola 18 |
| Reimplementar Claude+comprobantes+asientos en Connectia | **Fuera** — eso es Rendi |
| ERP completo SAP/Tango | Ola 40 `40.f` / Rendi `33.RENDI.10`; Connectia no es ERP |

#### Requisitos núcleo (DoD mínimo)

1. **`33.RENDI.00`:** capability off por defecto; al activarla aparece menú U (y opcional tarjeta hub §46).
2. **`33.RENDI.01`:** Admin configura `baseUrl` de la instancia Rendi, modo auth (SSO / token / deep-link firmado), y flags; secretos fuera del cliente.
3. **`33.RENDI.02` + `.08`:** el usuario Connectia abre Rendi **ya identificado** (o con mapeo email/externalId); sin compartir password en claro.
4. **`33.RENDI.03`:** pantalla U con CTA “Rendir gasto / Cargar comprobante” + listado resumen de mis rendiciones (vía API Rendi o redirect a listado Rendi).
5. **`33.RENDI.04`:** la carga y extracción IA ocurren **en Rendi** (foto JPG, cola IA, datos estructurados) — Connectia no duplica prompts Claude.
6. **`33.RENDI.05` + `.06`:** Connectia puede mostrar estado y notificar cambios relevantes (aprobada / rechazada) si hay API o webhook.
7. **`33.RENDI.SEC`:** aislamiento por tenant; una comunidad no ve rendiciones de otra; credenciales por comunidad.

#### Vertical / diferible (no bloquea cierre núcleo)

| ID | Qué | Cuándo |
|----|-----|--------|
| `33.RENDI.07` | Aprobación vía bandeja workflows §41 | Tenant quiere unificar aprobaciones en Connectia |
| `33.RENDI.10` | Interfaz ERP (SAP/etc.) | Cuando Rendi exponga conector; Connectia solo documenta/enlaza |
| Embed iframe full UI | UX embebida vs redirect | Decisión UX por cliente |
| Multi-instancia Rendi | 1 Rendi por tenant vs compartida | Arquitectura despliegue |

#### Criterios de aceptación

- [ ] Tenant **sin** cap: no aparece menú ni hub de rendiciones.
- [ ] Tenant **con** cap: colaborador entra a “Mis rendiciones” y llega a Rendi autenticado (o con error claro si falta mapeo).
- [ ] Cargar un comprobante de prueba termina en datos estructurados **en Rendi** (no en un modelo inventado solo en Connectia).
- [ ] Cambio a `aprobada`/`rechazada` puede reflejarse o notificarse en Connectia (si API/webhook disponible; si no, documentar limitación y deep-link al detalle).
- [ ] Admin no hardcodea Emp_Id; config es metadata/capability del tenant.
- [ ] No se copian tablas de plan de cuentas ni asientos al Mongo de Connectia en el MVP.

#### Fuera de alcance de esta ola

- Reescribir DocuFlow dentro de `connectia/`.
- Homologación AFIP/SAT, CFDI/XML, canal WhatsApp de Rendi.
- Convertir Connectia en sistema contable.
- Liquidación de sueldos / recibos → **Ola 40** `40.l` (docs naming DNI).
- Obligar a todos los tenants a usar Rendi (solo quien active la cap).

#### Referencia rápida — qué aporta Rendi (no re-especificar aquí)

Según inventario Rendi: captura multi-canal · IA Claude · rendiciones con viáticos multi-moneda · estados · export PDF/Word/Excel · módulo contable interno (cuentas, reglas, asientos). Connectia **consume** ese valor vía integración.

#### Orden sugerido dentro de la ola

1. Cap + config admin + menú (`33.RENDI.00`, `.01`, `.08`)  
2. SSO / deep-link (`33.RENDI.02`) + hub U (`33.RENDI.03`)  
3. Flujo cargar comprobante validado end-to-end en Rendi (`.04`)  
4. Estados + notificaciones (`.05`, `.06`)  
5. Hub §46 (`.09`) · QA/DOC  
6. Opcional: §41 (`.07`) · ERP (`.10`)  

---

### Ola 34 — Puente Hiryx → Connectia (`34.HIRYX.*`) — ola especial

| Campo | Valor |
|-------|--------|
| **Tipo** | **Ola especial de integración** (producto hermano Sooft **Hiryx** / ai-talent · ATS) |
| **Spec producto** | `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas` · anclas: `PostulanteContratado`, confirmaciones de ingreso, offer letter / inicio inteligente, workflows de onboarding ATS |
| **IDs** | `34.HIRYX.00`–`34.HIRYX.12` · `34.HIRYX.QA/SEC/UX/DOC` |
| **Estado** | `no hecha` · *bajo demanda · encaje natural si el cliente usa Hiryx + Connectia* |
| **Creada** | 2026-07-29 |
| **Menú A** | **Llegadas desde Hiryx** · U: flujo invite → `/bienvenida` (sin menú ATS) |
| **Caps** | `integracion.hiryx` · `ingresos.hiryx` · `admin.ingresos.hiryx` |
| **Depende de** | Ola 1 (acceso) · ola 16 (ABM users) · **ola 19** (PeopleCare + onboarding) · ola 7 (notif) · opcional ola 13 (políticas) |

#### Para qué sirve (objetivo de negocio)

Cerrar el **último kilómetro** del reclutamiento: la persona ya fue **elegida en Hiryx**; ahora tiene que **existir y sentirse recibida en Connectia** — cuenta, legajo, bienvenida, checklist de ingreso — **sin** que RRHH vuelva a cargar el CV a mano ni que el candidato “desaparezca” entre el ATS y la app de la empresa.

| Quién | Qué logra |
|-------|-----------|
| **Candidato seleccionado** | Recibe un **invite mágico**; al abrirlo crea/activa su usuario Connectia, ve bienvenida y primeros hitos (docs, políticas, datos). |
| **RRHH / admin comunidad** | Ve bandeja **Llegadas desde Hiryx**; confirma área/grupo si hace falta; no re-tipea nombre/email/DNI. |
| **Reclutador Hiryx** | Al marcar **contratado / confirmación de ingreso / oferta**, dispara el puente; opcionalmente ve que Connectia ya “tomó” al candidato. |
| **La organización** | Un solo relato: *Hiryx encuentra · Connectia incorpora*. Dos productos, un journey. |

#### Idea creativa del enlace — “Puente de ingreso” (Hire Bridge)

No es un SSO genérico ni un dump de CVs. Es un **rito de paso digital** en tres actos:

| Acto | Nombre | Qué pasa |
|------|--------|----------|
| **1. Señal** | *Te elegimos* | Hiryx emite evento al confirmar ingreso / crear `PostulanteContratado` / oferta aceptada (inicio inteligente). |
| **2. Nacimiento** | *Nacés en la comunidad* | Connectia crea o mergea User + IDs gemelos + semilla de legajo; arma **invite mágico** (token de un solo uso). |
| **3. Aterrizaje** | *Day-0 / Day-1* | Preboarding (docs/políticas) antes de la fecha; el día de ingreso: onboarding ola 19 a full + push “Bienvenido”. |

```
[Hiryx ATS]  --hire.confirmed-->  [Connectia API puente]
   |                                    |
 contratado /                     idempotencyKey
 confirmación ingreso                   |
 offer letter OK                  User + Legajo + Invite
   |                                    |
   |                              email magic link
   |                                    v
   |                            [Candidato móvil]
   |                             primer login U
   |                                    |
   +---- opcional status ---     /bienvenida + hitos
```

**Regla de oro:** Hiryx **sigue siendo el ATS** (vacantes, pipeline, shortlist, portal empleo). Connectia **sigue siendo la comunidad** (muro, RRHH operativo, onboarding interno). El puente solo mueve a la **persona ya seleccionada**.

#### Momentos de disparo en Hiryx (dónde enganchar)

| Momento Hiryx | Señal sugerida | Uso |
|---------------|----------------|-----|
| Alta `PostulanteContratado` | `hire.recorded` | Candidato marcado contratado |
| Confirmación de ingreso (UI existente) | `ingreso.confirmed` | **Preferido** — intención clara de fecha de ingreso |
| Offer letter enviada/aceptada (inicio inteligente) | `offer.accepted` | Preboarding temprano (Day-0) |
| Paso workflow “Onboarding y Administración” | `workflow.step` | Si el cliente usa WF Sooft — mapeo configurable |

Admin Connectia elige **cuál(es)** disparan el puente por tenant (no todos a la vez si no hace falta).

#### Payload mínimo del evento (contrato)

```json
{
  "eventId": "uuid",
  "type": "ingreso.confirmed",
  "occurredAt": "ISO-8601",
  "hiryx": {
    "tenantKey": "…",
    "candidateId": "…",
    "applicationId": "…",
    "vacancyId": "…",
    "vacancyTitle": "Analista Jr"
  },
  "person": {
    "email": "obligatorio",
    "nombre": "",
    "apellido": "",
    "telefono": "",
    "dniRut": "",
    "startDate": "YYYY-MM-DD"
  },
  "orgHints": {
    "area": "opcional",
    "grupo": "opcional",
    "clienteNombre": "opcional"
  }
}
```

Firma HMAC + `eventId` idempotente. Reintento Hiryx no duplica usuario.

#### Requisitos núcleo (DoD mínimo)

1. **`34.HIRYX.00`:** cap off; admin pega URL Connectia callback + secret compartido + mapeo `hiryxTenant → connectiaTenant`.
2. **`34.HIRYX.01` + `.02`:** webhook recibe evento; Hiryx tiene emisor en al menos **un** momento (confirmación de ingreso recomendado).
3. **`34.HIRYX.03` + `.04`:** magic link crea/activa User; merge por email si ya existía; guarda `hiryxCandidateId` / `hiryxApplicationId`.
4. **`34.HIRYX.05` + `.06`:** semilla legajo + instancia onboarding desde plantilla default del tenant (ola 19).
5. **`34.HIRYX.08`:** bandeja A lista llegadas pendientes / conectadas / error; acción “asignar área” si no vino en payload.
6. **`34.HIRYX.09`:** notif de bienvenida al aceptar invite.
7. **`34.HIRYX.SEC`:** PII mínima; secret rotatable; rechazo si firma inválida o tenant no mapeado.

#### Extras creativos (núcleo ligero o fase 2)

| Extra | ID | Idea |
|-------|-----|------|
| **Preboarding** | `.07` | Antes de `startDate`: rol `preboarding` solo ve docs/políticas/FAQs; el día D pasa a miembro pleno |
| **Origen visible** | `.10` | En perfil/legajo: chip “Reclutado vía Hiryx · {vacante}” + deep-link opcional a ficha ATS (admin) |
| **Auto-área** | `.11` | Mapear `orgHints` → área/grupo Connectia |
| **Handshake** | `.12` | Connectia avisa a Hiryx `member.connected` / `onboarding.started` para cerrar el loop en el ATS |
| **Kit Day-0** | — | Plantilla onboarding “Ingreso Hiryx” con hitos: foto perfil, aceptar políticas, presentate en muro (opcional) |

#### Qué NO es esta ola

| Confusión | Dónde |
|-----------|--------|
| Publicar vacantes / postulaciones en Connectia | Hiryx (ATS); vacantes **internas** = ola 27 |
| Clonar shortlist / pipeline / portal empleo | Hiryx |
| Multiposting redes | Hiryx social publish |
| Onboarding genérico sin Hiryx | Ya ola 19 (alta manual) |
| SSO empleado ↔ Hiryx reclutador | Fuera; son actores distintos |
| Integración Rendi | Ola 33 |

#### Criterios de aceptación

- [ ] Sin cap: webhook responde 404/disabled; no crea usuarios.
- [ ] Evento `ingreso.confirmed` válido → aparece en bandeja A y sale invite al email.
- [ ] Candidato abre magic link → puede entrar a Connectia U y ve `/bienvenida` u onboarding.
- [ ] Reenvío del mismo `eventId` no duplica User ni onboarding.
- [ ] Email ya existente: merge + marca origen Hiryx; no segundo usuario.
- [ ] Tenant Hiryx no mapeado: evento queda en error visible; cero leak cross-tenant.
- [ ] Ficha muestra origen Hiryx cuando el vínculo existe.

#### Fuera de alcance

- Reescribir Hiryx dentro de `connectia/`.
- Sincronizar todo el historial de postulaciones o CVs completos (solo PII de ingreso + refs).
- Evaluación/scoring de candidatos en Connectia.
- Offboarding disparado desde Hiryx (se puede diferir a handshake futuro).

#### Orden sugerido dentro de la ola

1. Cap + mapeo tenant + webhook receptor (`.00`, `.01`, `.SEC`)  
2. Emisor Hiryx en confirmación de ingreso (`.02`)  
3. Alta User + magic link (`.03`, `.04`)  
4. Legajo + onboarding (`.05`, `.06`) + notif (`.09`)  
5. Bandeja A (`.08`) + origen en ficha (`.10`)  
6. Preboarding / auto-área / handshake (`.07`, `.11`, `.12`) · QA/DOC  

---

### Ola 37 — Relevamientos de campo (`37.REL.*`) — add-on

| Campo | Valor |
|-------|--------|
| **Tipo** | **Add-on comercial** (módulo opt-in por comunidad; no núcleo genérico) |
| **Spec origen** | Gap legado §15.11 / motor de inspecciones de campo (ECR y similares) · **no** es Encuestas ola 5 |
| **IDs** | `37.REL.00`–`37.REL.14` · `37.REL.QA/SEC/UX/DOC` |
| **Estado** | `cerrada` (2026-07-30 · núcleo + `.14` enganche; `.12` fuera; pregunta-API → **Ola 40** `40.h`) |
| **Creada** | 2026-07-30 |
| **Menú U** | **Relevamientos** / **Mis relevamientos** / **Inspecciones** (default; renombrable §28) |
| **Menú A** | **Relevamientos de campo** (diseño, rutas, agenda, tablero, reportes) |
| **Caps** | `relevamientos` · `campo.relevamientos` · sub: `relevamientos.ejecutar` · `admin.relevamientos` · `admin.relevamientos.rutas` · `admin.relevamientos.agenda` · `admin.relevamientos.reportes` |
| **Depende de** | Tenant + menú (ola 2) · push/avisos (ola 7, recordatorios) · licenciamiento modular (ola **35**, candado comercial) · opcional supervisión 31/32 |
| **No depende de** | Motor `Survey` de ola 5 como producto (puede reusar helpers técnicos internos, **sin** unificar menú ni modelo de negocio) |

#### Para qué sirve (objetivo de negocio)

Que comunidades con operación en **campo** (inspecciones, visitas, relevamientos en sitio — caso típico ECR) puedan **diseñar formularios de campo**, **armar rutas**, **programar relevamientos por día**, asignar operadores y **capturar evidencias** (foto/GPS/facility) desde la app — como **módulo contratable**, sin mezclarlo con las encuestas de clima/NPS de empleados.

| Quién | Qué logra |
|-------|-----------|
| **Operador de campo** | Ve “qué tengo hoy”, sigue la ruta/paradas, completa formularios (con saltos), sube evidencias, trabaja offline y sincroniza. |
| **Supervisor / planificador** | Arma rutas, programa el día, asigna, reprograma; ve completitud y pendientes; manda recordatorios. |
| **Diseñador de formularios** | Crea plantillas versionadas con tipos de campo (multimedia, API, botón, facility) y lógica condicional. |
| **Admin de la comunidad** | Activa el add-on solo si está contratado (ola 35); no convierte Encuestas en inspecciones. |
| **PLATFORM** | Vende el módulo como ítem del catálogo de entitlements. |

#### Relación con Encuestas (ola 5) — separación dura

```
[Encuestas ola 5]                    [Relevamientos ola 37]
  clima / NPS / feedback               inspección / visita / evidencia
  Survey + audienceSnapshot            FormularioCampo + Ruta + AgendaDía
  menú Encuestas                       menú Relevamientos (cap aparte)
  on por packs que ya lo tienen        OFF por defecto (add-on)
```

**Regla de oro:** un tenant puede tener Encuestas **sin** Relevamientos. Activar Relevamientos **no** cambia el comportamiento de Encuestas. No hay un solo “admin de encuestas” que haga las dos cosas.

#### Qué NO es esta ola

| Confusión | Dónde va |
|-----------|----------|
| Encuestas corporativas / clima / NPS | Ola **5** (`Survey`) |
| Pedidos / CODESAC ligado a encuesta | **Retirado** · sistema ad hoc de pedidos |
| Marcación laboral GPS / turnos | Ola **18** |
| “Voy a la oficina” / coworking | Ola **21** |
| Tareas comerciales supervisión / checklist ECR panel | Ola **31** (pueden engancharse luego vía `.14`) |
| Reabrir backoffice legado `appWebEncuesta` | **Fuera** — se implementa nativo en Connectia |
| Pedidos internos / alarmas | Ola **25** |

#### Funciones — especificación exhaustiva

##### A. Add-on y acceso (`37.REL.00`, `.SEC`)

1. **Capability off por defecto.** Sin cap: menú U/A oculto; APIs responden 403/404 sin filtrar existencia cross-tenant.
2. **Candado comercial (ola 35):** el admin de comunidad no puede activar Relevamientos si PLATFORM no lo vendió.
3. **Menú dinámico** U/A con ítems propios; labels renombrables (§28).
4. **Authz:** solo operadores asignados (o rol con cap) ejecutan; planificadores ven su alcance; admin tenant según subcaps.
5. **Fuera:** link restringido / login externo solo-encuesta (`01.06` / `37.REL.12`) — descartado, no útil.

##### B. Diseñador de formularios (`37.REL.01`–`.03`)

1. **Ciclo de vida:** `draft` → `published` → `archived`. Publicar congela **versión inmutable**; editar publicado crea nueva versión (o clona a borrador según UX).
2. **Respuestas históricas** siempre referencian `formVersion` publicada al momento de la asignación/ejecución.
3. **Tipos de pregunta (mínimo):**
   - Básicos: texto, texto largo, número, sí/no, opción única/múltiple, rating, fecha, hora, datetime, email, teléfono.
   - **Campo:** `multimedia` (foto/video/audio con límites MIME/tamaño), `button` (CTA / acción configurada), `api` (consulta a endpoint allowlist del tenant; nunca credenciales en cliente), `geopoint`, `facility_checkin`, `facility_checkout`.
4. **Lógica condicional (`.03`):** reglas por pregunta/bloque — `show` / `hide` / `skip_to` / `require_if` según valor de otra pregunta. Motor evalúa igual **online y offline** (reglas embebidas en el payload de la asignación).
5. **Vista previa A** como la verá el operador en móvil.
6. **Plantillas** reutilizables por tenant (opcional clonar).
7. **IA (opcional, no bloquea DoD):** sugerir borrador de preguntas a partir de un objetivo en lenguaje natural — misma política que ola 5: humano revisa; no publica sola.

##### C. Rutas y programación diaria (`37.REL.04`–`.07`) — núcleo operativo

1. **Ruta / recorrido (`.04`):** nombre, vigencia, secuencia ordenada de **paradas** (label, dirección opcional, lat/lng, radio opcional, cliente/sede ref opcional, notas).
2. **Parada** puede vincularse a uno o más formularios default (o el formulario se elige al programar).
3. **Programación por día (`.05`):** para una fecha (timezone del tenant), crear **asignaciones**:
   - operador(es)
   - ruta completa **o** paradas sueltas **o** relevamiento sin ruta (modalidad sin ruta / espontáneo)
   - formulario + versión
   - ventana horaria opcional
   - prioridad / orden
4. **Reprogramar:** cambiar fecha, operador o orden sin perder historial de lo ya ejecutado.
5. **Reasignar:** pasar pendientes de un operador a otro.
6. **Modalidades (`.06`):**
   - `scheduled` — en agenda del día
   - `spontaneous` — el operador inicia sin ítem previo (si política lo permite)
   - `on_demand` — disparado por supervisor/admin “ahora”
   - `on_route` — atado a parada de ruta
   - `off_route` — formulario de campo sin parada
7. **Vista U “qué tengo hoy” (`.07`):** listado del día calendario (timezone tenant), estado por ítem (`pending` / `in_progress` / `done` / `skipped` / `failed`), acceso a mapa/orden de paradas, CTA ejecutar.
8. **Calendario A:** vista semanal/diaria de carga por operador (mínimo lista por día en MVP; calendario rico diferible).

##### D. Ejecución, evidencias, offline, facility (`37.REL.08`–`.10`)

1. **Ejecución (`.08`):** abrir asignación → recorrer preguntas con lógica → adjuntar evidencias → enviar. Estados: `pending` → `in_progress` → `submitted` → `synced` (o `failed`).
2. **Evidencias:** almacenamiento por tenant; metadatos (quién, cuándo, coords si aplica); no exponer URLs sin authz.
3. **Offline (`.09`):** cola local; `clientMutationId` / idempotencyKey; al volver online flush; conflicto → estado visible, no silent overwrite.
4. **Facility (`.10`):** check-in y check-out registran lat/lng/accuracy/permission/source/timestamp. Validación de radio si la parada/instalación lo define. **No** es punch de asistencia laboral (ola 18) ni office-day (ola 21).
5. **Geocerca opcional:** exigir estar dentro del radio de la parada para enviar (política por formulario/ruta).

##### E. Operación y reporting (`37.REL.11`, `.13`)

1. **Tablero A (`.11`):** por relevamiento/día/ruta — asignados, completados, pendientes, %; lista de pendientes (si no anónimo — los relevamientos de campo **no** son anónimos por defecto).
2. **Recordatorio:** push/in-app a operadores con ítems pending del día (reusa ola 7).
3. **Cierre:** por fin de día / fecha fin / meta de % completitud (configurable).
4. **Reportes (`.13`):** filtros por rango fechas, ruta, operador, formulario; export CSV; detalle con evidencias (link autorizado).
5. **Auditoría:** quién diseñó, publicó, asignó, ejecutó, reprogramó.

##### F. Enganche supervisión (`37.REL.14`) — hecho

- Hub **Mi equipo**: KPI “Relev. hoy”, timeline con ítems `relevamiento`, ficha de miembro con listado.
- Hub **Supervisión** (ola 31): tarjeta a `/relevamientos` si el tenant tiene el add-on.
- No fusiona productos: solo visibilidad / atajo.

##### Pregunta tipo `api` — deseable Ola 40 (`40.h`)

No forma parte del cierre de ola 37. Spec y criterios: `CONNECTIA-OLAS.md` → *Ola 40 · 40.h*. Hoy el tipo no se ofrece en el diseñador UI.

#### Requisitos núcleo (DoD mínimo)

1. **`37.REL.00`:** cap off; con cap aparecen menús U/A y guards.
2. **`37.REL.01`+`.02`+`.03`:** crear formulario con al menos un tipo multimedia + una regla de salto; publicar versión; responder respetando la regla.
3. **`37.REL.04`+`.05`+`.07`:** crear ruta con ≥2 paradas; programar un día para un operador; el operador ve “hoy” y completa.
4. **`37.REL.08`+`.09`:** enviar una respuesta online y una encolada offline que sync OK.
5. **`37.REL.11`:** tablero muestra pendientes/completados coherentes con asignaciones.
6. **`37.REL.SEC`:** aislamiento tenant; sin Emp_Id; add-on no activable si no contratado (cuando exista ola 35; hasta entonces flag PLATFORM/manual).

#### Vertical / diferible (no bloquea núcleo)

| ID / tema | Qué | Cuándo |
|-----------|-----|--------|
| `37.REL.10` | Facility check-in/out rico + geocerca estricta | Tenants facility |
| `37.REL.14` | Enganche 31/32 | **Hecho** · hub equipo + card supervisión |
| ~~Pregunta-API allowlist~~ | → **Ola 40** `40.h` (deseable) | — |
| Calendario A rich UI | Drag-and-drop semanal | Post-MVP |
| IA diseñador | Borrador de formulario | Si hay proveedor IA |

#### Criterios de aceptación

- [ ] Tenant **sin** cap: no menú Relevamientos; APIs denegadas.
- [ ] Tenant **con** Encuestas y **sin** Relevamientos: Encuestas intactas; cero UI de rutas/agenda de campo.
- [ ] Planificador crea ruta + agenda del día; operador ve solo **sus** ítems de hoy.
- [ ] Formulario con salto: rama oculta no se exige ni se envía.
- [ ] Multimedia obligatoria bloquea envío sin archivo válido.
- [ ] Offline: doble toque / reintento con misma clave no duplica envío.
- [ ] Reprogramar un pending cambia el día en U; un `submitted` no se “mueve” como pendiente.
- [ ] Reportes exportan filas alineadas al tablero del mismo filtro.
- [ ] No existe dependencia runtime al backoffice legado ni a CODESAC.

#### Fuera de alcance de esta ola

- Reescribir o conectar el admin externo legacy como sistema de diseño.
- Variantes CODESAC / pedidos dentro del formulario (retirado).
- Fusionar modelos `Survey` y relevamiento en un solo CRUD de producto.
- Asistencia laboral, office-day, pedidos internos, alarmas.
- Convertir Connectia en GIS / ruteo optimizado (TSP); MVP = orden manual de paradas.
- App nativa aparte: se entrega en PWA U existente con UX campo.

#### Orden sugerido dentro de la ola

1. Cap + menús + modelos base (`.00`, `.SEC`)  
2. Diseñador + tipos + saltos (`.01`–`.03`)  
3. Rutas + programación día + “qué tengo hoy” (`.04`–`.07`)  
4. Ejecución + offline + evidencias (`.08`–`.09`)  
5. Tablero + recordatorios + export (`.11`, `.13`)  
6. Facility · enganche 31/32 (`.10`, `.14`) · QA/DOC  

---

### Ola 38 — Padrón IdP / miembros (`38.PAD.*`) — diseño

| | |
|--|--|
| **Estado** | **no hecha** (spec) · ayuda “i” en UI ya publicada (workaround hoy) |
| **Depende de** | Ola 1 (`authConfig` dominio + auto-alta SSO) · Ola 16 (Directory Google/Entra + CSV) |
| **IDs** | `38.PAD.00`–`38.PAD.06` · QA/SEC/UX/DOC |

| ID | Punto | Capa | Dev | Config | Global | Nota |
|----|-------|------|-----|--------|--------|------|
| `38.PAD.00` | Pantalla unificada origen + filtro + sync | A S | `pendiente` | `pendiente` | `pendiente` | Reusa Directory |
| `38.PAD.01` | Filtro por dominio(s) | A S | `pendiente` | `pendiente` | `pendiente` | Alinea authConfig |
| `38.PAD.02` | Filtro Google Group / Entra group / OU | A S | `pendiente` | `pendiente` | `pendiente` | Gap principal |
| `38.PAD.03` | Sync on-demand + preview/commit | A S | `parcial` | `parcial` | `parcial` | Ya en Usuarios Directory |
| `38.PAD.04` | JIT SSO respeta mismo filtro | U S | `parcial` | `parcial` | `parcial` | Dominio+auto-alta hoy |
| `38.PAD.05` | Política desactivar al salir del grupo | A S | `pendiente` | `pendiente` | `pendiente` | |
| `38.PAD.06` | Scheduler sync opcional | S | `pendiente` | `pendiente` | `pendiente` | |
| `38.PAD.UX` | Ayuda “i” workaround en Comunidad/Usuarios | A | `hecho` | `n/a` | `hecho` | 2026-07-30 |

Detalle: sección *Ola 38 — Diseño* en `CONNECTIA-OLAS.md`.

---

### Ola 39 — Textos por comunidad (locale + labels) (`39.LOC.*`) — diseño

| | |
|--|--|
| **Estado** | **parcial** (spec + stub en código) · motor keys/overrides aún no |
| **Depende de** | Shell U/A · menú dinámico · **ex-ola 40** · baseline `uiLocale`/`modismos` · enganche opcional ola **29** |
| **IDs** | `39.LOC.00`–`39.LOC.10` · QA/SEC/UX/DOC |
| **Para qué** | Un motor de textos: **idioma/cultura** (glosa/texto, pt-BR) y **renombres de módulo** (Emp60). ≠ skins YOMOB/SOOFIA · ≠ Connectyx (36.p). |

| ID | Punto | Capa | Dev | Config | Global | Nota |
|----|-------|------|-----|--------|--------|------|
| `39.LOC.00` | Locale base del tenant (es-AR · es-CL · pt-BR · en) | A S | `parcial` | `parcial` | `parcial` | Hoy: `uiLocale` es-AR/es-CL en Comunidad |
| `39.LOC.01` | Catálogo de claves UI versionado | S | `pendiente` | `pendiente` | `pendiente` | Seed desde strings actuales |
| `39.LOC.02` | Packs de idioma (fallback es-AR) | U A S | `parcial` | `parcial` | `parcial` | es/en `23.38` + `modismos.js` como semilla es-CL |
| `39.LOC.03` | Glosario cultural (modismos por locale) | A S | `parcial` | `pendiente` | `parcial` | Overlay literales; falta glosario por keys |
| `39.LOC.04` | Overrides por comunidad (incl. renombres módulo/menú) | A S | `pendiente` | `pendiente` | `pendiente` | Absorbe ex-40 |
| `39.LOC.05` | Preferencia de idioma por usuario (opt-in) | U A S | `pendiente` | `pendiente` | `pendiente` | Si la comunidad lo permite |
| `39.LOC.06` | Admin “Idioma, cultura y labels” + preview + import/export | A | `pendiente` | `pendiente` | `pendiente` | Reemplaza selector suelto Comunidad |
| `39.LOC.07` | Runtime U/A: resolver t(key) con locale+override | U A | `parcial` | `parcial` | `parcial` | Hoy: `useUiText` literales |
| `39.LOC.08` | Enganche Sammy modo traducciones | A S | `pendiente` | `pendiente` | `pendiente` | Ola 40 `40.n` deseable |
| `39.LOC.09` | Menú dinámico aplica label resuelto | U A S | `pendiente` | `pendiente` | `pendiente` | Ex-40.LBL.01 |
| `39.LOC.10` | Seed / pack NR Emp60 (overrides sin Emp_Id) | S | `pendiente` | `pendiente` | `pendiente` | Ex-40.LBL.04 |
| `39.LOC.UX` | UX admin clara · preview lado a lado | A | `pendiente` | `n/a` | `pendiente` | |
| `39.LOC.SEC` | Authz tenant · sin Emp_Id | A S | `pendiente` | `n/a` | `pendiente` | |
| `39.LOC.QA` | DoD: AR vs CL vs BR + Emp60 rename | — | `pendiente` | `n/a` | `pendiente` | |
| `39.LOC.DOC` | OpenAPI catálogo / notas de contrato | S | `pendiente` | `n/a` | `pendiente` | |

**Fuera:** traducir UGC del muro; fork de app por país; skins YOMOB/SOOFIA; lógica NR distinta (ola 24); branding Connectyx (36.p).

Detalle: sección *Ola 39 — Textos por comunidad* en `CONNECTIA-OLAS.md`.

### Ola 40 — Deseables (otro MVP) (`40.*`) — backlog diferido

| | |
|--|--|
| **Estado** | **no hecha** · bolsa DESEABLE para otro MVP |
| **Regla** | No reabre olas cerradas; cada ítem se implementa en el módulo de la **ola origen** |
| **IDs** | `40.a`–`40.z` |

| ID | Nivel | Mejora | Ola origen | Dev | Nota |
|----|-------|--------|------------|-----|------|
| `40.a` | Deseable | Análisis IA de imagen/GIF en comentarios | **9** (§10) | `pendiente` | Moderación visual además del texto |
| `40.b` | Deseable | Apelación del autor ante comentario moderado | **9** (§10) | `pendiente` | U apela · A confirma/revierte |
| `40.c` | Deseable | Mis tickets Jira en app | **4** (§9.09) | `pendiente` | Listado/estado issues del miembro |
| `40.d` | Deseable | Config Jira por tenant | **4** (§9.10) | `pendiente` | URL/proyecto/auth + vínculo usuario |
| `40.e` | Deseable | Crear issue Jira desde Connectia | **4** (§9.11) | `pendiente` | Opcional · depende `40.d` |
| `40.f` | Deseable | Jobs SAP/ECR sobre consultas | **4** (§9.07 · `30.10`) | `pendiente` | Adapter al cambiar estado · SAP salió de Ola 28 |
| `40.g` | Deseable | Novedades GeoPop en consultas | **4** (§9.06) | `pendiente` | Contexto GeoPop en el trámite |
| `40.h` | Deseable | Pregunta tipo API (relevamientos) | **37** (`37.REL.02`) | `pendiente` | Allowlist + fetch en S · ver OLAS detalle |
| `40.i` | Deseable | Chat por voz | **10** (§8.02) | `pendiente` | WebRTC/SFU · audio 1:1/grupo |
| `40.j` | Deseable | Chat por video | **10** (§8.03) | `pendiente` | Mismo stack que `40.i` |
| `40.k` | Deseable | Resúmenes / transcripción IA de chat | **10** (§8.07) | `pendiente` | Buscador ya en núcleo ola 10 |
| `40.l` | Deseable | Recibos de sueldo vía Documentos | **12** (`32.01` · §17) | `pendiente` | Naming `{dni}_{clave}_{periodo}.pdf` · ver OLAS |
| `40.m` | Deseable | Conector PeopleCare / HRIS externo | **14** (legajo · toca **19**) | `pendiente` | Sync HRIS ↔ `EmployeeLegajo` · MVP sigue local |
| `40.n` | **DESEABLE** | Modos Sammy del asistente | **12** (ex-29) | `pendiente` | Personalidades opt-in · ≠ `29.CONV` |
| `40.o` | **CAPRICHO** | Asistente de contenido | **12** (`24.04`) | `pendiente` | Borradores pubs/push/FAQs |
| `40.p` | **CAPRICHO** | Asistente de carga | **12** (`24.05`) | `pendiente` | Autocompletar formularios |
| `40.q` | **CAPRICHO** | QR → vista | **12** (`24.06`) | `pendiente` | ≠ QR asistencia ola 18 |
| `40.r` | **CAPRICHO** | QR DNI | **12** (`24.07`) | `pendiente` | Parseo DNI |
| `40.s` | **DESEABLE** | Plano de planta gráfico | **21** (`35.03`) | `pendiente` | Mapa visual planta/zona |
| `40.t` | **DESEABLE** | Bundle sala+cochera 1-click | **21** (`35.11`) | `pendiente` | Reserva combinada misma sede |
| `40.u` | **CAPRICHO** | PSP bancario real | **20** (§18) | `pendiente` | Pasarela externa; ledger hoy = puntos |
| `40.v` | **CAPRICHO** | Retiro de saldo productivo | **20** (§18) | `pendiente` | Hoy `pending`; requiere `40.u` |
| `40.w` | **CAPRICHO** | KYC / conciliación productiva | **20** (§18) | `pendiente` | Identidad + cierre contable; requiere `40.u` |
| `40.x` | **DESEABLE** | Quiet hours / tope frecuencia campañas | **22** (§29 · §7) | `pendiente` | Franja + tope pushes impulso |
| `40.y` | **CAPRICHO** | Historial fino de conexiones | **22** (`29.06`) | `pendiente` | Más allá de `lastLoginAt` + canal |
| `40.z` | **CAPRICHO** | Organigrama matricial / import HRIS / IA | **22** (§37) | `pendiente` | Multi-jefe + import + sugerencias |

Detalle exhaustivo: sección *Ola 40 — Definiciones* en `CONNECTIA-OLAS.md` (incl. **40.n**–**40.z** · niveles DESEABLE vs CAPRICHO).

### Ola 41 — Coherencia entre módulos (`41.*`) — deuda transversal

| | |
|--|--|
| **Estado** | **no hecha** · prioridad NECESARIO |
| **Base** | Canvas Cursor `coherencia-modulos-connectia.canvas.tsx` (`C:\Users\lenovo\.cursor\projects\c-Users-lenovo-Documents-SUPERVISoRVIRTUAL\canvases\coherencia-modulos-connectia.canvas.tsx`) |
| **Regla** | Al retomar: abrir el canvas + sección *Ola 41* en `CONNECTIA-OLAS.md`. No reabrir ítems ya cerrados (C1/C2/A5/M1/B1/M5). |
| **IDs** | `41.A1` · `41.A2` · `41.A3` · `41.A4` · `41.M2` · `41.M4` · `41.B2` · ~~`41.M3`~~ |

| ID | Problema | Dev | Nota |
|----|----------|-----|------|
| `41.A1` | Reservas fuera de workflows unificados | `pendiente` | Olas 11 · 21 |
| `41.A2` | Perfil · Legajo · Directorio sin sync | `pendiente` | Fuente de verdad |
| `41.A3` | Motores Encuesta / Relevamiento gemelos | `pendiente` | Núcleo compartido; producto separado |
| `41.A4` | MODULE_CATALOG incompleto (~17 vs 34+) | `pendiente` | Ola 35 + módulos posteriores |
| `41.M2` | Tres “estoy aquí” (UX) | `pendiente` | 18 · 21 · 37 · labels 39 |
| `41.M3` | Solicitudes vs Pedidos vs Portal | `cerrado` | ADR-GAPS §E + D25-2 + D43-1 · [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md) |
| `41.M4` | Inbox líder (chat/push/composer) | `pendiente` | 7 · 10 · 12 · 32 |
| `41.B2` | Naming PeopleCare local | `pendiente` | Rename/docs |

Detalle: sección *Ola 41 — Coherencia funcional entre módulos* en `CONNECTIA-OLAS.md`.

### Ola 43 — Portal de servicios (`42.01` · `42.02` · …) — ex-ola 23

| Campo | Valor |
|-------|--------|
| **Spec** | §42 Gestión de servicios (portal) |
| **IDs** | `42.01` · `42.02` · `42.QA` · `42.SEC` · `42.UX` · `42.ADM` · `42.DOC` |
| **Prioridad** | NECESARIO · según demanda |
| **Estado** | `cerrada` (núcleo 2026-07-30) · postdev QA/smoke/docs |
| **Spec** | [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md) |

**Objetivo:** Catálogo + portal U + panel agentes + estados/SLA. Complementa §9/§20; no los reemplaza.

**Absorbido desde ola 30:** `32.04` gestión de atenciones → portal §42.

**Requisitos:** catálogo tenant; solicitar y seguir servicio (U); bandeja/asignación/SLA (A); formularios por tipo; capability on/off.

**Frontera:** **41.M3** cerrado (D43-1).  
**≠** Ola 42 (secrets/env). **≠** Ola 23 (solo §43 seguridad).

Detalle: sección *Ola 43 — Definiciones* en `CONNECTIA-OLAS.md`.

---

## Orden sugerido de trabajo (local)

1. ~~E0–Ola 22~~ + **Ola 18** — cerradas (núcleo; postdev QA/docs / vertical Geopop·ECR)
2. **Ola 23** Seguridad/privacidad (§43) — **IMPRESCINDIBLE** · gate go-live
3. **Ola 43** Portal de servicios (§42) — `41.M3` ✓ · según demanda
4. **Ola 24** Paridad por cliente según prioridad comercial
5. Olas **25–30** bajo demanda / cierre gaps
6. **Ola 31** Supervisión comercial (testigo `sooft-*-supervisores`) cuando haya demanda vertical / NR ECR
7. **Ola 32** Supervisor Virtual de equipo (pubs/eventos/notif/agenda solo a supervisados + seguimiento)
8. **Ola 33** Integración Rendi / DocuFlow (viáticos) — especial, bajo demanda comercial
9. **Ola 34** Puente Hiryx → Connectia (ingreso del seleccionado) — especial; reusa ola 19
10. **Ola 37** Relevamientos de campo (add-on) — bajo demanda ECR/campo; ≠ Encuestas ola 5
11. **Ola 39** Textos por comunidad (locale + labels) — multi-país + Emp60; stub uiLocale/modismos + ex-40
12. **Ola 40** Deseables / caprichos — `40.a`–`40.z` · Sammy `40.n` · plano/bundle `40.s`/`40.t` · billet. `40.u`–`40.w` CAPRICHO · quiet hours `40.x` DESEABLE · historial/org `40.y`/`40.z` CAPRICHO · `40.o`–`40.r` CAPRICHO
13. **Ola 41** Coherencia entre módulos — resto A1–A4 · M2 · M4 · B2 (**41.M3** cerrado)
14. **Ola 42** Secrets / env / vault — ops
15. **Postdesarrollo** continuo (sección final)

## Prompt plantilla para Cursor

```text
Trabajá SOLO el punto <ID> de CONNECTIA-STATUS.md / CSV.
Leé la spec en ECRMOBILE-FUNCIONES-CONSOLIDADO.md (sección indicada en notas).
Respetá ADR-GAPS y premisa anti-hardcode.
Stack: Vue3+Vite+Pinia (U/A) + Node + Mongo (como Hiryx), en SUPERVISoRVIRTUAL.
NO modifiques C:\Users\lenovo\Documents\HIRYX-SAAS.
Al terminar: indicá cómo actualizar estado_dev / estado_config / estado_global.
```

---

## Postdesarrollo (olas 1 · 2 · 3 · 4 · 6 · 7 · 8 · 9 · 10 · 11 · 14 · 16 · 19 · 20 · 21 · …)

> Trabajo **después** del núcleo de desarrollo: QA smoke, config fina, docs, DoD formal.  
> No bloquea marcar una ola como **`cerrada`** si ya no falta código de núcleo (regla 2026-07-29: solo QA/smoke/docs → cerrada).  
> Al completar un ítem: tachalo acá y actualizá el ID en el inventario / CSV.

### Ola 1 — Acceso (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| `01.QA` | Smoke humano: login ID/mail, pre-login, sesión, logout, términos, forgot/reset | QA |
| `01.14` | Dominio custom (hoy subdomain básico). Completar config o marcar `diferido` | Config / decisión |
| `01.10` · `01.UX` · `01.ADM` · `01.DOC` | Pasar a `cerrado` tras smoke | DoD formal |
| `01.04`–`01.09` · `01.15` | SSO Microsoft/Google/Okta, token, legacy, 2FA email/SMS, selector empresa | Desarrollado 2026-07-30 · `01.06` externo-encuestas = **fuera** |

### Ola 2 — Tenant + menú (+ Tema) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| `02.QA` · `28.QA` | Smoke: Suscriptores PLATFORM, CRUD tenant, dashboards, guards, menú U/A | QA |
| Caps / seed | Verificar capabilities + menú por tenant en demo/Arcor | Config / QA |
| `02.01`–`02.08` · `02.UX` · `02.ADM` · `28.01`–`28.04` · `28.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `02.05` · `02.SEC` · `02.DOC` · `28.SEC` · `28.UX` · `28.DOC` | Afinar docs o cerrar DoD (ya hay código) | Docs / DoD |
| `02.05` labels YOMOB/SOOFIA | Aclarado: skins ya → uxShell+Tema; renombres de módulo → **ola 39** (overrides) | Spec / diferir |

### Ola 3 — Muro (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Stories / IA / import / deep links / tabbar / menú compose / conocimiento / calendario | Hecho 2026-07-30 | — |
| `04.14` Pre-home | Descartado (no útil) | Fuera de alcance |

### Ola 4 — Solicitudes / consultas (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke consultas | Crear, listar, hilo, bandeja admin, tipos/áreas/campos | QA |
| `09.DOC` | OpenAPI / notas de contrato | Docs |
| `09.01`–`09.05` · `09.SEC` · `09.UX` · `09.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `09.06`–`09.07` · `09.09`–`09.11` | GeoPop, SAP/ECR jobs, Jira → **Ola 40** (`40.c`–`40.g`) | Deseable (otro MVP) |
| `09.08` | Notificaciones de consulta (in-app/push/email) | Hecho 2026-07-30 |
| `32.03` Turno carnet | Sustituido por tipo **`turno_carnet`** (seed) · Mis solicitudes | Hecho 2026-07-30 |
| §41 Workflows | Diseñador + bandeja unificada | **Fuera de ola 4** → Ola 11 del roadmap |

### Ola 6 — Perfil (§3) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke perfil | Ver/editar, foto, password, email, campos extra, dispositivos, actividad, baja | QA |
| `03.01`–`03.08` DoD | Pasar a `cerrado` tras smoke | DoD formal |
| `03.08` PeopleCare | ~~Conector HTTP~~ → **Legajo local** `EmployeeLegajo` (sin API externa) | Hecho 2026-07-28 |
| `03.QA` · `03.UX` · `03.DOC` | Calidad / docs | Postdev |

### Ola 7 — Push / avisos (§7) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke | U `/avisos` + badge; A crear/IA/programar/enviar/cancelar | QA |
| `07.01`–`07.06` · `07.SEC` · `07.UX` · `07.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `07.QA` · `07.DOC` | Checklist + OpenAPI | Postdev |

### Ola 8 — Saludos (§5) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke saludos | Regla cumpleaños → pub muro; Usuarios fechas/hitos; Ejecutar ahora | QA |
| `05.QA` · `05.DOC` | Checklist + OpenAPI | Postdev |

### Ola 9 — Comentarios / moderación (§10) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke | U comentar en detalle; A bandeja + aceptar sugerencia + config | QA |
| `10.01`–`10.03` · `10.SEC` · `10.UX` · `10.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `10.QA` · `10.DOC` | Checklist + OpenAPI | Postdev |

### Ola 10 — Chat (§8) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke chat | 1:1, grupos, adjuntos, reacciones, anclar, denuncia, bloqueo | QA |
| `08.QA` · `08.DOC` | Checklist + OpenAPI | Postdev |
| `08.02` · `08.03` · IA de `08.07` | → **Ola 40** `40.i`–`40.k` | Deseable (otro MVP) |

### Ola 11 — Workflows (§41) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke workflows | Diseñador A + bandeja U + enganche solicitudes/docs | QA |
| `41.QA` · `41.DOC` | Checklist + OpenAPI | Postdev |

### Ola 14 — Directorio + Legajo (§21) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke directorio / legajo | Búsqueda, fichas, Admin Legajos, `/me/peoplecare` | QA |
| `21.QA` · `21.DOC` | Checklist + OpenAPI / DoD formal | Postdev |
| Conector PeopleCare / HRIS | → **Ola 40** `40.m` | Deseable (otro MVP) |
| Sync Perfil · Legajo · Directorio | → **Ola 41** `41.A2` | Coherencia |
| Naming `peopleCareEnabled` | → **Ola 41** `41.B2` | Coherencia |

### Ola 16 — ABM configuración (§27) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke ABM | Usuarios/grupos/áreas/roles/params/categorías + import CSV | QA |
| `27.QA` · `27.DOC` | Checklist + OpenAPI | Postdev |
| IdP vault / env prod | Google Directory + Entra Graph con secretos por tenant | Config |

### Ola 19 — PeopleCare + Onboarding (`cerrada`)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke legajo / onboarding | `/mi-legajo`, `/bienvenida`, Admin fichas/listas/ingreso | QA |
| `14.QA` · `14.DOC` · `16.QA` · `16.DOC` | Checklist + OpenAPI | Postdev |
| ~~Revisión UX/UI U+A~~ | Claridad copy/flujos | **Hecho** 2026-07-30 |

### Ola 20 — Beneficios / billetera (§18) (`cerrada`)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| `18.QA` · `18.DOC` | Smoke + OpenAPI fino | Postdev (**no** gap producto) |
| ~~Google Maps Directions~~ | Cómo llegar | **Hecho** 2026-07-30 |
| PSP / retiro / KYC | → **Ola 40** `40.u`–`40.w` | CAPRICHO |
| Pack Claro / YoClaro | → **Ola 24** `NR.CLARO` | Pack NR |
| Admin tipología + wizard + previews | Hecho 2026-07-30 | — |

### Ola 21 — Reservas + coworking (§34 · §35) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke U/A | `/espacios`, `/oficina`, Admin `/reservas`, tipos/atributos, aprobar/cancelar | QA |
| `34.QA` · `35.QA` · `34.DOC` · `35.DOC` | Checklist + OpenAPI | Postdev |
| Activos reservables + UX U/A | Hecho 2026-07-30 | — |
| Plano de planta gráfico | → **Ola 40** `40.s` | Deseable |
| Bundle sala+cochera 1-click | → **Ola 40** `40.t` | Deseable |
| Booking conversacional en chatbot | Hecho (ola 12) | — |

### Ola 22 — Organigrama + Reportes (§37 · §29) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke U/A | `/organigrama`, Admin `/reportes` (tabs + boost + XLSX + live + RSVP), wipe dispositivos | QA |
| `37.QA` · `29.QA` · `37.DOC` · `29.DOC` | Checklist + OpenAPI | Postdev |
| `29.03` RSVP dedicado | Hecho 2026-07-30 · `/reportes` tab RSVP | — |
| Quiet hours campañas | → **Ola 40** `40.x` | **DESEABLE** |
| Historial fino conexiones (`29.06`) | → **Ola 40** `40.y` | **CAPRICHO** |
| Org matricial / import HRIS / IA | → **Ola 40** `40.z` | **CAPRICHO** |

### Ola 27 — Talento + Cultura (§38 · §39) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke U/A | `/mi-desarrollo`, `/cultura`, Admin `/talento` `/cultura`, seed demo | QA |
| `38.QA` · `39.QA` · `38.DOC` · `39.DOC` | Checklist + OpenAPI | Postdev |
| Cascada OKR / nine-box / SCORM | Mejoras | Diferible |
| ATS externo · pagos marketplace | Fuera de alcance MVP | Diferido |
| Picker personas · post muro · chat marketplace · puntos kudos | Hecho 2026-07-29 | — |
|
