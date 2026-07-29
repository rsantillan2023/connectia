# Connectia (local)

Prototipo de reingeniería ECRMOBILE → **Connectia**.

| Documento | Descripción |
|-----------|-------------|
| [CONNECTIA-BUILD.md](./CONNECTIA-BUILD.md) | Cómo construir y arrancar |
| [CONNECTIA-STATUS.md](./CONNECTIA-STATUS.md) | Tablero de avance (530 puntos) |
| [CONNECTIA-STATUS.csv](./CONNECTIA-STATUS.csv) | Estados editables (Excel) |
| [ECRMOBILE-FUNCIONES-CONSOLIDADO.md](./ECRMOBILE-FUNCIONES-CONSOLIDADO.md) | Spec funcional completa |
| [connectia/](./connectia/) | **Proto** Vue + Node + Mongo |

## Arranque rápido del proto

```powershell
cd connectia
docker compose up -d
cd backend; npm i; npm run seed; npm run dev
# otros terminales:
cd frontend; npm i; npm run dev   # http://localhost:5173
cd admin; npm i; npm run dev      # http://localhost:5174
```

Login demo: **DEMO / demo / Demo1234!** (tenant) · **PLATFORM / sooft / Demo1234!** (admin general / vendedor)

Stack inspirado en Hiryx (`HIRYX-SAAS`) — ese repo **no se modifica**.
