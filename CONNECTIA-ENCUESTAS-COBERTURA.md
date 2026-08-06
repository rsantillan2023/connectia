# Connectia — Encuestas: cobertura vs funciones indispensables

> Actualizado: 2026-08-04  
> Alcance: motor **Encuestas corporativas (Ola 5 / §15)** — clima, NPS, consultas a empleados.  
> **Fuera de este documento:** Relevamientos de campo (Ola 37), onboarding como proceso, entrevistas, CODESAC/pedidos, login externo solo-encuesta (`01.06` descartado).

## Premisa de producto

Hay que separar claramente:

| Rol | Qué hace |
|---|---|
| **Administrador** | Configura la encuesta, audiencia, vigencia, preguntas, publicación, resultados y exportación. |
| **Persona (empleado autenticado)** | Ve la encuesta en la app, responde, puede hacerlo offline; una respuesta por persona. |

No se mezcla con relevamientos de campo, hitos de onboarding (solo *reusan* `surveyId`) ni procesos externos.

---

## Leyenda

| Marca | Significado |
|:---:|---|
| ✅ | **Tenemos** — implementado y usable |
| 🟡 | **Parcial** — existe algo cercano, incompleto o con otro nombre |
| ➕ | **Agregable** — encaja en el producto y conviene sumarlo en el plan 30–40 % |
| ⏭ | **Después** — útil, pero no entra en el primer plan de cobertura |
| 🚫 | **Fuera** — otro módulo, descartado, o no aplica a encuestas corporativas internas |

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Ítems del catálogo completo (1–490) | **490** |
| ✅ Tenemos (aprox.) | **~78** (~16 %) |
| 🟡 Parcial (aprox.) | **~42** (~9 %) |
| Cobertura “efectiva” hoy (✅ + ½🟡) | **~20 %** |
| Meta plan | **30–40 %** efectiva |
| Ítems a sumar en el plan (➕ priorizados) | **~90–110** → cobertura efectiva **~35–40 %** |

### Las 15 imprescindibles de una versión inicial

| # | Función | Estado Connectia |
|---:|---|---|
| 1 | Constructor de encuestas | ✅ Admin + IA |
| 2 | Secciones y páginas | 🟡 Grupos temáticos; sin páginas reales |
| 3 | Texto, selección, escala, fecha y archivos | 🟡 Texto/selección/escala/fecha; **sin archivos** |
| 4 | Preguntas obligatorias | ✅ |
| 5 | Validaciones | 🟡 Por tipo (email/tel/fecha/rating); sin min/max custom |
| 6 | Lógica condicional | 🚫 No existe → ➕ plan |
| 7 | Enlace público y privado | 🟡 Acceso autenticado en app + muro; **sin link público** (descartado a propósito) |
| 8 | Respuesta anónima o identificada | ✅ Flag `anonymous` |
| 9 | Diseño adaptable a celular | ✅ App + preview admin |
| 10 | Guardado parcial | 🟡 Cola offline de envío; **sin “guardar y continuar después”** en servidor |
| 11 | Una o varias respuestas por persona | 🟡 Solo **una** (índice único); varias = ➕ |
| 12 | Envío y recordatorios | 🟡 Mail + push + in-app al publicar / renotify; **sin recordatorios programados** |
| 13 | Seguimiento pendientes / completadas | ✅ Snapshot audiencia + pendientes |
| 14 | Resultados con filtros y gráficos | 🟡 Resultados + filtros + informe IA con gráficos; sin dashboard libre |
| 15 | Exportación Excel, CSV y PDF | 🟡 CSV + JSON + PDF/DOCX (informe); **sin Excel de respuestas** |

---

## A. Configuración general de la encuesta

| # | Función | Estado | Nota |
|---:|---|:---:|---|
| 1 | Crear desde cero | ✅ | Admin CRUD |
| 2 | Crear desde plantilla | 🟡 | Generación con IA; no hay biblioteca de plantillas |
| 3 | Duplicar encuesta | ➕ | Fácil: clonar documento + status draft |
| 4 | Importar preguntas Excel/Word/CSV | ➕ | Hoy solo import de **audiencia** |
| 5 | Nombre interno | ➕ | Solo `titulo` hoy |
| 6 | Título visible | ✅ | `titulo` |
| 7 | Descripción / introducción | ✅ | `descripcion` |
| 8 | Instrucciones generales | ➕ | Campo nuevo o bloque texto |
| 9 | Mensaje de bienvenida | ➕ | |
| 10 | Mensaje al finalizar | ➕ | |
| 11 | Logo e identidad visual | 🟡 | Media portada (imágenes/video); no logo de marca por encuesta |
| 12 | Colores y tipografía | ⏭ | Tema tenant ya existe; branding por encuesta es costoso |
| 13 | Definir idioma | 🟡 | Locale comunidad (ola 39); no por encuesta |
| 14 | Varios idiomas | ⏭ | Alto costo |
| 15 | Fecha de apertura | ✅ | `startsAt` |
| 16 | Fecha de cierre | ✅ | `endsAt` |
| 17 | Zona horaria | ➕ | Default tenant / UTC explícito |
| 18 | Tiempo estimado de respuesta | ➕ | Cálculo simple por # preguntas |
| 19 | Responsable | 🟡 | `authorId` / `authorName` al crear |
| 20 | Categoría | 🟡 | `purpose`: general / onboarding / offboarding |
| 21 | Etiquetas | ➕ | |
| 22 | Guardar borrador | ✅ | `draft` |
| 23 | Publicar | ✅ | + notify audiencia |
| 24 | Pausar | 🟡 | Se puede pasar a `closed` / despublicar |
| 25 | Reabrir | 🟡 | Republicar |
| 26 | Cerrar | ✅ | `closed` |
| 27 | Archivar | ➕ | Status `archived` o soft-flag |
| 28 | Eliminar | ➕ | No hay `DELETE` de encuesta hoy |
| 29 | Versionar | 🟡 | Contador `version++` al editar preguntas; sin historial |
| 30 | Restaurar versión | ⏭ | Requiere historial real |

**Subtotal A:** ✅ ~10 · 🟡 ~9 · ➕ prioritarios ~10

---

## B. Organización de la encuesta

| # | Función | Estado | Nota |
|---:|---|:---:|---|
| 31 | Secciones | 🟡 | `grupo` temático (no página) |
| 32 | Páginas | ➕ | Agrupar preguntas en páginas |
| 33 | Una pregunta por pantalla | ✅ | `questionFlow: one_by_one` |
| 34 | Varias por pantalla | ✅ | `questionFlow: all` |
| 35 | Reordenar drag & drop | ➕ | Hoy se edita orden en array sin DnD UX |
| 36 | Duplicar preguntas | ➕ | |
| 37 | Duplicar secciones | ➕ | |
| 38 | Títulos intermedios | ➕ | Tipo `heading` / bloque |
| 39 | Textos explicativos | ➕ | Tipo `info` |
| 40 | Imágenes o videos informativos | 🟡 | Portada + `imageUrl` por pregunta |
| 41 | Barra de progreso | ✅ | `showProgress` |
| 42 | Número de página | 🟡 | Contador en one_by_one |
| 43 | Porcentaje completado | ✅ | |
| 44 | Avanzar y retroceder | ✅ | En one_by_one |
| 45 | Impedir volver atrás | ➕ | Flag `allowBack: false` |
| 46 | Revisar respuestas antes de enviar | ➕ | Pantalla resumen |
| 47 | Ocultar según respuestas previas | ➕ | = lógica condicional |
| 48 | Bloques repetibles | ⏭ | Complejo; más de relevamiento |

**Subtotal B:** ✅ ~5 · 🟡 ~3 · ➕ prioritarios ~9

---

## C. Tipos de preguntas

### Texto y datos

| # | Función | Estado |
|---:|---|:---:|
| 49 | Texto corto | ✅ |
| 50 | Texto largo | ✅ |
| 51 | Comentario abierto | 🟡 | = textarea |
| 52 | Número entero | 🟡 | `number` genérico |
| 53 | Número decimal | 🟡 | `number` |
| 54 | Porcentaje | ➕ |
| 55 | Importe monetario | ➕ |
| 56 | Email | ✅ |
| 57 | Teléfono | ✅ |
| 58 | URL | ➕ |
| 59 | Documento de identidad | ➕ |
| 60 | Fecha | ✅ |
| 61 | Hora | ✅ |
| 62 | Fecha y hora | ✅ |
| 63 | Rango de fechas | ⏭ |
| 64–68 | Dirección / país / provincia / ciudad / CP | ⏭ |

### Selección

| # | Función | Estado |
|---:|---|:---:|
| 69 | Sí o no | ✅ |
| 70 | Verdadero o falso | 🟡 | = yesno |
| 71 | Selección simple | ✅ |
| 72 | Selección múltiple | ✅ |
| 73 | Lista desplegable | ➕ | UI distinta, mismo modelo |
| 74 | Casillas | 🟡 | = multiple |
| 75 | Botones visuales | ⏭ |
| 76 | Opción “Otro” | ➕ |
| 77 | “No aplica” | ➕ |
| 78 | “Prefiero no responder” | ➕ |
| 79 | Selección jerárquica | ⏭ |
| 80 | Ordenar por preferencia | ⏭ |
| 81–82 | Min/max opciones | ➕ |

### Escalas y valoración

| # | Función | Estado |
|---:|---|:---:|
| 83 | Escala numérica | 🟡 | rating 1–5 |
| 84 | Escala 1 a 5 | ✅ |
| 85 | Escala 1 a 10 | ➕ |
| 86–90 | Likert / satisfacción / acuerdo / frecuencia / importancia | ➕ | Plantillas de opciones sobre `single`/`rating` |
| 91 | Estrellas | 🟡 | rating UI |
| 92 | Emojis | ⏭ |
| 93 | Barra deslizante | ➕ |
| 94 | NPS 0–10 | ➕ | Muy pedido en corporativo |
| 95–98 | Matriz / diferencial / ranking | ⏭ |

### Archivos y multimedia

| # | Función | Estado |
|---:|---|:---:|
| 99 | Carga de archivo | ➕ | Crítico para el “top 15” |
| 100 | Carga de imagen | ➕ |
| 101 | Varias imágenes | ⏭ |
| 102 | Captura foto dispositivo | 🟡 | En Relevamientos (37); no en Survey |
| 103–106 | Video / audio / grabación | 🚫/⏭ | Campo → Ola 37 |
| 107 | Firma manuscrita | ➕ | Útil corporativo (aceptaciones) |
| 108 | Dibujo sobre imagen | 🚫 | Relevamientos |

### Ubicación y códigos

| # | Función | Estado |
|---:|---|:---:|
| 109 | Geolocalización | ✅ | `geopoint` |
| 110 | Punto en mapa | 🟡 | Captura GPS, no mapa interactivo |
| 111–113 | QR / barras / ID | 🚫 | Más campo / acceso |
| 114 | Ubicación automática | 🟡 | Al responder geopoint |
| 115 | Validar lugar determinado | ⏭ | Geofence |

### Preguntas especiales

| # | Función | Estado |
|---:|---|:---:|
| 116–123 | Tabla / lista / calculado / oculto / acción | ⏭ |
| 120 | Dato precargado | ➕ | Desde perfil empleado |
| 121 | Solo lectura | ➕ | |
| 124–127 | Términos / consentimiento / DDJJ / firma obligatoria | ➕ | Bloque consentimiento |

**Subtotal C (plan):** sumar NPS, Likert presets, 1–10, dropdown, Otro/N/A, file/image, firma, URL, %/moneda, consentimiento.

---

## D. Configuración de cada pregunta

| # | Función | Estado |
|---:|---|:---:|
| 128 | Texto | ✅ |
| 129 | Descripción | ➕ |
| 130 | Ejemplo de respuesta | ➕ |
| 131 | Texto de ayuda | ➕ |
| 132 | Obligatoria | ✅ |
| 133–134 | Valor / opción predeterminada | ➕ |
| 135 | Permitir “Otro” | ➕ |
| 136–137 | Explicación / comentario adicional | ➕ |
| 138 | Orden de opciones | 🟡 | Array editable |
| 139 | Opciones aleatorias | ⏭ |
| 140 | Fijar algunas opciones | ⏭ |
| 141 | Imágenes en opciones | ⏭ |
| 142–143 | Puntaje / peso | ➕ | Base de scoring |
| 144 | Categoría pregunta | 🟡 | `grupo` |
| 145–148 | Sensible / visibilidad / edición | ⏭ | Privacidad avanzada |
| 149 | Etiquetas internas | ➕ | |

---

## E. Validaciones de respuesta

| # | Función | Estado |
|---:|---|:---:|
| 150–153 | Min/max caracteres / palabras | ➕ |
| 154–156 | Min/max número / decimales | ➕ |
| 157–158 | Fecha min/max | ➕ |
| 159–160 | Formato email / teléfono | ✅ |
| 161 | Formato documento | ➕ |
| 162 | Regex | ⏭ |
| 163–164 | Min/max opciones | ➕ |
| 165–167 | Archivo: tamaño / tipos / cantidad | ➕ | Con tipo file |
| 168–169 | Resolución / duración media | ⏭ |
| 170 | Confirmación de respuesta | ➕ | |
| 171–172 | Coherencia / fecha posterior | ➕ | Reglas simples |
| 173–174 | Ubicación / sistema externo | ⏭ |
| 175 | Mensaje de error personalizado | ➕ | |

---

## F. Lógica condicional

| # | Función | Estado |
|---:|---|:---:|
| 176–177 | Mostrar/ocultar pregunta | ➕ | **Must-have plan** |
| 178–179 | Mostrar/saltar sección | ➕ | |
| 180 | Ir a pregunta específica | ➕ | |
| 181 | Finalizar anticipadamente | ➕ | |
| 182 | Mensaje distinto según respuesta | ➕ | |
| 183–184 | Redirigir encuesta / web | ⏭ |
| 185–186 | Pedir archivo / explicación según respuesta | ➕ | |
| 187 | Obligatoria según condición | ➕ | |
| 188 | Cambiar opciones según previas | ⏭ | |
| 189–190 | Condiciones Y / O | ➕ | Motor simple |
| 191–195 | Por puntaje / precarga / tipo / fecha / ubicación | ⏭ | |

---

## G. Formas de acceso

| # | Función | Estado |
|---:|---|:---:|
| 196 | Enlace público | 🚫 | `01.06` descartado |
| 197 | Enlace privado | 🟡 | Ruta app autenticada `/encuestas/:id` |
| 198 | Enlace individual | 🟡 | Misma URL + auth |
| 199–201 | Un solo uso / vencimiento / password | ⏭/🚫 | No modelo actual |
| 202–203 | Usuario-pass / SSO corporativo | ✅ | Login Connectia (Ola 1) |
| 204–205 | Código / QR | ⏭ | QR a deep-link app = ➕ liviano |
| 206 | Embebida en web | 🟡 | Embebida en **muro** (`linkedSurveyId`) |
| 207–208 | Dentro de app / portal empleado | ✅ | |
| 209–212 | Chatbot / WhatsApp / email / SMS inicio | 🟡 | Email notifica; WhatsApp/SMS = ⏭ (comms) |
| 213 | Cargada por encuestador | 🚫 | Relevamientos / operadores |
| 214 | Sin conexión | ✅ | Cola offline |

---

## H. Formas de responder

| # | Función | Estado |
|---:|---|:---:|
| 215 | Anónima | ✅ | Identidad oculta en resultados |
| 216 | Nominal | ✅ | Default |
| 217 | Confidencial | 🟡 | Cercano a anónima + caps admin |
| 218 | Autenticada | ✅ | |
| 219–223 | PC / teléfono / tablet / app / navegador | ✅ | Responsive PWA |
| 224 | Offline | ✅ | |
| 225–226 | Asistida / telefónica operador | 🚫 | |
| 227–229 | Voz / imagen / video como canal | ⏭ | |
| 230 | Con firma | ➕ | Tipo firma |
| 231 | Con ubicación | ✅ | geopoint |
| 232–233 | Representante / grupal | 🚫 | |
| 234 | Periódica | ➕ | Recurrencia o republicar |
| 235 | Varias respuestas misma persona | ➕ | Flag `allowMultiple` |
| 236 | Una sola por persona | ✅ | Unique `(surveyId, userId)` |
| 237–238 | Una por dispositivo / entidad | ⏭ | |
| 239–240 | Parcial / continuación posterior | ➕ | Draft server-side |

---

## I. Experiencia al responder

| # | Función | Estado |
|---:|---|:---:|
| 241 | Adaptable a celular | ✅ | |
| 242 | Guardado automático | ➕ | Local + opcional server draft |
| 243–245 | Guardar y continuar / retomar / sesión | ➕ | |
| 246 | Indicación de avance | ✅ | |
| 247 | Tiempo estimado restante | ➕ | |
| 248–249 | Confirmar / editar antes de enviar | ➕ | |
| 250 | Modificar después de enviar | ➕ | Flag admin |
| 251 | Errores claros | ✅ | |
| 252 | Ayuda en pregunta | ➕ | |
| 253–256 | Accesibilidad / contraste / teclado / lector | 🟡 | Base HTML; no auditado |
| 257 | Selección de idioma | ⏭ | |
| 258–260 | Conexión lenta / aviso / sync | 🟡 | Offline queue + flush |

---

## J. Control de respuestas

| # | Función | Estado |
|---:|---|:---:|
| 261 | Una por persona | ✅ | |
| 262–263 | Por email / documento | 🟡 | Via user account |
| 264–265 | Por dispositivo / IP | ⏭ | |
| 266 | Múltiples respuestas | ➕ | |
| 267 | Bloquear duplicadas | ✅ | Unique index |
| 268 | Detectar incompletas | 🟡 | Pendientes de audiencia |
| 269–271 | Rápidas / sospechosas / idénticas | ⏭ | |
| 272–273 | Invalidar / excluir del análisis | ➕ | |
| 274 | Recuperar eliminadas | ⏭ | |
| 275–276 | Editar con permiso + auditoría | ➕ | |
| 277 | Registrar fecha/hora | ✅ | `submittedAt` |
| 278–279 | Canal / dispositivo | ➕ | Metadata al submit |
| 280 | Ubicación | 🟡 | Solo si pregunta geopoint |
| 281 | Versión encuesta | ✅ | `surveyVersion` |

---

## K. Envío y distribución

| # | Función | Estado |
|---:|---|:---:|
| 282 | Email | ✅ | Al publicar |
| 283 | SMS | ⏭ | Centro comunicaciones |
| 284 | WhatsApp | ⏭ | |
| 285 | Push | ✅ | |
| 286 | Compartir enlace | 🟡 | Deep link app |
| 287 | Generar QR | ➕ | QR → deep link |
| 288–289 | Intranet / web | 🟡 | Muro |
| 290 | Integrar en app | ✅ | |
| 291 | Importar destinatarios | ✅ | Excel/CSV audiencia |
| 292–293 | Grupos / segmentar | ✅ | Áreas, grupos, users |
| 294–296 | Personalizar mensaje / asunto / nombre | 🟡 | Template fijo con nombre |
| 297 | Programar envío | ➕ | `startsAt` + job notify |
| 298 | Envíos masivos | ✅ | Batch notify |
| 299–300 | Reintentos / bounces | ⏭ | |
| 301 | Excluir quien ya respondió | 🟡 | Renotify puede filtrarse |
| 302–306 | Recordatorios + frecuencia + stop | ➕ | **Alto impacto** |

---

## L. Estados de participación

| # | Función | Estado |
|---:|---|:---:|
| 307–309 | Invitado / enviado / entregado | 🟡 | Snapshot invited + notify |
| 310 | Rechazado servidor | ⏭ | |
| 311–314 | Abierto / iniciado / parcial / completado | 🟡 | Completado sí; parcial/iniciado ➕ |
| 315–320 | Vencido / abandonado / excluido / anulado / pendiente / reabierto | 🟡 | Pendiente + vencimiento por `endsAt` |

---

## M–O. Resultados, filtros, gráficos y reportes

| # | Función | Estado |
|---:|---|:---:|
| 321–323 | Individuales / agregados / cantidad | ✅ | |
| 324–327 | Tasas respuesta / finalización / abandono / tiempo | 🟡 | Participación temporal; sin tiempo promedio real |
| 328–333 | Por pregunta / % / promedios / distribución / abiertas | ✅ | |
| 334–336 | Buscar / filtrar / ordenar | 🟡 | Filtros segmento área/grupo |
| 337–340 | Comparar segmentos / períodos / encuestas / versiones | 🟡 | Segmentos; resto ➕/⏭ |
| 341–359 | Filtros (fecha, área, puesto, canal…) | 🟡 | Subconjunto (área/grupo/persona) |
| 360–372 | Gráficos / tendencias / cruces | 🟡 | En informe IA (barras etc.) |
| 373 | Dashboard configurable | ⏭ | |
| 374–378 | Reportes | 🟡 | Informe IA |
| 379 | Excel | ➕ | Falta xlsx de respuestas |
| 380 | CSV | ✅ | |
| 381 | PDF | ✅ | Informe |
| 382 | Word | ✅ | DOCX informe |
| 383 | PowerPoint | ⏭ | |
| 384 | JSON | ✅ | |
| 385 | Envío automático reportes | ⏭ | |

---

## P. Puntuación y evaluación

| # | Función | Estado |
|---:|---|:---:|
| 386–390 | Puntaje / pesos / total / por categoría | ➕ | Paquete scoring MVP |
| 391–395 | Mínimo / clasificar / semáforo / críticas / alertas | ➕ | Alertas simples |
| 396–397 | Mostrar/ocultar resultado al encuestado | ➕ | |
| 398–400 | Certificado / auto aprobar / revisión | ⏭ | |

---

## Q–R. Privacidad, seguridad y auditoría

| # | Función | Estado |
|---:|---|:---:|
| 401–404 | Consentimiento + registro versión | ➕ | |
| 405–409 | Retiro / anonimizar / seudonimizar | 🟡/⏭ | Anónima básica sí |
| 410–412 | Quién ve PII / abiertas / k-anonimato | ⏭ | Caps admin.encuestas |
| 413–416 | Conservación / borrado / download / erasure | ⏭ | Ola seguridad |
| 417–422 | Usuarios / roles / caps | ✅ | `admin.encuestas` + reportes |
| 423–428 | Auditoría detallada | 🟡 | Timestamps; sin audit log dedicado |
| 429–435 | Cifrado / backup / captcha / bots | 🟡/⏭ | Plataforma general |

---

## S. Integraciones

| # | Función | Estado |
|---:|---|:---:|
| 436–439 | API CRUD / respond / query | ✅ | REST interno autenticado |
| 440 | Webhooks al completar | ➕ | |
| 441–443 | CRM / RRHH / ERP | ⏭ | |
| 444–446 | Email / WhatsApp / SMS | 🟡 | Email sí |
| 447 | BI | ⏭ | Export JSON/CSV |
| 448 | Auth corporativa | ✅ | SSO Ola 1 |
| 449–450 | Sistemas propios / export DB | ⏭ | |

---

## T. Casuísticas que no pueden faltar

| # | Casuística | Estado |
|---:|---|:---:|
| 451 | Pública sin ID | 🚫 |
| 452 | Privada acceso individual | ✅ | Auth + audiencia |
| 453 | Anónima controlando quién respondió | ✅ | Unique user + hide PII |
| 454 | Una sola vez | ✅ | |
| 455 | Varias veces | ➕ | |
| 456 | Periódica | ➕ | |
| 457–458 | Con/sin vencimiento | ✅ | `endsAt` null = abierta |
| 459 | Una pregunta | ✅ | |
| 460 | Larga por secciones | 🟡 | Grupos |
| 461 | Condicionales | ➕ | |
| 462–463 | Archivo / fotos | ➕ | |
| 464 | Firma | ➕ | |
| 465 | Geolocalización | ✅ | |
| 466 | Offline | ✅ | |
| 467 | Desde QR | ➕ | |
| 468 | WhatsApp | ⏭ | |
| 469 | Email | ✅ | |
| 470 | Embebida web | 🟡 | Muro |
| 471 | Operador | 🚫 | |
| 472 | Precargadas | ➕ | |
| 473 | Guardar y retomar | ➕ | |
| 474 | No volver atrás | ➕ | |
| 475 | Editar post-envío | ➕ | |
| 476 | Genera puntaje | ➕ | |
| 477 | Genera alerta | ➕ | |
| 478 | Finaliza según respuesta | ➕ | |
| 479 | Varios idiomas | ⏭ | |
| 480 | Versiones | 🟡 | |
| 481–484 | Asociada persona/cliente/sucursal/orden | 🟡 | Persona vía user; resto ⏭ |
| 485–487 | Resultados públicos / privados / solo agregados | 🟡 | Admin privado + anónima |
| 488 | Preguntas sensibles | ⏭ | |
| 489 | Requiere consentimiento | ➕ | |
| 490 | Mala conexión | ✅ | |

---

## Lo que tenemos hoy (foto corta)

### Admin
- Constructor visual + generación IA del cuestionario completo o por tipologías.
- Estados: borrador / publicada / cerrada.
- Agenda `startsAt` / `endsAt`, propósito, anónimo, flujo all vs one-by-one, progreso.
- Audiencia: todos / áreas+grupos / personas; import Excel/CSV de destinatarios.
- Media de portada (imágenes + video) e imagen por pregunta.
- Tipos: text, textarea, number, yesno, single, multiple, rating 1–5, date, time, datetime, email, phone, geopoint.
- Obligatoriedad + validación por tipo.
- Publicación con email + push + in-app; renotify.
- Resultados: individuales, agregados, por grupo de preguntas, filtros de segmento.
- Export CSV/JSON; informe IA PDF/DOCX con gráficos.
- Preview móvil en admin.
- Caps `admin.encuestas`.

### Persona (app)
- Lista pendientes / respondidas; banner pendientes.
- Respuesta responsive; progreso; offline queue + sync.
- Una respuesta por usuario; lectura de lo enviado.
- Embebida desde muro; usable en onboarding (mismo motor).

### No es este producto
- Relevamientos, fotos de evidencia de campo, rutas, operadores → **Ola 37**.
- Link público sin login → **descartado**.
- WhatsApp/SMS masivo → centro de comunicaciones (otra ola).

---

## Plan para llegar al 30–40 % de cobertura

Meta: pasar de **~20 % efectiva** a **~35–40 %** sumando ~**95 ítems** de alto valor, en **4 oleadas internas** del módulo Encuestas (sin tocar Relevamientos).

### Oleada E1 — Cimientos del constructor (cubre ~8–10 % adicional)

**Objetivo:** admin más productivo y tipologías que cierran el “top 15”.

| Entrega | Ítems que cubre | Esfuerzo |
|---|---|:---:|
| Duplicar encuesta + eliminar (soft) + archivar | 3, 27, 28 | S |
| Duplicar pregunta + DnD reorder | 35, 36 | S |
| Nombre interno vs título; instrucciones; welcome/thanks | 5, 8, 9, 10 | S |
| Descripción/ayuda/ejemplo por pregunta | 129–131, 252 | S |
| Tipos: NPS 0–10, rating 1–10, dropdown, Likert presets | 73, 85–90, 94 | M |
| Opción Otro / N/A / Prefiero no responder + min/max opciones | 76–78, 81–82, 163–164 | S |
| Validaciones min/max texto y número + error custom | 150–156, 175 | M |
| Tipo file + image (upload) + límites | 99, 100, 165–167, 462, 463 | M |
| Export respuestas **Excel (xlsx)** | 379 | S |
| Tiempo estimado mostrado | 18, 247 | S |

**Criterio done E1:** constructor cubre texto/selección/escala/fecha/**archivo**; export Excel; duplicar encuesta.

### Oleada E2 — Lógica, flujo y guardado parcial (cubre ~7–8 % adicional)

**Objetivo:** encuesta “inteligente” y retomable.

| Entrega | Ítems que cubre | Esfuerzo |
|---|---|:---:|
| Motor show/hide pregunta + sección; finish early | 47, 176–181, 187, 461, 478 | L |
| Condiciones AND/OR simples (1 nivel) | 189–190 | M |
| Pedir explicación/archivo según respuesta | 185–186 | S |
| Páginas reales (+ títulos/textos info) | 32, 38, 39 | M |
| Impedir volver atrás + pantalla revisar | 45, 46, 248–249 | S |
| Draft servidor: auto-save + retomar + estados iniciado/parcial | 239–245, 311–313, 473 | L |
| Flag no-back / allow edit after submit | 250, 474, 475 | S |

**Criterio done E2:** encuesta condicional usable en admin+app; “guardar y continuar después”.

### Oleada E3 — Distribución y seguimiento (cubre ~5–6 % adicional)

**Objetivo:** cerrar envío/recordatorios del top 15.

| Entrega | Ítems que cubre | Esfuerzo |
|---|---|:---:|
| Recordatorios programados (N veces, frecuencia) | 302–306 | M |
| Excluir quienes ya respondieron en renotify | 301 | S |
| Programar primer envío con `startsAt` | 297 | S |
| QR → deep link app | 205, 287, 467 | S |
| Metadata canal/dispositivo en respuesta | 278–279 | S |
| Permitir múltiples respuestas (flag) + periódica simple | 235, 266, 455, 456 | M |
| Estados de participación más claros en UI admin | 307–309, 314–316, 319 | M |
| Marcar inválida / excluir del análisis | 272–273 | S |

**Criterio done E3:** admin programa recordatorios; ve invitados/pendientes/completados/vencidos con claridad.

### Oleada E4 — Consentimiento, score y resultados (cubre ~5–6 % adicional)

**Objetivo:** casos corporativos de clima/NPS/compliance liviano.

| Entrega | Ítems que cubre | Esfuerzo |
|---|---|:---:|
| Bloque consentimiento / términos + registro | 124–126, 401–404, 489 | M |
| Tipo firma | 107, 127, 230, 464 | M |
| Scoring: puntos por opción, total, por grupo, semáforo | 142–143, 386–393, 476 | L |
| Alertas por respuesta crítica | 394–395, 477 | M |
| Mostrar/ocultar score al encuestado | 396–397 | S |
| Filtros resultados: fecha + respuesta específica + puntaje | 341, 355–356 | M |
| Comparar períodos / versiones (básico) | 338, 340 | M |
| Webhook al completar | 440 | S |
| Precarga desde perfil (solo lectura) | 120–121, 472 | S |
| Zona horaria + etiquetas encuesta | 17, 21 | S |

**Criterio done E4:** NPS con score+alerta; encuesta con consentimiento y firma; export/filtros reforzados.

---

## Cobertura proyectada tras el plan

| Momento | ✅ plenos (aprox.) | 🟡 | Cobertura efectiva* | % catálogo 490 |
|---|---:|---:|---:|---:|
| Hoy | 78 | 42 | ~99 | **~20 %** |
| Post E1 | 110 | 35 | ~128 | **~26 %** |
| Post E2 | 135 | 30 | ~150 | **~31 %** |
| Post E3 | 155 | 28 | ~169 | **~34 %** |
| Post E4 | 175 | 25 | ~188 | **~38 %** |

\*efectiva ≈ ✅ + 0,5×🟡

Con **E1–E4** se alcanza la banda **30–40 %** del catálogo completo, cubriendo **las 15 imprescindibles** salvo enlace público (consciente) y multi-idioma.

---

## Qué queda fuera del plan 30–40 % (consciente)

No priorizar ahora (⏭ / 🚫):

- Enlace público anónimo sin login.
- Multi-idioma por encuesta.
- Matrices, ranking, diferencial semántico, bloques repetibles.
- WhatsApp/SMS como canal nativo de encuesta.
- Video/audio/grabación, dibujo, geofence estricto.
- Dashboard BI configurable, PowerPoint, webhooks masivos a ERP/CRM.
- Versionado con restore completo, anti-fraude avanzado, k-anonimato.
- Todo lo de **Relevamientos (Ola 37)** y **operador de campo**.

Esos ítems empujan hacia 50–70 % y son otro MVP (o producto distinto).

---

## Orden de implementación recomendado

```text
E1 Constructor + tipos + archivos + Excel     →  ~2–3 sprints
E2 Lógica + páginas + draft/retomar          →  ~2–3 sprints
E3 Recordatorios + estados + multi-respuesta →  ~1–2 sprints
E4 Consentimiento + score + alertas          →  ~2 sprints
────────────────────────────────────────────
Total orientativo                             ~7–10 sprints
```

### Dependencias técnicas internas

1. Extender schema `Survey.questions[]` (help, validations, score, visibleIf, pageId).
2. Nuevo `SurveyResponse` status: `draft | submitted` (rompe unique actual solo si `allowMultiple` o drafts).
3. Job/cron de recordatorios (reusar `notifySurvey`).
4. Upload reutilizar pipeline `uploadsSurveysAdmin` + límites.
5. Tests obligatorios en `connectia/backend` por cada oleada (`npm test`).

---

## Checklist de aceptación del plan (30–40 %)

- [ ] Las 15 imprescindibles en ✅ o 🟡 justificado (link público = 🚫 documentado).
- [ ] Admin configura sin tocar código: tipos núcleo + archivos + condicionales + recordatorios.
- [ ] Persona responde en celular, retoma, offline, ve progreso.
- [ ] Una o varias respuestas configurable.
- [ ] Resultados filtrables + CSV/Excel/PDF.
- [ ] Consentimiento + NPS/score disponibles.
- [ ] Documento de producto actualizado: este archivo + STATUS ola 5.

---

## Referencias de código

| Pieza | Ruta |
|---|---|
| Modelo | `connectia/backend/src/models/Survey.js` |
| Respuestas | `connectia/backend/src/models/SurveyResponse.js` |
| Tipos / validación | `connectia/backend/src/lib/surveyQuestions.js` |
| Analytics / export | `connectia/backend/src/lib/surveyAnalytics.js` |
| Admin API | `connectia/backend/src/routes/surveysAdmin.js` |
| App API | `connectia/backend/src/routes/surveys.js` |
| Admin UI | `connectia/admin/src/views/EncuestasAdminView.vue` |
| App UI | `connectia/frontend/src/views/EncuestaDetailView.vue` |
| Offline | `connectia/frontend/src/composables/useSurveyOfflineQueue.js` |
| Notify | `connectia/backend/src/services/notifySurvey.js` |
| Spec ola | `CONNECTIA-STATUS.md` §15 / Ola 5 |
