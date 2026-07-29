# Connectia — Orden de desarrollo (roadmap de olas)

> Cómo construimos: **una ola = un conjunto de puntos del CSV/STATUS**, cerrados con DoD, luego la siguiente.  
> No pedimos “todo el consolidado” a Cursor de una vez.  
> Detalle de requisitos olas 12–30: **`CONNECTIA-STATUS.md`** → sección *Olas 12–30 — especificación de requisitos*.  
> Spec funcional: **`ECRMOBILE-FUNCIONES-CONSOLIDADO.md`**.

## Método

1. Elegir ola.  
2. Implementar puntos (`estado_global → en_curso → desarrollado_y_configurado → cerrado`).  
3. Probar en local (U/A/API).  
4. `python scripts/connectia_progress.py` (si aplica).  
5. Siguiente ola.

## Olas 0–11 (núcleo ya atacado)

| Ola | Qué | Spec / IDs | Estado |
|-----|-----|------------|--------|
| **0** | Fundación stack | `E0.*` | **cerrada** |
| **1** | Acceso / sesión | `01.*` | **cerrada** (núcleo) |
| **+** | Tema / branding | `themeMode` · splash | **cerrada** |
| **2** | Tenant + menú | `02.*` · `28.*` | **cerrada** |
| **3** | Muro | `04.*` | **cerrada** |
| **4** | Solicitudes / consultas | `09.*` | **cerrada** |
| **5** | Encuestas + docs + hub | `15.*` · `17.*` · `46.*` | **cerrada** |
| **6** | Perfil (parcial) | `03.01`–`03.03` | **parcial** |
| **7** | Push / avisos | `07.*` | **cerrada** |
| **8** | Saludos | `05.*` | **parcial** |
| **9** | Comentarios / moderación | `10.*` | **cerrada** |
| **10** | Chat texto | `08.*` | **parcial** |
| **11** | Workflows / aprobaciones | `41.*` | **parcial** |

## Olas 12–30 (backlog completo del consolidado)

| Ola | Qué | Spec | Prioridad | Estado |
|-----|-----|------|-----------|--------|
| **12** | **Chatbot IA + KB + trámites** | §24.01–.03 | **Siguiente** | no hecha |
| **13** | FAQs / tutoriales + Políticas | §26 · §40 | Alta | **cerrada** |
| **14** | Perfil completo + Directorio | §3.04+ · §21 | Alta | no hecha |
| **15** | Eventos y calendario | §6 | Alta | cerrada (núcleo) |
| **16** | ABM usuarios/grupos/áreas | §27 | Alta | no hecha |
| **17** | Licencias / vacaciones / ausentismos | §13 · §12 | Media-alta | no hecha |
| **18** | Asistencia / turnos | §11 | Media | no hecha |
| **19** | PeopleCare + Onboarding | §14 · §16 | Media | **parcial** · núcleo 2026-07-28 · `16.03` reusa §15 |
| **20** | Beneficios / billetera | §18 | Media | cerrada |
| **21** | Reservas + coworking | §34 · §35 | Media | no hecha |
| **22** | Organigrama + Reportes | §37 · §29 | Media | no hecha |
| **23** | Portal servicios + Seguridad | §42 · §43 | Media | no hecha |
| **24** | Packs NR (Claro/Grido/ECR/EPEC/Emp60) | NR.* | Comercial | no hecha |
| **25** | Alarmas / pedidos / supervisor | §19 · §20 · §23 | Bajo demanda | no hecha |
| **26** | Modo TV + Live | §25 · §36 | Bajo demanda | no hecha |
| **27** | Talento + Cultura | §38 · §39 | Bajo demanda | no hecha |
| **28** | Integraciones plataforma | §30 · §31 · §33 | Según cliente | no hecha |
| **29** | IA extendida + QR | §24.04–.07 | Tras 12 | no hecha |
| **30** | Gaps / cierre producto | §32 · diferidos · §45 | Continuo | no hecha |

> Cobertura: **0–30** cubren el catálogo §1–§46 + NR. Transversales §44/§45 aplican en todas.

## Siguiente paso recomendado

**Ola 12** — Chatbot con base de conocimientos e intents de trámites (diálogos MVP del consolidado §24).
