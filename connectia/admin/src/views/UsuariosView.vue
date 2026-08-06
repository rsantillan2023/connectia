<template>
  <div>
    <AdminPageHeader title="Usuarios" subtitle="Personas que pueden entrar a esta comunidad.">
      <template #actions>
        <button class="btn-ghost" @click="exportCsv">Exportar</button>
        <button class="btn-ghost" @click="openImport">Importar</button>
        <button class="btn-ghost inline-flex items-center gap-2" @click="openDirectory">
          Google / Entra
        </button>
        <button
          type="button"
          class="info-btn"
          aria-label="Cómo cargar miembros desde Google o Azure"
          title="Cómo cargar miembros"
          @click="openMembersHelp"
        >
          i
        </button>
        <button class="btn-primary" @click="openNew">+ Usuario</button>
      </template>
    </AdminPageHeader>
    <ScreenHelp
      purpose="Administrá las cuentas de miembros y gestores de este tenant: quién puede ingresar a la app o al admin."
      can-do="Buscar, crear y editar usuarios (incl. fechas de nacimiento/ingreso e hitos custom para saludos). Como admin del tenant podés otorgar acceso a pantallas concretas del admin sin darles rol admin completo."
    />

    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <input
        v-model="q"
        class="border rounded-lg px-3 py-2 text-sm min-w-[220px] flex-1"
        placeholder="Buscar usuario, nombre, email, legajo, DNI…"
        @input="onSearchInput"
        @keyup.enter="searchNow"
      />
      <select v-model="activo" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="searchNow">
        <option v-for="f in activoFilters" :key="String(f.value)" :value="f.value">{{ f.label }}</option>
      </select>
      <select v-model="role" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="searchNow">
        <option v-for="f in roleFilters" :key="String(f.value)" :value="f.value">{{ f.label }}</option>
      </select>
      <select v-model="areaFilter" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="searchNow">
        <option value="">Área: todas</option>
        <option v-for="a in orgAreas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
      </select>
      <select v-model="pageSize" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="searchNow">
        <option :value="10">10 / pág</option>
        <option :value="20">20 / pág</option>
        <option :value="50">50 / pág</option>
      </select>

      <div class="view-toggle ml-auto" role="group" aria-label="Vista">
        <button
          type="button"
          class="view-btn"
          :class="{ on: viewMode === 'cards' }"
          title="Vista cards"
          :aria-pressed="viewMode === 'cards'"
          @click="setViewMode('cards')"
        >
          Cards
        </button>
        <button
          type="button"
          class="view-btn"
          :class="{ on: viewMode === 'table' }"
          title="Vista grilla"
          :aria-pressed="viewMode === 'table'"
          @click="setViewMode('table')"
        >
          Grilla
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>
    <p class="mt-2 text-xs text-slate-500">
      {{ total }} resultado{{ total === 1 ? '' : 's' }}
      <span v-if="total">· pág. {{ page }} / {{ pages }}</span>
    </p>

    <!-- Cards -->
    <ul v-if="viewMode === 'cards' && items.length" class="user-cards mt-4">
      <li v-for="u in items" :key="u.id" class="user-card" :class="{ off: !u.activo }">
        <div class="user-card-top">
          <div class="user-avatar" aria-hidden="true">
            <img v-if="avatarSrc(u)" :src="avatarSrc(u)" alt="" />
            <span v-else>{{ initials(u) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="user-card-name">{{ fullName(u) }}</p>
            <p class="user-card-meta">@{{ u.usuario }} · {{ u.email || 'sin email' }}</p>
          </div>
          <span class="badge" :data-on="u.activo ? '1' : '0'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
        </div>
        <p class="user-card-line">{{ orgLabel(u) }}</p>
        <p v-if="datesLabel(u)" class="user-card-line text-slate-500">{{ datesLabel(u) }}</p>
        <p class="user-card-line">
          <span v-if="u.esEmpleado" class="text-teal-800 font-medium">Empleado</span>
          <span v-else class="text-slate-400">Solo miembro</span>
          <span class="text-slate-400"> · </span>
          <span v-if="(u.roles || []).includes('admin')" class="text-teal-800 font-medium">Admin</span>
          <span v-else-if="screenLabels(u).length">{{ screenLabels(u).join(', ') }}</span>
          <span v-else class="text-slate-400">Sin pantallas admin</span>
          <span class="text-slate-400"> · {{ u.origen }}</span>
        </p>
        <div class="user-card-actions">
          <button type="button" class="text-teal-700" @click="edit(u)">Editar</button>
          <button type="button" class="text-slate-600" @click="openInspect(u)">Cuenta</button>
          <button v-if="u.activo" type="button" class="text-amber-700" @click="deactivate(u)">Desactivar</button>
          <button v-else type="button" class="text-teal-700" @click="activate(u)">Activar</button>
        </div>
      </li>
    </ul>

    <!-- Grilla -->
    <div v-else-if="viewMode === 'table'" class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">
              <button type="button" class="th-sort" @click="toggleSort('usuario')">
                Usuario {{ sortMark('usuario') }}
              </button>
            </th>
            <th class="p-3">
              <button type="button" class="th-sort" @click="toggleSort('nombre')">
                Nombre {{ sortMark('nombre') }}
              </button>
            </th>
            <th class="p-3">
              <button type="button" class="th-sort" @click="toggleSort('email')">
                Email {{ sortMark('email') }}
              </button>
            </th>
            <th class="p-3">
              <button type="button" class="th-sort" @click="toggleSort('idExterno')">
                ID / legajo {{ sortMark('idExterno') }}
              </button>
            </th>
            <th class="p-3">Empleado</th>
            <th class="p-3">Área / grupos</th>
            <th class="p-3">Fechas / hitos</th>
            <th class="p-3">Acceso admin</th>
            <th class="p-3">
              <button type="button" class="th-sort" @click="toggleSort('activo')">
                Estado {{ sortMark('activo') }}
              </button>
            </th>
            <th class="p-3">
              <button type="button" class="th-sort" @click="toggleSort('origen')">
                Origen {{ sortMark('origen') }}
              </button>
            </th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id" class="border-t">
            <td class="p-3">
              <div class="user-cell">
                <div class="user-avatar sm" aria-hidden="true">
                  <img v-if="avatarSrc(u)" :src="avatarSrc(u)" alt="" />
                  <span v-else>{{ initials(u) }}</span>
                </div>
                <span class="font-mono text-xs">{{ u.usuario }}</span>
              </div>
            </td>
            <td class="p-3">{{ fullName(u) }}</td>
            <td class="p-3">{{ u.email || '—' }}</td>
            <td class="p-3 font-mono text-xs">{{ u.idExterno || '—' }}</td>
            <td class="p-3 text-xs">
              <span v-if="u.esEmpleado" class="text-teal-800 font-medium">Sí</span>
              <span v-else class="text-slate-400">No</span>
            </td>
            <td class="p-3 text-xs text-slate-600">{{ orgLabel(u) }}</td>
            <td class="p-3 text-xs text-slate-600">{{ datesLabel(u) || '—' }}</td>
            <td class="p-3 text-xs">
              <span v-if="(u.roles || []).includes('admin')" class="text-teal-800 font-medium">Admin</span>
              <span v-else-if="screenLabels(u).length" class="text-slate-600">{{ screenLabels(u).join(', ') }}</span>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="p-3">
              <span :class="u.activo ? 'text-teal-700' : 'text-slate-400'">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="p-3 text-xs uppercase">{{ u.origen }}</td>
            <td class="p-3 text-right space-x-2 whitespace-nowrap">
              <button class="text-teal-700" @click="edit(u)">Editar</button>
              <button class="text-slate-600" @click="openInspect(u)">Cuenta</button>
              <button v-if="u.activo" class="text-amber-700" @click="deactivate(u)">Desactivar</button>
              <button v-else class="text-teal-700" @click="activate(u)">Activar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length && !error && !loading" class="p-4 text-sm text-slate-500">No hay usuarios con ese filtro.</p>
      <p v-if="loading" class="p-4 text-sm text-slate-500">Cargando…</p>
    </div>

    <p v-else-if="!loading" class="mt-4 text-sm text-slate-500">No hay usuarios con ese filtro.</p>
    <p v-else class="mt-4 text-sm text-slate-500">Cargando…</p>

    <div v-if="pages > 1 || total > pageSize" class="pager mt-4">
      <button type="button" class="pager-btn" :disabled="page <= 1 || loading" @click="goPage(page - 1)">
        Anterior
      </button>
      <span class="text-sm text-slate-600">Página {{ page }} de {{ pages }}</span>
      <button type="button" class="pager-btn" :disabled="page >= pages || loading" @click="goPage(page + 1)">
        Siguiente
      </button>
    </div>

    <Teleport to="body">
      <div v-if="draft" class="modal-root" @keydown.esc="draft = null">
        <button type="button" class="backdrop" aria-label="Cerrar" @click="draft = null" />
        <aside class="modal modal-wide" role="dialog" aria-modal="true">
          <header class="modal-head">
            <div>
              <h2>{{ draft.id ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
              <p class="muted small">
                {{
                  draft.id
                    ? 'Revisá identidad, organización y acceso.'
                    : 'Opcional: describí a la persona con IA y después revisá el formulario.'
                }}
              </p>
            </div>
          </header>

          <form class="form-split" @submit.prevent="save">
            <nav class="form-nav" aria-label="Pasos">
              <button
                v-if="!draft.id"
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'ia' }"
                @click="editorStep = 'ia'"
              >
                <span class="nav-n">1</span>
                <span>
                  <strong>IA (opcional)</strong>
                  <small>Prompt → borrador</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'datos' }"
                @click="editorStep = 'datos'"
              >
                <span class="nav-n">{{ draft.id ? '1' : '2' }}</span>
                <span>
                  <strong>Datos</strong>
                  <small>Identidad y login</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'org' }"
                @click="editorStep = 'org'"
              >
                <span class="nav-n">{{ draft.id ? '2' : '3' }}</span>
                <span>
                  <strong>Organización</strong>
                  <small>Área y grupos</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'fechas' }"
                @click="editorStep = 'fechas'"
              >
                <span class="nav-n">{{ draft.id ? '3' : '4' }}</span>
                <span>
                  <strong>Fechas / hitos</strong>
                  <small>Cumple, ingreso, custom</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'acceso' }"
                @click="editorStep = 'acceso'"
              >
                <span class="nav-n">{{ draft.id ? '4' : '5' }}</span>
                <span>
                  <strong>Acceso</strong>
                  <small>Roles y permisos</small>
                </span>
              </button>
            </nav>

            <div class="form-main">
              <section v-show="editorStep === 'ia' && !draft.id" class="pane">
                <h3 class="pane-title">Completar con IA</h3>
                <p class="muted small">
                  Pegá un mail, CV corto o descripción. La IA (o heurística) completa el formulario; vos revisás y
                  guardás. La contraseña siempre la definís vos.
                </p>
                <label class="field">
                  <span>Prompt</span>
                  <textarea
                    v-model="aiPrompt"
                    class="input"
                    rows="8"
                    :placeholder="aiPlaceholder"
                    :disabled="aiBusy"
                  />
                </label>
                <div class="row">
                  <button
                    type="button"
                    class="btn-primary"
                    :disabled="aiBusy || aiPrompt.trim().length < 8"
                    @click="runAiDraft"
                  >
                    {{ aiBusy ? 'Armando borrador…' : 'Completar formulario' }}
                  </button>
                  <button type="button" class="btn-ghost" :disabled="aiBusy" @click="aiPrompt = aiPlaceholder">
                    Ejemplo
                  </button>
                  <button type="button" class="btn-ghost" @click="editorStep = 'datos'">Saltar → Datos</button>
                </div>
                <p v-if="aiNotes" class="ai-notes">{{ aiNotes }}</p>
                <p class="muted small">
                  {{ aiConfigured ? 'IA LLM disponible.' : 'Sin API key: usa heurística local (email, nombre, área…).' }}
                </p>
              </section>

              <section v-show="editorStep === 'datos'" class="pane">
                <h3 class="pane-title">Datos de la persona</h3>
                <div class="grid-2">
                  <label class="field">
                    <span>Usuario (login) *</span>
                    <input
                      v-model="draft.usuario"
                      class="input"
                      :disabled="Boolean(draft.id)"
                      required
                      autocomplete="off"
                    />
                  </label>
                  <label class="field">
                    <span>{{ draft.id ? 'Nueva contraseña (opcional)' : 'Contraseña *' }}</span>
                    <input
                      v-model="draft.password"
                      type="password"
                      class="input"
                      :required="!draft.id"
                      minlength="8"
                      autocomplete="new-password"
                    />
                  </label>
                </div>
                <div class="grid-2">
                  <label class="field">
                    <span>Nombre</span>
                    <input v-model="draft.nombre" class="input" />
                  </label>
                  <label class="field">
                    <span>Apellido</span>
                    <input v-model="draft.apellido" class="input" />
                  </label>
                </div>
                <label class="field">
                  <span>Email</span>
                  <input v-model="draft.email" type="email" class="input" />
                </label>
                <div class="grid-3">
                  <label class="field">
                    <span>ID / legajo</span>
                    <input v-model="draft.idExterno" class="input" />
                  </label>
                  <label class="field">
                    <span>DNI</span>
                    <input v-model="draft.dni" class="input" />
                  </label>
                  <label class="field">
                    <span>CUIL</span>
                    <input v-model="draft.cuil" class="input" />
                  </label>
                </div>
              </section>

              <section v-show="editorStep === 'org'" class="pane">
                <h3 class="pane-title">Organización</h3>
                <label class="field">
                  <span>Área</span>
                  <select v-model="draft.areaId" class="input">
                    <option value="">Sin área</option>
                    <option v-for="a in orgAreas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
                  </select>
                </label>
                <label class="field">
                  <span>Reporta a (organigrama)</span>
                  <select v-model="draft.managerId" class="input">
                    <option value="">Sin jefe / raíz</option>
                    <option
                      v-for="u in managerOptions"
                      :key="u.id"
                      :value="u.id"
                      :disabled="draft.id && u.id === draft.id"
                    >
                      {{ managerLabel(u) }}
                    </option>
                  </select>
                </label>
                <p class="muted small">Grupos</p>
                <div class="checks-box">
                  <label v-for="g in orgGroups" :key="g.id" class="check-row">
                    <input v-model="draft.groupIds" type="checkbox" :value="g.id" />
                    {{ g.nombre }}
                  </label>
                  <p v-if="!orgGroups.length" class="muted small">No hay grupos. Creálos en Organización.</p>
                </div>
              </section>

              <section v-show="editorStep === 'fechas'" class="pane">
                <h3 class="pane-title">Fechas y hitos (saludos automáticos)</h3>
                <p class="muted small">
                  El motor de celebraciones usa estas fechas (día/mes). Las keys custom alimentan tipos con origen
                  <code>customDate</code> / <code>daysAfter</code> en Admin → Saludos.
                </p>
                <label class="field">
                  <span>Cargo (plantillas de saludo)</span>
                  <input v-model="draft.cargo" class="input" maxlength="120" placeholder="Ej. Analista RRHH" />
                </label>
                <div class="grid-2">
                  <label class="field">
                    <span>Fecha de nacimiento</span>
                    <input v-model="draft.fechaNacimiento" class="input" type="date" />
                  </label>
                  <label class="field">
                    <span>Fecha de ingreso</span>
                    <input v-model="draft.fechaIngreso" class="input" type="date" />
                  </label>
                </div>
                <div class="custom-dates">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <p class="field-label">Fechas personalizadas (hitos)</p>
                    <button type="button" class="btn-ghost sm" @click="addCustomDateRow">+ Hito</button>
                  </div>
                  <div v-for="(row, idx) in draft.customDateRows" :key="idx" class="custom-date-row">
                    <input
                      v-model="row.key"
                      class="input"
                      placeholder="key (ej. promocion)"
                      pattern="[a-z0-9_]*"
                    />
                    <input v-model="row.date" class="input" type="date" />
                    <button type="button" class="btn-ghost sm danger" @click="removeCustomDateRow(idx)">Quitar</button>
                  </div>
                  <p v-if="!(draft.customDateRows || []).length" class="muted small">
                    Sin hitos custom. Ejemplos: <code>promocion</code>, <code>certificacion</code>,
                    <code>fin_prueba</code>.
                  </p>
                </div>
              </section>

              <section v-show="editorStep === 'acceso'" class="pane">
                <h3 class="pane-title">Acceso</h3>
                <div class="row">
                  <label class="check-row">
                    <input v-model="draft.roleMember" type="checkbox" /> member (app)
                  </label>
                  <label class="check-row">
                    <input v-model="draft.roleAdmin" type="checkbox" :disabled="!canGrantPerms" /> admin del tenant
                  </label>
                  <label class="check-row">
                    <input v-model="draft.activo" type="checkbox" /> Activo
                  </label>
                  <label class="check-row">
                    <input v-model="draft.twoFactorEnabled" type="checkbox" /> 2FA (email/SMS)
                  </label>
                </div>
                <div v-if="draft.twoFactorEnabled" class="row">
                  <label class="field">
                    <span class="field-label">Método 2FA</span>
                    <select v-model="draft.twoFactorMethod" class="input">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">Teléfono (SMS)</span>
                    <input v-model="draft.telefono" class="input" placeholder="+54911…" />
                  </label>
                </div>
                <p v-if="draft.roleAdmin" class="muted small">Admin completo: ve todas las pantallas.</p>
                <div v-if="!draft.roleAdmin" class="checks-box">
                  <p class="field-label">Permisos de pantallas del admin</p>
                  <p class="muted small">
                    Sin ser admin, puede entrar solo a las pantallas marcadas.
                    {{ canGrantPerms ? '' : ' Solo un admin del tenant puede cambiar estos permisos.' }}
                  </p>
                  <label v-for="cap in screenCaps" :key="cap.id" class="check-row">
                    <input
                      v-model="draft.capabilities"
                      type="checkbox"
                      :value="cap.id"
                      :disabled="!canGrantPerms"
                    />
                    <span>
                      <strong>{{ cap.label }}</strong>
                      <small class="block muted">{{ cap.description }}</small>
                    </span>
                  </label>
                </div>
              </section>

              <p v-if="formError" class="form-error">{{ formError }}</p>
              <footer class="form-foot">
                <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar</button>
              </footer>
            </div>
          </form>
        </aside>
      </div>
    </Teleport>

    <div
      v-if="inspect"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="inspect = null"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 class="font-semibold text-lg">Cuenta · {{ inspect.nombre || inspect.usuario }}</h2>
        <p v-if="inspect.deletionRequestedAt" class="text-sm text-amber-700">
          Solicitud de baja: {{ new Date(inspect.deletionRequestedAt).toLocaleString() }}
        </p>
        <p class="text-xs text-slate-500">
          Último login: {{ inspect.lastLoginAt ? new Date(inspect.lastLoginAt).toLocaleString() : '—' }}
          · Dispositivos: {{ inspect.deviceCount ?? '—' }}
        </p>
        <p class="text-xs text-slate-600">
          <span v-if="inspect.cargo">Cargo: {{ inspect.cargo }} · </span>
          {{ datesLabel(inspect) || 'Sin fechas de saludo' }}
        </p>
        <ul
          v-if="inspect.customDates && Object.keys(inspect.customDates).length"
          class="text-xs text-slate-500 space-y-1"
        >
          <li v-for="(d, k) in inspect.customDates" :key="k">
            <code>{{ k }}</code>: {{ toDateInput(d) }}
          </li>
        </ul>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium">Dispositivos push</h3>
            <div class="flex gap-2">
              <button type="button" class="text-xs text-amber-700" @click="wipeAllDevices">Blanquear todos</button>
              <button type="button" class="text-xs text-teal-700" @click="loadInspectDevices">Actualizar</button>
            </div>
          </div>
          <ul v-if="inspectDevices.length" class="text-sm space-y-2">
            <li
              v-for="d in inspectDevices"
              :key="d.id"
              class="flex justify-between gap-2 border rounded-lg px-3 py-2"
            >
              <span>{{ d.platform }} · …{{ d.endpointHint }}</span>
              <button type="button" class="text-amber-700 text-xs" @click="revokeInspectDevice(d.id)">
                Blanquear
              </button>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-500">Sin dispositivos.</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium">Actividad reciente</h3>
            <button type="button" class="text-xs text-teal-700" @click="loadInspectActivity">Actualizar</button>
          </div>
          <ul v-if="inspectActivity.length" class="text-sm space-y-1 max-h-48 overflow-y-auto">
            <li v-for="ev in inspectActivity" :key="ev.id" class="flex justify-between gap-2 border-b py-1">
              <span>{{ ev.action }}</span>
              <span class="text-slate-400 text-xs">{{ new Date(ev.createdAt).toLocaleString() }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-500">Sin eventos.</p>
        </div>

        <div class="flex justify-end">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="inspect = null">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Import CSV -->
    <div
      v-if="importOpen"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="importOpen = false"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 class="font-semibold text-lg">Importar usuarios (CSV / Excel)</h2>
        <p class="text-sm text-slate-500">
          Descargá la plantilla, completá y subí .csv o .xlsx.
        </p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-lg border px-3 py-1.5 text-sm" @click="downloadTemplate('csv')">
            Plantilla CSV
          </button>
          <button type="button" class="rounded-lg border px-3 py-1.5 text-sm" @click="downloadTemplate('xlsx')">
            Plantilla Excel
          </button>
          <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="text-sm" @change="onImportFile" />
        </div>
        <div v-if="importSummary" class="text-sm bg-slate-50 rounded-lg p-3">
          Total {{ importSummary.total }} · altas {{ importSummary.create }} · updates
          {{ importSummary.update }} · errores {{ importSummary.errors }} · política
          {{ importSummary.policy }}
        </div>
        <ul v-if="importPreview.length" class="text-xs max-h-48 overflow-y-auto border rounded-lg divide-y">
          <li
            v-for="row in importPreview.slice(0, 80)"
            :key="row.line"
            class="px-3 py-1.5 flex justify-between gap-2"
            :class="row.ok ? '' : 'bg-red-50'"
          >
            <span>L{{ row.line }} · {{ row.action }} · {{ row.payload?.usuario || '—' }}</span>
            <span v-if="!row.ok" class="text-red-600">{{ (row.issues || []).join(', ') }}</span>
          </li>
        </ul>
        <p v-if="importReport" class="text-sm text-teal-700">{{ importReport }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="importOpen = false">Cerrar</button>
          <button
            type="button"
            class="px-4 py-2 bg-teal-700 text-white rounded-lg disabled:opacity-50"
            :disabled="!importFile || importBusy"
            @click="commitImport"
          >
            Confirmar importación
          </button>
        </div>
      </div>
    </div>

    <!-- Directory sync -->
    <div
      v-if="dirOpen"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="dirOpen = false"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-semibold text-lg">Sync directorio (Google / Entra)</h2>
          <button
            type="button"
            class="info-btn"
            aria-label="Cómo usar este sync"
            @click="openMembersHelp"
          >
            i
          </button>
        </div>
        <p class="text-sm text-slate-500">
          Con credenciales de plataforma trae usuarios del IdP. Sin ellas, pegá una lista JSON.
          Tocá la <strong>i</strong> para el paso a paso (puerta SSO vs padrón).
        </p>
        <p v-if="dirStatus" class="text-xs text-slate-500">
          Google: {{ dirStatus.google?.note }} · Entra: {{ dirStatus.entra?.note }}
        </p>
        <label class="block text-sm">
          Proveedor
          <select v-model="dirProvider" class="mt-1 w-full border rounded-lg px-3 py-2 bg-white">
            <option value="google">Google Workspace</option>
            <option value="entra">Microsoft Entra ID</option>
          </select>
        </label>
        <label v-if="dirProvider === 'google'" class="block text-sm">
          Dominio Google (ej. empresa.com)
          <input v-model="dirDomain" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="empresa.com" />
        </label>
        <label class="block text-sm">
          Lista JSON opcional (si no hay IdP configurado)
          <textarea
            v-model="dirJson"
            rows="5"
            class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-xs"
            placeholder='[{"email":"a@empresa.com","nombre":"Ana","apellido":"Lopez"}]'
          />
        </label>
        <div v-if="dirSummary" class="text-sm bg-slate-50 rounded-lg p-3">
          Total {{ dirSummary.total }} · altas {{ dirSummary.create }} · updates {{ dirSummary.update }}
          <span v-if="dirSource" class="text-slate-400"> · fuente {{ dirSource }}</span>
        </div>
        <p v-if="dirReport" class="text-sm text-teal-700">{{ dirReport }}</p>
        <div class="flex justify-end gap-2 flex-wrap">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="dirOpen = false">Cerrar</button>
          <button type="button" class="px-4 py-2 border rounded-lg" :disabled="dirBusy" @click="previewDirectory(true)">
            Traer del IdP
          </button>
          <button type="button" class="px-4 py-2 border rounded-lg" :disabled="dirBusy" @click="previewDirectory(false)">
            Vista previa JSON
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-teal-700 text-white rounded-lg"
            :disabled="dirBusy || !dirEntries.length"
            @click="commitDirectory"
          >
            Confirmar sync
          </button>
        </div>
      </div>
    </div>

    <!-- Ayuda: cómo traer miembros hoy -->
    <div
      v-if="membersHelp"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="members-help-title"
      @click.self="membersHelp = false"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto shadow-xl">
        <header class="flex items-start justify-between gap-3">
          <h2 id="members-help-title" class="font-semibold text-lg">{{ membersHelp.title }}</h2>
          <button type="button" class="text-2xl leading-none text-slate-400" aria-label="Cerrar" @click="membersHelp = false">
            ×
          </button>
        </header>
        <p class="text-sm text-slate-600">{{ membersHelp.lead }}</p>
        <ul class="text-sm text-slate-700 space-y-2 list-disc pl-5">
          <li v-for="(p, i) in membersHelp.points" :key="i">{{ p }}</li>
        </ul>
        <p v-if="membersHelp.tip" class="text-sm bg-teal-50 text-teal-900 rounded-lg px-3 py-2">
          <strong>Tip.</strong> {{ membersHelp.tip }}
        </p>
        <footer class="flex justify-end pt-1">
          <button type="button" class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="membersHelp = false">
            Entendido
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'
import { useAuthStore } from '../stores/auth'
import { ADMIN_SCREEN_CAPABILITIES } from '../utils/adminCapabilities'
import { resolveMediaUrl } from '../utils/media'

const auth = useAuthStore()
const canGrantPerms = computed(() => auth.isFullAdmin)
const screenCaps = ADMIN_SCREEN_CAPABILITIES
const orgAreas = ref([])
const orgGroups = ref([])
const orgManagers = ref([])

const managerOptions = computed(() => orgManagers.value || [])

function managerLabel(u) {
  const n = [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.label || ''
  return n ? `${n} (@${u.usuario})` : u.usuario
}

const items = ref([])
const total = ref(0)
const page = ref(1)
const pages = ref(1)
const pageSize = ref(20)
const sort = ref('nombre')
const order = ref('asc')
const loading = ref(false)
const viewMode = ref(localStorage.getItem('cx.users.view') === 'cards' ? 'cards' : 'table')
const q = ref('')
const activo = ref('')
const role = ref('')
const areaFilter = ref('')
let searchTimer = null
const draft = ref(null)
const editorStep = ref('datos')
const aiPrompt = ref('')
const aiBusy = ref(false)
const aiNotes = ref('')
const aiConfigured = ref(false)
const aiPlaceholder =
  'Ej: Alta de María Gómez, maria.gomez@empresa.com, legajo 8842, área IT, permisos de publicaciones y documentos. No es admin.'
const inspect = ref(null)
const inspectDevices = ref([])
const inspectActivity = ref([])
const error = ref('')
const formError = ref('')
const okMsg = ref('')
const importOpen = ref(false)
const importFile = ref(null)
const importPreview = ref([])
const importSummary = ref(null)
const importReport = ref('')
const importBusy = ref(false)
const dirOpen = ref(false)
const dirProvider = ref('google')
const dirJson = ref('')
const dirDomain = ref('')
const dirStatus = ref(null)
const dirSummary = ref(null)
const dirEntries = ref([])
const dirSource = ref('')
const dirReport = ref('')
const dirBusy = ref(false)
const membersHelp = ref(null)

const MEMBERS_HELP = {
  title: 'Cómo traer miembros hoy (sin desarrollo nuevo)',
  lead: 'Hay dos pasos distintos: quién puede entrar (puerta) y quiénes son el padrón (esta pantalla). Ambos ya existen.',
  points: [
    'Padrón (acá): usá “Google / Entra” para sincronizar Google Workspace o Microsoft Entra ID, o “Importar” con CSV/Excel, o “+ Usuario” a mano.',
    'Con credenciales en el servidor (GOOGLE_WORKSPACE_* / ENTRA_*) podés “Traer del IdP”. Sin ellas, pegá una lista JSON y hacé vista previa → confirmar sync.',
    'Puerta (Comunidad → Ingreso): activá SSO Google/Microsoft, poné el dominio (ej. sooft.com.ar) y opcionalmente “Auto-alta por SSO”. Eso controla quién puede autenticarse; no reemplaza este sync.',
    'Receta típica: 1) sync Directory acá para precargar mails/nombres · 2) en Comunidad, dominio + SSO (+ auto-alta si querés altas JIT) · 3) Guardar y probar login.',
    'Qué aún no está: filtrar por un Google Group concreto. Hoy syncéa el directorio/dominio; el filtro por grupo es la Ola 38 (diseño).',
  ],
  tip: 'Si solo querés “quien tenga @sooft.com.ar puede entrar” sin precargar lista, alcanza con dominio + SSO + auto-alta en Comunidad. El sync acá sirve para tener el padrón completo de antemano.',
}

function openMembersHelp() {
  membersHelp.value = MEMBERS_HELP
}

const activoFilters = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

const roleFilters = [
  { value: '', label: 'Cualquier rol' },
  { value: 'admin', label: 'Admins' },
  { value: 'member', label: 'Members' },
]

function fullName(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || '—'
}

function initials(u) {
  const n = (u.nombre || u.usuario || '?').trim()
  const a = (u.apellido || '').trim()
  return `${n.slice(0, 1)}${a.slice(0, 1) || n.slice(1, 2) || ''}`.toUpperCase()
}

function avatarSrc(u) {
  return resolveMediaUrl(u?.avatarUrl || '')
}

function screenLabels(u) {
  const set = new Set(u.capabilities || [])
  return screenCaps.filter((c) => set.has(c.id)).map((c) => c.label)
}

function orgLabel(u) {
  const area = orgAreas.value.find((a) => a.id === u.areaId)?.nombre
  const groups = (u.groupIds || [])
    .map((id) => orgGroups.value.find((g) => g.id === id)?.nombre)
    .filter(Boolean)
  const parts = []
  if (area) parts.push(area)
  if (groups.length) parts.push(groups.join(', '))
  return parts.join(' · ') || '—'
}

function toDateInput(v) {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function fmtDayMonth(v) {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function datesLabel(u) {
  const parts = []
  if (u.fechaNacimiento) parts.push(`Cumple ${fmtDayMonth(u.fechaNacimiento)}`)
  if (u.fechaIngreso) parts.push(`Ingreso ${fmtDayMonth(u.fechaIngreso)}`)
  const custom = u.customDates && typeof u.customDates === 'object' ? Object.keys(u.customDates) : []
  if (custom.length) parts.push(`${custom.length} hito${custom.length === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function customDatesToRows(raw) {
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw).map(([key, date]) => ({
    key,
    date: toDateInput(date),
  }))
}

function rowsToCustomDates(rows) {
  const out = {}
  for (const row of rows || []) {
    const key = String(row?.key || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .slice(0, 64)
    if (!key || !row?.date) continue
    out[key] = row.date
  }
  return out
}

function addCustomDateRow() {
  if (!draft.value) return
  if (!Array.isArray(draft.value.customDateRows)) draft.value.customDateRows = []
  draft.value.customDateRows.push({ key: '', date: '' })
}

function removeCustomDateRow(idx) {
  if (!draft.value?.customDateRows) return
  draft.value.customDateRows.splice(idx, 1)
}

function setViewMode(mode) {
  viewMode.value = mode
  localStorage.setItem('cx.users.view', mode)
}

function sortMark(key) {
  if (sort.value !== key) return ''
  return order.value === 'asc' ? '↑' : '↓'
}

function toggleSort(key) {
  if (sort.value === key) order.value = order.value === 'asc' ? 'desc' : 'asc'
  else {
    sort.value = key
    order.value = 'asc'
  }
  page.value = 1
  load()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 320)
}

function searchNow() {
  clearTimeout(searchTimer)
  page.value = 1
  load()
}

function goPage(p) {
  page.value = Math.max(1, Math.min(pages.value, p))
  load()
}

function rolesFromDraft(d) {
  const roles = []
  if (d.roleMember) roles.push('member')
  if (d.roleAdmin) roles.push('admin')
  return roles.length ? roles : ['member']
}

async function loadOrg() {
  try {
    const { data } = await api.get('/admin/org/options')
    orgAreas.value = data.areas || []
    orgGroups.value = data.groups || []
    orgManagers.value = data.managers || []
  } catch {
    orgAreas.value = []
    orgGroups.value = []
    orgManagers.value = []
  }
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      sort: sort.value,
      order: order.value,
    }
    if (q.value.trim()) params.q = q.value.trim()
    if (activo.value) params.activo = activo.value
    if (role.value) params.role = role.value
    if (areaFilter.value) params.areaId = areaFilter.value
    const { data } = await api.get('/admin/users', { params })
    items.value = data.items || []
    total.value = Number(data.total) || 0
    page.value = Number(data.page) || page.value
    pages.value = Number(data.pages) || 1
    pageSize.value = Number(data.pageSize) || pageSize.value
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar usuarios'
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function openNew() {
  formError.value = ''
  aiNotes.value = ''
  aiPrompt.value = ''
  editorStep.value = 'ia'
  draft.value = {
    usuario: '',
    nombre: '',
    apellido: '',
    email: '',
    idExterno: '',
    dni: '',
    cuil: '',
    password: '',
    cargo: '',
    fechaNacimiento: '',
    fechaIngreso: '',
    customDateRows: [],
    roleMember: true,
    roleAdmin: false,
    capabilities: [],
    areaId: '',
    managerId: '',
    groupIds: [],
    activo: true,
    twoFactorEnabled: false,
    twoFactorMethod: 'email',
    telefono: '',
  }
}

function edit(u) {
  formError.value = ''
  aiNotes.value = ''
  editorStep.value = 'datos'
  draft.value = {
    id: u.id,
    usuario: u.usuario,
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    idExterno: u.idExterno || '',
    dni: u.dni || '',
    cuil: u.cuil || '',
    password: '',
    cargo: u.cargo || '',
    fechaNacimiento: toDateInput(u.fechaNacimiento),
    fechaIngreso: toDateInput(u.fechaIngreso),
    customDateRows: customDatesToRows(u.customDates),
    roleMember: (u.roles || []).includes('member'),
    roleAdmin: (u.roles || []).includes('admin'),
    capabilities: (u.capabilities || []).filter((c) => screenCaps.some((s) => s.id === c)),
    areaId: u.areaId || '',
    managerId: u.managerId || '',
    groupIds: [...(u.groupIds || [])],
    activo: u.activo !== false,
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
    twoFactorMethod: u.twoFactorMethod || 'email',
    telefono: u.telefono || '',
  }
}

function applyAiDraft(d) {
  if (!draft.value || !d) return
  if (d.usuario) draft.value.usuario = d.usuario
  if (d.nombre != null) draft.value.nombre = d.nombre
  if (d.apellido != null) draft.value.apellido = d.apellido
  if (d.email != null) draft.value.email = d.email
  if (d.idExterno != null) draft.value.idExterno = d.idExterno
  if (d.dni != null) draft.value.dni = d.dni
  if (d.cuil != null) draft.value.cuil = d.cuil
  draft.value.roleMember = d.roleMember !== false
  draft.value.roleAdmin = Boolean(d.roleAdmin) && canGrantPerms.value
  draft.value.capabilities = Array.isArray(d.capabilities)
    ? d.capabilities.filter((c) => screenCaps.some((s) => s.id === c))
    : []
  draft.value.areaId = d.areaId || ''
  draft.value.groupIds = Array.isArray(d.groupIds) ? [...d.groupIds] : []
  draft.value.activo = d.activo !== false
}

async function runAiDraft() {
  if (aiBusy.value || aiPrompt.value.trim().length < 8) return
  aiBusy.value = true
  aiNotes.value = ''
  formError.value = ''
  try {
    const { data } = await api.post('/admin/users/ai-draft', { prompt: aiPrompt.value.trim() })
    aiConfigured.value = Boolean(data.configured)
    applyAiDraft(data.draft)
    aiNotes.value = data.draft?.notes || 'Borrador aplicado. Revisá Datos → Organización → Acceso.'
    editorStep.value = 'datos'
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo armar el borrador'
  } finally {
    aiBusy.value = false
  }
}

async function loadAiStatus() {
  try {
    const { data } = await api.get('/admin/users/ai-status')
    aiConfigured.value = Boolean(data.configured)
  } catch {
    aiConfigured.value = false
  }
}

async function save() {
  formError.value = ''
  const payload = {
    nombre: draft.value.nombre,
    apellido: draft.value.apellido,
    email: draft.value.email,
    idExterno: draft.value.idExterno,
    dni: draft.value.dni,
    cuil: draft.value.cuil,
    cargo: draft.value.cargo || '',
    fechaNacimiento: draft.value.fechaNacimiento || null,
    fechaIngreso: draft.value.fechaIngreso || null,
    customDates: rowsToCustomDates(draft.value.customDateRows),
    roles: rolesFromDraft(draft.value),
    activo: draft.value.activo,
    twoFactorEnabled: Boolean(draft.value.twoFactorEnabled),
    twoFactorMethod: draft.value.twoFactorMethod || 'email',
    telefono: draft.value.telefono || '',
    capabilities: draft.value.roleAdmin ? [] : [...(draft.value.capabilities || [])],
    areaId: draft.value.areaId || null,
    managerId: draft.value.managerId || null,
    groupIds: [...(draft.value.groupIds || [])],
  }
  if (draft.value.password) payload.password = draft.value.password
  try {
    if (draft.value.id) {
      await api.patch(`/admin/users/${draft.value.id}`, payload)
    } else {
      await api.post('/admin/users', {
        ...payload,
        usuario: draft.value.usuario,
        password: draft.value.password,
      })
    }
    draft.value = null
    okMsg.value = 'Usuario guardado'
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function deactivate(u) {
  if (!confirm(`¿Desactivar a ${u.usuario}? Se revocan sus sesiones.`)) return
  try {
    await api.delete(`/admin/users/${u.id}`)
    okMsg.value = 'Usuario desactivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo desactivar'
  }
}

async function activate(u) {
  try {
    await api.patch(`/admin/users/${u.id}`, { activo: true })
    okMsg.value = 'Usuario activado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo activar'
  }
}

async function exportCsv() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/users/export')
    const headers = data.fields || []
    const lines = [headers.join(';')]
    for (const row of data.rows || []) {
      lines.push(
        headers
          .map((h) => {
            const v = row[h] ?? ''
            const s = String(v).replace(/"/g, '""')
            return `"${s}"`
          })
          .join(';'),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios-${data.tenant || 'tenant'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    okMsg.value = 'Exportación lista'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo exportar'
  }
}

function openImport() {
  importOpen.value = true
  importFile.value = null
  importPreview.value = []
  importSummary.value = null
  importReport.value = ''
}

async function downloadTemplate(format = 'csv') {
  try {
    const { data } = await api.get('/admin/users/template', {
      params: { format },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = format === 'xlsx' ? 'plantilla-usuarios.xlsx' : 'plantilla-usuarios.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo descargar plantilla'
  }
}

async function onImportFile(ev) {
  const file = ev.target?.files?.[0]
  if (!file) return
  importFile.value = file
  importBusy.value = true
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/users/preview', fd)
    importPreview.value = data.preview || []
    importSummary.value = data.summary || null
  } catch (e) {
    error.value = e.response?.data?.error || 'Preview falló'
  } finally {
    importBusy.value = false
  }
}

async function commitImport() {
  if (!importFile.value) return
  importBusy.value = true
  error.value = ''
  importReport.value = ''
  try {
    const fd = new FormData()
    fd.append('file', importFile.value)
    const { data } = await api.post('/admin/users/commit', fd)
    const s = data.summary || {}
    importReport.value = `OK ${s.ok}/${s.total} (altas ${s.created}, updates ${s.updated}, errores ${s.errors}${s.format ? `, ${s.format}` : ''})`
    okMsg.value = importReport.value
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'Import falló'
  } finally {
    importBusy.value = false
  }
}

async function openDirectory() {
  dirOpen.value = true
  dirReport.value = ''
  dirSummary.value = null
  dirEntries.value = []
  dirSource.value = ''
  try {
    const { data } = await api.get('/admin/users/directory/status')
    dirStatus.value = data
  } catch {
    dirStatus.value = null
  }
}

function parseDirEntries() {
  const raw = String(dirJson.value || '').trim()
  if (!raw) return []
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : parsed.entries || []
}

/** @param {boolean} fromIdp si true no manda entries y pide al IdP */
async function previewDirectory(fromIdp = false) {
  dirBusy.value = true
  error.value = ''
  try {
    const payload = {
      provider: dirProvider.value,
      domain: dirDomain.value || undefined,
      maxResults: 200,
    }
    if (!fromIdp) {
      const entries = parseDirEntries()
      if (!entries.length) {
        error.value = 'Pegá JSON o usá “Traer del IdP”'
        return
      }
      payload.entries = entries
    }
    const { data } = await api.post('/admin/users/directory/preview', payload)
    dirSummary.value = data.summary
    dirSource.value = data.source || ''
    dirEntries.value = (data.plan || []).map((p) => ({
      email: p.email,
      nombre: p.nombre,
      apellido: p.apellido,
      usuario: p.usuario,
      idExterno: p.idExterno,
      cargo: p.cargo,
      activo: p.activo,
    }))
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Preview directorio falló'
  } finally {
    dirBusy.value = false
  }
}

async function commitDirectory() {
  dirBusy.value = true
  error.value = ''
  try {
    const entries = dirEntries.value.length ? dirEntries.value : parseDirEntries()
    const payload = {
      provider: dirProvider.value,
      domain: dirDomain.value || undefined,
    }
    if (entries.length) payload.entries = entries
    const { data } = await api.post('/admin/users/directory/commit', payload)
    const s = data.summary || {}
    dirReport.value = `Sync OK ${s.ok}/${s.total} (errores ${s.errors}${data.source ? `, ${data.source}` : ''})`
    okMsg.value = dirReport.value
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'Sync falló'
  } finally {
    dirBusy.value = false
  }
}

async function openInspect(u) {
  inspect.value = u
  inspectDevices.value = []
  inspectActivity.value = []
  await Promise.all([loadInspectDevices(), loadInspectActivity()])
}

async function loadInspectDevices() {
  if (!inspect.value?.id) return
  try {
    const { data } = await api.get(`/admin/users/${inspect.value.id}/devices`)
    inspectDevices.value = data.items || []
  } catch {
    inspectDevices.value = []
  }
}

async function loadInspectActivity() {
  if (!inspect.value?.id) return
  try {
    const { data } = await api.get(`/admin/users/${inspect.value.id}/activity`, { params: { limit: 40 } })
    inspectActivity.value = data.items || []
  } catch {
    inspectActivity.value = []
  }
}

async function revokeInspectDevice(index) {
  if (!inspect.value?.id) return
  if (!confirm('¿Blanquear este dispositivo?')) return
  try {
    const { data } = await api.delete(`/admin/users/${inspect.value.id}/devices/${index}`)
    inspectDevices.value = data.items || []
    okMsg.value = 'Dispositivo blanqueado'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo blanquear'
  }
}

async function wipeAllDevices() {
  if (!inspect.value?.id) return
  const motivo = window.prompt('Motivo del blanqueo total (obligatorio):', 'Reseteo de dispositivos')
  if (motivo == null) return
  if (!String(motivo).trim()) {
    error.value = 'El motivo es obligatorio'
    return
  }
  if (!confirm('¿Blanquear TODOS los dispositivos y cerrar sesiones de este usuario?')) return
  try {
    const { data } = await api.post(`/admin/users/${inspect.value.id}/devices/wipe`, {
      motivo: String(motivo).trim(),
    })
    inspectDevices.value = []
    okMsg.value = `Blanqueo OK (${data.devicesCleared || 0} dispositivos)`
    await loadInspectActivity()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo blanquear'
  }
}

onMounted(async () => {
  await loadOrg()
  await load()
  await loadAiStatus()
})
</script>

<style scoped>
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
}
.backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 45%);
  cursor: pointer;
}
.modal {
  position: relative;
  z-index: 1;
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgb(0 0 0 / 20%);
}
.modal-wide {
  width: min(1080px, 96vw);
  max-height: min(94vh, 920px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-head {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--line);
}
.modal-head h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}
.muted {
  color: var(--ink-soft);
}
.small {
  font-size: 0.8125rem;
}
.form-split {
  display: grid;
  grid-template-columns: 20% 80%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.form-nav {
  border-right: 1px solid var(--line);
  background: var(--panel-2);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.nav-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 10px 8px;
  cursor: pointer;
  color: var(--ink);
}
.nav-step:hover {
  background: var(--panel);
  border-color: var(--line);
}
.nav-step.on {
  background: var(--panel);
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 1px var(--brand-primary)22;
}
.nav-n {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--line);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.nav-step.on .nav-n {
  background: var(--brand-primary);
  color: #fff;
}
.nav-step strong {
  display: block;
  font-size: 13px;
}
.nav-step small {
  display: block;
  font-size: 11px;
  color: var(--ink-soft);
  margin-top: 2px;
}
.form-main {
  padding: 16px 20px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.pane-title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 700;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
}
.field span,
.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.875rem;
}
.input:disabled {
  background: var(--panel-2);
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.custom-dates {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2);
}
.custom-date-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.btn-ghost.sm {
  padding: 6px 10px;
  font-size: 0.75rem;
}
.btn-ghost.sm.danger {
  color: var(--bad);
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.checks-box {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: var(--panel-2);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.check-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.875rem;
}
.btn-primary {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--brand-primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-ghost {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--panel);
  font-size: 0.875rem;
  cursor: pointer;
}
.btn-ghost:disabled {
  opacity: 0.55;
}
.ai-notes {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--brand-primary);
  background: var(--ok-bg);
  border-radius: 10px;
  padding: 10px 12px;
}
.form-error {
  margin: 0;
  color: var(--bad);
  font-size: 0.875rem;
}
.form-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  margin-top: auto;
}
@media (max-width: 800px) {
  .form-split {
    grid-template-columns: 1fr;
  }
  .form-nav {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    flex-direction: row;
    flex-wrap: wrap;
  }
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}

.view-toggle {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
.info-btn {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 800;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.info-btn:hover {
  color: var(--brand-primary);
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
}
.view-btn {
  border: 0;
  background: var(--panel);
  padding: 8px 12px;
  font-size: 0.8125rem;
  cursor: pointer;
  color: var(--ink-soft);
}
.view-btn.on {
  background: var(--ink);
  color: #fff;
}
.th-sort {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
}
.user-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.user-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.user-card.off {
  opacity: 0.7;
}
.user-card-top {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--ok-bg);
  color: var(--brand-primary);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  overflow: hidden;
}
.user-avatar.sm {
  width: 32px;
  height: 32px;
  font-size: 0.7rem;
}
.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-card-name {
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-card-meta,
.user-card-line {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.user-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid var(--panel-2);
  font-size: 0.8125rem;
}
.badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
  flex-shrink: 0;
}
.badge[data-on='1'] {
  background: var(--ok-bg);
  color: var(--brand-primary);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.pager-btn {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.875rem;
  cursor: pointer;
}
.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
