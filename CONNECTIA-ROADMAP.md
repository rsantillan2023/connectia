# Connectia — Orden de desarrollo (roadmap de olas)

> Cómo construimos: **una ola = un conjunto de puntos del CSV/STATUS**, cerrados con DoD, luego la siguiente.  
> Tablero corto: **`CONNECTIA-OLAS.md`**.  
> Detalle de requisitos: **`CONNECTIA-STATUS.md`** → sección *Olas 12–37 — especificación de requisitos*.  
> Spec funcional: **`ECRMOBILE-FUNCIONES-CONSOLIDADO.md`**.  
> Producto hermano Rendi (DocuFlow): `C:\Users\lenovo\Documents\docuflow` · inventario `FUNCIONES-RENDI.md`.  
> Producto hermano Hiryx (ATS): `C:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas` · puente de ingreso = Ola 34.

## Método

1. Elegir ola.  
2. Implementar puntos (`estado_global → en_curso → desarrollado_y_configurado → cerrado`).  
3. Probar en local (U/A/API).  
4. `python scripts/connectia_progress.py` (si aplica).  
5. Siguiente ola.

## Olas 0–11 (núcleo)

| Ola | Qué | Spec / IDs | Estado |
|-----|-----|------------|--------|
| **0** | Fundación stack | `E0.*` | **cerrada** |
| **1** | Acceso / sesión | `01.*` | **cerrada** |
| **+** | Tema / branding | `themeMode` · splash | **cerrada** |
| **2** | Tenant + menú | `02.*` · `28.*` | **cerrada** |
| **3** | Muro | `04.*` | **cerrada** |
| **4** | Solicitudes / consultas | `09.*` | **cerrada** |
| **5** | Encuestas + docs + hub | `15.*` · `17.*` · `46.*` | **cerrada** |
| **6** | Perfil | `03.*` | **cerrada** |
| **7** | Push / avisos | `07.*` | **cerrada** |
| **8** | Saludos | `05.*` | **cerrada** |
| **9** | Comentarios / moderación | `10.*` | **cerrada** |
| **10** | Chat texto | `08.*` | **cerrada** (voz/video/IA → **Ola 40** `40.i`–`40.k`) |
| **11** | Workflows / aprobaciones | `41.*` | **cerrada** |

## Olas 12–32 (consolidado restante)

| Ola | Qué | Spec | Prioridad | Estado |
|-----|-----|------|-----------|--------|
| **12** | Chatbot IA + KB + trámites | §24.01–.03 | Hecha | **cerrada** (recibos → **Ola 40** `40.l`) |
| **13** | FAQs / tutoriales + Políticas | §26 · §40 | Alta | **cerrada** |
| **14** | Perfil completo + Directorio | §3 · §21 | Alta | **cerrada** |
| **15** | Eventos y calendario | §6 | Alta | **cerrada** |
| **16** | ABM usuarios/grupos/áreas | §27 | Alta | **cerrada** |
| **17** | Licencias / vacaciones / ausentismos | §13 · §12 | Media-alta | **cerrada** |
| **18** | Asistencia / turnos | §11 | Cerrada | cerrada |
| **19** | PeopleCare + Onboarding | §14 · §16 | Media | **cerrada** |
| **20** | Beneficios / billetera | §18 | Media | **cerrada** |
| **21** | Reservas + coworking | §34 · §35 | Media | **cerrada** |
| **22** | Organigrama + Reportes | §37 · §29 | Media | cerrada |
| **23** | Seguridad / privacidad (gate) | §43 | **IMPRESCINDIBLE** | no hecha |
| **24** | Paridad por cliente (no-regresión) | NR.* · `CONNECTIA-OLA24-NR.md` | **IMPRESCINDIBLE** | no hecha |
| **25** | Pedidos + canal alarma + mapa | §19 · §20 · `CONNECTIA-OLA25-SPEC.md` | Bajo demanda | **cerrada** (2026-07-30) |
| **26** | Modo TV + Live | §25 · §36 | Bajo demanda | no hecha |
| **27** | Talento + Cultura | §38 · §39 | Bajo demanda | cerrada (2026-07-29) |
| **28** | Centro de comunicaciones | `28.COM.*` · testigo Hiryx | **IMPRESCINDIBLE** | **cerrada** (2026-07-30) |
| **29** | Chat conversacional asistente | `29.CONV` | **IMPRESCINDIBLE** | **cerrada** (2026-07-30) |
| **30** | Modernización UX residual | §45 · Fases 0–4 (Admin Hiryx → primitivas → companion → `*.UX`) | Continuo | parcial |
| **31** | Supervisión comercial (testigo) | §23 | Vertical | no hecha |
| **32** | Supervisor Virtual de equipo | `23.SV.*` | Producto | no hecha |
| **33** | Integración Rendi / DocuFlow (viáticos) | `33.RENDI.*` | Especial / integración | no hecha |
| **34** | Puente Hiryx → Connectia (ingreso) | `34.HIRYX.*` | Especial / integración | no hecha |
| **35** | Licenciamiento modular (PLATFORM) | entitlements / packs | Comercial | **cerrada** (2026-07-30) |
| **36** | Mejoras referenciadas (backlog) | a–n + 36.p · idioma → **39** | Continuo | **cerrada** (2026-07-30 · +36.p) |
| **37** | Relevamientos de campo (add-on) | `37.REL.*` | Add-on ECR/campo · ≠ ola 5 | **cerrada** (2026-07-30) |
| **38** | Padrón IdP (miembros) | `38.PAD.*` | UX unificada · filtro grupo | no hecha |
| **39** | Textos por comunidad (locale + labels) | `39.LOC.*` | Multi-país · Emp60 · stub uiLocale/modismos · ex-40 | **parcial** |
| **40** | Deseables / caprichos (otro MVP) | `40.a`–`40.r` · `40.n` DESEABLE · `40.o`–`40.r` CAPRICHO | Otro MVP · bajo Sammy | no hecha |
| **41** | Coherencia entre módulos | `41.A1`–`41.B2` · canvas coherencia | Deuda fronteras/sync entre módulos | no hecha |
| **42** | Secrets / env / vault (ops) | `42.cal.*` · `.env.example` | Config productiva de integraciones ya hechas | no hecha |
| **43** | Portal de servicios | §42 · [`OLA43-SPEC`](./CONNECTIA-OLA43-SPEC.md) | NECESARIO · `41.M3` ✓ | en desarrollo |

> Cobertura: **0–32** = catálogo §1–§46 + NR · **33–34** = especiales (Rendi, Hiryx) · **37** = Relevamientos · **38–39** = padrón IdP + textos · **40** = deseables otro MVP · **41** = coherencia · **42** = secrets/env ops · **43** = portal servicios. Transversales §44/§45 en todas.

## Siguiente paso recomendado

**IMPRESCINDIBLE:** **23** seguridad §43 · **24** paridad por cliente ([`CONNECTIA-OLA24-NR.md`](./CONNECTIA-OLA24-NR.md)) · **29** `29.CONV` (cerrada).  
Según demanda: **43** portal servicios · **33** Rendi · **34** Hiryx · **37** Relevamientos · **39** textos/labels · **41** coherencia · **42** secrets/env.  
**Ola 35** (licenciamiento modular) cerrada 2026-07-30.  
Especiales bajo demanda: **Ola 33** Rendi · **Ola 34** Hiryx · **Ola 37** Relevamientos (campo/ECR; distinto de Encuestas).
