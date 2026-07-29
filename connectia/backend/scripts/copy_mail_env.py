# -*- coding: utf-8 -*-
from pathlib import Path

hiryx = Path(r"c:\Users\lenovo\Documents\HIRYX-SAAS\aitalent-saas\backend\.env")
cx = Path(r"c:\Users\lenovo\Documents\SUPERVISoRVIRTUAL\connectia\backend\.env")

h = {}
for line in hiryx.read_text(encoding="utf-8", errors="ignore").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    h[k.strip()] = v.strip().strip('"').strip("'")

adds = {
    "EMAIL_USER": h.get("EMAIL_USER", ""),
    "EMAIL_PASSWORD": h.get("EMAIL_PASSWORD", ""),
    "FRONTEND_URL": "http://localhost:5173",
    "PASSWORD_RESET_EXPIRY_MINUTES": "60",
    "BRAND_NAME": "Connectia",
}

text = cx.read_text(encoding="utf-8") if cx.exists() else ""
out = []
remaining = dict(adds)
for line in text.splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0].strip()
        if k in remaining:
            out.append(f"{k}={remaining.pop(k)}")
            continue
    out.append(line)
for k, v in remaining.items():
    out.append(f"{k}={v}")

cx.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
print("EMAIL_USER set:", bool(adds["EMAIL_USER"]))
print("EMAIL_PASSWORD set:", bool(adds["EMAIL_PASSWORD"]))
print("FRONTEND_URL set: True")
