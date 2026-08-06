# Connectia — Olas (tablero corto)

> Actualizado: 2026-08-03  
> **Estado:** <span style="color:#16a34a">✓</span> cerrada · <span style="color:#ca8a04">●</span> parcial · <span style="color:#dc2626">✗</span> no hecha  
> Regla: **cerrada** si solo falta QA / smoke / docs.  
> Columna **Qué falta** = solo desarrollo pendiente (nunca UAT, smoke ni documentación).  
> Columna **Objetivo funcional** = qué ofrece el sistema a la comunidad.  
> Columna **Funciones** = viñetas de capacidades (**mínimo 5**; más si el módulo lo ofrece).  
> Columna **Gaps** = solo lo pendiente / diferido / postdev funcional (nunca QA·smoke·docs; nunca “OK”). Si no hay nada → —.  
> Columna **Prioridad** = solo olas **no terminadas** (✗): juicio subjetivo de valor de producto — <span style="color:#dc2626">IMPRESCINDIBLE</span> · <span style="color:#ca8a04">NECESARIO</span> · <span style="color:#2563eb">DESEABLE</span>. Cerradas (✓) → —.  
> Detalle: [`CONNECTIA-STATUS.md`](./CONNECTIA-STATUS.md) · orden: [`CONNECTIA-ROADMAP.md`](./CONNECTIA-ROADMAP.md) · Rendi: `docuflow` · Hiryx: `HIRYX-SAAS`  
> **Ola 41** (coherencia entre módulos): base = canvas Cursor `coherencia-modulos-connectia.canvas.tsx` — ver sección *Ola 41* abajo.  
> **Ola 42** (secrets / env / vault): checklist de **configuración productiva** de integraciones ya desarrolladas — **no** es desarrollo de producto; ver sección *Ola 42* abajo.  
> **Ola 23** = solo **seguridad/privacidad** (§43 · IMPRESCINDIBLE). **Portal de servicios** (§42) → **Ola 43** (separado 2026-07-30).  
> **Ola 24** = paridad por cliente estratégico (**IMPRESCINDIBLE** · no perder lo que hoy opera en legacy). Seguimiento tema a tema: [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md).  
> **Ola 28** = centro de comunicaciones de plataforma (`28.COM.*` · **cerrada** 2026-07-30 · testigo Hiryx). Packs de cliente ≠ esta ola.

### Avance del tablero

| Estado | Olas | Score |
|--------|-----:|------:|
| <span style="color:#16a34a">✓</span> cerrada | 35 | 100% c/u |
| <span style="color:#ca8a04">●</span> parcial | 2 | 50% c/u |
| <span style="color:#dc2626">✗</span> no hecha | 8 | 0% c/u |
| **Total** | **45** | |

| Métrica | Valor |
|---------|------:|
| **Avance simple** (todas las olas pesan igual) | **80%** |
| **Avance ponderado** (por prioridad) | **78%** |

```
████████████████░░░░  78% ponderado
```

Pendientes abiertas por prioridad: <span style="color:#dc2626">IMPRESCINDIBLE</span> 4 · <span style="color:#ca8a04">NECESARIO</span> 5 · <span style="color:#2563eb">DESEABLE</span> 1 (incluye las 2 parciales).

**Cómo se pondera:** peso <span style="color:#dc2626">IMPRESCINDIBLE</span>=3 · <span style="color:#ca8a04">NECESARIO</span>=2 · <span style="color:#2563eb">DESEABLE</span>=1 · olas ya cerradas (sin prio)=2. Avance por ola: ✓=1 · ●=0,5 · ✗=0.  
`% ponderado = Σ(peso × avance) / Σ(peso)` → hoy `72,5 / 93 ≈ 78%`. Recalcular al cambiar estados en la tabla.

<table style="width:100%; table-layout:fixed; border-collapse:collapse">
<colgroup>
  <col style="width:3%" />
  <col style="width:8%" />
  <col style="width:4%" />
  <col style="width:9%" />
  <col style="width:9%" />
  <col style="width:14%" />
  <col style="width:28%" />
  <col style="width:25%" />
</colgroup>
<thead>
<tr>
  <th style="width:3%">Nº</th>
  <th style="width:8%">Descripción</th>
  <th style="width:4%">Estado</th>
  <th style="width:9%">Prioridad</th>
  <th style="width:9%">Qué falta</th>
  <th style="width:14%">Objetivo funcional</th>
  <th style="width:28%">Funciones</th>
  <th style="width:25%">Gaps (faltante · diferido · postdev)</th>
</tr>
</thead>
<tbody>
<tr>
  <td>0</td>
  <td>Fundación</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Stack local listo (app U, admin A, API S, tenant DEMO) para construir el resto del producto.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Arranque de API Node + Mongo por tenant</li><li>App usuario (PWA) operativa</li><li>App admin operativa</li><li>Auth JWT y middleware de tenant</li><li>Seed comunidad DEMO</li><li>Estructura de menús y capabilities base</li><li>Premisa multi-empresa sin hardcode Emp_Id</li><li>Scripts de seed y entorno local</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>1</td>
  <td>Acceso</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Entrar y salir de la comunidad: login, sesión, términos, recuperación de clave.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Login con usuario / email / ID</li><li>Mantenimiento de sesión y logout</li><li>Aceptación de términos y privacidad</li><li>Olvidé mi contraseña / reset</li><li>Pre-login y validación previa</li><li>Branding de pantalla de acceso</li><li>Bloqueo de cuenta inactiva</li><li>Acceso a app U y/o admin según roles</li><li>SSO Microsoft / Google / Okta (OIDC+PKCE)</li><li>2FA email / SMS</li><li>Selector multi-empresa</li><li>Login por token / legacy</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>+</td>
  <td>Tema</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Identidad visual de la comunidad (colores, splash, modo claro/oscuro) en login y app.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Colores de marca por comunidad</li><li>Splash / pantalla de bienvenida</li><li>Modo claro y oscuro (themeMode)</li><li>Logo y tipografía de comunidad</li><li>Aplicación del tema en login</li><li>Aplicación del tema en shell U/A</li><li>Configuración de branding en admin</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>2</td>
  <td>Tenant + menú</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Varias comunidades aisladas; menú dinámico según capacidades de cada una.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Alta y edición de comunidades (tenants)</li><li>Aislamiento de datos por comunidad</li><li>Menú dinámico según capabilities</li><li>Roles y pantallas por comunidad</li><li>Dashboards PLATFORM / tenant</li><li>Activar / desactivar módulos por capability</li><li>Guards de ruta por permiso</li><li>Orden e íconos de menú configurables</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>3</td>
  <td>Muro</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Canal de comunicación: noticias, UGC, reacciones, moderación y publicaciones corporativas.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Feed de publicaciones corporativas</li><li>Detalle de publicación con media</li><li>Reacciones en publicaciones</li><li>Envío de contenido por el usuario (UGC)</li><li>Cola de aprobación / rechazo de UGC</li><li>Categorías y tipos de publicación</li><li>Audiencia por área, grupo o personas</li><li>Programación / prioridad de pubs</li><li>Clonar y actualizar publicaciones en admin</li><li>Notificación al publicar a la audiencia</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>4</td>
  <td>Solicitudes</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Pedidos internos (consultas/tickets): crear, seguir hilo, gestionar bandeja admin y avisar cambios.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Alta de solicitud / consulta por el miembro</li><li>Seguimiento del estado del trámite</li><li>Hilo de mensajes en la solicitud</li><li>Adjuntos en la solicitud</li><li>Bandeja de atención en admin</li><li>Tipos, áreas y campos configurables</li><li>Cambio de estado / cierre por gestor</li><li>Histórico de mis solicitudes</li><li>Notificaciones (in-app / push / email) por eventos del trámite</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>5</td>
  <td>Encuestas + docs + hub</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Encuestas, biblioteca de documentos y hub de accesos rápidos a módulos.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Responder encuestas desde la app</li><li>Tipos de pregunta y lógica de encuesta</li><li>Publicar y analizar encuestas en admin</li><li>Resultados / participación</li><li>Biblioteca de documentos visibles al miembro</li><li>Descarga / lectura de documentos</li><li>Hub / launchpad de accesos rápidos</li><li>Audiencia por área, grupo o persona</li><li>Agenda / vigencia de encuestas</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>6</td>
  <td>Perfil (§3)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Cada persona gestiona su cuenta: datos, foto, password, dispositivos y actividad.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Edición de nombre, email y teléfono</li><li>Cambio de foto de perfil</li><li>Cambio de contraseña</li><li>Verificación de email pendiente</li><li>Campos adicionales de perfil</li><li>Ver dispositivos push vinculados</li><li>Historial de actividad de cuenta</li><li>Solicitud de baja / anonimización</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>7</td>
  <td>Push / avisos (§7)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Avisos a la comunidad: bandeja in-app, campañas admin, programación y Web Push.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Bandeja de avisos in-app del miembro</li><li>Badge / conteo de no leídos</li><li>Campañas push desde admin</li><li>Programación de envío por día/hora</li><li>Audiencia segmentada del aviso</li><li>Web Push en navegador (VAPID)</li><li>Import / export CSV de campañas</li><li>Generación de copy con IA (opcional)</li><li>Cancelar o reenviar campaña</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>8</td>
  <td>Saludos (§5)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Celebraciones automáticas (cumpleaños, aniversarios, fechas custom) publicadas en el muro.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Publicación automática de cumpleaños</li><li>Aniversario laboral / de ingreso</li><li>Fechas fijas corporativas (ej. fin de año)</li><li>Hitos custom en el perfil del usuario</li><li>Tipos de celebración configurables</li><li>Reglas con horario y audiencia</li><li>Ejecutar ahora / pausar regla</li><li>Generación de reglas con IA</li><li>Carga de fechas/hitos en Admin → Usuarios</li><li>Publicación tipo celebración en el muro</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>9</td>
  <td>Comentarios (§10)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Conversar bajo publicaciones; admin modera con ayuda de IA.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Comentar en una publicación</li><li>Listado de comentarios en el detalle</li><li>Bandeja de moderación en admin</li><li>Aprobar / ocultar comentarios</li><li>Sugerencias de moderación con IA</li><li>Respuesta del moderador</li><li>Configuración de moderación por comunidad</li><li>Filtro por riesgo / estado</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>10</td>
  <td>Chat (§8)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Mensajería 1:1 y grupos (texto, adjuntos, reacciones, anclados, denuncia/bloqueo).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Envío de chat entre miembros de la comunidad</li><li>Bandeja de conversaciones</li><li>Creación de grupos de chat</li><li>Adjuntos en mensajes</li><li>Reacciones en mensajes</li><li>Menciones a usuarios</li><li>Mensajes anclados</li><li>Denuncia de conversación / mensaje</li><li>Bloqueo de usuario</li><li>Retención y moderación configurables</li><li>Buscador de conversaciones</li></ul></td>
  <td>—</td>
</tr>
<tr>
  <td>11</td>
  <td>Workflows (§41)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Aprobaciones multi-paso: diseñador admin + bandeja unificada para líderes/RRHH.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Diseño de flujos de aprobación</li><li>Pasos por rol / capability</li><li>Bandeja unificada de pendientes</li><li>Aprobar / rechazar con comentario</li><li>Enganche a solicitudes</li><li>Enganche a documentos / políticas</li><li>Plantillas de ejemplo asistidas por IA</li><li>Condiciones por tipo de trámite</li><li>Deep link al ítem a aprobar</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>12</td>
  <td>Chatbot IA + KB + trámites (§24)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Asistente 24/7: orienta con KB, consulta datos del usuario e inicia trámites con confirmación.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Preguntas “cómo hago” con citas de KB</li><li>Consulta de solicitudes en curso</li><li>Consulta de documentos visibles</li><li>Consulta de saldo de vacaciones</li><li>Solicitud de vacaciones con confirmación</li><li>Combinado saldo + solicitud en el mismo hilo</li><li>Reserva conversacional de sala / cochera / oficina</li><li>Fallback recibo → consulta RRHH</li><li>Confirmación explícita antes de mutar</li><li>ABM de base de conocimientos en admin</li><li>Historial de conversación por usuario</li></ul></td>
  <td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>13</td>
  <td>Ayuda + Políticas (§26 · §40)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>FAQs/tutoriales y políticas con acuse; alimentan la base de conocimiento del bot.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Lectura de FAQs por el miembro</li><li>Búsqueda de FAQs</li><li>Tutoriales paso a paso</li><li>Políticas corporativas versionadas</li><li>Acuse de lectura de políticas</li><li>Reporte de cumplimiento de acuses</li><li>ABM de FAQs / tutoriales / políticas</li><li>Indexación automática hacia la KB del asistente</li><li>Deep links a artículo concreto</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>14</td>
  <td>Perfil completo + Directorio (§3 · §21)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Buscar personas/teléfonos útiles y ver expediente RRHH local de la comunidad.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Búsqueda en directorio de la comunidad</li><li>Fichas de contacto / teléfonos útiles</li><li>Favoritos en directorio</li><li>Expediente RRHH local (legajo)</li><li>Distinción miembro vs empleado</li><li>ABM de entradas de directorio</li><li>ABM de legajos en admin</li><li>Visibilidad según política de la comunidad</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>15</td>
  <td>Eventos y calendario (§6)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Agenda corporativa, RSVP y sincronización con Outlook/Google.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Agenda de eventos de la comunidad</li><li>Alta / edición de eventos en admin</li><li>Confirmar / consultar asistencia (RSVP)</li><li>Cupo y lista de asistentes</li><li>Vista unificada “qué tengo hoy”</li><li>Conexión de calendario Outlook</li><li>Conexión de calendario Google</li><li>Sync bidireccional de eventos personales</li><li>Notificaciones de evento</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>16</td>
  <td>ABM configuración (§27)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Operar la comunidad sin código: usuarios, grupos, áreas, roles, params e importaciones.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Alta y edición de usuarios</li><li>Fechas / hitos de perfil para saludos</li><li>Grupos y áreas organizativas</li><li>Roles y permisos de pantallas</li><li>Parámetros de la comunidad</li><li>Categorías de publicaciones</li><li>Importación masiva CSV / XLSX</li><li>Sync directorio Google / Entra (si hay credenciales)</li><li>Auditoría de cambios sensibles</li><li>Campos de perfil administrables</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>17</td>
  <td>Licencias / vacaciones / ausentismos (§13 · §12)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Pedir y aprobar vacaciones/licencias/ausencias; saldos, feriados y notificaciones.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Consulta de saldo de vacaciones</li><li>Solicitud de vacaciones / licencias</li><li>Solicitud de ausentismos</li><li>Adjuntos en el trámite</li><li>Aprobación / rechazo por líder o RRHH</li><li>Validación de solape y saldo</li><li>Feriados nacionales y de comunidad</li><li>Reglas AR / CL por comunidad</li><li>Notificaciones de cambio de estado</li><li>Enganche a bandeja de workflows</li><li>Integración ECR ausentismos (adapter + mock · 12.04)</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>18</td>
  <td>Asistencia, turnos y marcación (§11)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>El colaborador marca entrada/salida con GPS en el <strong>lugar asignado</strong> para que el empleador verifique presencia laboral; turnos, historial y excepciones. <em>No es</em> el check-in de oficina (ola 21).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>ABM de lugares con coords + radio (geocerca) + servicio/objetivo</li><li>Consulta de mis turnos / lugar esperado / multi-instalación</li><li>Marcación GPS: libre / en lugar / temporal (con vigencia)</li><li>Prefichada (mock Geopop) desde turnos locales</li><li>Marcación por QR (cámara nativa + token / paste)</li><li>Validación servidor dentro/fuera de radio</li><li>Tolerancia horaria configurable por tenant</li><li>Historial y novedades (colaborador + supervisor via managerId/TeamScope)</li><li>ABM de turnos y asignaciones en admin</li><li>Marcas fuera de rango + justificación + notificaciones</li><li>Domingos adicionales (agregación local + panel ECR)</li><li>Panel supervisores ECR local (justificar / amonestar / anexo)</li><li>Cola offline de marcas (pending/confirmed/failed)</li><li>Export CSV de novedades en admin</li><li>Políticas de asistencia por comunidad</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>19</td>
  <td>Legajo PeopleCare + Onboarding (§14 · §16)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Legajo digital completo + ciclo de ingreso/egreso con hitos y progreso.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Ficha colaborador con bloques RRHH</li><li>Autoservicio de datos del legajo</li><li>Catálogos RRHH en admin</li><li>Plantillas de onboarding</li><li>Plantillas de offboarding</li><li>Progreso de hitos de ingreso</li><li>Encuestas de ingreso/egreso vinculadas</li><li>Notificación al asignar onboarding</li><li>Revocación de accesos en egreso</li></ul></td>
  <td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>20</td>
  <td>Beneficios / billetera / recompensas (§18)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Catálogo de beneficios, puntos/billetera y canje de premios según la comunidad.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Catálogo de beneficios visibles al miembro</li><li>Filtros, favoritos y detalle de condiciones</li><li>Billetera / puntos de la comunidad</li><li>Ledger de movimientos de puntos</li><li>Canje de premios / recompensas</li><li>Código / QR local de canje</li><li>Partners genéricos por capability</li><li>ABM de beneficios en admin</li><li>Audiencia de beneficios</li><li>Publicación tipo beneficio en muro</li></ul></td>
  <td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>21</td>
  <td>Reservas + coworking (§34 · §35)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Reservar salas, cocheras y puestos; “voy a la oficina”, check-in y políticas de aforo. Target: <strong>cualquier activo reservable</strong> configurable por tenant.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Catálogo de sedes y recursos</li><li>Consulta de disponibilidad</li><li>Reserva de salas / espacios</li><li>Reserva de cocheras (con patente)</li><li>Reserva de puesto / hot desk</li><li>Mis reservas y cancelación</li><li>Declarar “voy a la oficina” / check-in</li><li>Quién está hoy en sede</li><li>Aprobación de reservas pendientes</li><li>Políticas de aforo y horarios</li><li>Reportes de ocupación en admin</li><li>Notificaciones de reserva</li></ul></td>
  <td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>22</td>
  <td>Organigrama + Reportes (§37 · §29)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Ver la estructura organizacional e informes de uso/participación de la comunidad.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Visualización del organigrama (personas + áreas)</li><li>Nodos desde usuarios (`managerId`) / áreas (`parentId`)</li><li>Navegación y búsqueda por jerarquía</li><li>Reportes de adopción de la app</li><li>Reportes de muro / engagement</li><li>Reportes de encuestas</li><li>Reporte dedicado RSVP (§29.03)</li><li>Reportes de trámites / solicitudes</li><li>Exportación CSV de informes</li><li>Capability `admin.reportes` de visibilidad</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>23</td>
  <td>Seguridad, privacidad y cumplimiento (§43)</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#dc2626; font-weight:600; font-size:0.85em">IMPRESCINDIBLE</td>
  <td>Controles mínimos de privacidad / cumplimiento (gate go-live)</td>
  <td>Checklist enterprise para operar y vender sin riesgo legal: consentimientos, retención, export/borrado y auditoría de accesos sensibles.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Gestión de consentimientos por comunidad</li><li>Política de retención de datos por módulo</li><li>Export / borrado o anonimización mínimos (titular / egreso)</li><li>Logs de acceso a datos sensibles auditables</li><li>Revocación de acceso al baja (tokens/sesiones)</li><li>Gate de go-live / checklist compliance</li><li>Aislamiento multi-tenant (sin cruce de datos)</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>certificación formal SOC 2 (org)</li><li>DPA por cliente</li></ul></td>
</tr>
<tr>
  <td>24</td>
  <td>Paridad por cliente (no-regresión)</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#dc2626; font-weight:600; font-size:0.85em">IMPRESCINDIBLE</td>
  <td>Claro · Grido/Gridonet · ECR · EPEC · Emp60 (+ sync live asistencia ECR)</td>
  <td>Que cada cliente estratégico pueda operar en Connectia como hoy (login, menús, pantallas, integraciones) vía pack/capability — sin fork ni <code>Emp_Id</code>.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Pack Claro / YoClaro (SSO / hub / beneficios)</li><li>Pack Grido / Gridonet</li><li>Pack ECR (supervisión / marcas + sync live)</li><li>Pack EPEC</li><li>Pack Emp60 / variantes comerciales</li><li>Capabilities y menús por cliente</li><li>Seeds y smoke de no-regresión</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li><strong>Seguimiento:</strong> <a href="./CONNECTIA-OLA24-NR.md">CONNECTIA-OLA24-NR.md</a> (tema a tema · todos ✗)</li><li><code>NR.CLARO</code> · <code>NR.GRIDO</code> (Gridonet) · <code>NR.ECR</code> · <code>NR.EPEC</code> · <code>NR.EMP60</code></li><li><strong>NR.ECR</strong> (ex-ola 18): sync Geopop · API ECR · GeoVictoria (creds →42)</li><li>UAT firmada por cliente = DoD pack</li></ul></td>
</tr>
<tr>
  <td>25</td>
  <td>Operaciones campo (§19 · §20)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Un dominio Pedido; alarma = captura rápida (pánico). Mapa admin por categoría en MVP.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Pedido canónico (catálogo + source=alarm)</li><li>Botón pánico GPS / observación</li><li>Estados y seguimiento únicos</li><li>ABM categorías / artículos</li><li>Mapa admin por categoría (MVP)</li><li>Push a receptores por categoría</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>26</td>
  <td>TV + Live (§25 · §36)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Pantallas TV de sede y transmisiones por URL externa (2026-07-30). Ingest nativo diferido. ≠ ola 36 backlog.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Modo TV para pantallas de sede</li><li>Playlist de contenidos en TV</li><li>Rotación de pubs / avisos en TV</li><li>Live streaming a la comunidad (URL externa)</li><li>Broadcasts programados</li><li>Controles admin de emisión</li><li>Audiencia / sede del canal TV</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>27</td>
  <td>Talento + Cultura (§38 · §39)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Desarrollo (OKR/LMS/desempeño/vacantes) y cultura (reconocimientos, marketplace, referidos, pulso).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>OKR / objetivos y key results del colaborador</li><li>Seguimiento de avance auditado por ciclo</li><li>Ciclos de evaluación de desempeño + feedback continuo</li><li>Plan de carrera con hitos y gaps de skills</li><li>LMS: catálogo, asignación, progreso, quiz y certificado</li><li>Vacantes internas + postulación y tracking</li><li>Reconocimientos peer-to-peer / líder (valores de empresa)</li><li>Marketplace interno entre colaboradores</li><li>Programa de referidos a vacantes</li><li>Pulso / eNPS con umbral de anonimato</li><li>ABM Talento y Cultura en admin (caps por submódulo)</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>28</td>
  <td>Centro de comunicaciones (`28.COM.*`)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>Plantillas IA · asistente multi-canal · outbox</td>
  <td>Centro de comunicaciones de <strong>plataforma</strong> (paridad Hiryx): tipos, plantillas con IA, envío email/WhatsApp/SMS, historial. Sin packs de cliente.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Tipos de comunicación por comunidad</li><li>Plantillas multi-canal + placeholders</li><li>Generar plantilla con IA</li><li>Asistente / wizard de envío a audiencia</li><li>Canal email (branding tenant)</li><li>Canal WhatsApp Business / WTA</li><li>Canal SMS (Twilio)</li><li>Outbox / comunicaciones enviadas</li><li>Health / logs de canales</li><li>Adjuntos vía storage plataforma</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>29</td>
  <td>Chat conversacional del asistente (`29.CONV`)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td style="color:#dc2626; font-weight:600; font-size:0.85em">IMPRESCINDIBLE</td>
  <td>Trámites 100% hablados · sin wizard de botones</td>
  <td>Asistente <strong>casi humano</strong>: completar trámites hablando (sin caminos de decisión con botones). Sammy / contenido / carga / QR → <strong>Ola 40</strong>.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Trámites 100% conversacionales (multi-turno)</li><li>Slot-filling por diálogo hasta completar el trámite</li><li>Confirmación en el chat (“sí / no”) sin confirm-card</li><li>Sin depender de chips de decisión</li><li>Mismos backends/authz que la UI nativa</li><li>Cancelar por texto (“no” / “cancelar”)</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>30</td>
  <td>Modernización UX residual (§45)</td>
  <td style="text-align:center; font-size:1.15rem" title="parcial"><span style="color:#ca8a04">●</span></td>
  <td style="color:#ca8a04; font-weight:600; font-size:0.85em">NECESARIO</td>
  <td>Fases 2–4 + completar headers A · KB en chatbot</td>
  <td>Cerrar gaps de modernización UX (§45) en U y Admin ya entregados. Spec: <em>Ola 30 — Definiciones</em>.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Contrato visual (Fase 0) + Admin sticky lila Hiryx (Fase 1)</li><li>Primitivas spinner / skeleton / empty / error (Fase 2)</li><li>Companion desktop U · 5 flujos críticos (Fase 3)</li><li>Cerrar <code>*.UX</code> reales pendientes (Fase 4)</li><li>Detalle: sección <em>Ola 30 — Definiciones</em> debajo</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>Fase 1: Publicaciones · Comunidad · resto A</li><li>Fase 2: primitivas shared</li><li>Fase 3: companion U</li><li>Fase 4: <code>*.UX</code> reales</li></ul></td>
</tr>
<tr>
  <td>31</td>
  <td>Supervisión comercial (testigo completo)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Supervisión de campo: tareas, checklists, master data y panel ECR.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Home / KPIs de supervisión</li><li>Creación y asignación de tareas de campo</li><li>Tareas desde template / checklist</li><li>Completar tarea con evidencia foto</li><li>Comentarios y adjuntos en tarea</li><li>Mediciones / pilares de checklist</li><li>Master data cadenas / clientes / salas</li><li>Import XLSX de master data</li><li>Roles granulares por pantalla</li><li>Offline-first en móvil</li><li>Panel ECR de marcas / amonestaciones</li><li>Push de supervisión</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>32</td>
  <td>Supervisor Virtual de equipo</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>El líder publica/avisa/agenda solo a su equipo y sigue su actividad en Connectia.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Capability y modelo de alcance “mi equipo”</li><li>Hub “Mi equipo” con lista de supervisados</li><li>Definir / sincronizar equipo (área, grupo, personas)</li><li>Publicar al muro solo para supervisados</li><li>Enviar avisos solo al equipo</li><li>Agendar eventos solo para el equipo</li><li>Encuestas / consultas acotadas al equipo</li><li>Documentos / avisos de lectura al equipo</li><li>Chat / canal de equipo</li><li>Timeline de actividad de supervisados</li><li>Ficha de supervisado</li><li>Composer unificado “Crear para mi equipo”</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>33</td>
  <td>Integración Rendi / DocuFlow</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#ca8a04; font-weight:600; font-size:0.85em">NECESARIO</td>
  <td>Cap + SSO/deep-link + hub U/A + resumen estados; ERP vía Rendi</td>
  <td>El colaborador rinde <strong>viáticos y gastos</strong> desde Connectia usando <strong>Rendi</strong> (DocuFlow, producto Sooft): foto del comprobante → IA lee/categoriza → rendición → plan de cuentas → camino a ERP. Connectia orquesta el acceso; no reimplementa el motor.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Capability `rendiciones` / `integracion.rendi` por comunidad</li><li>Menú U “Mis rendiciones / Viáticos”</li><li>SSO o deep-link autenticado hacia Rendi</li><li>Carga de comprobante (foto) con extracción IA en Rendi</li><li>Consulta de estado de mis rendiciones</li><li>Aprobación en Rendi (enganche §41 opcional)</li><li>Admin: URL instancia, mapeo usuarios, on/off por tenant</li><li>Sin duplicar asientos/plan de cuentas en Connectia</li><li>ERP solo si Rendi lo expone; Connectia no es el ERP</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>cap + menú Rendi</li><li>SSO/deep-link Rendi</li><li>resumen estados</li><li>admin instancia</li><li>no reimplementar motor DocuFlow</li></ul></td>
</tr>
<tr>
  <td>34</td>
  <td>Puente Hiryx → Connectia</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#ca8a04; font-weight:600; font-size:0.85em">NECESARIO</td>
  <td>Webhook hire + invite mágico + alta user/legajo + onboarding Day-0</td>
  <td>Cuando Hiryx <strong>selecciona / confirma el ingreso</strong> de un candidato, nace el miembro en Connectia: invite, legajo semilla, bienvenida y onboarding. Hiryx recluta; Connectia recibe a la persona — sin clonar el ATS.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Capability `integracion.hiryx` / `ingresos.hiryx`</li><li>Triggers: contratado, confirmación de ingreso, oferta aceptada</li><li>Webhook firmado Hiryx → Connectia (idempotente)</li><li>Invite mágico al email del candidato</li><li>Alta User + semilla PeopleCare / legajo</li><li>Arranque onboarding ola 19 (Day-0 / Day-1)</li><li>Preboarding: docs/políticas antes del primer día</li><li>Bandeja A “Llegadas desde Hiryx”</li><li>IDs gemelos candidato/postulación Hiryx</li><li>Ficha Connectia: “Reclutado vía Hiryx · vacante X”</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>webhook Hiryx</li><li>invite</li><li>alta user/legajo</li><li>bandeja llegadas</li><li>enlace onboarding</li></ul></td>
</tr>
<tr>
  <td>35</td>
  <td>Licenciamiento modular (PLATFORM)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>El dueño de la plataforma, al crear o editar una comunidad, define qué módulos compra el cliente: uno, varios o la suite completa — y eso es lo que ve en menú U/A.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Alta PLATFORM (Suscriptores): elegir módulos contratados (no solo pack fijo `DEFAULT_CAPS`)</li><li>Packs comerciales rápidos: Básico · Personalizado · Todo</li><li>Edición posterior de entitlements desde Suscriptores (upgrade / downgrade)</li><li>Catálogo de módulos vendibles alineado a capabilities (muro, chat, vacaciones, reservas, etc.)</li><li>Menú U/A y guards respetan solo lo contratado</li><li>Candado: el admin de la comunidad no puede activar módulos no comprados</li><li>Resumen en ficha del suscriptor: “módulos contratados”</li><li>Seed al alta solo de los módulos elegidos</li><li>Auditoría de cambios de licencia por comunidad</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>36</td>
  <td>Mejoras referenciadas (backlog)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Bolsa de mejoras de producto <strong>sin perder definición</strong>: cada ítem apunta a la ola origen donde se implementa. No es un módulo nuevo; es el tablero de evoluciones. Incluye branding del software <strong>Connectyx</strong>.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li><strong>→Tema (+) · 36.p</strong> Branding producto <strong>Connectyx</strong>: logo diseñador + nombre en chrome visible U y Admin</li><li><strong>→3</strong> Fijación temporal · vencimiento · plantillas · sección editorial · newsletter auto</li><li><strong>→5</strong> Enlaces con valores dinámicos (título/puntos/rangos)</li><li><strong>→16</strong> Áreas internas + clientes como audiencia (mails/users)</li><li><strong>→20</strong> Puntos: integraciones externas + UX destacada en app</li><li><strong>→21</strong> Reserva de activos, horas libres y grupos</li><li><strong>→30 / Tema</strong> Home U alternativa (20–30 años) sin tocar la actual · color admin Talent lila</li><li><strong>→32</strong> Supervisor: enviar todo tipo de contenido a supervisados</li><li>Detalle: sección <em>Ola 36 — Definiciones</em></li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>37</td>
  <td>Relevamientos de campo (add-on)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Inspecciones / relevamientos operativos en sitio (caso ECR y similares): formularios de campo, rutas, programación por día y evidencias. <strong>Add-on distinto</strong> de Encuestas corporativas (ola 5).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Capability off por defecto (add-on comercial · ola 35)</li><li>Diseñador de formularios (saltos, multimedia, botón, GPS/facility)</li><li>Rutas / recorridos y paradas</li><li>Programación de relevamientos por día + asignación</li><li>Vista U “qué tengo hoy” (ruta del día)</li><li>Ejecución en campo + offline + GPS / facility</li><li>Evidencias foto/video y check-in·out</li><li>Tablero A: completitud, pendientes, recordatorios</li><li>Enganche Mi equipo / Supervisión</li><li>Reportes y export del módulo</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
<tr>
  <td>38</td>
  <td>Padrón IdP (miembros)</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#dc2626; font-weight:600; font-size:0.85em">IMPRESCINDIBLE</td>
  <td>Origen + dominio/grupo + sync/JIT unificados</td>
  <td>Definir de forma simple quiénes son los miembros de la comunidad tomando la fuente de verdad en Google Workspace, Microsoft Entra u otro IdP — sin inventar un segundo padrón.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Pantalla única “Miembros / padrón” (origen Google · Entra · manual/CSV)</li><li>Filtro por dominio de email (ej. sooft.com.ar)</li><li>Filtro por Google Group / Entra security group / OU</li><li>Sync on-demand + opcional periódico</li><li>JIT al primer SSO (reusa auto-alta ola 1)</li><li>Preview altas/updates antes de confirmar</li><li>Desactivar miembros que salieron del grupo/dominio (política configurable)</li><li>Estado de última sync y errores por tenant</li><li>Reusa sync Directory ola 16 + authConfig ola 1 · no duplicar motor</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>UI unificada origen+filtro+sync</li><li>filtro por grupo Google/Entra</li><li>política baja al salir del grupo</li><li>scheduler sync opcional</li><li>hoy: ayuda “i” en Comunidad/Usuarios (workaround dominio+SSO+Directory)</li></ul></td>
</tr>
<tr>
  <td>39</td>
  <td>Textos por comunidad (locale + labels)</td>
  <td style="text-align:center; font-size:1.15rem" title="parcial"><span style="color:#ca8a04">●</span></td>
  <td style="color:#dc2626; font-weight:600; font-size:0.85em">IMPRESCINDIBLE</td>
  <td>Locale + glosario + overrides / renombres de módulo</td>
  <td>Un solo motor de textos por comunidad: <strong>idioma/cultura</strong> (es-AR · es-CL · pt-BR) y <strong>renombres de producto</strong> (Alarmas → “Feedback de vecinos”) sin fork ni Emp_Id. Incluye stub `uiLocale`/modismos + ex-ola 40.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Locale base por comunidad (es-AR · es-CL · pt-BR · en · …)</li><li>Catálogo de claves UI (menús, botones, labels, vacíos)</li><li>Glosario cultural: término canónico → variante por locale (glosa/texto/…)</li><li>Overrides por tenant (incluye renombre de módulos/menú)</li><li>Menú U/A y títulos usan el label resuelto</li><li>Seed / pack NR (Emp60) carga diccionario sin hardcode</li><li>Preferencia de idioma opcional por usuario</li><li>Admin “Idioma, cultura y labels” + preview + import/export</li><li>Baseline ya: `uiLocale` + `modismos.js` + `useUiText` (puente)</li><li>Enganche Sammy (ola 29) solo sugiere copy</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>hoy: stub uiLocale/modismos + i18n es/en (`23.38`)</li><li>falta motor keys + packs + overrides + admin unificado</li><li>≠ skins YOMOB/SOOFIA · ≠ Sammy 29 · ≠ Connectyx 36.p</li></ul></td>
</tr>
<tr>
  <td>40</td>
  <td>Deseables (otro MVP)</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#2563eb; font-weight:600; font-size:0.85em">DESEABLE</td>
  <td>Backlog diferido · atacar por ola origen en otro MVP</td>
  <td>Funciones <strong>deseables</strong> y <strong>caprichos</strong> sacadas del núcleo: se harán en <strong>otro MVP</strong> (o nunca), sin reabrir olas cerradas. Dentro de la bolsa: <strong>DESEABLE</strong> = tiene sentido de producto si sobra capacidad; <strong>CAPRICHO</strong> = nice-to-have de baja prioridad (por debajo de deseable).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li><strong>→9</strong> Análisis IA de imagen/GIF en comentarios del muro</li><li><strong>→9</strong> Apelación del autor ante comentario moderado</li><li><strong>→4</strong> Jira (mis tickets · config · crear issue)</li><li><strong>→4</strong> SAP/ECR jobs sobre consultas</li><li><strong>→4</strong> Novedades GeoPop en consultas</li><li><strong>→37</strong> Pregunta tipo API en relevamientos (allowlist)</li><li><strong>→10</strong> Chat por voz (WebRTC)</li><li><strong>→10</strong> Chat por video (WebRTC)</li><li><strong>→10</strong> Resúmenes / transcripción IA de chat</li><li><strong>→12</strong> Recibos de sueldo vía Documentos (naming DNI)</li><li><strong>→14</strong> Conector PeopleCare / HRIS externo (sync legajo)</li><li><strong>→21 · DESEABLE</strong> Plano de planta gráfico (`40.s`)</li><li><strong>→21 · DESEABLE</strong> Bundle sala+cochera 1-click (`40.t`)</li><li><strong>→12 · DESEABLE</strong> Modos Sammy del asistente (`40.n`)</li><li><strong>→12 · CAPRICHO</strong> Asistente de contenido (`40.o`)</li><li><strong>→12 · CAPRICHO</strong> Asistente de carga (`40.p`)</li><li><strong>→12 · CAPRICHO</strong> QR → vista (`40.q`)</li><li><strong>→12 · CAPRICHO</strong> QR DNI (`40.r`)</li><li><strong>→20 · CAPRICHO</strong> PSP bancario real (`40.u`)</li><li><strong>→20 · CAPRICHO</strong> Retiro de saldo productivo (`40.v`)</li><li><strong>→20 · CAPRICHO</strong> KYC / conciliación (`40.w`)</li><li><strong>→22 · DESEABLE</strong> Quiet hours / tope frecuencia campañas (`40.x`)</li><li><strong>→22 · CAPRICHO</strong> Historial fino de conexiones (`40.y`)</li><li><strong>→22 · CAPRICHO</strong> Organigrama matricial / import HRIS / IA org (`40.z`)</li><li>Detalle: sección <em>Ola 40 — Definiciones</em> debajo</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>backlog otro MVP</li><li>DESEABLE ≠ CAPRICHO</li><li>no reabre olas cerradas</li></ul></td>
</tr>
<tr>
  <td>41</td>
  <td>Coherencia entre módulos</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#ca8a04; font-weight:600; font-size:0.85em">NECESARIO</td>
  <td>7 pendientes del canvas · decisiones de producto + refactor cruzado</td>
  <td>Cerrar <strong>incoherencias funcionales</strong> entre módulos ya construidos (fronteras, sync de datos, motores duplicados, licenciamiento incompleto). No es un módulo nuevo: es deuda de coherencia detectada al insertar olas.</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li><strong>41.A1</strong> Reservas en bandeja unificada de workflows</li><li><strong>41.A2</strong> Fuente de verdad Perfil · Legajo · Directorio</li><li><strong>41.A3</strong> Núcleo compartido Encuestas / Relevamientos (sin mezclar producto)</li><li><strong>41.A4</strong> Ampliar MODULE_CATALOG / packs a módulos reales</li><li><strong>41.M2</strong> Glosario UX punch ≠ office-day ≠ facility (→39)</li><li><strong>41.M4</strong> Inbox unificado líder (chat/push/composer)</li><li><strong>41.B2</strong> Rename/docs PeopleCare local</li><li>Base de trabajo: canvas coherencia (ver sección <em>Ola 41</em>)</li></ul></td>
  <td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>A1 reservas↔workflows</li><li>A2 sync persona</li><li>A3 motores formularios</li><li>A4 catálogo comercial</li><li>M2/M4 producto</li><li>B2 naming PeopleCare</li><li><strong>41.M3</strong> cerrado (ADR-GAPS §E + D25-2 + D43-1)</li></ul></td>
</tr>
<tr>
  <td>42</td>
  <td>Secrets / env / vault (ops)</td>
  <td style="text-align:center; font-size:1.15rem" title="no hecha"><span style="color:#dc2626">✗</span></td>
  <td style="color:#ca8a04; font-weight:600; font-size:0.85em">NECESARIO</td>
  <td>Checklist env/vault por integración · sin código de producto</td>
  <td>Poner en <strong>prod/staging</strong> las credenciales y secretos de integraciones <strong>ya desarrolladas</strong>, para que dejen de caer a mock/503. No es feature nueva: es ops + registro en portales (Azure, Google Cloud, ECR, etc.).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Calendario personal Outlook / Google (OAuth app + redirect)</li><li>Directory Google Workspace (service account + DWD)</li><li>Directory Microsoft Entra (app registration)</li><li>SSO login Entra / Google / Okta (si el tenant lo usa)</li><li>ECR ausentismos live + panel supervisores</li><li>Búsqueda web Serper/Brave (media “desde la web”)</li><li>Mail / Twilio / VAPID / claves IA (si aplica al deploy)</li><li>Vault IdP por tenant (hoy JSON/env fallback · ola 16)</li><li>Checklist + `.env.example` como fuente de verdad</li></ul></td>
<td style="width:27%; vertical-align:top; font-size:0.9em"><ul><li>MS_/GOOGLE_CALENDAR_*</li><li>GOOGLE_WORKSPACE_*</li><li>ENTRA_*</li><li>ECR_AUSENTISMO_* · ECR_SUPERVISORS_*</li><li>SERPER / LOGIN_* / VAPID / mail</li><li>ver sección <em>Ola 42</em></li></ul></td>
</tr>
<tr>
  <td>43</td>
  <td>Portal de servicios (§42)</td>
  <td style="text-align:center; font-size:1.15rem" title="cerrada"><span style="color:#16a34a">✓</span></td>
  <td>—</td>
  <td>—</td>
  <td>Service desk interno: el miembro pide servicios (RRHH/TI/Ops/facilities) y los agentes atienden con estados y SLA. Separado de seguridad (ola 23).</td>
  <td style="width:30%; vertical-align:top"><ul style="margin:0.2rem 0; padding-left:1.15rem"><li>Catálogo de servicios internos por tenant</li><li>Solicitud de servicio desde el portal (U)</li><li>Formularios dinámicos por tipo de servicio</li><li>Asignación / atención por agentes (A)</li><li>Estados y SLA del servicio</li><li>Aprobaciones (propias o vía §41)</li><li>Reportes de volumen / SLA / CSAT</li></ul></td>
  <td style="width:27%; vertical-align:top; font-size:0.9em">—</td>
</tr>
</tbody>
</table>

## Ola 25 — Definiciones (DESEABLE · §19 + §20)

> **Prioridad:** DESEABLE · **Estado:** cerrada (código 2026-07-30)  
> **Spec exhaustiva:** [`CONNECTIA-OLA25-SPEC.md`](./CONNECTIA-OLA25-SPEC.md).  
> **≠** Ola 31 (supervisión) · **≠** Emp60 labels (**24** `NR.EMP60` + **39**) · **≠** Portal (**43**).

### ADR (resumen)

| Id | Decisión |
|----|----------|
| **D25-1** | Alarma = canal de captura de **Pedido** (`source=alarm`). Sin entidad CRM paralela. |
| **D25-2** | Frontera `41.M3` Alarma↔Pedido cerrada; un incidente = un Pedido. (§9 vs Portal → **D43-1**, cerrado). |
| **D25-3** | **Mapa admin por categoría = DoD MVP** (no diferido). |
| **D25-4** | Emp60 / “Feedback de vecinos” **fuera** de esta ola. |

### DoD mínimo
- [x] Pánico U → Pedido con número + geo (si permiso).
- [x] Bandeja A unificada + mapa por categoría.
- [x] Caps `pedidos` / `pedidos.alarma` / `admin.pedidos`; cero Emp_Id hardcode.

**Entrega:** U `/alarma` · `/pedidos` · A `/pedidos` · APIs `/api/pedidos` · `/api/admin/pedidos` · seed DEMO.

## Ola 26 — Definiciones (DESEABLE · §25 + §36)

> **Prioridad:** DESEABLE · **Estado:** **cerrada** (código 2026-07-30) · **DoD = Track A + Track B**.  
> **≠ Ola 36** (backlog `36.a`–`36.p` Connectyx). Acá **§25 Modo TV** + **§36 Live** del catálogo.  
> **Fuente:** consolidado §25 / §36 · ADR-GAPS **§H**.

### Bloqueos resueltos (ADR)

| Bloqueo | Resolución |
|---------|------------|
| DoD / MVP indefinido | **DoD = Track A (§25) + Track B (§36 URL externa).** |
| Proveedor media live | **Sin ingest propio.** Live = URL externa (YouTube Live / Vimeo / HLS). RTMP/WebRTC/CDN → fase 2. |
| MQTT pairing (gap legado) | Reemplazado por **HTTP poll**; no MQTT en MVP. |
| Caps / rutas / menú | Caps off por defecto; rutas y menús abajo. |
| Confusión Ola 36 vs §36 | Ola 36 = backlog producto; §36 = live. |

### Track A — Modo TV (§25) · **DoD**

| Id | Función | Definición |
|----|---------|------------|
| `25.00` | Cap + menú | Caps `tv.mode` (U emparejar) · `admin.tv` (A). Sin cap: cero menú/API. Off por defecto. `ensureOla26Menu`. |
| `25.01` | Reproducción | Vista kiosk `/tv` (device token). Playlist continua; precarga; salto si ítem falla; fallback seguro; heartbeat 60 s. |
| `25.02` | Emparejamiento | TV pide sesión → código 6 dígitos + QR (TTL 5 min, 5 intentos, un uso). U `/tv/emparejar` confirma tenant/dispositivo. Credencial `tv:device` de mínimo privilegio. Revocable. |
| `25.03` | Configuración | A `/modo-tv`: dispositivos, playlist asignada, mute, orientación, fallback, timezone. Auditado. |
| `25.04` | Feed / playlist | Manifiesto versionado + ETag. Ítems: image · video · youtube · text · post (pub del tenant). Vigencia + orden. |
| `25.QA/SEC/UX/ADM/DOC` | Transversales | Checklist §25 · authz tenant · sin Emp_Id · UX kiosk + móvil emparejar · OpenAPI. |

**Datos clave:** `TvDevice`, `TvPairingSession`, `TvPlaylist` + items, `deviceCredential`, `playlistVersion`, heartbeat.

**Criterios DoD Track A:**
- [x] Código usado/expirado no vincula; TV obtiene solo scope dispositivo.
- [x] Repro continúa ante ítem defectuoso; sin playlist → pantalla segura.
- [x] Un dispositivo no obtiene feed de otro tenant.
- [x] Admin lista/revoca dispositivos y edita playlist sin deploy.
- [x] Seed DEMO + tests de pairing/feed/authz.

### Track B — Live por URL (§36) · **en DoD**

| Id | Función | Definición |
|----|---------|------------|
| `36.00` | Cap live | Caps `live.stream` · `admin.live`. Off por defecto. Independiente de `tv.*`. |
| `36.01` | Crear / programar | A: título, cover, audiencia (selector), horario, `streamUrl` externa, replay=link opcional. |
| `36.02` | Ver live | U `/en-vivo` + badge LIVE en muro/home si activo y en audiencia. Player = embed/HLS de la URL. |
| `36.03` | Interacción / métricas | **MVP:** contador de “entradas al live” (views). Chat/reacciones/concurrentes finos → fase 2. |

**Fuera de Ola 26:** ingest RTMP/WebRTC, co-hosts, DVR propio, moderación chat del stream, subtítulos IA.

### Entrega (2026-07-30)

- S: modelos TV + Live · `/api/tv/*` · `/api/admin/tv/*` · `/api/live/*` · `/api/admin/live/*` · caps · `ensureOla26Menu` · seed · tests `ola26TvLive.test.js`
- U: `/tv` (kiosk) · `/tv/emparejar` · `/en-vivo` · badge LIVE en muro
- A: `/modo-tv` · `/live`

### Smoke

1. Caps DEMO → `/tv` muestra código → U Emparejar TV → playlist demo → heartbeat OK.  
2. Live demo YouTube → U En vivo + badge muro; audiencia fuera no ve.

---

## Ola 36 — Definiciones (referenciadas a ola origen)

> **Estado:** cerrada 2026-07-30 · MVP **a–n** + **p** · gaps del tablero = **—**.  
> Catálogo de referencia: al evolucionar, abrir la **ola origen**. Idioma/labels → **Ola 39**.

| Id | Mejora | Ola origen | Definición |
|----|--------|------------|------------|
| **a** | Fijación temporal de pubs fijas | **3** Muro | Configurar que una publicación fija mantenga la fijación por **X días u horas** (luego se desfija sola). |
| **b** | Vencimiento de publicación | **3** Muro | Publicar con **fecha y hora de vencimiento**; al vencer deja de mostrarse en el feed (o pasa a archivada). |
| **c** | Publicación modelo / plantilla | **3** Muro · consume **8** Saludos | Plantillas reutilizables al crear pubs (ej. base cumpleaños, feriado, anuncio genérico). Saludos puede usar estas plantillas. |
| **d** | Sección editorial | **3** Muro | Atributo de sección en publicaciones: deporte, internacional, moda, etc. (filtro / agrupación en feed o admin). |
| **e** | Newsletter automatizado | **3** Muro · canal **7** Push/avisos · email **28** `28.COM` | Reglas de generación: tiempo, calidad, cantidad, cuáles pubs elegir, audiencia. Ej.: cada 8 h, newsletter con las últimas 6 pubs para audiencia X. |
| **f** | Integrar sistemas externos → puntos | **20** Beneficios · earn externo | Reglas de puntos alimentadas por otros sistemas (earn desde integraciones), no solo ledger local. ≠ centro COM ola 28. |
| **g** | UX de puntos en app U | **20** Beneficios | Hacer los puntos **protagonistas** en la app: ver saldo y cómo sumar, con jerarquía visual clara (es importante para el usuario). |
| **h** | Home U alternativa (20–30 años) | **30** modernización §45 · shell U / **Tema (+)** | Análisis + propuesta de modernización del home. **Sin tocar la home actual**: variante UX/UI alternativa opt-in orientada a usuarios de 20–30 años. |
| **i** | Enlaces con valores dinámicos | **5** Hub/enlaces · datos **20** | Tipo de enlace cuyo título/copy usa tokens dinámicos. Ej.: “BENEFICIOS · Tenés 5 PUNTOS”. Catálogo de variables: valores, rangos, textos, saldos, etc. |
| **j** | Color base admin = Talent lila | **Tema (+)** · shell Admin | El color base / identidad del admin usa el **lila de Talent** (alineación visual con marca Talent). |
| **k** | Áreas internas para audiencia | **16** ABM config · audiencias transversales | Manejar **áreas internas** como dimensión de audiencia (pubs, avisos, beneficios, etc.). |
| **l** | Clientes para audiencia | **16** ABM · audiencia (≠ clientes ECR **31**) | Concepto **cliente** para audiencia: asociar mails y usuarios a clientes o a áreas internas. Segmentación comercial/org distinta del master data supervisión. |
| **m** | Supervisor → todo tipo a supervisados | **32** Supervisor Virtual | El líder puede mandar **todo tipo de contenidos/acciones** a sus supervisados (no solo el subset actual del composer). |
| **n** | Reserva ampliada | **21** Reservas + coworking | Reserva de **activos**, espacios, **horas libres** y **grupos** (amplía el catálogo más allá de sala/cochera/puesto). |
| **p** | Branding producto **Connectyx** | **Tema (+)** · shell U + Admin | <span style="color:#16a34a; font-weight:600">hecho 2026-07-30</span>. Nombre comercial **Connectyx** en UI U/A: `document.title` / favicon monograma OO 32×32 (`favicon1–3`), login, shell U, shell Admin, PWA. Assets en `public/branding/connectyx/` + `constants/brand.js`. Admin color base `#8554C9` / producto `#8453C8`. Tests: `src/tests/ola36.test.js`. **No** reemplaza logo/colores de la **comunidad** (Tema por tenant). |


## Ola 37 — Relevamientos de campo (add-on) — definiciones

> **Add-on comercial:** capability off por defecto; se vende/activa por comunidad (alin. ola **35**). **No** es una extensión de Encuestas (ola **5**): motor, menú y UX propios.  
> Reemplaza el gap legado `15.11` (admin externo de encuestas/campo) **sin** reabrir el backoffice viejo. Spec exhaustiva: `CONNECTIA-STATUS.md` → *Ola 37* · IDs `37.REL.*`.  
> **Fuera del núcleo 37:** CODESAC / pedidos-en-encuesta (retirado). Pregunta tipo **API** → deseable **Ola 40** (`40.h`).

| Id | Función | Definición |
|----|---------|------------|
| **37.REL.00** | Cap + menú add-on | Caps `relevamientos` / `campo.relevamientos` (+ subcaps A/U). Sin cap: cero menú U/A ni APIs. Off por defecto. |
| **37.REL.01** | Diseñador de formularios | ABM de plantillas/formularios de relevamiento (borrador → publicado → archivado). Versionado: respuestas históricas atadas a versión publicada inmutable. |
| **37.REL.02** | Tipos de pregunta de campo | Básicos + **multimedia**, **botón**, geopunto, facility. Pregunta **API** → deseable **Ola 40** (`40.h`). |
| **37.REL.03** | Lógica condicional / saltos | Reglas: si respuesta X → mostrar/ocultar bloque, saltar a pregunta Y, validar. Mismas reglas online y offline. |
| **37.REL.04** | Rutas y paradas | ABM de rutas/recorridos con secuencia de paradas (punto, cliente, sede, coords). Ruta ≠ encuesta corporativa. |
| **37.REL.05** | Programación por día | Agenda operativa: asignar relevamientos (formulario + ruta/parada + operador) a **fechas/días**. Reprogramar / reasignar. |
| **37.REL.06** | Modalidades de ejecución | Programado · espontáneo · on-demand · **en ruta** · **sin ruta**. |
| **37.REL.07** | Vista U “qué tengo hoy” | Lista del día: ruta, paradas, formularios pendientes/hechos, deep-link a ejecutar. |
| **37.REL.08** | Ejecución en campo (U) | Completar relevamiento en sitio; captura de evidencias; GPS; estados pending/confirmed/failed. |
| **37.REL.09** | Offline de campo | Cola local con idempotencia; sync al recuperar red; no sobrescribir conflictos en silencio. |
| **37.REL.10** | Facility check-in / check-out | Par entrada/salida en instalación (precisión, permiso, origen, momento), distinto de punch laboral (ola 18) y office-day (ola 21). |
| **37.REL.11** | Tablero ops (A) | Invitados/asignados · completados · pendientes · %; recordatorio a pendientes; cierre por fecha o meta de completitud. |
| **37.REL.13** | Reportes / export | Por relevamiento, ruta, día, operador, evidencias; CSV/export. |
| **37.REL.14** | Enganche supervisión (opc.) | **Hecho:** KPI/timeline en Mi equipo · ficha miembro · tarjeta en hub Supervisión. |
| **37.REL.SEC/UX/QA/DOC** | Transversales | Authz tenant · sin Emp_Id · UX móvil-primero §45 · OpenAPI · criterios DoD. |

### Separación dura vs Ola 5 (Encuestas)

| | **Encuestas (ola 5)** | **Relevamientos (ola 37)** |
|--|----------------------|----------------------------|
| Propósito | Escuchar empleados (clima, NPS, feedback) | Inspeccionar / relevar en campo |
| Actores | RRHH / comunicaciones | Operaciones / supervisores de campo |
| Agenda | `startsAt`/`endsAt` de campaña | **Ruta + día + asignación** |
| Evidencias | No (salvo geopoint simple) | Foto/video + facility |
| Default | Según caps del pack | **Add-on off** |
| Modelo | `Survey` existente | Modelo propio (no mezclar producto) |

## Cierre Ola 12 (2026-07-29)

> **Estado:** cerrada · **gaps de ola 12 = —**.  
> Ex-gaps reubicados (no viven en la fila 12):  
> - Trámites 100% hablados → **Ola 29** `29.CONV` (**hecho** 2026-07-30)  
> - Recibos vía Documentos → **Ola 40** `40.l` (DESEABLE)  
> - Sammy / contenido / carga / QR → **Ola 40** `40.n`–`40.r` (DESEABLE / CAPRICHO)

Núcleo §24.01–.03 + diálogos MVP:

| Diálogo | Qué hace |
|---------|----------|
| **A** Recibo de sueldo | Hoy: pide período y ofrece **consulta RRHH**. Módulo completo → **Ola 40** `40.l` (docs con naming DNI) |
| **B** Saldo vacaciones | Saldo real (§13 / ola 17) |
| **C** Solicitar vacaciones | Borrador + confirmación → `LicenseRequest` |
| **D** Cómo hago / KB | RAG + citas; “cómo marcar” vía KB |
| **E** Combinado | Intent `saldo_y_solicitar_vacaciones` en el mismo hilo |
| **F–H** Reservas | Booking conversacional sala / cochera / oficina (no solo deep-link) |

## Ola 20 — Admin beneficios: previews, wizard y tipología legado (gap · NECESARIO)

> **Estado:** **entregado código 2026-07-30** · tipología + wizard + previews + **Cómo llegar** (Google Maps Directions).  
> **Gaps producto ola 20:** —  
> PSP / retiro productivo / KYC → **Ola 40** `40.u`–`40.w` (**CAPRICHO**). Pack Claro → **Ola 24** `NR.CLARO`. Smoke/DOC ≠ gap.

### Veredicto
El catálogo **funciona** en app U. El admin ahora tiene **grilla con thumbs**, **wizard 5 pasos** y tipología `offerType` (informativo · canjeable · premio · geo · partner). Antes era un sheet técnico sin preview ni tipos guiados.

### Tipología (paridad legado · sin Emp_Id)

| Tipo (producto) | Qué es | Comportamiento |
|-----------------|--------|----------------|
| **Informativo / convenio** | Descuento o perk sin gastar puntos | Detalle/condiciones; `costoPuntos=0` |
| **Canjeable con puntos** | Canje con ledger | Código/QR, stock, límite por usuario |
| **Premio / reward** | Recompensas | `kind=reward` + canje |
| **Con geolocalización** | Sucursal / mapa | Lat/lng + sucursal → mapa U |
| **Link / partner externo** | URL partner | `partnerUrl` + imagen |

### Criterios DoD
- [x] Admin ve la imagen del beneficio en listado y en el editor (preview ≈ card U).
- [x] Alta de beneficio con wizard por pasos; estados en español.
- [x] Al crear, el admin elige un **tipo** y solo completa campos de ese tipo.

## Ola 21 — Activos reservables + revisión UX/UI (**hecha** 2026-07-30)

> **Estado:** implementada · gaps de ola 21 = **—**.  
> Movidos a **Ola 40** (DESEABLE): plano de planta gráfico (`40.s`) · bundle sala+cochera 1-click (`40.t`).

### Qué se entregó

**Activos reservables genéricos**
- Modelos `SpaceResourceType` + `SpaceAttributeDef`; recursos con `typeId` + `attributes[]`.
- Seed: tipos sistema (sala/cochera/puesto/…) + proyector/herramienta/locker; atributos HDMI/WiFi/marca/…
- Admin: ABM Tipos / Atributos; alta de recurso por wizard (tipo → datos → reglas).
- U: catálogo por tipo dinámico + filtros por atributo; mismo motor de disponibilidad/reserva.

**Rediseño UX/UI**
- U `/espacios`: modos Reservar / Mis reservas; chips de tipo; Libre/Ocupado; confirmación clara.
- U `/oficina`: CTA “Voy a la oficina” destacado; estados en español.
- A `/reservas`: recorrido Sedes → Tipos → Recursos → Políticas → Pendientes; copy ES.

### Criterios DoD
- [x] Admin crea tipo (seed proyector/herramienta) y recursos reservables por franja.
- [x] Filtro U por atributo (ej. HDMI).
- [x] Sala / cochera / puesto como tipos seed.
- [x] Flujos U/A rediseñados sin jerga EN en el camino feliz.
- [ ] Smoke humano QA / OpenAPI → postdev.

### Diferidos

| Ítem | Destino |
|------|---------|
| Plano de planta gráfico | **Ola 40** `40.s` DESEABLE |
| Bundle sala+cochera 1-click | **Ola 40** `40.t` DESEABLE |
| Smoke QA / OpenAPI `34.DOC` `35.DOC` | Postdev |

## Ola 19 — Revisión UX/UI (**hecha** 2026-07-30)

> **Estado:** implementada · gaps de ola 19 = **—**.  
> Sammy / chatbot onboarding vive solo en **Ola 40** `40.n` (no se menciona en la fila 19).

### Qué se cambió
- **U `/bienvenida`:** título dinámico (Tu ingreso / Tu egreso), tabs si hay ambos, **Siguiente paso** destacado, estados/tipos en español, vacío amable.
- **U `/mi-legajo`:** distingue Perfil vs ficha laboral; edición por secciones; vacío claro.
- **A Ingreso y egreso:** guía 1→2, labels ES, sin `§15`/estados crudos.
- **A Fichas de empleado + Listas del legajo:** copy de miembro≠empleado y propósito de las listas.
- Menú seed / `ensureOla19Menu`: labels alineados (renueva solo labels legacy).

### Criterios DoD
- [x] Usuario no ve `pending` / `content` crudos.
- [x] Admin inicia proceso con copy en español y pasos numerados.
- [x] Sin `§15` en UI.
- [x] Menú/títulos alineados (Tu ingreso · Ingreso y egreso · Fichas de empleado).

## Ola 28 — Definiciones (IMPRESCINDIBLE · Centro de comunicaciones · `28.COM.*`)

> **Prioridad:** <span style="color:#dc2626; font-weight:600">IMPRESCINDIBLE</span> · **Estado:** cerrada (código 2026-07-30)  
> **Testigo:** Hiryx / Talent — `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas` (asistente de comunicación, plantillas + IA, outbox).  
> **Qué es:** canal de **comunicaciones de plataforma** multi-canal (email · WhatsApp · SMS) con plantillas configurables por comunidad y generación por IA — análogo al centro de comunicaciones de Hiryx, adaptado a miembros/comunidad Connectia (no postulantes/vacantes).  
> **Qué NO es:** packs Claro/Grido/ECR/EPEC/Emp60 → **Ola 24**; Jira/SAP/GeoPop → **Ola 40** (`40.c`–`40.g`); ERP/Rendi → **Ola 33**; secretos prod → **Ola 42**; mapa genérico de todos los sistemas legacy (§33 inventario) → doc de arquitectura, no producto de esta ola.

### Objetivo
Que Admin pueda **definir tipos**, **editar plantillas** (o generarlas con IA), **enviar** a una audiencia de la comunidad por el canal elegido, y **auditar** el outbox — sin hardcode Emp_Id y sin acoplar a un cliente vertical.

### IDs (`28.COM.*`)

| ID | Qué | Notas / paridad Hiryx |
|----|-----|------------------------|
| `28.COM.00` | Cap `comunicaciones` / `admin.comunicaciones` + menú A | On/off por tenant |
| `28.COM.01` | Tipos de comunicación (CRUD por comunidad) | `CommunicationType` Hiryx |
| `28.COM.02` | Plantillas multi-canal + placeholders `{{…}}` | `CommunicationTemplate` · email/whatsapp/sms |
| `28.COM.03` | Generar plantilla con IA (prompt → subject/body) | `communicationTemplateGenerator` · GPT |
| `28.COM.04` | Asistente / wizard de envío | Tipo → audiencia Connectia → canal → preview → send bulk |
| `28.COM.05` | Outbox / comunicaciones enviadas | Estados sent/failed/pending · filtros |
| `28.COM.06` | Canal **email** (provider + branding tenant) | Endurecer `emailService` Connectia · layout marca |
| `28.COM.07` | Canal **WhatsApp Business / WTA** (API + webhook) | No `wa.me`; Meta Graph / WTA servidor |
| `28.COM.08` | Canal **SMS** (Twilio) | Reusa `smsService` si aplica |
| `28.COM.09` | Adjuntos en comunicaciones (storage) | Reusa `docStorage` / cuotas |
| `28.COM.10` | Health / logs de canales | Estado email/WA/SMS por comunidad · sin PII en logs |
| `28.COM.QA` / `SEC` / `UX` / `ADM` / `DOC` | Meta módulo | Authz tenant · UI móvil-primero admin · OpenAPI |

### Fuera de esta ola (reubicado 2026-07-30)

| Antes (§30 / mezcla) | Destino |
|----------------------|---------|
| `30.01`–`30.07` ECR Salud, GeoVictoria, packs ECR/Claro/EPEC/Emp60/Grido | **Ola 24** `NR.*` |
| `30.10` SAP | **Ola 40** `40.f` (jobs SAP/ECR) |
| Jira tickets / config / crear issue | **Ola 40** `40.c`–`40.e` |
| Google Maps (`30.09`) | Ya parcial en módulos (beneficios/eventos); residual → gaps / no bloquea 28 |
| Inventario §33 de *todos* los backends legacy | Doc consolidado · no UI de esta ola |
| Archivos genéricos / PWA endurecida (`31.02`/`31.04`) | Soporte transversal; **adjuntos** via `28.COM.09`; PWA no es núcleo de comunicaciones (postdev o gap §31 si hace falta) |
| Credenciales prod mail/WA/Twilio | **Ola 42** |

### Spec legado a reutilizar (consolidado)

> Fuente: [`ECRMOBILE-FUNCIONES-CONSOLIDADO.md`](./ECRMOBILE-FUNCIONES-CONSOLIDADO.md). Hiryx da el **producto** (asistente/plantillas IA/outbox); el consolidado da el **contrato de canal**.

| Pieza | Ancla consolidado | Aplica a |
|-------|-------------------|----------|
| Email outbox / idempotencia / rebotes / zona / no secretos en links | [§31 Envío de email](./ECRMOBILE-FUNCIONES-CONSOLIDADO.md#31-whatsapp--wta-email-archivos-y-plataforma) | `28.COM.06` · `28.COM.05` |
| WhatsApp: opt-in, plantillas Meta, webhook firmado, E.164, rate limit, no mezclar tenants | [§30 WhatsApp Business / WTA](./ECRMOBILE-FUNCIONES-CONSOLIDADO.md#30-integraciones-especiales) | `28.COM.07` |
| Health / logs sin PII · correlationId | §31 Logging y health check | `28.COM.10` |
| Adjuntos: signed URL, ACL, MIME | §31 Gestión de archivos (recortada a com.) | `28.COM.09` |
| IA “mejorar templates” | §31 Elementos de IA | `28.COM.03` |
| Anti-patrones WTA/files | §44 **D02** · **D05** · **D09** · **D16** · **D20** | DoD SEC |

### Criterios DoD
- [x] Admin crea tipo + plantilla (manual e IA) y envía a ≥2 usuarios demo por **email**.
- [x] WhatsApp: adapter Meta Cloud API + webhook + DEV fallback (no `wa.me`).
- [x] Outbox muestra estado y error sin secretos.
- [x] Cero `Emp_Id` hardcode; scope por `tenantId`.
- [x] Tests del motor de plantillas + send (sin DB) en `connectia/backend` (`communications.test.js`).

### Entrega código (2026-07-30)
- S: modelos `CommunicationType` / `CommunicationTemplate` / `Communication` · `communicationService` · `whatsappService` · `communicationTemplateAi` · `/api/admin/communications` · webhook `/api/webhooks/whatsapp` · `ensureOla28Menu` · tests
- A: `/comunicaciones` (tipos · plantillas+IA · wizard · outbox · health canales)
- Caps: `admin.comunicaciones`
- Env: `WHATSAPP_*` · `COM_EMAIL_DEV_LOG` / `COM_WA_DEV_LOG` en `.env.example`
- Credenciales live mail/WA/Twilio → **Ola 42**

### Referencias de código (testigo Hiryx)
- `aitalent-saas/backend/src/services/communicationService.js`
- `aitalent-saas/backend/src/services/communicationTemplateGenerator.js`
- `aitalent-saas/frontend/src/views/AsistenteComunicacionPostulantes.vue`
- `aitalent-saas/frontend/src/views/ConfiguracionPlantillasComunicacion.vue`
- `aitalent-saas/frontend/src/views/ComunicacionesEnviadas.vue`

---

## Ola 29 — Definiciones (IMPRESCINDIBLE · solo `29.CONV`)

> **Prioridad:** IMPRESCINDIBLE · **Estado:** cerrada (código 2026-07-30) · **Origen del feedback:** demo del asistente (ola 12) — se percibía como wizard con botones, no como chat humano.  
> **Fuera de esta ola:** modos Sammy · asistente contenido · asistente carga · QR vista/DNI → **Ola 40** (`40.n` DESEABLE · `40.o`–`40.r` CAPRICHO).

### 29.CONV — Trámites 100% conversacionales (**imprescindible**)

**Problema:** el usuario ve chips de atajo y una **confirm-card** con botones. El producto debe sentirse como hablar con alguien.

**Target UX:**
1. Usuario escribe (o dicta): “quiero hacer un trámite”.
2. Bot pregunta en lenguaje natural qué trámite.
3. Bot pide **dato por dato** lo que falte (“¿desde qué fecha?”, “¿motivo?”) hasta completar el borrador.
4. Bot resume en el chat y pide confirmación **hablada** (“¿Lo confirmo? Decime sí o no”) — **sin** tarjeta de botones de decisión.
5. Tras “sí”, ejecuta con las mismas reglas/authz que la UI nativa.

**Qué queda permitido (opcional, no obligatorio):** chips de atajo en el welcome **solo como ayuda**; el flujo principal no debe depender de ellos. Fuentes/citas de KB pueden seguir siendo links.

**Qué NO cambia:** mutaciones siguen requiriendo confirmación explícita (puede ser texto “sí”); aislamiento tenant; mismos backends de vacaciones/solicitudes/reservas/etc.

**Criterios DoD:**
- [x] Un usuario completa vacaciones / solicitud / reserva **solo escribiendo**, sin tocar chips ni botones Sí/No.
- [x] El bot re-pregunta campos faltantes en vez de fallar o abrir un formulario.
- [x] Cancelar = escribir “cancelar” / “no” (o equivalente), no solo un botón.
- [x] Smoke DEMO: al menos 2 trámites end-to-end solo por chat.

**≠ Modos Sammy / contenido / QR:** eso vive en **Ola 40** (`40.n`–`40.r`), no bloquea el cierre de `29.CONV`.

**Entrega código (2026-07-30):** sin confirm-card ni chips mid-thread; slot-filling vacaciones/ausencias multi-turno (`assistantLicenseDraft`); confirmación hablada en solicitudes/reservas/licencias; entrada “quiero hacer un trámite” pregunta el tipo; turnos de borrador **sin reformular con LLM** (el polish no pisa el diálogo).

---

## Ola 30 — Definiciones (NECESARIO · modernización UX residual §45)

> **Prioridad:** NECESARIO · **Estado:** en curso · **Alcance:** solo §45 (sin §44 · sin cierre de diferidos · §32 reubicado).  
> **Testigo visual Admin:** `HIRYX-SAAS` **MainLayout completo** (no solo la barra lila): header fijo blanco · chatbot fijo a la izquierda (colapsable) · sidebar derecho por hover · modal «Funciones de Administración» · FAB ayuda · títulos sticky lila en páginas.  
> **≠ Branding producto Connectyx (`36.p`):** logo/nombre Connectyx en el chrome; el **layout** es el de Hiryx.

### Objetivo

Pulir U + unificar Admin al patrón visual Hiryx desktop, con primitivas compartidas de loading/empty/error, companion desktop U y cierre residual de `*.UX` reales.

### Fase 0 — Contrato visual (~1 día)

Congelar el patrón de **pantallas** con el prototipo `hiryx-prototipo.html` (no solo sticky Talent):

| Pieza | Regla |
|-------|--------|
| Tema default | **Oscuro** (`--canvas #111019`, paneles `#1e1a2b`, brand `#6b5bf0`) |
| Toggle | Usuario puede pasar a **claro** (header Admin · `ThemeToggle`) |
| Tipografía | Space Grotesk (títulos) + IBM Plex Sans / Mono |
| Barra de página | Título + subtítulo + acciones a la derecha + **línea** `border-bottom` (como `.top` del prototipo) — **sin** sticky morado |
| Contenido | Padding/espaciado fijo · paneles/tablas/inputs con tokens |
| Empty / skeleton / error / spinner | Mismos componentes (Fase 2) |

**Sin esto**, cada vista inventa su header y colores.  
**MainLayout** (chat/sidebar/header fijo) es aparte: ver Fase 1.

### Fase 1 — Admin = Hiryx MainLayout (mayor impacto)

**Target de layout** (calcado de `HIRYX-SAAS/.../MainLayout.vue`):

| Pieza | Comportamiento |
|-------|----------------|
| Header fijo blanco | Logo · badge Administrador · atajos · «Funciones de Administración» · botón Asistente |
| Chatbot izquierdo | Fijo; colapsado `w-14` / abierto `w-96`; FAB «¿Necesitás ayuda?» |
| Sidebar derecho | Blanco; hover expande iconos (Inicio · +Funciones · Reportes · avatar) |
| Modal funciones | Grid de secciones lila `#8554C9` con todo el menú A |
| Contenido | `mt-20` + margen izquierdo según chatbot; páginas con `AdminPageHeader` sticky lila |

| Pieza código | Qué |
|--------------|-----|
| `AdminShell.vue` | Shell MainLayout (arriba) |
| `AdminShellChatbot.vue` | Rail chatbot |
| `AdminFunctionsModal.vue` | Modal funciones |
| `AdminPageHeader.vue` | Sticky lila título + acciones |
| `AdminPage.vue` (opcional) | Header + body + empty/error |
| Migración headers | Por oleadas (no ~50 de una) |

**Oleadas de migración A:**

1. Usuarios · Solicitudes · Publicaciones · Comunidad · Beneficios  
2. Resto de menú diario  
3. Verticales (supervisión, reservas, etc.)

**DoD Fase 1:** ninguna pantalla A con H1 suelto distinto; todas pasan por el header común.

**Avance (2026-07-30):** Chatbot Admin = UX Hiryx + KB tenant + **JSON producto** (`connectiaAdminKnowledgeBase.json` como contexto, paridad `aitalentKnowledgeBase`). Pendiente: oleadas 1–3 de headers.

### Fase 2 — Primitivas de “piensa / vacío / falla”

Componentes compartidos U+A (o al menos A primero):

| Componente | Uso |
|------------|-----|
| `AppSpinner` / overlay de página | Busy global o de pantalla |
| `AppSkeleton` | Listas / tablas |
| `AppEmpty` | Copy + CTA |
| `AppError` | Reintentar |

**Regla:** todo `busy` / `loading` / `fetch` muestra uno de estos; nada de pantalla congelada.

**Aplicar primero a:** login · muro · solicitudes · asistente · admin listados.

### Fase 3 — U companion desktop

No es un admin. Es la misma app U en PC:

- Anchos máximos, tipografía, botones táctiles que no se vean raros con mouse  
- Revisar shell + 5 flujos críticos: login · muro · trámite · encuesta · punch  

### Fase 4 — Cerrar `*.UX` pendientes

Solo **después** de Fases 1–2: ir módulo a módulo (`03.UX` parcial, `11.UX`, etc.) y marcar hecho cuando use las primitivas + no rompa desktop.

Los `*.UX` de inventarios genéricos §44/§45 **no** son pantallas reales: **no priorizarlos**.

### Orden de ejecución recomendado

| # | Qué | Por qué |
|---|-----|---------|
| 1 | Header sticky lila + layout página Admin | Un cambio, todas las pantallas A |
| 2 | Spinner / empty / error compartidos | Feedback “donde piensa” |
| 3 | Migrar top 8–10 vistas A | Se nota en demo al jefe |
| 4 | Flujos críticos U + companion | §45 móvil/desktop |
| 5 | Resto + checklist `*.UX` | Barrido residual |

### Qué no hacer

- Rediseñar módulo por módulo sin componentes base  
- Mezclar branding Connectyx (`36.p`) con este trabajo (logo/nombre ≠ chrome Admin)  
- Copiar Hiryx **literal** (Talent/vacantes/Soofia): reimplementar el **mismo layout** en Connectia Admin con menú/capacidades Connectia  
- Volver al aside oscuro fijo como único menú (el menú vive en el modal «Funciones», como en Hiryx)  

### Criterios DoD (ola completa)

- [ ] Contrato visual congelado (Fase 0) y respetado en A  
- [ ] Toda pantalla A usa `AdminPageHeader` (o equivalente común) — sin H1 suelto  
- [ ] Primitivas spinner / skeleton / empty / error en flujos críticos U+A  
- [ ] Companion desktop: 5 flujos críticos usables en PC  
- [ ] `*.UX` reales pendientes/parciales cerrados o justificados; inventarios genéricos §44/§45 no bloquean  

---

## Cierre Ola 18 (2026-07-29 · cámara QR 2026-07-30)

Núcleo §11 + postdev producto + escaneo cámara:

| Pieza | Qué hace |
|-------|----------|
| **Lugares** | ABM A con lat/lng/radio; GPS asistido al cargar coords |
| **Turnos** | CRUD A + mis turnos U; cancelar/reemplazar |
| **Punch** | Modos libre / en lugar / temporal; geocerca en servidor; idempotencia |
| **Ventana** | Tolerancia horaria ± min; late/early en la marca |
| **Excepciones** | `allow\|block\|justify`; notif a líder/TeamScope/admin |
| **Offline** | Cola local pending → sync online |
| **Equipo** | Historial con `managerId` + miembros TeamScope |
| **Admin** | Novedades + export CSV + políticas |
| **Prefichada** | Mock Geopop desde turnos locales (11.03) |
| **Multi-sitio** | Servicio/objetivo + lugares alternativos (11.04) |
| **QR** | Cámara nativa (`BarcodeDetector` + fallback `jsQR`) + paste token + punch (11.06) — gap menor cerrado |
| **Domingos** | Agregación mensual local (11.09) |
| **Panel ECR** | Marcas fuera de rango reales + justificar/amonestar/anexo (11.11) |

Vertical **local** cerrado (incl. cámara QR en U `/mi-asistencia`). Sync productivo Geopop / API ECR externa / GeoVictoria → **Ola 24** `NR.ECR` (adapters). Credenciales live → **Ola 42** cuando el código del pack exista.

## Ola 38 — Diseño: padrón de miembros desde IdP

> **Estado:** spec / no implementada · **Base:** ola 1 (`authConfig` dominio + auto-alta SSO) + ola 16 (Directory Google/Entra + CSV).  
> **Hoy sin código nuevo:** Comunidad → Ingreso (SSO + dominio + auto-alta) y Usuarios → Google/Entra o Import — ayudas “i” en esas pantallas.

### Problema
El admin pregunta: “los miembros son todos los `@sooft.com.ar`” o “los del grupo Google X”. Hoy hay piezas sueltas (puerta SSO vs sync Directory) y **no** hay filtro por grupo.

### Principios
1. **Una fuente de verdad** por comunidad: Google **o** Entra **o** manual/CSV — no tres padrones en paralelo.
2. **Separar puerta vs padrón:** dominio/SSO controla *entrar*; sync/grupo define *quién está en la lista*.
3. **Reusar** `directorySync`, `loginMethods`, `authConfig` — no segundo motor de usuarios.
4. **Preview antes de commit** (ya existe en Directory).

### Flujo objetivo (1 pantalla)
1. Elegir **origen**: Google Workspace · Microsoft Entra · Solo manual/CSV.  
2. Elegir **filtro**: dominio(s) y/o **grupo** (Google Group / Entra group / OU).  
3. **Sync ahora** → preview altas/updates → confirmar.  
4. Opcional: **auto-alta JIT** al primer SSO (ya en ola 1).  
5. Opcional: política **“si sale del grupo → desactivar en Connectia”**.

### Recetas
| Necesidad | Hoy (workaround) | Ola 38 |
|-----------|------------------|--------|
| Todos `@sooft.com.ar` pueden entrar | Dominio + SSO + auto-alta | Igual + sync Domain opcional |
| Padrón precargado del Workspace/Entra | Usuarios → Google/Entra | Misma sync, UI unificada |
| Solo miembros de un Google Group | CSV export del grupo | Filtro grupo nativo |
| Baja automática al salir del IdP | Manual | Política de desactivación |

### Fuera de alcance
- Clonar el IdP como CRM.  
- Multi-origen simultáneo en el mismo tenant (salvo migración controlada).  
- Login externo solo-encuestas (`01.06` descartado).

### Criterios DoD (cuando se implemente)
- [ ] Admin configura origen + dominio/grupo y ve preview.  
- [ ] Sync Google Group / Entra group materializa solo esos usuarios.  
- [ ] JIT SSO respeta el mismo filtro.  
- [ ] Ayuda “i” actualizada apuntando a la pantalla unificada.

## Ola 39 — Textos por comunidad (locale + labels) — definiciones

> **Estado:** spec / **parcial en código** · **Base:** i18n es/en de `23.38` · stub `uiLocale`/modismos · **ex-ola 40** (renombres).  
> **No confundir con:** ola **29** Sammy “modo traducciones” (sugiere copy) · skins YOMOB/SOOFIA (ya → `uxShell` + Tema) · branding producto **Connectyx** (ola **36.p**).

### Por qué una sola ola
Locale/cultura (“glosa” vs “texto”) y renombre comercial de módulo (Alarmas → “Feedback de vecinos”) usan el **mismo motor**: clave canónica → texto visible según comunidad (pack de idioma + glosario + override). Separarlos duplicaba modelo y admin.

### Ya en código (baseline · no alcanza DoD)

| Pieza | Dónde | Qué cubre | Qué falta para 39 |
|-------|--------|-----------|-------------------|
| `tenant.uiLocale` (`es-AR` \| `es-CL`) | `Tenant` · auth · Comunidad admin | Locale base mínimo | Ampliar a `pt-BR` · `en` · enum/admin unificado (`39.LOC.00`) |
| Diccionario modismos CL | `frontend/src/i18n/modismos.js` | Overlay ~30 strings (Tenés→Tenís, etc.) | Pasar a glosario versionado + packs (`39.LOC.02`–`.03`) |
| `useUiText()` / `t()` | composable shell / home / puntos | Helper liviano sin vue-i18n | Runtime completo por **claves** + overrides (`39.LOC.07`) |
| Selector en Comunidad | Admin → branding/locale | Cambiar es-AR / es-CL | Absorber en pantalla “Idioma, cultura y labels” (`39.LOC.06`) |

### Qué NO es (gap legado aclarado)

| Concepto legado | Qué era | Destino |
|-----------------|---------|---------|
| Skins YOMOB / SOOFIA | Dos “pieles” de producto | Ya resuelto: `uxShell` + Tema (+) |
| Renombre por empresa | Mismo módulo, otro nombre en menú | **Overrides de esta ola** (ex-40) |
| Modismo / país | es-CL, pt-BR, glosa/texto | **Locale + glosario de esta ola** |

### Problema
1. Multi-país: AR/CL/BR sin hardcode ni forks.  
2. Multi-cliente: Emp60 (y NR) necesitan labels de producto distintos sin Emp_Id en vistas.

### Principios
1. **Locale por comunidad** (default): `es-AR` · `es-CL` · `pt-BR` · `en` · extensible.
2. **Capas de texto:** (A) pack de idioma · (B) glosario cultural · (C) **override por tenant** (incluye renombres de menú/módulo).
3. **Claves, no literales:** `t('menu.alarmas')` / `t('receipt.lineItem')` → locale + override. El stub actual con literales es **puente** hasta migrar a keys.
4. **Solo presentación:** renombrar no cambia APIs, métricas ni reglas.
5. **Sin Emp_Id** en vistas; seed/pack NR carga overrides.
6. **Usuario opcional:** preferencia de idioma si la comunidad lo habilita.
7. **Sammy 29** sugiere copy; no es fuente de verdad.

### Ejemplos de resolución

| Comunidad | Locale | Clave | Resultado |
|-----------|--------|-------|-----------|
| ARCOR | `es-AR` | `receipt.lineItem` | “Texto” |
| Cliente CL | `es-CL` | `receipt.lineItem` | “Glosa” |
| Cliente BR | `pt-BR` | (pack) | UI en portugués |
| DEMO | `es-AR` | `menu.alarmas` | “Alarmas” |
| Emp60 | `es-AR` + override | `menu.alarmas` | “Feedback de vecinos” |

### Funciones (`39.LOC.*`)

| Id | Función | Definición |
|----|---------|------------|
| **39.LOC.00** | Locale del tenant | Comunidad: elegir locale base (país + idioma). **Hoy:** `uiLocale` es-AR/es-CL en Comunidad. Target: enum completo + seed. |
| **39.LOC.01** | Catálogo de claves UI | Inventario versionado (menú, botones, vacíos, módulos). Seed desde strings actuales. |
| **39.LOC.02** | Packs de idioma | `es-AR`, `es-CL`, `pt-BR`, `en`. Fallback: key → es-AR → key cruda. Absorbe `modismos.js` como pack `es-CL` inicial. |
| **39.LOC.03** | Glosario cultural | Término canónico → variantes por locale (glosa↔texto; Tenés/Tenís). |
| **39.LOC.04** | Overrides por comunidad | Admin edita keys (incluye **renombres de módulo/menú**). Aislado por tenant. |
| **39.LOC.05** | Preferencia usuario | Opt-in: miembro elige idioma; si off, solo locale comunidad. |
| **39.LOC.06** | Admin UI | “Idioma, cultura y labels”: locale, glosario, overrides, preview, import/export. Reemplaza el selector suelto de Comunidad. |
| **39.LOC.07** | Runtime U/A | Resolver `t(key)` al boot / cambio de comunidad. Evoluciona `useUiText` → keys + capas A/B/C. |
| **39.LOC.08** | Enganche Sammy | Ola 40 `40.n` (deseable) puede proponer traducciones al editar keys. |
| **39.LOC.09** | Menú dinámico | Al armar menú U/A, `item.label` = texto resuelto (pack + override). |
| **39.LOC.10** | Seed / pack NR | Emp60 (y similares) cargan overrides al seed sin hardcode en vistas. |
| **39.LOC.SEC/UX/QA/DOC** | Transversales | Authz · sin Emp_Id · OpenAPI · DoD. |

### Fuera de alcance
- Traducir **UGC** del muro.  
- Traducción automática en runtime sin revisión (salvo Sammy).  
- Forks de app por país.  
- Revivir skins YOMOB/SOOFIA.  
- Lógica distinta por cliente (pack NR ola **24**); acá solo copy/labels.  
- Branding producto Connectyx (ola **36.p**).

### Criterios DoD (cuando se implemente)
- [ ] AR vs CL: “texto” vs “glosa” sin redeploy.
- [ ] BR con `pt-BR`: UI en portugués (pack MVP).
- [ ] Override de un label no afecta otras comunidades.
- [ ] Emp60 (u otro tenant) muestra “Feedback de vecinos” donde otro ve “Alarmas”, misma capability.
- [ ] Ninguna vista hardcodea Emp_Id para texto de menú.
- [ ] Stub `uiLocale` + `modismos.js` migrados/alineados a este motor · ex-ola 40 atendida vía overrides.

## Ola 40 — Definiciones (deseables · caprichos · otro MVP · referenciadas a ola origen)

> Regla: **no reabrir** la ola origen (ya cerrada). Al desarrollar, implementar en el módulo de la ola origen y marcar el ítem acá.  
> **Niveles dentro de la bolsa:**  
> - **DESEABLE** — tiene sentido de producto si sobra capacidad en otro MVP.  
> - **CAPRICHO** — por debajo de deseable: nice-to-have; no planificar salvo demanda explícita del cliente.

| Id | Nivel | Mejora | Ola origen | Definición |
|----|-------|--------|------------|------------|
| **40.a** | Deseable | Análisis IA de imagen/GIF | **9** Comentarios (§10) | Además del texto, la moderación IA revisa **imágenes y GIFs** en comentarios del muro y sugiere acción al admin (ocultar / aprobar / revisar). |
| **40.b** | Deseable | Apelación del autor | **9** Comentarios (§10) | Si un comentario se oculta/rechaza, el **autor** puede apelar; el admin ve la apelación en bandeja y confirma o revierte. |
| **40.c** | Deseable | Mis tickets Jira en app | **4** Solicitudes (§9.09) | El miembro ve en Connectia el listado/estado de **sus issues Jira** vinculados (soporte pendiente), sin salir a Jira. Requiere `40.d`. |
| **40.d** | Deseable | Config Jira por tenant | **4** Solicitudes (§9.10) | Admin configura integración Jira del tenant (URL/cloud, proyecto, auth) y vínculo de usuario Connectia ↔ cuenta Jira. Sin Emp_Id hardcode. |
| **40.e** | Deseable | Crear issue Jira desde Connectia | **4** Solicitudes (§9.11) | Opcional: desde una consulta/solicitud (o acción dedicada) **crear un issue** en Jira y dejar el vínculo en el trámite. Depende de `40.d`. |
| **40.f** | Deseable | Jobs SAP/ECR sobre consultas | **4** Solicitudes (§9.07 · `30.10`) | Jobs/adapters que, al cambiar estado de una consulta, disparan o consultan flujos **SAP / ECR** (aprobación/impacto). Solo si el cliente aporta contrato y credenciales. Absorbido desde §30 / fuera de Ola 28. |
| **40.g** | Deseable | Novedades GeoPop en consultas | **4** Solicitudes (§9.06) | Mostrar/vincular **novedades GeoPop** relevantes al contexto de la consulta (turno, marca, asignación). Reusa conectores de asistencia/GeoPop cuando existan credenciales; no es el motor de punch (ola 18). |
| **40.h** | Deseable | Pregunta tipo API (relevamientos) | **37** Relevamientos (`37.REL.02`) | Tipo de pregunta de campo que, al ejecutar el relevamiento, **consulta un endpoint externo allowlisteado** del tenant y usa la respuesta como valor (o ayuda a completar el formulario). Ver detalle debajo. |
| **40.i** | Deseable | Chat por voz | **10** Chat (§8.02) | Llamada de **audio** 1:1 (y grupo si el tenant lo habilita) dentro de Connectia: ringing → aceptar/rechazar → colgar; evento en historial; sin grabar por defecto. Requiere WebRTC/SFU + push (§7). |
| **40.j** | Deseable | Chat por video | **10** Chat (§8.03) | **Videollamada** 1:1 (y grupo si habilitado): mute/cam off; consentimiento cámara/mic; mismo stack media que `40.i`. |
| **40.k** | Deseable | Resúmenes / transcripción IA de chat | **10** Chat (§8.07) | **Resumir hilos** largos y **transcribir audios** con IA acotada al tenant + auditoría. El buscador de conversaciones ya está en el núcleo de ola 10. |
| **40.l** | Deseable | Recibos de sueldo (vía Documentos) | **12** Chatbot (§24) · `32.01` · implementa en **§17** | Módulo completo de recibos como **documentos personales** con naming por archivo; el chatbot consume el mismo backend. Ver detalle debajo. |
| **40.m** | Deseable | Conector PeopleCare / HRIS externo | **14** Directorio + Legajo · toca **19** | Sync bidireccional (o pull) entre un **HRIS externo** (PeopleCare u otro) y el legajo local `EmployeeLegajo`. Hoy el núcleo de ola **14** es **100% local** (sin HTTP). Ver detalle debajo. |
| **40.n** | **DESEABLE** | Modos Sammy del asistente | **12** / ex-29 · §24 | Personalidades opt-in del bot: personal · soporte · onboarding · traducciones · research · ventas. **No** es el chat conversacional (`29.CONV`). |
| **40.o** | **CAPRICHO** | Asistente de contenido | **12** / ex-29 · `24.04` | IA que propone borradores de pubs / push / FAQs; humano confirma. |
| **40.p** | **CAPRICHO** | Asistente de carga de datos | **12** / ex-29 · `24.05` | Autocompletar / sugerir campos en formularios (foto/PDF → datos). |
| **40.q** | **CAPRICHO** | Escaneo QR → vista | **12** / ex-29 · `24.06` | QR abre una pantalla Connectia (doc, pub, sala…). ≠ QR de asistencia (ola 18). |
| **40.r** | **CAPRICHO** | Lectura QR DNI | **12** / ex-29 · `24.07` | Parseo de datos del DNI vía QR para legajo/campo. |
| **40.s** | **DESEABLE** | Plano de planta gráfico | **21** Coworking (`35.03`) | Mapa visual de planta/zona para elegir puesto o recurso tocando el plano (hoy: lista/zonas). Ver detalle en *Ola 21 — gaps*. |
| **40.t** | **DESEABLE** | Bundle sala + cochera 1-click | **21** Reservas (`35.11`) | Reservar sala + cochera (u otros activos de la misma sede) en **un solo paso** con confirmación única. |
| **40.u** | **CAPRICHO** | PSP bancario real | **20** Beneficios (§18) | Pasarela de pago externa (tarjeta/débito/liquidación bancaria). Hoy el ledger es solo puntos internos de la comunidad. |
| **40.v** | **CAPRICHO** | Retiro de saldo productivo | **20** Beneficios (§18) | Acreditar el retiro (alias/CBU) en cuenta bancaria real. Hoy el pedido queda `pending` sin liquidación. Depende de `40.u`. |
| **40.w** | **CAPRICHO** | KYC / conciliación productiva | **20** Beneficios (§18) | Verificación de identidad y cierre contable ledger ↔ banco. Sin esto no hay custodia productiva de fondos. |
| **40.x** | **DESEABLE** | Quiet hours / tope frecuencia campañas | **22** Reportes · reusa §7 | No molestar fuera de franja horaria del tenant + tope de pushes de impulso/adopción por usuario/día. Hoy: defaults de §7 sin quiet hours. |
| **40.y** | **CAPRICHO** | Historial fino de conexiones | **22** Reportes (`29.06`) | Timeline de logins/sesiones más allá de `lastLoginAt` + canal del tablero de adopción. |
| **40.z** | **CAPRICHO** | Organigrama matricial / import HRIS / IA org | **22** Organigrama (§37) | Reportes a varios jefes, import desde HRIS y sugerencias IA para completar el árbol. Hoy: árbol simple `managerId`. |

### 40.n–40.r — IA extendida / QR (ex ola 29 · priorización)

| Id | Nivel | Para el usuario | Cuándo tocar |
|----|-------|-----------------|--------------|
| `40.n` Sammy | **Deseable** | El bot cambia de “rol” (nuevo ingreso, traducir, redactar…) | Otro MVP si el cliente pide suite tipo Sammy |
| `40.o` Contenido | **Capricho** | Quien publica escribe menos | Solo demanda explícita |
| `40.p` Carga | **Capricho** | Menos tipeo en formularios | Solo demanda explícita |
| `40.q` QR vista | **Capricho** | Atajo cartel → pantalla | Solo demanda explícita |
| `40.r` QR DNI | **Capricho** | Cargar identidad sin teclear | Solo demanda explícita |

> El chat **hablado** de trámites **no** está acá: es **Ola 29** `29.CONV` (IMPRESCINDIBLE).

### 40.u–40.w — Billetera bancaria (ex ola 20 · CAPRICHO)

| Id | Nivel | Qué resuelve | Criterio |
|----|-------|--------------|----------|
| `40.u` PSP | **Capricho** | Dinero real entra/sale (no solo puntos) | Solo demanda explícita + proveedor |
| `40.v` Retiro | **Capricho** | Pedido de retiro → plata en CBU/alias | Requiere `40.u` |
| `40.w` KYC | **Capricho** | Identidad + conciliación ledger/banco | Requiere `40.u` |

> **Ola 20 gaps producto** = — (Cómo llegar / Google Maps Directions entregado 2026-07-30). Pack Claro → **Ola 24** `NR.CLARO`. Smoke/DOC = postdev, no gap.

### 40.l — Recibos de sueldo vía Documentos (detalle)

**Ola origen:** **12** (gap del diálogo “quiero mi recibo”) · catálogo `32.01` · se implementa sobre **§17 Documentos** (ola 5), no como liquidación/nómina separada.

**Decisión de producto:** no hay greenfield de “nómina”. Los recibos **son PDFs en Documentos** subidos por admin/RRHH con un **formato de nombre** que identifica al colaborador y al período.

**Convención de archivo (obligatoria):**
```
{dni}_{clave}_{periodo}.pdf
```
Ejemplo: `30111222_dsad_2026-03.pdf` o `30111222_dsad_202603.pdf`.

| Parte | Significado |
|-------|-------------|
| `{dni}` | Documento del colaborador (mismo valor que en perfil/legajo) |
| `{clave}` | Token fijo o tipo (ej. `dsad`, `recibo`) configurable por tenant |
| `{periodo}` | Período de liquidación (`YYYY-MM` o `YYYYMM`) |

**Qué hace el producto (cuando se implemente):**

1. **Admin (A · §17):** sube uno o muchos PDFs (individual o lote) a una categoría/tipo **Recibo de sueldo** (doc sensible). S parsea el nombre → valida patrón → resuelve `User` por DNI en el tenant → asigna visibilidad **solo** a ese usuario (no al feed general de docs).
2. **Usuario (U):** en **Mis documentos** (filtro/sección Recibos) ve listado por período y descarga/abre el PDF. Solo los suyos.
3. **Chatbot (ola 12):** intent `recibo_sueldo` → elige período → **muestra/descarga** el doc matcheado (mismo store §17). Si no hay archivo para ese período → mensaje claro + opción de **consulta RRHH** (el fallback actual).
4. **Reglas:** aislamiento tenant; nunca listar recibos de otro DNI; auditoría de descarga; no exponer en menú/bot hasta que el parser + authz estén operativos; archivo con nombre inválido → rechazo o cola de “sin match” para RRHH.

**Qué NO es:** conector SAP de nómina obligatorio; liquidación de sueldos; módulo aparte fuera de Documentos.

**Criterios DoD:**
- [ ] Upload A con nombre válido crea doc visible solo al usuario del DNI.
- [ ] U lista/descarga solo sus recibos.
- [ ] Chatbot “quiero mi recibo de marzo” abre el PDF correcto o escala a consulta RRHH si falta.
- [ ] Nombre inválido o DNI inexistente no filtra datos ajenos.

### 40.m — Conector PeopleCare / HRIS (detalle)

**Ola origen:** **14** (gap diferido del expediente) · se implementa sobre legajo local + perfil (§3 / §14 / §21); reusa ficha ola **19**.

**Qué hace el producto (cuando se implemente):**
- Capability / toggle por tenant: “HRIS externo” (URL, auth, mapeo de campos).
- Adapter HTTP hacia PeopleCare (u HRIS genérico) con sync de ficha colaborador → `EmployeeLegajo` (y opcional write-back de autoservicio).
- Idempotencia, mapeo miembro↔empleado externo, y fallo del proveedor **no** tumba el legajo local.
- Admin: estado de última sync, errores, dry-run/preview.

**Qué NO es:** no reemplaza el legajo local del MVP; no es el rename `peopleCareEnabled` (**41.B2**); no es la fuente de verdad Perfil·Legajo·Directorio (**41.A2** — coherencia interna sin HRIS).

**Criterio:** con credenciales del cliente, un cambio en el HRIS se refleja en Connectia (o viceversa según política) sin reabrir el cierre de ola 14.

### 40.h — Pregunta API en Relevamientos (detalle)

**Ola origen:** **37** Relevamientos de campo · tipo de pregunta en el diseñador (`FieldForm`), no en Encuestas (ola 5).

**Problema que resuelve:** en una inspección el operador necesita un dato que **ya vive en otro sistema** (ej. “¿el local está activo en el maestro?”, “último ticket abierto”, “cupo del día”) sin salir de la app ni inventar el dato a mano.

**Qué NO es:** no es el centro de comunicaciones de plataforma (ola 28 `28.COM.*`), ni Jira/SAP de solicitudes (ola 4 / `40.c`–`40.f`), ni llamar URLs arbitrarias desde el celular.

**Alcance funcional (cuando se implemente):**

1. **Admin (A):** catálogo de **endpoints allowlist** por tenant (URL https, método, headers/auth en vault, timeout, mapeo de respuesta JSON → valor mostrado).
2. **Diseñador de relevamiento:** pregunta tipo `api` elige un endpoint del catálogo (no pega URL libre); opcional parámetros desde otras respuestas del mismo formulario.
3. **Ejecución (U/S):** al llegar a la pregunta (o al abrir el formulario), **S** llama al endpoint allowlisteado; U muestra el valor / opciones; se persiste en la respuesta del relevamiento.
4. **Seguridad:** solo URLs del catálogo; secretos fuera del cliente; aislamiento por tenant; sin Emp_Id; fallo de red → mensaje claro + reintento (no inventar valor).
5. **Offline:** si no hay red, la pregunta queda pendiente o usa caché de TTL corto según política; no se ejecuta la llamada desde el dispositivo a destinos no allowlisteados.

**Criterios de aceptación (borrador):**

- [ ] Sin ítems en allowlist, el tipo `api` no se puede publicar en un formulario.
- [ ] Un endpoint de otro tenant nunca es invocable.
- [ ] La respuesta del relevamiento guarda valor normalizado + metadata (endpointId, fetchedAt), no el secreto.
- [ ] Timeout / 4xx / 5xx no rompe el resto del formulario.

**Dependencias:** Ola 37 núcleo (diseñador + ejecución) · secretos/config tenant · opcional canales ola 28 si el envío de avisos reusa el outbox `28.COM`.

## Ola 41 — Coherencia funcional entre módulos

> **Estado:** no hecha · **Prioridad:** NECESARIO · **Creada:** 2026-07-30  
> **Base de trabajo (abrir primero):** canvas Cursor  
> [`coherencia-modulos-connectia.canvas.tsx`](file:///C:/Users/lenovo/.cursor/projects/c-Users-lenovo-Documents-SUPERVISoRVIRTUAL/canvases/coherencia-modulos-connectia.canvas.tsx)  
> Ruta absoluta: `C:\Users\lenovo\.cursor\projects\c-Users-lenovo-Documents-SUPERVISoRVIRTUAL\canvases\coherencia-modulos-connectia.canvas.tsx`  
> Al retomar esta ola: abrir el canvas al lado del chat, contrastar con el código actual y marcar ítems cerrados ahí + acá.

### Qué es / qué no es
- **Es** una ola transversal de **deuda de coherencia** entre módulos ya entregados (no un feature nuevo para el miembro).
- **No es** Ola 36 (mejoras referenciadas) ni Ola 40 (deseables diferidos de núcleo): acá el problema es que dos o más módulos **se pisan, se contradicen o dejan huecos** de producto/datos.
- Ya cerrados en pasada 2026-07-30 (no reabrir): C1 pack preserva extras · C2 permisos admin · A5 menú feriados/equipos · M1 DocItem→KB · B1 gaps Ola 27 · STATUS ola 18.
- Cerrado 2026-07-30: **41.M3** (ADR-GAPS §E + D25-2 + [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md) D43-1).

### Ítems pendientes (`41.*`)

| Id | Sev. | Cluster | Problema | Olas / módulos tocados | Cómo abordar |
|----|------|---------|----------|------------------------|--------------|
| **41.A1** | Alta | Aprobaciones | Reservas fuera de la bandeja de workflows | **11** Workflows · **21** Espacios | Enganchar `Reservation` a `TRIGGER_MODULES` / approvals o documentar bandeja dual explícita |
| **41.A2** | Alta | Identidad | Perfil · Legajo · Directorio sin sync | **6/14** Perfil · **14/19** Legajo · **14** Directorio · **16** ABM | Decidir fuente de verdad + reglas write (self-service / RRHH / datos útiles) |
| **41.A3** | Alta | Formularios | Motores gemelos Encuesta / Relevamiento | **5** Encuestas · **37** Relevamientos | Extraer núcleo preguntas/respuestas; **mantener** separación de producto |
| **41.A4** | Alta | Licenciamiento | MODULE_CATALOG = 17 vs ~34+ módulos reales | **35** Licenciamiento + módulos post-35 | Ampliar catálogo/packs o UI de entitlements operativos |
| **41.M2** | Media | Presencia | Tres “estoy aquí” (punch / oficina / facility) | **18** · **21** · **37** · labels **39** | Glosario UX unificado (copy); no mezclar modelos |
| **41.M4** | Media | Comunicación | Chat · Chatbot · Push · Composer en silos | **7** · **10** · **12** · **32** | Inbox / timeline del líder (mejora producto) |
| **41.B2** | Baja | Naming | `peopleCareEnabled` sin conector externo | **14/19** Legajo | Rename/docs: legajo local |

### Criterios DoD (cuando se implemente)
- [ ] Canvas actualizado: solo quedan ítems realmente abiertos (o vacío + ola ✓).
- [ ] Cada `41.*` cerrado tiene decisión de producto documentada (o código) y no reintroduce Emp_Id.
- [ ] Tests backend en verde tras cambios de licencia / workflows / persona / formularios.
- [ ] OLAS fila 41 → ✓ y STATUS refleja la ola.

## Ola 42 — Secrets / env / vault (ops · no desarrollo de producto)

> **Estado:** no hecha · **Prioridad:** NECESARIO · **Creada:** 2026-07-30  
> **Qué es:** checklist de **configuración productiva** (variables de entorno, app registrations, vault por tenant) para integraciones cuyo **código ya está**.  
> **Qué no es:** middleware faltante, features nuevas, ni reabrir olas cerradas (15·16·17·31, etc.). Sin estas vars el producto degrada a mock / 503 / fallback — eso **no** es gap de desarrollo.  
> **Fuente de verdad de nombres:** `connectia/backend/.env.example`.

### Regla
- Al “cerrar” un ítem `42.*`: credenciales cargadas en el entorno target + redirect/consent OK + smoke mínimo del conector.
- Si falta **código** (no solo secretos) → no va acá; va a la ola de producto o a **40**/**28**.

### Checklist (`42.*`)

| Id | Para qué (función) | Ola origen | Variables / secretos |
|----|--------------------|------------|----------------------|
| **42.cal.ms** | Conectar Outlook / calendario personal + sync RSVP | **15** §6 | `MS_CALENDAR_CLIENT_ID` · `MS_CALENDAR_CLIENT_SECRET` · `MS_CALENDAR_REDIRECT_URI` · opcional `MS_CALENDAR_SCOPES` |
| **42.cal.google** | Conectar Google Calendar personal + sync | **15** §6 | `GOOGLE_CALENDAR_CLIENT_ID` · `GOOGLE_CALENDAR_CLIENT_SECRET` · `GOOGLE_CALENDAR_REDIRECT_URI` · opcional `GOOGLE_CALENDAR_SCOPES` |
| **42.cal.enc** | Cifrado de tokens OAuth en Mongo | **15** | `CALENDAR_TOKEN_ENC_KEY` (opcional; si falta se deriva de `JWT_ACCESS_SECRET`) |
| **42.dir.google** | Import / sync usuarios Google Workspace Directory | **16** §27 · **38** | `GOOGLE_WORKSPACE_CLIENT_EMAIL` · `GOOGLE_WORKSPACE_PRIVATE_KEY` · `GOOGLE_WORKSPACE_SUBJECT` · `GOOGLE_WORKSPACE_DOMAIN` · alt. `GOOGLE_WORKSPACE_CREDENTIALS_JSON` |
| **42.dir.entra** | Import / sync usuarios Microsoft Graph (Entra) | **16** §27 · **38** | `ENTRA_TENANT_ID` · `ENTRA_CLIENT_ID` · `ENTRA_CLIENT_SECRET` |
| **42.sso** | Login SSO Microsoft / Google / Okta | **1** | `LOGIN_ENTRA_*` · `LOGIN_GOOGLE_*` · `LOGIN_OKTA_*` (ver `.env.example`) |
| **42.ecr.aus** | Ausentismos ECR **live** (sin mock) | **17** `12.04` | `ECR_AUSENTISMO_API` · `ECR_AUSENTISMO_API_KEY` · opcional `ECR_AUSENTISMO_BEARER` · paths |
| **42.ecr.sup** | Panel supervisores ECR productivo | **31** | `ECR_SUPERVISORS_API` · `ECR_SUPERVISORS_API_KEY` |
| **42.web** | Búsqueda “Desde la web” (media) | Media / admin | `SERPER_API_KEY` · opcional `BRAVE_SEARCH_API_KEY` |
| **42.mail** | Email transaccional (reset, notif) | **1** · notif | `EMAIL_USER` · `EMAIL_PASSWORD` · opcional `EMAIL_FROM` |
| **42.sms** | 2FA SMS | **1** | `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_FROM_NUMBER` |
| **42.push** | Web Push estable (no claves efímeras) | **7** | `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` |
| **42.ai** | LLM / imágenes IA en admin | IA transversal | `OPENAI_API_KEY` · `ANTHROPIC_API_KEY` · modelos |
| **42.sap.docs** | Stub docs SAP live | **5** §17 | `SAP_DOCS_ENABLED` · `SAP_DOCS_BASE_URL` · `SAP_DOCS_API_KEY` |
| **42.vault** | Secretos IdP / integraciones **por tenant** (no solo `.env` global) | **16** postdev | Vault o store por comunidad (hoy JSON/env fallback) |
| **42.openapi** | OpenAPI en CI / portal auth · **sin** Swagger try-it público (`32.10`) | **E0** · ex-ola 30 | Alinear publicación OpenAPI; no exponer try-it en prod |
| **42.docs** | Docs / tutoriales dashboard legado (`32.07`) | ex-ola 30 | Retirar o cablear menú admin huérfano; no publicar stub. Contenido de ayuda al miembro = §26 (ola 13). |

### Notas
- Geopop / GeoVictoria / sync asistencia productivo: desarrollo de adapters → **Ola 24** `NR.ECR` (no reabrir ola 18). Si el bloqueo es **solo** credenciales y ya hay vars en `.env.example` → sumar filas `42.*` acá.
- Jira / PeopleCare / Rendi: cuando el conector exista, sumar fila `42.*` acá; el desarrollo del conector vive en **40** / **33** / etc.
### Criterios DoD
- [ ] Cada integración usada por el cliente target tiene su bloque `42.*` marcado con entorno + smoke.
- [ ] `.env.example` sigue alineado a los nombres reales del código.
- [ ] OLAS filas 15·16·17·31 **no** vuelven a listar “falta env” como gap de producto.
- [ ] OLAS fila 42 → ✓ cuando el deploy target esté cableado (o documentado N/A por integración no vendida).

## Ola 23 — Definiciones (IMPRESCINDIBLE · solo §43)

> **Prioridad:** IMPRESCINDIBLE · **Estado:** no hecha · **Spec:** consolidado §43  
> **IDs inventario:** `43.01` · `43.QA` · `43.SEC` · `43.UX` · `43.ADM` · `43.DOC`  
> **Fuera de esta ola:** portal / catálogo / agentes → **Ola 43** (§42).

### Objetivo
Gate de go-live: controles mínimos de privacidad y cumplimiento para operar y vender a clientes enterprise, sin frenar el uso deskless.

### Requisitos (mínimo)
1. Consentimientos versionados por comunidad (aceptación auditada).
2. Retención documentada por módulo (qué se guarda y cuánto).
3. Export / borrado o anonimización mínimos (titular y egreso).
4. Logs de acceso a datos sensibles auditables y exportables.
5. Baja de usuario → revocación de tokens/sesiones (y chats si aplica).
6. Ningún reporte/insight cruza tenants.

### Criterios DoD
- [ ] Checklist §43 parte del gate de go-live documentado.
- [ ] Admin A: pantallas o flujos mínimos de consentimiento / retención / solicitud de borrado.
- [ ] Logs sensibles consultables por rol autorizado.
- [ ] Tests de aislamiento multi-tenant + revocación al baja.

## Ola 43 — Definiciones (Portal de servicios · §42)

> **Prioridad:** NECESARIO · **Estado:** cerrada (núcleo 2026-07-30) · **Creada:** 2026-07-30 (separada de ola 23)  
> **Spec:** consolidado §42 · [`CONNECTIA-OLA43-SPEC.md`](./CONNECTIA-OLA43-SPEC.md) · **IDs:** `42.01` · `42.02` · `42.QA` · `42.SEC` · `42.UX` · `42.ADM` · `42.DOC`  
> **≠** Ola 42 (secrets/env ops). Los IDs `42.01`… son del módulo portal; `42.cal.*` son checklist ops.  
> **Frontera `41.M3`:** **cerrada** (ADR-GAPS §E + D25-2 + D43-1).

**Objetivo:** Service desk interno: catálogo + portal U + panel de agentes con estados/SLA. Complementa §9 y §20; no los reemplaza.

**Absorbido desde ola 30:** `32.04` gestión de atenciones (legado) → portal §42 (o tipo §9 si el tenant no habilita portal).

### Entrega núcleo + gaps
- Caps `servicios` / `admin.servicios` · menú U/A · modelos `ServiceArea` · `ServiceCatalogItem` · `ServiceRequest` · `ServiceFeedback`.
- API `/api/servicios` + `/api/admin/servicios` · seed · tests.
- Enrutamiento heurístico · CSAT · reportes · audiencia · aprobación §41 · feedback · Jira opcional (`jiraConfig` / env).

### Criterios DoD
- [x] U pide y sigue un servicio; A resuelve con SLA básico.
- [x] Regla de producto documentada vs §9 / §20 — **D43-1**.
- [x] Aislamiento multi-tenant + caps.
- [x] Enrutamiento · CSAT · reportes · audiencia · §41 · feedback · Jira adapter.
- [ ] QA smoke / OpenAPI (`42.QA` · `42.DOC`) — postdev.

## Ola 24 — Definiciones (IMPRESCINDIBLE · paridad por cliente)

> **Prioridad:** <span style="color:#dc2626; font-weight:600">IMPRESCINDIBLE</span> · **Estado:** no hecha · **Spec:** consolidado §0b  
> **Seguimiento tema a tema (fuente de gaps):** [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md)

### Objetivo
Que cada cliente estratégico (Claro/YoClaro, Grido/Gridonet, ECR, EPEC, Emp60) opere en Connectia **con paridad** respecto al legacy — login, menús, pantallas e integraciones — vía pack/capability, **sin** hardcode `Emp_Id`. UAT firmada por cliente = DoD del pack.

> **Absorbido desde §30 / ex-Ola 28 (2026-07-30):** `30.01` ECR Salud · `30.02` GeoVictoria · `30.03`–`30.07` customizaciones ECR/Claro/EPEC/Emp60/Grido. La **Ola 28** queda solo centro de comunicaciones de plataforma (`28.COM.*`).

### Packs
| ID | Cliente | Estado |
|----|---------|--------|
| `NR.CLARO` | Claro / YoClaro | ✗ |
| `NR.GRIDO` | Grido / Gridonet | ✗ |
| `NR.ECR` | ECR + asociadas (incl. sync Geopop / API ECR / GeoVictoria · Salud) | ✗ |
| `NR.EPEC` | EPEC (incl. WTA operativo del pack) | ✗ |
| `NR.EMP60` | Emp 60 (labels) | ✗ |

### Gaps
Todo el desglose funcional, checklists legacy y avance ✗/✓ viven en **[`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md)**. No duplicar filas acá.

### Criterios DoD
- [ ] Cada pack con capability + menú + seed/smoke
- [ ] UAT firmada por owner de negocio (Claro · Grido · ECR como mínimo gate)
- [ ] Cero ramas `Emp_Id === N` en vistas del pack
- [ ] Aislamiento multi-tenant verificado

---

## Siguiente desarrollo

1. **23** Seguridad / privacidad (§43) — <span style="color:#dc2626; font-weight:600">IMPRESCINDIBLE</span> · gate go-live
2. **24** Paridad por cliente (no-regresión) — <span style="color:#dc2626; font-weight:600">IMPRESCINDIBLE</span> · [`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md)
3. Smoke / postdev de **28** Comunicaciones · **35** Licenciamiento modular
4. **39** Textos por comunidad (locale + labels) — multi-país y/o NR Emp60
5. **38** Padrón IdP — según demanda
6. Según demanda: **43** portal servicios · **33** Rendi · **34** Hiryx · **37** Relevamientos
7. **40** Deseables / caprichos (otro MVP) — Jira/SAP=`40.c`–`40.f` · Sammy=`40.n` · resto `40.*`
8. **41** Coherencia entre módulos — retomar con el canvas (**41.M3** cerrado · quedan A1–A4 · M2 · M4 · B2)
9. **42** Secrets / env / vault — cablear prod/staging (calendario, Directory, ECR, SSO, mail, WA, push, IA)