# Connectia — Spec exhaustiva Ola 31 + Ola 32 (Supervisor Virtual)

> **Actualizado:** 2026-07-29  
> **Estado en tablero:** `CONNECTIA-STATUS.md` · IDs `23.*` / `23.ECR.*` / `23.SV.*`  
> **Objetivo:** tener **toda la info** para no perder funcionalidad del testigo (31) y para implementar el Supervisor Virtual de equipo (32) sin inventar a ciegas.

---

## Mapa rápido

| Ola | Nombre | Nivel | Fuente de verdad |
|-----|--------|-------|------------------|
| **31** | Supervisión comercial + panel ECR | **Básico / vertical campo** | `sooft-frontend-supervisores` + `sooft-backend-supervisores` + `sooft_newapp_lite_back` (`supervisor-mod`, `Supervisors`) |
| **32** | Supervisor Virtual de equipo | **Full / producto Connectia** | Patrones de audiencia Connectia (`audience.js`) + concepto de alcance “solo mis supervisados” (**no** está en el testigo sooft) |

**Full Supervisor Virtual = Ola 31 + Ola 32.**

Repos testigo (locales, gitignored):

- `SUPERVISoRVIRTUAL/sooft-frontend-supervisores`
- `SUPERVISoRVIRTUAL/sooft-backend-supervisores`
- `SUPERVISoRVIRTUAL/sooft_newapp_lite_back/...`

---

# PARTE A — Ola 31 (paridad testigo)

## A.1 Concepto

Sistema de **supervisión comercial de campo**: master data (cadena → sala → cliente → asignaciones), plantillas checklist, ciclo de vida de tareas, roles granulares, push, offline móvil, y (pack ECR) marcas fuera de rango / domingos.

## A.2 Roles canónicos

| rol_id | Nombre | Notas |
|--------|--------|-------|
| 1 | Operario (legacy alias) | En migración se mapea a **4** |
| 4 | **Operario** (canónico Connectia) | Quien ejecuta la tarea en sala · **ADR-D31-1** |
| 2 | Supervisor | |
| 3 | Plataforma Comercial | Mismo set de vistas que Supervisor en `TareasComerciales` |
| — | Gestor | Implícito por asignación en `clientes_salas_colaboradores`; crea tareas de sala |
| 5 | Administrador | Bypass total; no se puede dejar el tenant sin ningún admin |

**ADR-D31-1 (resuelto 2026-07-29):** Operario canónico = `rol_id` **4**; alias 1 → 4 en migración.

## A.3 Pantallas `permisos_config` (JSON por rol)

| Pantalla id | Acciones |
|-------------|----------|
| `inicio` | ver |
| `historial-tareas` | ver-detalle |
| `templates` | crear-template, crear-categoria, ver-detalle, editar, copiar, eliminar |
| `abm-cliente-sala` | importar, descargar, nueva-relacion, ver-detalle, editar, eliminar |
| `abm-cliente` | importar, descargar, nuevo-cliente, ver-detalle, editar, eliminar |
| `abm-sala` | importar, descargar, nueva-sala, ver-detalle, editar, eliminar |
| `abm-cadena` / `abm-subcadena` / `abm-asignaciones` | importar, descargar, nuevo, ver-detalle, editar, eliminar |
| `roles` | exportar, importar, gestionar, asignar-rol, editar, eliminar, ver-detalle-usuario |

Admin (`rol_id=5` o nombre admin) = acceso total.

## A.4 Entidades de dominio (campos clave)

| Entidad | Campos clave |
|---------|--------------|
| Usuarios | usu_id, nombre, apellido, email, emp_id |
| Usuarios_Roles | usuario_id, rol_id, emp_id |
| Roles | rol_id, rol_nombre, emp_id, **permisos_config** JSON |
| Cadenas / Subcadenas | id, nombre, emp_id (+ cadena_id en sub) |
| Clientes | id, nombre_division, nombre_sociedad, codigo_division, emp_id |
| Salas | id, nombre, codigo_lps, cadena_id, subcadena_id, comuna_id, emp_id |
| Clientes_Salas | id, cliente_id, sala_id, emp_id, **colaboradores[]** (usuario_id+rol_id) |
| País / Región / Comuna | jerarquía geo |
| Categorías / Pilares / Mediciones / Items | taxonomía de checklist |
| Pilares_Mediciones / Mediciones_Templates | N:M |
| Templates / Templates_Estados | plantillas |
| Prioridades | Alta/Media/Baja |
| **Tareas** | titulo, descripcion, fecha_limite, nota, tipo, usuario_asignado_id, usuario_creador_id, sala_id, prioridad_id, tarea_estado_id, emp_id, template_id, fechas creacion/completado/asignacion/cancelacion, requiere_foto, usuario_completado_id, usuario_cancelado_id |
| Tareas_Estados | ids observados: **2=Pendiente**, **8=Asignación**, **1=En progreso** (móvil), Completada, Cancelada |
| Tareas_Respuestas | tarea_id, medicion_id, completada, observación, valor |
| Observacion_Mediciones / Comentarios / Adjuntos | evidencia |
| Notificaciones (MER) | modelo referenciado; envío real = Push HTTP externo |

## A.5 Reglas de negocio críticas (tareas)

1. **Al crear:** si hay `usuario_asignado_id` y no mandan estado → estado **8 (Asignación)**; si no → **2 (Pendiente)**.
2. **Al asignar por primera vez** (antes null, estado 2) → pasa a **8**.
3. Validar existencia de usuario/sala/prioridad/estado al create/update.
4. Plantilla editada **no** debe mutar tareas ya creadas (snapshot / versionado Connectia).
5. Completar con `tarea_requiere_foto` exige evidencia; `CompleteTaskModal` exige observación no vacía.
6. **Offline:** crear tarea **bloqueada**; abrir detalle offline solo si asignada y estado “En progreso” (id 1); cola: editar, respuestas, comentarios, completar, fotos base64; cache con límites (30 tareas, 3 detalles, 50 comentarios…).

## A.6 Matriz API backend testigo (Nest)

```
/api/usuarios                  GET | GET con-roles | GET :id | GET/PUT :id/rol
                               GET :id/rol/:rol_id/verificar-relaciones | DELETE :id/rol/:rol_id
                               POST roles/bulk  (AdminGuard)
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
GET /global/schema             introspección (doc)
```

CreateTarea campos obligatorios: `tarea_titulo`, `tarea_fecha_limite`, `tarea_tipo`, `usuario_creador_id`, `sala_id`, `prioridad_id`.

## A.7 Frontend testigo (Next) — rutas

| Ruta | Función |
|------|---------|
| `/home` | Landing |
| `/gestion-tareas` | Lista + filtros + crear (`AddTaskForm`, `FiltersModal`, `TasksTable`) |
| `/gestion-tareas/[id]` | Detalle |
| `/plantillas-checklist` | Templates / categorías / pilares / mediciones |
| `/roles` | Roles + permisos_config + import usuarios-roles |
| `/abm/*` | cadena, subcadena, sala, cliente, cliente-sala, asignaciones |
| `/configuracion` | Preferencias |
| `/mer` | Diagrama ER (referencia, no producto U) |
| `/acceso-requerido` | Sin permiso |
| `/pwa` | Flujo móvil por rol (candidato a reemplazar supervisor-mod) |

## A.8 Móvil legado `supervisor-mod`

| Vista | Quién / qué |
|-------|-------------|
| `TareasSala` | Gestor: tareas de sus salas; crear manual |
| `TareasComerciales` | Supervisor / PC: listado + **acciones masivas** (asignar, priorizar, editar, cancelar, completar) |
| `AsignacionTareas` | Asignación + masivas |
| `MisActividades` | Tareas propias |
| `CrearTarea` | Alta manual (bloqueada offline) |
| `DesdeTemplate` / `CrearDesdeTemplate` | Alta desde plantilla (bloqueada offline) |
| `DetalleTarea` | Iniciar, checklist, foto, comentario, adjunto, cancelar, completar |

Navegación: `eventBus` (no vue-router). Servicio: `tareasService.js`. Offline: `tareasOffline.js` + helper.

## A.9 Panel ECR (`views/Supervisors`)

API externa: `VUE_APP_ECR_SUPERVISORS_API` + header `x-api-key` (**en Connectia: solo BFF**).

| Acción | Endpoint | Payload clave |
|--------|----------|---------------|
| Listar marcas | `GET /api/v1/getMarcasFueraRango?pernrSupervisor=&fecha=DD-MM-YYYY` | — |
| Justificaciones catálogo | `GET /api/v1/getJustificaciones` | — |
| PDV cercanos | `GET /api/v1/getProyectos?division=&latRef=&lngRef=` | — |
| Justificar | `POST /api/v1/setJustificarFueraRangos` | `{ idJustificacion, fecha, rutTrabajador, idDivisionTrabajador, tipoMarca }` |
| Anexo contrato | `POST /api/v1/setAnexoContratoFueraRango` | `{ idProyecto, fecha, rutTrabajador, idDivisionTrabajador, tipoMarca }` |
| Amonestar | `POST /api/v1/setAmonestarFueraRango` | `{ fecha, rutTrabajador, idDivisionTrabajador, tipoMarca }` |
| Domingos | `GET /api/v1/getReporteDomingosAdicionales?pernrSupervisor=` | — |

Flags por marca: `accJustificar`, `accAmonestar`, `accGenAnexo`.  
Fecha default marcas: ayer si hora &lt; 12:00, hoy si ≥ 12:00.

**Gap legado:** no notifica al operario al resolver marca (documentar como mejora opcional Connectia).

## A.10 Notificaciones (testigo)

| Trigger | Destinatarios |
|---------|---------------|
| Crear tarea (creador Gestor) | Supervisores + Plataforma Comercial de la sala |
| Crear tarea (otros) | Colaboradores de la sala |
| Asignar | Operario asignado |
| Cambio estado / eliminar | Según lógica service (asignado/creador) |

Canal: `POST PUSH_NOTIFICATION_URL` (token). Fallo **no bloquea** la operación.  
**Email fallback:** **ADR-D31-2 (resuelto):** si falla el push, enviar email vía infraestructura §7 Connectia.

## A.11 Env vars

| Ámbito | Vars |
|--------|------|
| Backend Nest | `DATABASE_URL`, `DATABASEYO_URL`, `FILES_API_URL`, `PUSH_NOTIFICATION_URL`, `PUSH_NOTIFICATION_TOKEN`, `PORT`, CORS… |
| Front Next | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ENV`… |
| YoMob legacy | `VUE_APP_TAREAS_API_URL`, `VUE_APP_FILES_API_URL`, `VUE_APP_API_ASIGNACIONES`, `VUE_APP_ECR_SUPERVISORS_API`, `VUE_APP_ECR_SUPERVISORS_API_KEY` |

## A.12 Checklist de paridad DoD (101 ítems)

Ver inventario detallado en conversación / agent — resumen por bloques:

1. **Dominio/roles** (1–16): entidades, rol 5, permisos_config, bloqueos admin/relaciones.  
2. **API tareas** (17–23): defaults estado, validaciones, PATCH, filtros emp/usuario.  
3. **API master data** (24–48): CRUD+XLSX cadenas…adjuntos, ubicaciones, health.  
4. **Front Next** (49–68): gestión tareas, templates, roles, ABMs, PWA por rol.  
5. **Móvil supervisor-mod** (69–83): vistas, masivas, offline, cache, fotos.  
6. **ECR** (84–91): marcas, justificar, amonestar, anexo, domingos, BFF key.  
7. **Notif / transversal** (92–101): push triggers, no-bloqueo, env multi-stage, Files API.

IDs tablero: `23.00`–`23.42`, `23.ECR.*`, `23.IA`, `23.QA/SEC/UX/ADM/DOC`.

## A.13 Decisiones de producto Ola 31 — **RESUELTAS** (2026-07-29)

| ID | Decisión | Estado |
|----|----------|--------|
| **ADR-D31-1** | Operario canónico `rol_id = 4` (migrar 1→4) | **Aprobado** |
| **ADR-D31-2** | Si falla push → también email (§7) | **Aprobado** |
| **ADR-D31-3** | Reimplementar dominio en Connectia (Mongo); BFF solo para API ECR externa | **Aprobado** |
| **ADR-D31-4** | Prioridad: app móvil/campo primero; Admin (ABM/roles/templates) en paralelo | **Aprobado** |
| **ADR-D31-5** | Al justificar / amonestar / anexo ECR → avisar al empleado in-app (mejora vs legado) | **Aprobado** |

---

# PARTE B — Ola 32 (Supervisor Virtual de equipo)

## B.1 Concepto

El supervisor puede **generar elementos de la app Connectia** (muro, eventos/agenda, notificaciones, encuestas, docs, chat…) **solo para sus supervisados**, y **seguir su actividad**, sin ser admin del tenant.

No viene del testigo sooft-*-supervisores. Reutiliza el patrón de audiencia Connectia.

## B.2 Qué ya existe en Connectia (reutilizar)

| Pieza | Path / nota |
|-------|-------------|
| Audiencia unificada | `connectia/backend/src/lib/audience.js` — `mode: all \| restricted \| users \| none` + areaIds/groupIds/userIds |
| Post / Event / DocItem / PushCampaign | mismo shape de audience |
| Chat canal desde audience + sync | `chatAdmin.js` `resolveAudienceMembers` + `POST .../channels/:id/sync` |
| Org | `OrgArea`, `UserGroup`, `User.areaId`, `User.groupIds` |
| Líder descriptivo | `EmployeeLegajo.liderUserId` (**no** usado aún en authz) |
| Capabilities | `requireCapability` / `hasCapability` — agregar `supervision.equipo*` |
| Snapshot audiencia | patrón `Survey.audienceSnapshot` |

## B.3 Gaps a cerrar

1. No hay modelo activo supervisor↔equipo (`TeamScope`).  
2. `User` no tiene `managerId`.  
3. No hay cap `supervision.equipo` ni hub «Mi equipo».  
4. No hay middleware `requireTeamScope` / forzar audience en servidor.  
5. `Survey` (y Request) no tienen `mode: users` + `userIds`.  
6. No hay timeline de actividad de miembro (ActivityEvent es auditoría admin).  
7. Composer U no tiene preset “solo mi equipo” inmutable.

## B.4 Modelo propuesto `TeamScope`

```text
tenantId, supervisorId, nombre
source: {
  // Combinable (ADR-D32-1): se pueden usar varias fuentes a la vez
  areaIds[]          // por área organizacional
  groupIds[]         // por grupo
  userIds[]          // personas elegidas a mano (X, Y, Z…)
  clientIds[]        // por cliente (dominio supervisión comercial / Ola 31)
  // “área + cliente” = intersección o unión según UI; default unión de miembros que
  // matchean área Y/O cliente según lo que el admin marque en el scope
}
memberIds[] (denormalizado), memberCount, resolvedAt
allowedModules: [muro|eventos|notif|encuestas|docs|chat]
activo, createdById, timestamps
```

**Cómo se arma el equipo (funcional, ADR-D32-1):** el admin/supervisor elige **una o varias** formas y se combinan:

| Forma | Ejemplo |
|-------|---------|
| Por **área** | Toda el área Ventas |
| Por **área + cliente** | Área Ventas **y** solo gente del cliente “Cadena X” |
| Por **grupo** | Grupo “Promotores CABA” |
| Por **personas a mano** | Elegir Ana, Luis y Sofía |
| **Combinación** | Área + grupo + 2 personas sueltas, etc. |

El sistema calcula la lista final de miembros (`memberIds`) y esa lista es la audiencia forzada de todo lo que publique el supervisor.

Helpers:

- `resolveTeamScopeMembers` → resuelve áreas/grupos/clientes/personas → lista única
- `audienceFromScope(scope)` → `{ mode: 'users', userIds: memberIds }`
- Mutaciones supervisor: **sobrescribir audience en servidor**; ignorar `all` del cliente

## B.5 Caps

```
supervision.equipo
supervision.equipo.muro
supervision.equipo.eventos
supervision.equipo.notif
supervision.equipo.encuestas
supervision.equipo.docs
supervision.equipo.chat
```

## B.6 Flujos U

| ID | Entrega |
|----|---------|
| `23.SV.00` | Cap + menú |
| `23.SV.01` | Hub Mi equipo |
| `23.SV.02` | Definir/sync alcance |
| `23.SV.03`–`08` | Crear muro / eventos / notif / encuestas / docs / chat → solo equipo |
| `23.SV.09` | Timeline agregada |
| `23.SV.10` | Ficha supervisado |
| `23.SV.11` | Composer unificado |
| `23.SV.12` | Authz servidor |
| `23.SV.13` | Vista supervisado (solo recibe) |

## B.7 Criterios DoD

- Supervisor A no ve/notifica equipo de B.  
- Supervisado solo recibe lo de su alcance.  
- Quitar del equipo: deja de recibir **nuevos**; historial según política (snapshot).  
- Supervisor **nunca** publica a “toda la empresa”.  
- Si Ola 31 activa: timeline puede unir tareas de campo.

## B.8 Decisiones de producto Ola 32 — **RESUELTAS** (2026-07-29)

| ID | Decisión | Estado |
|----|----------|--------|
| **ADR-D32-1** | Armar equipo de **varias formas combinables**: área, área+cliente, grupo, personas a mano | **Aprobado** |
| **ADR-D32-2** | Un supervisor puede tener **N equipos** (`TeamScope`) | **Aprobado** |
| **ADR-D32-3** | MVP de creación: **muro + notificaciones + eventos/agenda**; resto por subcap después | **Aprobado** |
| **ADR-D32-4** | El supervisado **solo recibe** (sin composer ni gestión de equipo) | **Aprobado** |
| **ADR-D32-5** | Ficha: perfil básico + actividad del alcance; **sin** datos RRHH sensibles salvo cap futura | **Aprobado** |
| **ADR-D32-6** | Ola 32 **en paralelo** a Ola 31 (no espera a cerrar 31) | **Aprobado** |

---

# PARTE C — Relación entre olas

```text
                    ┌─────────────────────────┐
                    │   App Connectia (U)     │
                    └───────────┬─────────────┘
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   Ola 31 (campo)        Ola 32 (equipo)        Resto módulos
   tareas/checklist      pubs/eventos/notif     (muro, agenda…)
   ABM comercial         alcance TeamScope      reutilizados
   ECR marcas            seguimiento equipo
```

| Pregunta | Respuesta |
|----------|-----------|
| ¿Básico? | Solo **31** |
| ¿Full? | **31 + 32** |
| ¿Misma app? | Sí, capabilities + menú |
| ¿Testigo cubre 32? | No |

---

# PARTE D — Cómo usar esta spec al implementar

1. Abrir ID en `CONNECTIA-STATUS.md`.  
2. Buscar la función en esta spec (Parte A o B).  
3. Contrastar con código testigo / Connectia (paths citados).  
4. No hardcodear `Emp_Id`.  
5. Secretos ECR/push solo en backend.  
6. Actualizar estado del ID al cerrar.  
7. Respetar ADR **D31-*** / **D32-*** ya resueltos en esta spec (no reabrir sin producto).

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-07-29 | Primera versión exhaustiva Ola 31 (testigo) + Ola 32 (audiencia Connectia) + decisiones abiertas |
| 2026-07-29 | **ADR cerrados:** D31-1…5 (recomendados) · D32-1 formas combinables (área / área+cliente / grupo / personas) · D32-2…6 aprobados |
