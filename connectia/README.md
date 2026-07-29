# Connectia — prototipo local

> Workspace: `C:\Users\lenovo\Documents\SUPERVISoRVIRTUAL\connectia`  
> Spec: `../ECRMOBILE-FUNCIONES-CONSOLIDADO.md` · Avance: `../CONNECTIA-STATUS.csv` · Guía: `../CONNECTIA-BUILD.md`  
> Stack copiado **en espíritu** de Hiryx (`HIRYX-SAAS`): Vue 3 + Vite + Pinia + Router + Tailwind | Node.js | MongoDB.  
> **Hiryx no se modifica.**

## Arranque rápido

> Levantá vos los procesos en terminal (el agente no inicia servidores).

```powershell
# 1) Mongo
cd C:\Users\lenovo\Documents\SUPERVISoRVIRTUAL\connectia
docker compose up -d

# 2) API
cd backend
copy .env.example .env   # solo la primera vez
npm install              # solo la primera vez
npm run seed
npm run free-port        # si sale EADDRINUSE
npm run dev              # sin --watch (evita procesos huérfanos)
# opcional: npm run dev:watch

# 3) App usuario (U) — otro terminal
cd ..\frontend
npm install              # solo la primera vez
npm run dev

# 4) Admin (A) — otro terminal
cd ..\admin
npm install              # solo la primera vez
npm run dev
```

| App | URL | Credencial demo |
|-----|-----|-----------------|
| API | http://localhost:4000 | `GET /api/health` |
| Usuario (U) | http://localhost:5173 | empresa `DEMO` / usuario `demo` / pass `Demo1234!` |
| Admin tenant (A) | http://localhost:5174 | `DEMO` / `demo` / `Demo1234!` |
| **Admin plataforma (vendedor)** | http://localhost:5174 | **`PLATFORM` / `sooft` / `Demo1234!`** → Suscriptores |

## Mail (reset de contraseña)

Misma config que Hiryx: Gmail + `EMAIL_USER` / `EMAIL_PASSWORD` en `backend/.env` (ya copiada desde el origen si corriste el seed de env).

1. Reiniciá el backend tras tocar `.env`.
2. `npm run seed` — el usuario `demo` toma `SEED_DEMO_EMAIL` o `EMAIL_USER` como casilla real.
3. En login U: «¿Olvidaste la contraseña?» → llega un link a `/reset-password?token=…`.

## Qué incluye este proto (Epic 0 parcial)

- [x] Monorepo local `frontend` + `admin` + `backend`
- [x] Mongo + seed tenant DEMO
- [x] Login JWT (access 15m + refresh)
- [x] Shell U móvil-primero + desktop
- [x] Shell Admin básico
- [x] Menú dinámico stub desde API
- [x] `allowDesktop` respetado
- [ ] Packs Claro/Grido/ECR (después)

## Medir avance

```powershell
python ..\scripts\connectia_progress.py
```
