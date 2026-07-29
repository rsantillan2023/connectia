# Connectia — Tablero de avance (local)

> Actualizado: **2026-07-28** · Fuente funcional: `ECRMOBILE-FUNCIONES-CONSOLIDADO.md` · Stack de referencia (solo lectura): `C:\Users\lenovo\Documents\HIRYX-SAAS`
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

**Total de puntos:** 530

| estado_global | Cantidad | % |
|---------------|----------|---|
| `pendiente` | 402 | 75.8% |
| `diferido` | 51 | 9.6% |
| `cerrado` | 29 | 5.5% |
| `desarrollado_y_configurado` | 25 | 4.7% |
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
| 5. Saludos automáticos | 7 | 7 | 0 | 0 | 0% |
| 6. Eventos y calendario | 12 | 0 | 0 | 12 | 100% |
| 7. Notificaciones push | 11 | 11 | 0 | 0 | 0% |
| 8. Chat y comunicación | 12 | 2 | 1 | 7 | ~58% |
| 9. Consultas / tickets | 16 | 16 | 0 | 0 | 0% |
| 10. Comentarios (moderación) | 8 | 0 | 5 | 3 | 38% |
| 11. Asistencia, turnos y marcación | 16 | 16 | 0 | 0 | 0% |
| 12. Ausentismos | 9 | 1 | 1 | 7 | 78% |
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
| 23. Supervisor comercial | 8 | 8 | 0 | 0 | 0% |
| 24. IA y QR | 12 | 12 | 0 | 0 | 0% |
| 25. Modo TV | 9 | 9 | 0 | 0 | 0% |
| 26. FAQs y tutoriales (centro de ayuda) | 8 | 1 | 0 | 0 | 88% |
| 27. ABM de configuración | 15 | 1 | 0 | 0 | ~93% |
| 28. Menú dinámico | 9 | 1 | 0 | 0 | 0% |
| 29. Reportes e informes | 19 | 19 | 0 | 0 | 0% |
| 30. Integraciones especiales | 15 | 15 | 0 | 0 | 0% |
| 31. WhatsApp / WTA, email, archivos y plataforma | 10 | 10 | 0 | 0 | 0% |
| 32. Gaps / no implementado o incompleto | 15 | 5 | 0 | 0 | 0% |
| 33. Mapa de integraciones con sistemas externos | 5 | 5 | 0 | 0 | 0% |
| 34. Reserva de salas, espacios y cocheras | 16 | 16 | 0 | 0 | 0% |
| 35. Coworking y puestos de trabajo | 19 | 19 | 0 | 0 | 0% |
| 36. Live streaming y broadcasts | 8 | 0 | 0 | 8 | — |
| 37. Organigrama | 7 | 7 | 0 | 0 | 0% |
| 38. Desarrollo de talento | 10 | 0 | 0 | 10 | — |
| 39. Cultura empresarial | 9 | 0 | 0 | 9 | — |
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
> | **cerrada** | No falta desarrollo de núcleo (postdev QA/config/docs puede quedar en sección final) |
> | **parcial** | Hay avance usable, pero faltan puntos del núcleo, QA o docs |
> | **no hecha** | Todavía no se empezó esa ola / módulo de ola |

| Ola | Estado | Nota / pendiente |
|-----|--------|------------------|
| **0** Fundación | **cerrada** | 2026-07-27 · todos `E0.*` → `cerrado` |
| **1** Acceso | **cerrada** | 2026-07-28 · núcleo login/sesión OK; sin más desarrollo. Postdev → sección final |
| **+** Tema | **cerrada** | 2026-07-28 · `themeMode` + branding login/splash en núcleo §2. Postdev → sección final |
| **2** Tenant+menú | **cerrada** | 2026-07-28 · PLATFORM + CRUD tenants + menú dinámico. Sin más desarrollo de núcleo. Postdev → final |
| **3** Muro | **cerrada** | 2026-07-28 · feed/UGC/moderación IA. Stories/comentarios = diferidos. Postdev → final |
| **4** Solicitudes | **cerrada** | 2026-07-28 · consultas U/A núcleo. Jira/SAP/GeoPop/notif = diferidos. §41 workflows = fuera de esta ola. Postdev → final |
| **5** Encuestas+docs+hub | **cerrada** | 2026-07-27 · núcleo OK; sin CODESAC / admin externo (fuera de alcance) |
| **6** Perfil (§3) | **cerrada** | 2026-07-28 · núcleo U/A/S: `03.01`–`03.08` (perfil, foto, password, campos extra, baja, dispositivos, actividad, PeopleCare stub). Postdev QA/DOC → sección final |
| **7** Push / avisos (§7) | **cerrada** | 2026-07-28 · núcleo U/A/S OK (bandeja, campañas, IA, programar día/hora, CSV, Web Push). Postdev QA/DOC → sección final. FCM nativo = fuera (Web Push) |
| **8** Saludos (§5) | **parcial** | 2026-07-28 · núcleo A/S: reglas + motor + pub tipo `celebracion` + generador IA. Falta smoke/QA/DOC y fechas en UI usuarios |
| **9** Comentarios (§10) | **cerrada** | 2026-07-28 · núcleo U/A/S: comentarios en pub + bandeja A + IA sugiere + config tenant. Postdev QA/DOC |
| **10** Chat (§8) | **parcial** | 2026-07-28 · núcleo texto 1:1 + grupos + moderación/retención + reacciones/menciones/anclados. Voz/video + resúmenes IA = diferidos |
| **11** Workflows (§41) | **parcial** | 2026-07-28 · núcleo A/U/S: diseñador + IA (3 ejemplos) + bandeja unificada + enganche solicitudes/docs. Postdev QA/DOC |
| **12** Chatbot IA + KB + trámites (§24) | **parcial** | 2026-07-28 · núcleo U/A/S: Asistente + KB + tools (solicitudes en curso, docs visibles, RAG). Confirmación de trámites. Postdev QA/DOC · stubs vacaciones/recibos |
| **13** Ayuda + Políticas (§26 · §40) | **cerrada** | 2026-07-28 · FAQs/tutoriales U+A + políticas con acuse + sync KB (`KbArticle`). Postdev DOC |
| **14** Perfil completo + Directorio (§3 · §21) | **parcial** → cerrar DoD | Legajo local + Directorio `21.*` implementado (U/A/S); falta smoke/DoD formal |
| **15** Eventos y calendario (§6) | **cerrada** | 2026-07-28 · núcleo U/A/S: agenda corp. + RSVP + Outlook/Google OAuth + sync bidireccional + vista unificada. Postdev QA/DOC |
| **16** ABM configuración (§27) | **parcial** | 2026-07-28 · núcleo A/S: usuarios/grupos/áreas/campos + categorías + params + roles + import CSV + sync Google/Entra (lista JSON / env). Postdev QA/DOC · IdP real con vault |
| **17** Licencias / vacaciones / ausentismos (§13 · §12) | **cerrada** | 2026-07-28 · núcleo + AR/CL por comunidad + feriados + adjuntos U + notif · *12.04 ECR diferida* |
| **18** Asistencia, turnos y marcación (§11) | **no hecha** | Vertical deskless / operaciones |
| **19** Legajo PeopleCare + Onboarding (§14 · §16) | **parcial** | Núcleo hecho 2026-07-28 · QA/DOC postdev |
| **20** Beneficios / billetera / recompensas (§18) | **cerrada** | 2026-07-28 · núcleo U/A/S: catálogo, canjes, ledger puntos, partners por capability (sin Emp_Id). Postdev QA/DOC |
| **21** Reservas + coworking (§34 · §35) | **no hecha** | Salas, cocheras, puestos / hot desk |
| **22** Organigrama + Reportes (§37 · §29) | **no hecha** | Estructura + informes núcleo |
| **23** Portal servicios + Seguridad (§42 · §43) | **no hecha** | Catálogo/agentes + controles privacidad |
| **24** Packs NR clientes (§NR) | **no hecha** | Claro, Grido, ECR, EPEC, Emp60 |
| **25** Operaciones campo (§19 · §20 · §23) | **no hecha** | Alarmas, pedidos internos, supervisor comercial |
| **26** TV + Live (§25 · §36) | **no hecha** | Modo TV + streaming/broadcasts |
| **27** Talento + Cultura (§38 · §39) | **no hecha** | OKR/LMS/desempeño + reconocimientos/marketplace |
| **28** Integraciones plataforma (§30 · §31 · §33) | **no hecha** | WhatsApp/WTA, email, archivos, PWA, mapa externos |
| **29** IA extendida + QR (§24 resto) | **no hecha** | Modos Sammy, asistente contenido/carga, QR DNI/vista |
| **30** Gaps / cierre producto (§32 · §45 · diferidos) | **no hecha** | Recibos greenfield, Jira/SAP si demanda, modernización residual |

> **Cobertura:** olas **12–30** = catálogo restante del consolidado (§1–§46 + NR) que **no** quedó en 0–11. Spec detallada: sección *Olas 12–30 — especificación de requisitos* (más abajo). Transversales §44 (deuda a no migrar) y §45 (UX) se aplican en **todas** las olas.

### Roadmap Ola 12+ (orden acordado · 2026-07-28)

| # | Ola | Tema | Spec | Prioridad |
|---|-----|------|------|-----------|
| 1 | **12** | Chatbot IA + KB + trámites | §24.01–.03 | **Siguiente** (capacidad prioritaria producto) |
| 2 | **13** | FAQs / tutoriales + Políticas | §26 · §40 | Alta (alimenta KB) |
| 3 | **14** | Directorio + Legajo RRHH local | §21 · §14 local | Alta |
| 4 | **15** | Eventos y calendario | §6 | Alta |
| 5 | **16** | ABM usuarios/grupos/áreas | §27 | Alta |
| 6 | **17** | Licencias / vacaciones / ausentismos | §13 · §12 | Media-alta (RRHH) |
| 7 | **18** | Asistencia / turnos | §11 | Media (vertical) |
| 8 | **19** | PeopleCare + Onboarding | §14 · §16 | Media · **parcial** |
| 9 | **20** | Beneficios | §18 | Media |
| 10 | **21** | Reservas + coworking | §34 · §35 | Media |
| 11 | **22** | Organigrama + Reportes | §37 · §29 | Media |
| 12 | **23** | Portal servicios + Seguridad | §42 · §43 | Media |
| 13 | **24** | Packs NR | NR.* | Comercial |
| 14 | **25** | Alarmas / pedidos / supervisor | §19 · §20 · §23 | Bajo demanda |
| 15 | **26** | TV + Live | §25 · §36 | Bajo demanda |
| 16 | **27** | Talento + Cultura | §38 · §39 | Bajo demanda |
| 17 | **28** | Integraciones plataforma | §30 · §31 · §33 | Según cliente |
| 18 | **29** | IA extendida + QR | §24.04–.07 | Tras ola 12 |
| 19 | **30** | Gaps / cierre | §32 · diferidos | Continuo |

### Pendiente inmediato (prioridad)

1. **Ola 12** — Chatbot IA + KB (arranque núcleo `24.01` / `24.02`) **o** cerrar smoke de olas parciales 8/10/11.
2. Smoke §8 Chat / §41 Workflows / §5 Saludos / §3 Perfil.
3. **Postdesarrollo** olas 1–7, §8, §10 y §41 — sección final.

### Reciente (2026-07-28 · Ola 16 ABM configuración · núcleo)

- A: Roles, Parámetros, Categorías de pubs; Usuarios con Import CSV + sync Google/Entra (JSON).
- S: modelos `Role` / `TenantParam` / `PostCategory`; import CSV; directory sync; auditoría ABM; `User.roleIds`.
- Caps: `admin.roles`, `admin.parametros`. Tests `ola16Abm.test.js`.
- Estado ola **parcial** (IdP real + DOC postdev).

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
- Sync: `CONNECTIA-ROADMAP.md` + `CONNECTIA-BUILD.md`. Siguiente de producto: **Ola 12**.

### Reciente (2026-07-28 · Chat §8 · núcleo)

- U `/chat` + `/chat/:id`: bandeja, 1:1, grupos, adjuntos, polling, reacciones, anclar, denuncia, bloqueo.
- A `/chat-moderacion`: retención, denuncias (resolver/cerrar chat), stats.
- S: modelos `Chat`/`ChatMessage`/`ChatBlock`/`ChatReport`, `notifyChat` (in-app+push), upload, seed DEMO.
- Diferido: voz/video (`08.02`/`08.03`), resúmenes/transcripción IA (parte de `08.07`).
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
- Ola 7 marcada **cerrada** (núcleo). Fuera de alcance: FCM/Huawei nativo, OpenAPI formal.

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
| `01.04` | Login Azure AD / Microsoft | U A S | `diferido` | `diferido` | `diferido` |
| `01.05` | Login por token | U A S | `diferido` | `diferido` | `diferido` |
| `01.06` | Login externo (solo encuestas) | U A S | `diferido` | `diferido` | `diferido` |
| `01.07` | Login legacy por empresa | U A S | `diferido` | `diferido` | `diferido` |
| `01.08` | Verificación en dos pasos (email) | U A S | `diferido` | `diferido` | `diferido` |
| `01.09` | Verificación SMS (Twilio) | U A S | `diferido` | `diferido` | `diferido` |
| `01.10` | Recuperación de contraseña | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `01.11` | Recordar / reanudar sesión | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.12` | Cierre de sesión | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.13` | Aceptar términos y condiciones | U A S | `desarrollado` | `configurado` | `cerrado` |
| `01.14` | Detección multi-tenant por host/usuario | U A S | `desarrollado` | `pendiente` | `desarrollado` |
| `01.15` | Selector de empresa | U A S | `diferido` | `diferido` | `diferido` |
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
| `04.04` | Publicación por menú dinámico | U A S | `diferido` | `n/a` | `diferido` |
| `04.05` | Tipos de publicación | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.06` | CRUD publicaciones (admin) | A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.07` | Publicar / mejorar contenido con IA | U A S | `diferido` | `n/a` | `diferido` |
| `04.08` | Importación masiva de publicaciones | U A S | `diferido` | `n/a` | `diferido` |
| `04.09` | Layouts de card | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.10` | Comentarios en publicaciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.11` | Votación / reacciones | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` |
| `04.12` | Stories | U A S | `diferido` | `n/a` | `diferido` |
| `04.13` | Gestión del conocimiento | U A S | `diferido` | `n/a` | `diferido` |
| `04.14` | Pre-home | U A S | `diferido` | `n/a` | `diferido` |
| `04.15` | Deep links / filtros externos | U A S | `diferido` | `n/a` | `diferido` |
| `04.16` | Botonera inferior dinámica | U A S | `diferido` | `n/a` | `diferido` |
| `04.17` | Calendario de publicaciones | U A S | `diferido` | `n/a` | `diferido` |
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
| `05.UX` | UX moderna móvil-primero revisada (§45) | U A S | `parcial` | `n/a` | `parcial` | Admin listo; U ve pub en muro |
| `05.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/saludos` |
| `05.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 6. Eventos y calendario

*Fase: Núcleo MVP · Ola 15 cerrada 2026-07-28*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `06.01` | Calendario corporativo | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | U `/agenda` lista + **vista mes** |
| `06.02` | Conectar calendario personal (Outlook / Google) — verlo en la app | U A S | `desarrollado` | `parcial` | `parcial` | OAuth PKCE; requiere env MS_/GOOGLE_CALENDAR_* |
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
| `08.02` | Chat por voz | U A S | `diferido` | `n/a` | `diferido` | Fase 2 WebRTC |
| `08.03` | Chat por video | U A S | `diferido` | `n/a` | `diferido` | Fase 2 WebRTC |
| `08.04` | Chat grupal | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | Crear grupo + historial |
| `08.05` | Moderación / retención de chat | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | A políticas + denuncias + bloqueo |
| `08.06` | Menciones, reacciones, mensajes anclados | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | @usuario + 👍 + pin |
| `08.07` | Buscador + resúmenes/transcripción IA | U A S | `parcial` | `parcial` | `parcial` | Buscador conversaciones OK; IA diferida |
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
| `09.06` | Novedades GeoPop | U A S | `diferido` | `n/a` | `diferido` |
| `09.07` | Jobs SAP/ECR sobre consultas | S | `diferido` | `n/a` | `diferido` |
| `09.08` | Notificaciones de consulta | U A S | `diferido` | `n/a` | `diferido` |
| `09.09` | Mis tickets Jira — soporte pendiente en la app | U A S | `diferido` | `n/a` | `diferido` |
| `09.10` | Configurar integración Jira (admin tenant) + vínculo de usuario | A S | `diferido` | `n/a` | `diferido` |
| `09.11` | Crear issue en Jira desde Connectia (opcional) | U A S | `diferido` | `n/a` | `diferido` |
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

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `11.01` | Mis turnos / mi asistencia | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.02` | Marcación libre / en lugar / temporal | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.03` | Prefichada Geopop | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.04` | Objetivos y servicios | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.05` | Turnos supervisados | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.06` | Escaneo DNI / QR para marcación | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.07` | Novedades e historial de asistencia | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.08` | Marcas fuera de rango | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.09` | Domingos adicionales | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.10` | CRUD turnos (API) | A S | `pendiente` | `pendiente` | `pendiente` |
| `11.11` | Panel supervisores ECR | U A S | `pendiente` | `pendiente` | `pendiente` |
| `11.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `11.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `11.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `11.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `11.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 12. Ausentismos

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `12.01` | Solicitar ausentismo | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `12.02` | Aprobar / rechazar ausentismo | U A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `12.03` | Reporte de ausentismos | A S | `hecho` | `hecho` | `desarrollado_y_configurado` |
| `12.04` | Integración ausentismo ECR | S | `diferido` | `diferido` | `diferido` |
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
| `15.11` | Admin de encuestas externo | A S | `n/a` | `n/a` | `n/a` | Fuera de alcance (sistema externo) |
| `15.12` | Variantes CODESAC / pedidos en encuesta | U A S | `n/a` | `n/a` | `n/a` | No requerido |
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
| `18.03` | Pagos y transferencias | U A S | `hecho` | `hecho` | `hecho` | Transfer pts + canje código/QR local; PSP externo diferido |
| `18.04` | Premios / rewards | U A S | `hecho` | `hecho` | `hecho` | `kind=reward` en mismo catálogo |
| `18.05` | Integración Claro / YoClaro | S | `hecho` | `hecho` | `hecho` | Partners genéricos (`beneficios.partners`); NR Claro extiende |
| `18.06` | Beneficios como tipo de publicación | U A S | `hecho` | `hecho` | `hecho` | `Post.tipo=beneficio` (ya en muro) |
| `18.07` | Reglas de puntos por comunidad | U A S | `hecho` | `hecho` | `hecho` | `PointsRule` + hooks muro/comentarios; admin en `/beneficios` |
| `18.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `parcial` | `n/a` | `parcial` | Smoke humano pendiente |
| `18.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `hecho` | `n/a` | `hecho` | |
| `18.UX` | UX moderna móvil-primero revisada (§45) | U A S | `hecho` | `n/a` | `hecho` | |
| `18.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `hecho` | `hecho` | `hecho` | `/beneficios` admin |
| `18.DOC` | OpenAPI / notas de contrato del módulo | U A S | `parcial` | `n/a` | `parcial` | Contratos en rutas |
### 19. Alarmas

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `19.01` | Crear / actualizar / cancelar alarma | U A S | `pendiente` | `pendiente` | `pendiente` |
| `19.02` | Listado y pedidos de alarmas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `19.03` | Renombre por empresa | U A S | `pendiente` | `pendiente` | `pendiente` |
| `19.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `19.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `19.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `19.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `19.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 20. Pedidos internos

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `20.01` | Pedidos del usuario | U A S | `pendiente` | `pendiente` | `pendiente` |
| `20.02` | ABM pedidos (admin) | A S | `pendiente` | `pendiente` | `pendiente` |
| `20.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `20.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `20.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `20.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `20.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
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

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `23.01` | Tareas comerciales | U A S | `pendiente` | `pendiente` | `pendiente` |
| `23.02` | Sincronización offline de tareas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `23.03` | API de asignaciones | S | `pendiente` | `pendiente` | `pendiente` |
| `23.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `23.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `23.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `23.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `23.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 24. IA y QR

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `24.01` | Chatbot IA con base de conocimientos | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | U `/asistente` + intents + confirmación |
| `24.02` | Gestión de base de conocimientos del bot | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | A `/asistente-kb` · `KbArticle` |
| `24.03` | Búsqueda por IA | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | KB + docs + posts en tools |
| `24.04` | Asistente de contenido | U A S | `pendiente` | `pendiente` | `pendiente` | Ola 29 |
| `24.05` | Asistente de carga de datos | U A S | `pendiente` | `pendiente` | `pendiente` | Ola 29 |
| `24.06` | Escaneo QR a vista | U A S | `pendiente` | `pendiente` | `pendiente` | Ola 29 |
| `24.07` | Lectura QR DNI | U A S | `pendiente` | `pendiente` | `pendiente` | Ola 29 |
| `24.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
| `24.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `desarrollado` | `n/a` | `desarrollado` | tenant + `admin.ia` |
| `24.UX` | UX moderna móvil-primero revisada (§45) | U A S | `desarrollado` | `n/a` | `desarrollado` | Chat asistente + chips |
| `24.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `desarrollado` | `configurado` | `desarrollado_y_configurado` | `/asistente-kb` |
| `24.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` | Postdev |
### 25. Modo TV

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `25.01` | Reproducción modo TV | U A S | `pendiente` | `pendiente` | `pendiente` |
| `25.02` | Emparejamiento móvil ↔ TV | U A S | `pendiente` | `pendiente` | `pendiente` |
| `25.03` | Configuración TV | A S | `pendiente` | `pendiente` | `pendiente` |
| `25.04` | Feed TV | U A S | `pendiente` | `pendiente` | `pendiente` |
| `25.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `25.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `25.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `25.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `25.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
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
| `29.01` | Tablero de adopción / uso de la app | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.02` | Campañas de impulso al uso | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.03` | Confirmaciones de eventos | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.04` | Visitas en publicaciones | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.05` | Contenido más consumido (ranking) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.06` | Últimas conexiones / historial | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.07` | Sentimientos en publicaciones | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.08` | Resultados de encuestas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.09` | Publicaciones por período / grupo | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.10` | Usuarios blanqueados | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.11` | Descargas de documentos | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.12` | Solicitudes de ausentismo | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.13` | Visitas en tiempo real (EPEC) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.14` | Exportación Excel / filtros | U A S | `pendiente` | `pendiente` | `pendiente` |
| `29.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `29.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `29.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `29.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `29.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 30. Integraciones especiales

*Fase: Vertical / no-regresión*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `30.01` | ECR Salud | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.02` | GeoVictoria | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.03` | Customizaciones ECR | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.04` | Customizaciones Claro / YoClaro | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.05` | Customizaciones EPEC | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.06` | Customizaciones Emp_Id 60 | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.07` | Customizaciones Grido / Gridonet | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.08` | WhatsApp Business / WTA | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.09` | Google Maps | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.10` | SAP | U A S | `pendiente` | `pendiente` | `pendiente` |
| `30.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `30.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 31. WhatsApp / WTA, email, archivos y plataforma

*Fase: Vertical / no-regresión*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `31.01` | Envío de email | U A S | `pendiente` | `pendiente` | `pendiente` |
| `31.02` | Gestión de archivos | U A S | `pendiente` | `pendiente` | `pendiente` |
| `31.03` | Logging y health check | U A S | `pendiente` | `pendiente` | `pendiente` |
| `31.04` | Capacidades PWA | U A S | `pendiente` | `pendiente` | `pendiente` |
| `31.05` | Soporte (admin) | A S | `pendiente` | `pendiente` | `pendiente` |
| `31.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `31.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 32. Gaps / no implementado o incompleto

*Fase: Meta / backlog decisión*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `32.01` | Recibos de sueldo | U A S | `pendiente` | `pendiente` | `meta` |
| `32.02` | Videollamadas | U A S | `pendiente` | `pendiente` | `meta` |
| `32.03` | Solicitud turno carnet | U A S | `pendiente` | `pendiente` | `meta` |
| `32.04` | Gestión de atenciones | U A S | `pendiente` | `pendiente` | `meta` |
| `32.05` | Mapa de alarmas (admin) | A S | `pendiente` | `pendiente` | `meta` |
| `32.06` | Visitas por menú (reporte) | A S | `pendiente` | `pendiente` | `meta` |
| `32.07` | Documentación / tutoriales dashboard | A S | `pendiente` | `pendiente` | `meta` |
| `32.08` | Stories (API) | S | `pendiente` | `pendiente` | `meta` |
| `32.09` | Admin de beneficios | A S | `pendiente` | `pendiente` | `meta` |
| `32.10` | Swagger interactivo | U A S | `pendiente` | `pendiente` | `meta` |
| `32.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `32.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 33. Mapa de integraciones con sistemas externos

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `33.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `33.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 34. Reserva de salas, espacios y cocheras

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `34.01` | Catálogo de salas / espacios | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.02` | Catálogo de cocheras / plazas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.03` | Disponibilidad y calendario | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.04` | Reservar sala / espacio | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.05` | Reservar cochera | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.06` | Mis reservas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.07` | Aprobación de reservas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.08` | Check-in / liberación | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.09` | Notificaciones de reserva | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.10` | Reportes de uso | A S | `pendiente` | `pendiente` | `pendiente` |
| `34.11` | Reserva vía chatbot | U A S | `pendiente` | `pendiente` | `pendiente` |
| `34.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `34.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `34.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `34.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `34.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 35. Coworking y puestos de trabajo

*Fase: Vertical opcional*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `35.01` | Catálogo de sedes / plantas / zonas | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.02` | Catálogo de puestos | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.03` | Mapa / plano de planta | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.04` | Reservar puesto / hot desk | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.05` | “Voy a la oficina” / día en sede | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.06` | Mis días / mis puestos | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.07` | Check-in / check-out en sede | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.08` | Quién está hoy (opcional) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.09` | Políticas híbridas y aforo | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.10` | Amenities coworking | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.11` | Encadenar con sala / cochera | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.12` | Notificaciones coworking | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.13` | Reportes de ocupación coworking | A S | `pendiente` | `pendiente` | `pendiente` |
| `35.14` | Coworking vía chatbot | U A S | `pendiente` | `pendiente` | `pendiente` |
| `35.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `35.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `35.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `35.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `35.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 36. Live streaming y broadcasts

*Fase: Diferido fase 2+*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `36.01` | Crear / programar live | U A S | `diferido` | `diferido` | `diferido` |
| `36.02` | Transmitir / ver live | U A S | `diferido` | `diferido` | `diferido` |
| `36.03` | Interacción y métricas | U A S | `diferido` | `diferido` | `diferido` |
| `36.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `diferido` | `n/a` | `diferido` |
| `36.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `diferido` | `n/a` | `diferido` |
| `36.UX` | UX moderna móvil-primero revisada (§45) | U A S | `diferido` | `n/a` | `diferido` |
| `36.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `diferido` | `n/a` | `diferido` |
| `36.DOC` | OpenAPI / notas de contrato del módulo | U A S | `diferido` | `n/a` | `diferido` |
### 37. Organigrama

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `37.01` | Vista de organigrama | U A S | `pendiente` | `pendiente` | `pendiente` |
| `37.02` | Mantener jerarquía | U A S | `pendiente` | `pendiente` | `pendiente` |
| `37.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `37.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `37.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `37.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `37.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 38. Desarrollo de talento

*Fase: Diferido fase 2+*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `38.01` | OKRs / objetivos | U A S | `diferido` | `diferido` | `diferido` |
| `38.02` | Evaluación de desempeño | U A S | `diferido` | `diferido` | `diferido` |
| `38.03` | Plan de carrera | U A S | `diferido` | `diferido` | `diferido` |
| `38.04` | Aprendizaje (LMS) | U A S | `diferido` | `diferido` | `diferido` |
| `38.05` | Búsquedas internas | U A S | `diferido` | `diferido` | `diferido` |
| `38.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `diferido` | `n/a` | `diferido` |
| `38.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `diferido` | `n/a` | `diferido` |
| `38.UX` | UX moderna móvil-primero revisada (§45) | U A S | `diferido` | `n/a` | `diferido` |
| `38.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `diferido` | `n/a` | `diferido` |
| `38.DOC` | OpenAPI / notas de contrato del módulo | U A S | `diferido` | `n/a` | `diferido` |
### 39. Cultura empresarial

*Fase: Diferido fase 2+*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `39.01` | Programa de referidos | U A S | `diferido` | `diferido` | `diferido` |
| `39.02` | People Experience / pulso | U A S | `diferido` | `diferido` | `diferido` |
| `39.03` | Marketplace interno | U A S | `diferido` | `diferido` | `diferido` |
| `39.04` | Reconocimientos | U A S | `diferido` | `diferido` | `diferido` |
| `39.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `diferido` | `n/a` | `diferido` |
| `39.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `diferido` | `n/a` | `diferido` |
| `39.UX` | UX moderna móvil-primero revisada (§45) | U A S | `diferido` | `n/a` | `diferido` |
| `39.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `diferido` | `n/a` | `diferido` |
| `39.DOC` | OpenAPI / notas de contrato del módulo | U A S | `diferido` | `n/a` | `diferido` |
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

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `42.01` | Catálogo + portal | U A S | `pendiente` | `pendiente` | `pendiente` |
| `42.02` | Panel de agentes | U A S | `pendiente` | `pendiente` | `pendiente` |
| `42.QA` | Criterios de aceptación del módulo verificados (checklist §) | U A S | `pendiente` | `n/a` | `pendiente` |
| `42.SEC` | Authz tenant + sin hardcode Emp_Id (premisa) | U A S | `pendiente` | `n/a` | `pendiente` |
| `42.UX` | UX moderna móvil-primero revisada (§45) | U A S | `pendiente` | `n/a` | `pendiente` |
| `42.ADM` | Pantallas/admin de configuración del módulo listas (si aplica) | U A S | `pendiente` | `n/a` | `pendiente` |
| `42.DOC` | OpenAPI / notas de contrato del módulo | U A S | `pendiente` | `n/a` | `pendiente` |
### 43. Seguridad, privacidad y cumplimiento

*Fase: Núcleo MVP*

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
### NR. Packs no-regresión clientes estratégicos

*Fase: Núcleo MVP*

| ID | Punto | Capa | Dev | Config | Global |
|----|-------|------|-----|--------|--------|
| `NR.CLARO` | Pack no-regresión Claro/YoClaro (SSO Azure, hub, beneficios, bandeja estado 8) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.GRIDO` | Pack no-regresión Grido/Gridonet (AD, appMobile, deep links, branding) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.ECR` | Pack no-regresión ECR + asociadas (salud, GeoVictoria, ausentismo, supervisores) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.EPEC` | Pack no-regresión EPEC (visitas, WTA, reglas home) | U A S | `pendiente` | `pendiente` | `pendiente` |
| `NR.EMP60` | Pack labels Emp 60 (Feedback vecinos / renombres vía metadata) | U A | `pendiente` | `pendiente` | `pendiente` |

---

## Olas 12–30 — especificación de requisitos

> Fuente: `ECRMOBILE-FUNCIONES-CONSOLIDADO.md`. Cada ola lista **objetivo**, **IDs**, **requisitos funcionales**, **reglas**, **criterios de aceptación** y **fuera de alcance**.  
> Premisas transversales: tenant/`Emp_Id` sin hardcode · humano confirma mutaciones IA · UX §45 · capability por módulo · auditoría.

### Ola 12 — Chatbot IA + KB + trámites (`24.*` núcleo)

| Campo | Valor |
|-------|--------|
| **Spec** | §24 · *Chatbot con IA y base de conocimientos* |
| **IDs núcleo** | `24.01` `24.02` `24.03` + `24.SEC` `24.UX` `24.ADM` |
| **Capas** | U (chat) · A (KB/gobierno) · S (RAG, intents, orquestación) |
| **Estado** | `parcial` (núcleo 2026-07-28) |

**Objetivo:** Asistente 24/7 del suscriptor: orientar con KB, consultar datos del usuario (incl. **solicitudes en curso** y **documentos visibles**) e **iniciar trámites** con confirmación explícita (mismas reglas que la UI nativa).

**Requisitos funcionales:**
1. U abre asistente (entrada fija / menú); historial de hilo por usuario/tenant.
2. S clasifica intent: orientación | consulta | trámite (+ entidades).
3. Orientación: RAG sobre KB del tenant; respuesta con **citas** (enlace a FAQ/política/guía).
4. Consulta: solo APIs del usuario autenticado — **solicitudes en curso**, estado, **documentos publicados visibles**, **saldo vacaciones real** (APIs §13 / ola 17).
5. Trámite: borrador → resumen → **confirmación U** → `POST` solicitud **o licencia/ausencia** → comprobante.
6. Sin confianza/permiso → FAQ, deep link o abrir consulta §9 (nunca inventar datos).
7. A: ABM de fuentes KB (`/asistente-kb`); indexación desde help/policies cuando existan.
8. Búsqueda por IA sobre KB + docs + posts autorizados (`24.03`).

**Diálogos MVP obligatorios (criterio de producto):**
- Ayuda KB (“¿Cómo hago para…?”)
- **Solicitudes en curso** / estado de trámites
- **Documentos visibles** / buscar documento
- Saldo vacaciones · solicitar vacaciones · saldo+solicitud (**APIs reales ola 17**; stub eliminado)
- Recibo de sueldo (fallback a consulta RRHH)
- Estado de consulta · “dónde está X módulo” · “cómo marcar”
- Reservar sala / cochera / puesto (contrato de intent; stub hasta ola 21)

**Reglas:** mismo authz que UI · sin ampliar permisos · mutaciones solo con confirmación · aislamiento tenant · fallback si falla proveedor IA · auditoría de usos.

**Criterios de aceptación:**
- [ ] Los diálogos MVP A–E (KB, saldo, vacaciones, combinado, recibo/fallback) funcionan en tenant DEMO.
- [ ] Respuestas KB citan fuente; sin fuente → mensaje honesto + escalamiento.
- [ ] Ningún trámite se ejecuta sin confirmación.
- [ ] Capability `admin.ia` / menú Asistente configurables por tenant.

**Fuera de esta ola:** modos Sammy completos, QR, traducciones masivas → **Ola 29**.

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
| **Spec** | §21 Datos útiles / directorio · §3.08 / §14 **local** (sin API PeopleCare externa) |
| **IDs** | `21.*` · legajo autónomo Connectia · DoD |
| **Estado** | `parcial` — núcleo `21.*` + legajo local hechos; DoD QA/DOC pendiente |
| **Decisión (2026-07-28)** | **No** hay conector HTTP a PeopleCare. El expediente vive en `EmployeeLegajo`. Un **miembro** de la comunidad puede **no** ser empleado (`userId` opcional / sin legajo). |

**Objetivo:** Directorio corporativo + expediente RRHH gestionado 100% en Connectia.

**Requisitos:**
1. Directorio / teléfonos / datos útiles U+A (`21.*`): búsqueda, fichas, visibilidad por política. ✅
2. ~~Reemplazar stub PeopleCare por conector HTTP~~ → **Legajo local** (`EmployeeLegajo` + Admin → Legajos RRHH + `GET /me/peoplecare`).
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
| **Estado** | `parcial` (núcleo 2026-07-28) |

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
| **Estado** | `cerrada` · 2026-07-28 · *12.04 ECR diferida* |

**Objetivo:** Trámites RRHH clásicos consumibles desde U y aprobables (UI + §41 + chatbot).

**Requisitos:**
1. Solicitar licencia/vacaciones; consultar saldos/devengados. ✅
2. Aprobar/rechazar/editar (líder/RRHH); reportes A. ✅
3. Ausentismos: solicitar, aprobar/rechazar, reporte; integración ECR diferible (`12.04`). ✅ (ECR diferida)
4. Enganche a bandeja §41; intents chatbot ola 12 contra estas APIs. ✅ (stub eliminado)
5. Validaciones: solape, saldo, feriados (según reglas tenant). ✅ (solape + saldo + feriados nacionales y calendario por comunidad)

---

### Ola 18 — Asistencia, turnos y marcación (`11.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §11 |
| **IDs** | `11.01`–`11.11` (priorizar 11.01, 11.02, 11.07, 11.10; resto vertical) |
| **Estado** | `no hecha` · *Vertical opcional* |

**Objetivo:** Ver turnos y marcar asistencia desde móvil.

**Requisitos núcleo:** mis turnos/asistencia; marcación (libre/lugar/temporal); historial/novedades; CRUD turnos A; authz tenant.  
**Vertical / cliente:** Geopop, panel ECR, DNI/QR, fuera de rango, domingos — según demanda NR.

---

### Ola 19 — PeopleCare + Onboarding (`14.*` · `16.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §14 · §16 |
| **IDs** | `14.01`–`14.10` · `16.*` |
| **Estado** | `parcial` · núcleo + mejoras UX 2026-07-28 · *Vertical* · QA/DOC postdev |
| **Decisión (2026-07-28)** | **`16.03` reusa el motor de encuestas §15** — no hay un segundo constructor. Misma UI admin (tipos de pregunta, IA, audiencia, agenda, offline, resultados). Un hito de onboarding/offboarding referencia `surveyId` (mismo patrón que `linkedSurveyId` en muro). Campo opcional `purpose` / etiqueta (`general` \| `onboarding` \| `offboarding`) solo para filtrar y reportar; el CRUD sigue siendo Admin → Encuestas. |

**Objetivo:** Legajo digital + ciclo de vida ingreso/egreso.

**Requisitos:**
1. Ficha colaborador y bloques (domicilio, familia, OS, banco, médica, contratos, skills, líderes). ✅
2. Catálogos RRHH A. ✅ (`/api/admin/hr-catalogs` + Admin → Catálogos RRHH)
3. Onboarding: plantillas, hitos, progreso U; offboarding (checklist + revocación accesos). ✅
4. **Encuestas de onboarding/egreso (`16.03`):** configurar con el motor §15. ✅ `Survey.purpose` + gancho post-`respond` → cierra hito.
5. Onboarding asistido por chatbot (modo onboarding → ola 29/12). Diferido.

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

**Paridad legado:** cubierta la UI/flujo de `sooft_newapp_lite_back` Benefits (Catalog, Cart, Geolocation, PaymentQR, RecievePaymentQR, WithdrawCash, Wallet).  
**Aún externo/diferido:** PSP bancario real, Google Maps Directions, KYC/conciliación productiva (retiro queda `pending`).

**Fuera de alcance / diferido:** PSP externo, pack NR Claro específico (ola 24).

---

### Ola 21 — Reservas + coworking (`34.*` · `35.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §34 · §35 (greenfield) |
| **IDs** | `34.*` · `35.*` |
| **Estado** | `no hecha` |

**Objetivo:** Reservar salas/cocheras y puestos/hot desk; check-in sede.

**Requisitos:**
1. Catálogo recursos; disponibilidad; crear/cancelar reserva; aprobación si política.
2. Mis reservas; notificaciones.
3. Coworking: mapa/zonas simplificado; cupos híbridos; check-in.
4. Intents chatbot (sala/cochera/puesto) contra estas APIs.
5. Admin: sedes, recursos, políticas, reportes ocupación.

---

### Ola 22 — Organigrama + Reportes (`37.*` · `29.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §37 · §29 |
| **IDs** | `37.*` · núcleo `29.*` (dashboards clave; no todo el catálogo de reports de golpe) |
| **Estado** | `no hecha` |

**Objetivo:** Ver estructura organizacional + informes de uso/participación.

**Requisitos:** organigrama U/A (nodos desde usuarios/áreas); reportes muro/encuestas/trámites/adopción; export; solo datos del tenant; roles de visibilidad.

---

### Ola 23 — Portal de servicios + Seguridad (`42.*` · `43.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §42 · §43 |
| **IDs** | `42.*` · `43.*` |
| **Estado** | `no hecha` |

**Objetivo:** Catálogo de servicios internos + controles de privacidad/cumplimiento mínimos.

**Requisitos:** portal U (solicitar servicio); panel agentes A; estados/SLA básicos; §43: consentimientos, retención, export/borrado mínimos, logs de acceso sensibles.

---

### Ola 24 — Packs no-regresión (`NR.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | Particularidades por empresa (consolidado 0b) |
| **IDs** | `NR.CLARO` `NR.GRIDO` `NR.ECR` `NR.EPEC` `NR.EMP60` |
| **Estado** | `no hecha` |

**Objetivo:** Conservar comportamientos críticos de clientes estratégicos **sin hardcode** (metadata/capabilities).

**Requisitos por pack:** ver filas NR en inventario. UAT firmada por cliente = DoD del pack.

---

### Ola 25 — Operaciones de campo (`19.*` · `20.*` · `23.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §19 Alarmas · §20 Pedidos · §23 Supervisor comercial |
| **Estado** | `no hecha` · *Bajo demanda* |

**Requisitos:** alarmas U/A; pedidos internos flujo completo; supervisor comercial (rutas/visitas/formularios) según spec §23. Priorizar por tenant NR (ECR/EPEC).

---

### Ola 26 — Modo TV + Live streaming (`25.*` · `36.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §25 · §36 |
| **Estado** | `no hecha` · *Bajo demanda* |

**Requisitos:** reproducción TV, emparejamiento móvil↔TV, feed/config; broadcasts en vivo (latencia, roles, grabación según gaps). Diferible si no hay demanda comercial.

---

### Ola 27 — Desarrollo de talento + Cultura (`38.*` · `39.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §38 · §39 |
| **Estado** | `no hecha` · *Bajo demanda* (hoy muchos IDs `diferido` en inventario) |

**Requisitos:** OKR, desempeño, LMS, búsquedas internas; referidos, pulso, marketplace, reconocimientos. Activar por capability; no bloquea MVP comunidad.

---

### Ola 28 — Integraciones de plataforma (`30.*` · `31.*` · `33.*`)

| Campo | Valor |
|-------|--------|
| **Spec** | §30 · §31 · §33 |
| **Estado** | `no hecha` |

**Objetivo:** Canales e integraciones transversales.

**Requisitos:** WhatsApp/WTA, email transaccional, archivos/storage, PWA móvil+desktop; mapa de sistemas externos; integraciones especiales (ECR/Grido) coordinadas con ola 24. Adapters Azure/AD/SSO ya diferidos en §1 se retoman aquí o en NR.

---

### Ola 29 — IA extendida + QR (`24.04`–`24.07` + modos)

| Campo | Valor |
|-------|--------|
| **Spec** | §24 (resto) |
| **IDs** | `24.04` `24.05` `24.06` `24.07` + modos Sammy |
| **Estado** | `no hecha` · *Tras ola 12* |

**Requisitos:**
1. Asistente de contenido (pubs/push/FAQs) — unificar con mejoras ya parciales en muro/push.
2. Asistente de carga de datos en formularios.
3. Modos: personal, soporte, onboarding, traducciones, research, ventas (opt-in).
4. Escaneo QR → vista; lectura QR DNI.
5. Gobierno: límites/costos por tenant; opt-out; auditoría.

---

### Ola 30 — Gaps / cierre de producto (`32.*` · diferidos · §45 residual)

| Campo | Valor |
|-------|--------|
| **Spec** | §32 · diferidos de §1/§4/§8/§9 · modernización |
| **Estado** | `no hecha` · *Continuo* |

**Requisitos / decisiones:**
1. Recibos de sueldo (greenfield o integración) — desbloquea diálogo chatbot A.
2. Jira / SAP / GeoPop / notif consulta (§9.06–11) si hay demanda.
3. Chat voz/video (§8.02–03); stories muro; resúmenes IA chat.
4. Revisar §45 (microinteracciones, desktop companion) donde falte.
5. §44: checklist explícito de deuda técnica **a no migrar**.

---

## Orden sugerido de trabajo (local)

1. ~~E0–Ola 5~~ — hechas (núcleo)
2. Cerrar parciales olas 6–11 (smoke/QA) en paralelo a postdev
3. **Ola 12** Chatbot IA + KB ← **siguiente de producto**
4. Olas **13 → 16** (ayuda, perfil/directorio, eventos, ABM)
5. Olas **17 → 23** (RRHH, ops, espacios, reportes, portal/seguridad)
6. **Ola 24** Packs NR según prioridad comercial
7. Olas **25–30** bajo demanda / cierre gaps
8. **Postdesarrollo** continuo (sección final)

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

## Postdesarrollo (olas 1 · 2 · 3 · 4 · 6 · 7 · 9)

> Trabajo **después** del núcleo de desarrollo: QA smoke, config fina, docs, DoD formal.  
> No bloquea marcar una ola como **`cerrada`** si ya no falta código de núcleo.  
> Al completar un ítem: tachalo acá y actualizá el ID en el inventario / CSV.

### Ola 1 — Acceso (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| `01.QA` | Smoke humano: login ID/mail, pre-login, sesión, logout, términos, forgot/reset | QA |
| `01.14` | Dominio custom (hoy subdomain básico). Completar config o marcar `diferido` | Config / decisión |
| `01.10` · `01.UX` · `01.ADM` · `01.DOC` | Pasar a `cerrado` tras smoke | DoD formal |
| `01.04`–`01.09` · `01.15` | Azure, token, externo, legacy, 2FA, SMS, selector empresa | Ya `diferido` |

### Ola 2 — Tenant + menú (+ Tema) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| `02.QA` · `28.QA` | Smoke: Suscriptores PLATFORM, CRUD tenant, dashboards, guards, menú U/A | QA |
| Caps / seed | Verificar capabilities + menú por tenant en demo/Arcor | Config / QA |
| `02.01`–`02.08` · `02.UX` · `02.ADM` · `28.01`–`28.04` · `28.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `02.05` · `02.SEC` · `02.DOC` · `28.SEC` · `28.UX` · `28.DOC` | Afinar docs o cerrar DoD (ya hay código) | Docs / DoD |
| `02.05` labels YOMOB/SOOFIA | Opcional: renombres vía metadata; núcleo usa `uxShell` Connectia | Decisión / diferir |

### Ola 3 — Muro (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke muro + UGC | Feed, detalle, reacciones, composer, mis envíos, cola admin aprobar/rechazar + mail/push | QA |
| `04.DOC` | OpenAPI / notas de contrato del módulo muro | Docs |
| `04.01`–`04.03` · `04.05`–`04.06` · `04.09` · `04.11` · `04.18`–`04.20` · `04.SEC` · `04.UX` · `04.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `04.04` · `04.07` · `04.08` · `04.12`–`04.17` | Stories, IA publicar, etc. | Ya `diferido` |
| `04.10` | Comentarios en publicaciones | Hecho con §10 |

### Ola 4 — Solicitudes / consultas (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke consultas | Crear, listar, hilo, bandeja admin, tipos/áreas/campos | QA |
| `09.DOC` | OpenAPI / notas de contrato | Docs |
| `09.01`–`09.05` · `09.SEC` · `09.UX` · `09.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `09.06`–`09.11` | GeoPop, SAP/ECR jobs, notif consulta, Jira | Ya `diferido` |
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
| FCM / Huawei nativo | App nativa | Fuera de alcance (Web Push) |

### Ola 9 — Comentarios / moderación (§10) (`cerrada` · postdev)

| ID / tema | Qué falta | Tipo |
|-----------|-----------|------|
| Smoke | U comentar en detalle; A bandeja + aceptar sugerencia + config | QA |
| `10.01`–`10.03` · `10.SEC` · `10.UX` · `10.ADM` | Pasar a `cerrado` tras smoke | DoD formal |
| `10.QA` · `10.DOC` | Checklist + OpenAPI | Postdev |
| Análisis imagen/GIF · apelación autor | Gaps de spec | Diferido / post |

