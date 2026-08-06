<template>
  <div class="page hub">
    <header class="page-head">
      <div class="page-head-main">
        <h1>Enlaces</h1>
        <p class="page-head-sum">
          Arrastrá para reordenar · Estrella = acceso rápido en el muro (scrolleable; no se ve el grupo completo) · Podés ocultar un grupo del muro sin sacarlo de Enlaces
        </p>
        <ScreenHelp
          purpose="Hub de enlaces: grupos (pestañas) y accesos rápidos por grupo. En el muro solo se ven los marcados con estrella (con scroll horizontal), y solo si el grupo tiene «Mostrar en muro». Sin estrellas, la franja del muro no aparece. El listado completo sigue en /accesos."
          can-do="Elegir tipo de destino; marcar Acceso rápido (estrella = visible en muro, scrolleable); mostrar u ocultar el grupo en el muro; arrastrar; iconos; colores; vencimiento; pedir cambios con IA."
        />
      </div>
    </header>

    <Teleport to="body">
    <div
      v-if="newGroupOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo grupo"
      @click.self="cancelNewGroup"
      @keydown.escape.prevent="cancelNewGroup"
    >
      <form class="panel new-group-panel" @submit.prevent="confirmNewGroup">
        <div class="panel-head">
          <h2>Nuevo grupo</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="cancelNewGroup">×</button>
        </div>
        <p class="new-group-lead">
          Los grupos son pestañas en Enlaces y en el muro (si están visibles).
        </p>
        <label>
          Nombre del grupo
          <input
            ref="newGroupInputEl"
            v-model="newGroupDraft"
            type="text"
            class="input"
            maxlength="80"
            placeholder="Ej. RRHH"
            required
          />
        </label>
        <div class="footer">
          <span class="spacer" />
          <button type="button" class="btn-ghost" :disabled="busy" @click="cancelNewGroup">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="busy || !newGroupDraft.trim()">Crear grupo</button>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="aiOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="aiIntent === 'create' ? 'Crear con IA' : 'Configurar con IA'"
      @click.self="closeAi"
      @keydown.escape.prevent="closeAi"
    >
      <div class="panel ai-panel">
        <div class="panel-head">
          <h2>{{ aiIntent === 'create' ? 'Crear con IA' : 'Configurar con IA' }}</h2>
          <span class="ai-badge" :data-on="aiConfigured ? '1' : '0'">
            {{ aiConfigured ? 'IA conectada' : 'Modo reglas locales' }}
          </span>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeAi">×</button>
        </div>
        <p class="ai-panel-lead">
          <template v-if="aiIntent === 'create'">
            Pedile un grupo nuevo y sus enlaces, o enlaces en un grupo existente.
          </template>
          <template v-else>
            Pedile cambios: rápidos, orden, colores, tamaños y visibilidad.
          </template>
        </p>

        <details class="ai-guide">
          <summary>{{ aiIntent === 'create' ? 'Qué puedo crear' : 'Qué puedo configurar' }}</summary>
          <template v-if="aiIntent === 'create'">
            <ul class="ai-guide-list">
              <li>
                <strong>Grupos / pestañas</strong>
                <span>Nombre nuevo; opcionalmente orden, tamaño de iconos y si se muestra en el muro.</span>
              </li>
              <li>
                <strong>Enlaces</strong>
                <span>URL, webview, ruta interna, mail, teléfono, WhatsApp o texto para copiar. Si no pasás URL, queda un placeholder para completar después.</span>
              </li>
              <li>
                <strong>Renombrar existentes</strong>
                <span>Podés pedir cambiar el título de un enlace que ya está (ej. «Renombrá Portal a Intranet»).</span>
              </li>
              <li>
                <strong>No crea a mano</strong>
                <span>Encuesta, documento, solicitud, publicación, FAQ, tutorial o política: usá «Nuevo enlace».</span>
              </li>
            </ul>
          </template>
          <template v-else>
            <ul v-if="aiGuide?.fields?.length" class="ai-guide-list">
              <li v-for="f in aiGuide.fields" :key="f.id">
                <strong>{{ f.label }}</strong>
                <span>{{ f.values }}</span>
              </li>
            </ul>
            <p v-else class="hub-muted">Cargando guía…</p>
            <p v-if="aiGuide?.summary" class="ai-guide-sum">{{ aiGuide.summary }}</p>
          </template>
        </details>

        <details class="ai-guide">
          <summary>Pedidos prearmados</summary>
          <div class="ai-examples">
            <button
              v-for="ex in aiExamples"
              :key="ex"
              type="button"
              class="ai-chip"
              @click="aiPrompt = ex"
            >
              {{ ex }}
            </button>
          </div>
        </details>

        <label class="ai-prompt-label">
          Pedido
          <textarea
            v-model="aiPrompt"
            class="input ai-prompt"
            rows="2"
            :placeholder="aiIntent === 'create'
              ? 'Ej. Creá el grupo Beneficios con Portal, Nómina y Vacaciones'
              : 'Ej. Marcá como rápidos Portal, Nómina y Vacaciones en RRHH; iconos medianos y color var(--brand-primary)'"
          />
        </label>

        <div class="ai-actions-block">
          <div class="ai-actions">
            <button
              type="button"
              class="btn-ghost"
              :disabled="aiBusy || aiPrompt.trim().length < 6"
              @click="runAiPlan"
            >
              {{ aiBusy && aiMode === 'plan' ? 'Pensando…' : 'Armar plan' }}
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="aiBusy || (!aiPlan?.ops?.length && aiPrompt.trim().length < 6)"
              @click="runAiApply"
            >
              {{ aiBusy && aiMode === 'apply' ? 'Aplicando…' : aiPlan?.ops?.length ? 'Aplicar plan' : 'Planificar y aplicar' }}
            </button>
          </div>
          <details class="ai-guide ai-actions-help">
            <summary>Qué hace cada botón</summary>
            <ul class="ai-actions-hint">
              <li>
                <strong>Armar plan</strong>
                — solo propone los cambios (sin tocar nada). Revisá la lista y después tocá
                <em>Aplicar plan</em>. Ideal si querés controlar antes de guardar.
              </li>
              <li>
                <strong>Planificar y aplicar</strong>
                — arma el plan y lo aplica en un paso. Si ya hay un plan armado, el botón pasa a
                <em>Aplicar plan</em> y solo ejecuta ese plan. Ideal si el pedido es claro y confías en el resultado.
              </li>
            </ul>
          </details>
        </div>

        <p v-if="aiError" class="err">{{ aiError }}</p>
        <p v-if="aiInfo" class="ai-info">{{ aiInfo }}</p>

        <div v-if="aiPlan" class="ai-plan">
          <p class="ai-plan-sum"><strong>{{ aiPlan.summary }}</strong></p>
          <p v-if="aiPlan.explanation" class="ai-plan-exp">{{ aiPlan.explanation }}</p>
          <p v-if="aiPlan.aiError" class="hub-muted">{{ aiPlan.aiError }}</p>
          <ol v-if="aiPlan.ops?.length" class="ai-ops">
            <li v-for="(op, i) in aiPlan.ops" :key="i">
              <code>{{ formatOp(op) }}</code>
            </li>
          </ol>
          <p v-else class="hub-muted">Sin operaciones en el plan.</p>
        </div>
      </div>
    </div>
    </Teleport>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="hub-muted">Cargando…</p>

    <div v-if="!loading" class="muro-bar">
      <div class="head-actions muro-bar-actions">
        <button
          type="button"
          class="btn-ghost"
          :class="{ on: muroPreviewOpen }"
          @click="muroPreviewOpen = true"
        >
          Así se ve en el muro
        </button>
        <button type="button" class="btn-ghost" :disabled="busy" @click="startNewGroup">Nuevo grupo</button>
        <button type="button" class="btn-primary" @click="openNew">Nuevo enlace</button>
        <button type="button" class="btn-ghost" :class="{ on: aiOpen && aiIntent === 'create' }" @click="toggleAi('create')">
          Crear con IA
        </button>
        <button type="button" class="btn-ghost" :class="{ on: aiOpen && aiIntent === 'edit' }" @click="toggleAi('edit')">
          Configurar con IA
        </button>
      </div>
    </div>

    <Teleport to="body">
    <div
      v-if="muroPreviewOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del muro"
      @click.self="muroPreviewOpen = false"
      @keydown.escape.prevent="muroPreviewOpen = false"
    >
      <div class="panel muro-preview-panel">
        <div class="panel-head">
          <h2>Así se ve en el muro</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="muroPreviewOpen = false">×</button>
        </div>
        <p class="muro-preview-lead">
          Franja del muro con el color de la comunidad y el acento de cada enlace.
        </p>
        <section
          v-if="muroPreviewCats.length"
          class="mp-hub compact"
          :style="muroBrandStyle"
          aria-label="Vista previa del muro"
        >
          <div class="mp-shell">
            <div class="mp-tabs" role="tablist">
              <button
                v-for="cat in muroPreviewCats"
                :key="cat.nombre"
                type="button"
                role="tab"
                class="mp-tab"
                :class="{ on: muroPreviewCat === cat.nombre }"
                :aria-selected="muroPreviewCat === cat.nombre"
                @click="muroPreviewCat = cat.nombre"
              >
                {{ cat.nombre }}
              </button>
            </div>
            <div class="mp-card" role="tabpanel">
              <div class="mp-actions">
                <div
                  v-for="l in muroPreviewQuick"
                  :key="l.id"
                  class="mp-action"
                  :style="muroLinkAccentStyle(l)"
                >
                  <span class="mp-action-ico" aria-hidden="true">
                    <HubIcon :name="l.icon" :size="28" />
                  </span>
                  <span class="mp-action-label">{{ l.titulo }}</span>
                </div>
                <p v-if="!muroPreviewQuick.length" class="mp-empty">Sin accesos rápidos en este grupo.</p>
              </div>
            </div>
          </div>
        </section>
        <p
          v-else-if="orderedCategories.some((c) => c.activo)"
          class="hub-hint muro-preview-empty"
        >
          Ningún grupo activo está marcado para el muro. Activá «Mostrar en muro» en al menos uno.
        </p>
        <p v-else class="hub-muted">
          Creá un grupo activo para previsualizar el muro.
        </p>
      </div>
    </div>
    </Teleport>

    <div v-if="!loading" class="hub-workspace">
      <aside class="hub-groups" aria-label="Grupos de accesos">
        <div class="hub-groups-head">
          <strong>Grupos de accesos</strong>
          <span class="cat-count">{{ orderedCategories.length }}</span>
        </div>
        <ul class="group-list">
          <li
            v-for="(cat, catIdx) in orderedCategories"
            :key="cat.nombre"
            class="group-item"
            :class="{
              on: selectedGroupNombre === cat.nombre,
              off: !cat.activo,
              'off-muro': cat.activo && cat.showOnMuro === false,
              'drop-group': dropGroup === cat.nombre,
              dragging: dragGroup === cat.nombre,
            }"
            @dragover.prevent="onGroupDragOver(cat.nombre, $event)"
            @drop.prevent="onGroupDrop(cat.nombre, catIdx)"
          >
            <button
              type="button"
              class="drag-handle"
              title="Arrastrar grupo"
              draggable="true"
              @click.stop
              @dragstart="onGroupDragStart(cat.nombre, catIdx, $event)"
              @dragend="onDragEnd"
            >⋮⋮</button>
            <button type="button" class="group-select" @click="selectGroup(cat.nombre)">
              {{ cat.nombre }}
            </button>
          </li>
        </ul>
      </aside>

      <div class="hub-main" v-if="selectedGroup">
        <header class="cat-head">
          <div class="cat-title">
            <form
              v-if="renamingNombre === selectedGroup.nombre"
              class="rename-form"
              @submit.prevent="confirmRename"
            >
              <input
                v-model="renameDraft"
                type="text"
                maxlength="80"
                aria-label="Nuevo nombre del grupo"
                @keydown.escape.prevent="cancelRename"
              />
              <button type="submit" class="btn-primary sm" :disabled="busy">Guardar</button>
              <button type="button" class="btn-ghost sm" :disabled="busy" @click="cancelRename">Cancelar</button>
            </form>
            <template v-else>
              <strong>{{ selectedGroup.nombre }}</strong>
              <span class="cat-stat" title="Cantidad de enlaces en este grupo">
                {{ selectedLinks.length }}
                {{ selectedLinks.length === 1 ? 'enlace' : 'enlaces' }}
              </span>
              <span v-if="!selectedGroup.activo" class="pill warn">Oculto en toda la app</span>
              <span v-else-if="selectedGroup.showOnMuro === false" class="pill warn">No se muestra en el muro</span>
            </template>
          </div>
          <div v-if="renamingNombre !== selectedGroup.nombre" class="cat-toolbar">
            <button
              type="button"
              class="tool-btn"
              :disabled="busy"
              @click="startRename(selectedGroup)"
            >
              <svg class="tool-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                />
              </svg>
              Renombrar
            </button>

            <div class="tool-group" role="group" aria-label="Visibilidad del grupo">
              <button
                type="button"
                class="tool-toggle"
                :class="{ on: selectedGroup.showOnMuro !== false && selectedGroup.activo }"
                :disabled="busy || !selectedGroup.activo"
                :aria-pressed="selectedGroup.showOnMuro !== false"
                :title="!selectedGroup.activo
                  ? 'Activá el grupo en la app primero'
                  : (selectedGroup.showOnMuro !== false
                    ? 'Ahora se ve en el muro. Tocá para sacarlo (sigue en Enlaces)'
                    : 'Ahora no se ve en el muro. Tocá para mostrarlo')"
                @click="toggleShowOnMuro(selectedGroup)"
              >
                <span class="tool-toggle-track" aria-hidden="true"><span class="tool-toggle-knob" /></span>
                <span class="tool-toggle-text">
                  <strong>Muro</strong>
                  <small>{{ selectedGroup.showOnMuro !== false && selectedGroup.activo ? 'Visible' : 'Oculto' }}</small>
                </span>
              </button>
              <button
                type="button"
                class="tool-toggle"
                :class="{ on: selectedGroup.activo }"
                :disabled="busy"
                :aria-pressed="selectedGroup.activo"
                :title="selectedGroup.activo
                  ? 'Ahora se ve en la app. Tocá para ocultarlo de muro y Enlaces'
                  : 'Ahora está oculto. Tocá para mostrarlo en la app'"
                @click="toggleGroup(selectedGroup)"
              >
                <span class="tool-toggle-track" aria-hidden="true"><span class="tool-toggle-knob" /></span>
                <span class="tool-toggle-text">
                  <strong>App</strong>
                  <small>{{ selectedGroup.activo ? 'Visible' : 'Oculto' }}</small>
                </span>
              </button>
            </div>

            <div
              class="tool-seg"
              role="group"
              aria-label="Tamaño de iconos en el admin"
              title="Solo afecta esta pantalla del admin; en la app el tamaño es uniforme"
            >
              <span class="tool-seg-label">Iconos</span>
              <div class="tool-seg-opts">
                <button
                  v-for="opt in iconSizeOpts"
                  :key="opt.value"
                  type="button"
                  class="tool-seg-btn"
                  :class="{ on: selectedGroup.iconSize === opt.value }"
                  :disabled="busy"
                  :aria-pressed="selectedGroup.iconSize === opt.value"
                  @click="setGroupIconSize(selectedGroup, opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <p v-if="!selectedLinks.length" class="hub-muted center">
          Este grupo no tiene enlaces. Creá uno con “Nuevo enlace”.
        </p>

        <template v-else>
          <section class="hub-section">
            <header class="hub-section-head">
              <h3>Accesos rápidos</h3>
              <span class="cat-stat soft">{{ selectedQuick.length }} en el muro</span>
            </header>
            <p class="hub-section-hint">
              Solo estos (con estrella) se muestran en el muro; si hay muchos, el usuario scrollea. Sin ninguno, ese grupo no aparece en el muro.
            </p>
            <div
              class="hub-grid"
              :class="{ 'drop-grid': dropLink?.cat === selectedGroup.nombre && dropLink?.idx == null }"
              @dragover.prevent="onGridDragOver(selectedGroup.nombre, $event)"
              @drop.prevent="onLinkDrop(selectedGroup.nombre, selectedQuickDropIdx)"
            >
              <article
                v-for="l in selectedQuick"
                :key="l.id"
                class="hub-card featured"
                :class="{
                  inactive: !l.activo || l.expired,
                  dragging: dragLink?.id === l.id,
                  'drop-before': dropLink?.cat === selectedGroup.nombre && dropLink?.idx === linkIndex(l),
                }"
                :data-kind="normalizeKindId(l.kind || l.openMode)"
                :style="cardStyle(l, selectedGroup)"
                @click="edit(l)"
                @dragover.prevent.stop="onLinkDragOver(selectedGroup.nombre, linkIndex(l), $event)"
                @drop.prevent.stop="onLinkDrop(selectedGroup.nombre, linkIndex(l))"
              >
                <div
                  class="card-kind"
                  :data-kind="normalizeKindId(l.kind || l.openMode)"
                  :title="kindLabel(l.kind || l.openMode)"
                >
                  {{ kindShort(l.kind || l.openMode) }}
                </div>
                <div class="card-top">
                  <div class="card-lead">
                    <span class="hub-ico" :data-size="resolvedSize(l, selectedGroup)" aria-hidden="true">
                      <HubIcon :name="l.icon" :size="iconPx(resolvedSize(l, selectedGroup))" />
                    </span>
                    <div class="card-copy">
                      <strong>{{ l.titulo }}</strong>
                      <small v-if="l.subtitulo">{{ l.subtitulo }}</small>
                    </div>
                  </div>
                  <div class="card-ops" @click.stop>
                    <button
                      type="button"
                      class="card-ico-btn"
                      :class="{ on: l.featured }"
                      :aria-label="l.featured ? 'Sacar del muro' : 'Pasar al muro'"
                      :title="l.featured ? 'Sacar de accesos rápidos del muro' : 'Pasar al muro'"
                      @click="toggleQuick(l)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.8 5.7 20.8 8 13.6 2 9.2h7.6L12 2z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="card-ico-btn"
                      :class="{ on: l.activo, danger: !l.activo }"
                      :aria-label="l.activo ? 'Desactivar' : 'Activar'"
                      :title="l.activo ? 'Desactivar enlace' : 'Activar enlace'"
                      @click="toggleLink(l)"
                    >
                      <svg v-if="l.activo" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.2L6.8 12l1.4-1.4 2.8 2.8 5.8-5.8L18.2 9l-7.2 7.2z"
                        />
                      </svg>
                      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="card-ico-btn danger"
                      aria-label="Borrar enlace"
                      title="Borrar enlace"
                      @click="askDeleteLink(l)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12l1-12H5l1 12z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="card-foot">
                  <span v-if="!l.activo" class="hub-badge">Inactivo</span>
                  <span v-else-if="l.expired" class="hub-badge">Vencido</span>
                  <span v-else-if="l.temporary" class="hub-badge temp">Hasta {{ l.visibleUntilDate }}</span>
                </div>
                <button
                  type="button"
                  class="drag-handle card-drag"
                  title="Arrastrar enlace"
                  draggable="true"
                  @click.stop
                  @dragstart.stop="onLinkDragStart(l, selectedGroup.nombre, linkIndex(l), $event)"
                  @dragend="onDragEnd"
                >⋮⋮</button>
              </article>
            </div>
            <p v-if="!selectedQuick.length" class="hub-muted hub-section-empty">
              Todavía no hay accesos rápidos. Tocá la estrella en otros enlaces.
            </p>
          </section>

          <section class="hub-section">
            <header class="hub-section-head">
              <h3>Otros enlaces</h3>
              <span class="cat-stat">{{ selectedOther.length }}</span>
            </header>
            <p class="hub-section-hint">
              Se ven en Enlaces (/accesos), no como botones del muro.
            </p>
            <div
              class="hub-grid"
              :class="{ 'drop-grid': dropLink?.cat === selectedGroup.nombre && dropLink?.idx == null }"
              @dragover.prevent="onGridDragOver(selectedGroup.nombre, $event)"
              @drop.prevent="onLinkDrop(selectedGroup.nombre, selectedLinks.length)"
            >
              <article
                v-for="l in selectedOther"
                :key="l.id"
                class="hub-card"
                :class="{
                  inactive: !l.activo || l.expired,
                  dragging: dragLink?.id === l.id,
                  'drop-before': dropLink?.cat === selectedGroup.nombre && dropLink?.idx === linkIndex(l),
                }"
                :data-kind="normalizeKindId(l.kind || l.openMode)"
                :style="cardStyle(l, selectedGroup)"
                @click="edit(l)"
                @dragover.prevent.stop="onLinkDragOver(selectedGroup.nombre, linkIndex(l), $event)"
                @drop.prevent.stop="onLinkDrop(selectedGroup.nombre, linkIndex(l))"
              >
                <div
                  class="card-kind"
                  :data-kind="normalizeKindId(l.kind || l.openMode)"
                  :title="kindLabel(l.kind || l.openMode)"
                >
                  {{ kindShort(l.kind || l.openMode) }}
                </div>
                <div class="card-top">
                  <div class="card-lead">
                    <span class="hub-ico" :data-size="resolvedSize(l, selectedGroup)" aria-hidden="true">
                      <HubIcon :name="l.icon" :size="iconPx(resolvedSize(l, selectedGroup))" />
                    </span>
                    <div class="card-copy">
                      <strong>{{ l.titulo }}</strong>
                      <small v-if="l.subtitulo">{{ l.subtitulo }}</small>
                    </div>
                  </div>
                  <div class="card-ops" @click.stop>
                    <button
                      type="button"
                      class="card-ico-btn"
                      :class="{ on: l.featured }"
                      :aria-label="l.featured ? 'Sacar del muro' : 'Pasar al muro'"
                      :title="l.featured ? 'Sacar de accesos rápidos del muro' : 'Pasar al muro'"
                      @click="toggleQuick(l)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.8 5.7 20.8 8 13.6 2 9.2h7.6L12 2z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="card-ico-btn"
                      :class="{ on: l.activo, danger: !l.activo }"
                      :aria-label="l.activo ? 'Desactivar' : 'Activar'"
                      :title="l.activo ? 'Desactivar enlace' : 'Activar enlace'"
                      @click="toggleLink(l)"
                    >
                      <svg v-if="l.activo" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.2L6.8 12l1.4-1.4 2.8 2.8 5.8-5.8L18.2 9l-7.2 7.2z"
                        />
                      </svg>
                      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="card-ico-btn danger"
                      aria-label="Borrar enlace"
                      title="Borrar enlace"
                      @click="askDeleteLink(l)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12l1-12H5l1 12z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="card-foot">
                  <span v-if="!l.activo" class="hub-badge">Inactivo</span>
                  <span v-else-if="l.expired" class="hub-badge">Vencido</span>
                  <span v-else-if="l.temporary" class="hub-badge temp">Hasta {{ l.visibleUntilDate }}</span>
                  <span v-else-if="l.clickCount" class="hub-meta">{{ l.clickCount }} clics</span>
                </div>
                <button
                  type="button"
                  class="drag-handle card-drag"
                  title="Arrastrar enlace"
                  draggable="true"
                  @click.stop
                  @dragstart.stop="onLinkDragStart(l, selectedGroup.nombre, linkIndex(l), $event)"
                  @dragend="onDragEnd"
                >⋮⋮</button>
              </article>
            </div>
            <p v-if="!selectedOther.length" class="hub-muted hub-section-empty">
              Todos los enlaces de este grupo están marcados como accesos rápidos.
            </p>
          </section>
        </template>
      </div>

      <div v-else class="hub-main hub-main-empty">
        <p class="hub-muted">Creá un grupo para empezar a organizar enlaces.</p>
      </div>
    </div>

    <p v-if="!loading && !items.length && !orderedCategories.length" class="hub-muted center">
      Todavía no hay enlaces. Creá el primero con “Nuevo enlace”.
    </p>

    <Teleport to="body">
    <div
      v-if="draft"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="draft.id ? 'Configurar enlace' : 'Nuevo enlace'"
      @click.self="closeDraft"
      @keydown.escape.prevent="closeDraft"
    >
      <form class="panel panel-wide link-dlg" @submit.prevent="save">
        <div class="link-dlg-head">
          <h2>{{ draft.id ? 'Configurar enlace' : 'Nuevo enlace' }}</h2>
          <div class="link-dlg-head-flags">
            <label class="check link-dlg-flag">
              <input v-model="draft.activo" type="checkbox" />
              Activo
            </label>
            <label class="check link-dlg-flag">
              <input v-model="draft.featured" type="checkbox" />
              Acceso rápido
            </label>
          </div>
          <div class="link-dlg-head-actions">
            <button
              v-if="draft.id"
              type="button"
              class="btn-ghost danger sm"
              @click="askDeleteDraft"
            >Borrar</button>
            <button type="submit" class="btn-primary sm" :disabled="saving">Guardar</button>
            <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeDraft">×</button>
          </div>
        </div>
        <p v-if="formError" class="err link-dlg-err">{{ formError }}</p>
        <p v-else-if="autosaveMsg" class="link-dlg-autosave">{{ autosaveMsg }}</p>

        <div class="link-dlg-layout">
          <nav class="link-dlg-nav" aria-label="Apartados del enlace">
            <button
              v-for="sec in draftSections"
              :key="sec.id"
              type="button"
              class="link-dlg-nav-item"
              :class="{ on: draftSection === sec.id }"
              :disabled="saving"
              @click="goDraftSection(sec.id)"
            >
              {{ sec.label }}
            </button>
          </nav>

          <div class="link-dlg-body">
            <section v-if="draftSection === 'preview'" class="link-dlg-sec">
              <h3 class="link-dlg-sec-title">Previsualización</h3>
              <p class="link-dlg-sec-hint">
                Así se ve el icono en el muro. Cambiá icono o color en
                <button type="button" class="link-dlg-inline" @click="goDraftSection('apariencia')">Apariencia</button>.
              </p>

              <div class="draft-preview-wrap" :style="muroBrandStyle" aria-label="Vista previa del icono">
                <div class="mp-hub compact">
                  <div class="mp-shell">
                    <div class="mp-card">
                      <div class="mp-actions">
                        <div
                          class="mp-action"
                          :style="muroLinkAccentStyle(draft)"
                        >
                          <span class="mp-action-ico" aria-hidden="true">
                            <HubIcon :name="draft.icon || 'link'" :size="28" />
                          </span>
                          <span class="mp-action-label">{{ draft.titulo || 'Título' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p class="link-dlg-sec-hint">También en la lista de Accesos:</p>
              <div
                class="hub-card preview draft-preview-card"
                :style="draft.color ? { '--accent': draft.color } : undefined"
                aria-hidden="true"
              >
                <div class="card-lead">
                  <span class="hub-ico" :data-size="previewSize">
                    <HubIcon :name="draft.icon || 'link'" :size="iconPx(previewSize)" />
                  </span>
                  <div class="card-copy">
                    <strong>{{ draft.titulo || 'Título' }}</strong>
                    <small>{{ draft.subtitulo || kindHint(draft.kind) }}</small>
                  </div>
                </div>
                <span class="kind-chip">{{ kindLabel(draft.kind) }}</span>
              </div>

              <div class="draft-try-row">
                <button
                  type="button"
                  class="btn-primary sm"
                  :disabled="!canTryDraft || tryingDraft"
                  @click="tryDraftLink"
                >
                  {{ tryingDraft ? 'Abriendo…' : 'Probar enlace' }}
                </button>
                <p v-if="tryDraftMsg" class="draft-try-msg" :class="{ err: tryDraftIsError }">{{ tryDraftMsg }}</p>
              </div>
            </section>

            <section v-if="draftSection === 'config'" class="link-dlg-sec">
              <h3 class="link-dlg-sec-title">Configuración</h3>
              <label>Título
                <input
                  ref="tituloInputEl"
                  v-model="draft.titulo"
                  class="input input-title"
                  maxlength="120"
                  @focus="titleTemplateTarget = 'titulo'"
                />
              </label>
              <label>Subtítulo
                <input
                  ref="subtituloInputEl"
                  v-model="draft.subtitulo"
                  class="input"
                  maxlength="200"
                  @focus="titleTemplateTarget = 'subtitulo'"
                />
              </label>
              <details class="title-tpl">
                <summary class="title-tpl-summary">
                  Valores dinámicos para título / subtítulo
                </summary>
                <div class="title-tpl-body">
                  <p class="field-hint">
                    Tocá un valor para insertarlo en el campo activo (título o subtítulo).
                  </p>
                  <div class="tpl-chips" role="group" aria-label="Valores dinámicos de título">
                    <button
                      v-for="t in hubTemplates"
                      :key="t.token"
                      type="button"
                      class="tpl-chip"
                      :title="`${t.hint} — inserta ${t.token}`"
                      @click="insertTitleTemplate(t.token)"
                    >
                      {{ t.label }}
                    </button>
                  </div>
                </div>
              </details>
              <div class="row2">
                <label>Grupo
                  <select v-model="draft.category" class="input">
                    <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                  </select>
                </label>
                <label>Orden<input v-model.number="draft.order" type="number" class="input" /></label>
              </div>
              <label>Visible hasta
                <input v-model="draft.visibleUntilDate" type="date" class="input" required />
              </label>
            </section>

            <section v-if="draftSection === 'tipo'" class="link-dlg-sec">
              <h3 class="link-dlg-sec-title">Tipo</h3>
              <p class="link-dlg-sec-hint">Elegí cómo se abre el enlace. Después configurá el link específico.</p>
              <fieldset class="kind-field">
                <legend>Tipo de destino</legend>
                <div v-for="group in kindGroups" :key="group" class="kind-group">
                  <p class="kind-group-label">{{ group }}</p>
                  <div class="kind-grid">
                    <button
                      v-for="k in kindsByGroup(group)"
                      :key="k.id"
                      type="button"
                      class="kind-opt"
                      :class="{ on: draft.kind === k.id }"
                      @click="setKind(k.id)"
                    >
                      <span class="kind-opt-ico" aria-hidden="true">
                        <HubIcon :name="k.icon || kindIcon(k.id)" :size="18" />
                      </span>
                      <span class="kind-opt-copy">
                        <strong>{{ k.label }}</strong>
                        <span>{{ k.hint }}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </fieldset>
              <div class="link-dlg-next">
                <button
                  type="button"
                  class="btn-primary sm"
                  :disabled="!draft.kind"
                  @click="goDraftSection('destino')"
                >
                  Continuar a Link específico →
                </button>
              </div>
            </section>

            <section v-if="draftSection === 'destino'" class="link-dlg-sec">
              <h3 class="link-dlg-sec-title">Link específico</h3>
              <p v-if="draft.kind" class="link-dlg-sec-hint">
                Según el tipo <strong>{{ kindLabel(draft.kind) }}</strong>.
                <button type="button" class="link-dlg-inline" @click="goDraftSection('tipo')">Cambiar tipo</button>
              </p>
              <p v-else class="link-dlg-sec-hint">
                Primero elegí un tipo.
                <button type="button" class="link-dlg-inline" @click="goDraftSection('tipo')">Ir a Tipo</button>
              </p>

              <details class="dest-ai">
                <summary class="dest-ai-summary">
                  <span class="dest-ai-summary-label">
                    Completar con IA
                    <CfgInfoTip
                      title="Completar link específico con IA"
                      body="Escribí en lenguaje simple qué querés que haga el enlace. La IA completa los campos de abajo según el tipo elegido. No hace falta JSON ni códigos."
                      :items="destAiHelpItems"
                    />
                  </span>
                </summary>
                <div class="dest-ai-body">
                  <p class="dest-ai-explain">
                    Describí el link en una frase. Ejemplo para
                    <strong>{{ kindLabel(draft.kind) || 'este tipo' }}</strong>:
                    «{{ destAiExample }}».
                  </p>
                  <label class="dest-ai-label">
                    <span class="hub-muted">Tu pedido</span>
                    <textarea
                      v-model="destAiPrompt"
                      class="input"
                      rows="2"
                      :placeholder="destAiExample"
                    />
                  </label>
                  <div class="dest-ai-actions">
                    <button
                      type="button"
                      class="btn-primary sm"
                      :disabled="destAiBusy || destAiPrompt.trim().length < 4"
                      @click="suggestDestinationAi"
                    >
                      {{ destAiBusy ? 'Generando…' : 'Completar link' }}
                    </button>
                    <span v-if="!aiConfigured" class="hub-muted dest-ai-note">Sin API: usa reglas locales</span>
                  </div>
                  <p v-if="destAiMsg" class="dest-ai-msg" :class="{ err: destAiIsError }">{{ destAiMsg }}</p>
                </div>
              </details>

              <div class="dest-box">
                <template v-if="draft.kind === 'url' || draft.kind === 'webview'">
                  <label>URL
                    <input v-model="draft.target" class="input" placeholder="https://ejemplo.com/…" />
                  </label>
                  <p v-if="draftUrlPreview" class="url-preview" aria-live="polite">
                    <span class="url-preview-label">Así se invocará esta URL</span>
                    <span class="url-preview-value">{{ draftUrlPreview }}</span>
                  </p>
                  <div class="query-field">
                    <div class="query-field-head">
                      <span>Parámetros extra de la URL <span class="hub-muted">(opcional)</span></span>
                      <CfgInfoTip
                        title="Parámetros extra de la URL"
                        purpose="Le mandan datos al sitio que se abre: quién es la persona, de dónde vino el clic o qué sección mostrar. Se agregan al final de la URL como ?clave=valor."
                        body="Se escriben en JSON (clave y valor). Con plantillas, Connectia reemplaza {{usuario}}, {{legajo}}, etc. por los datos de quien toca el enlace."
                        :examples="queryHelpExamples"
                        note="Si el sitio no usa estos datos, dejá el campo vacío. Las plantillas de texto largo (puntos_saludo, si puntos) sirven en correo o WhatsApp, no acá."
                      />
                    </div>
                    <input
                      ref="queryJsonInputEl"
                      v-model="draft.queryJson"
                      class="input"
                      :placeholder="queryPlaceholder"
                      aria-label="Parámetros extra de la URL en JSON"
                    />
                    <p class="field-hint">Tocá una plantilla para insertarla en el campo:</p>
                    <div class="tpl-chips" role="group" aria-label="Plantillas para parámetros">
                      <button
                        v-for="t in hubTemplates"
                        :key="t.token"
                        type="button"
                        class="tpl-chip"
                        :class="{ off: !templateEnabled(t, 'query') }"
                        :disabled="!templateEnabled(t, 'query')"
                        :title="templateChipTitle(t, 'query')"
                        @click="insertQueryTemplate(t.token)"
                      >
                        {{ t.label }}
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="draft.kind === 'route'">
                  <label>Ruta de la app
                    <input v-model="draft.target" class="input" placeholder="/muro o /solicitudes" list="hub-routes" />
                  </label>
                  <datalist id="hub-routes">
                    <option value="/muro" />
                    <option value="/solicitudes" />
                    <option value="/encuestas" />
                    <option value="/docs" />
                    <option value="/accesos" />
                    <option value="/guardados" />
                    <option value="/chat" />
                  </datalist>
                  <div class="query-field">
                    <div class="query-field-head">
                      <span>Parámetros de la ruta <span class="hub-muted">(opcional)</span></span>
                      <CfgInfoTip
                        title="Parámetros de la ruta"
                        purpose="Le dicen a una pantalla interna de Connectia cómo abrirse: pestaña, filtro o id. Se agregan a la ruta como ?clave=valor."
                        body="Se escriben en JSON. Las plantillas ({{usuario}}, etc.) se completan con los datos de quien abre el enlace."
                        :examples="routeQueryHelpExamples"
                        note="Si no hace falta filtrar la pantalla, dejá el campo vacío."
                      />
                    </div>
                    <input
                      ref="queryJsonInputEl"
                      v-model="draft.queryJson"
                      class="input"
                      placeholder='{"tab":"abiertas"}'
                      aria-label="Parámetros de la ruta en JSON"
                    />
                    <p class="field-hint">Tocá una plantilla para insertarla en el campo:</p>
                    <div class="tpl-chips" role="group" aria-label="Plantillas para parámetros">
                      <button
                        v-for="t in hubTemplates"
                        :key="t.token"
                        type="button"
                        class="tpl-chip"
                        :class="{ off: !templateEnabled(t, 'query') }"
                        :disabled="!templateEnabled(t, 'query')"
                        :title="templateChipTitle(t, 'query')"
                        @click="insertQueryTemplate(t.token)"
                      >
                        {{ t.label }}
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="draft.kind === 'request'">
                  <label>Plantilla de solicitud
                    <select v-model="draft.requestTypeId" class="input">
                      <option disabled value="">Elegí…</option>
                      <option v-for="t in options.requestTypes" :key="t.id" :value="t.id">
                        {{ t.nombre }}{{ t.area ? ` (${t.area})` : '' }}
                      </option>
                    </select>
                  </label>
                </template>

                <template v-else-if="draft.kind === 'survey'">
                  <label>Encuesta
                    <select v-model="draft.surveyId" class="input">
                      <option disabled value="">Elegí…</option>
                      <option v-for="s in options.surveys" :key="s.id" :value="s.id">
                        {{ s.titulo }} ({{ s.status }})
                      </option>
                    </select>
                  </label>
                </template>

                <template v-else-if="draft.kind === 'document'">
                  <label>Documento
                    <select v-model="draft.docId" class="input">
                      <option disabled value="">Elegí…</option>
                      <option v-for="d in options.documents" :key="d.id" :value="d.id">
                        {{ d.titulo }}{{ d.category ? ` · ${d.category}` : '' }}
                      </option>
                    </select>
                  </label>
                </template>

                <template v-else-if="draft.kind === 'post'">
                  <label>Publicación
                    <select v-model="draft.postId" class="input">
                      <option disabled value="">Elegí…</option>
                      <option v-for="p in options.posts" :key="p.id" :value="p.id">
                        {{ p.titulo }} ({{ p.status }})
                      </option>
                    </select>
                  </label>
                </template>

                <template v-else-if="draft.kind === 'mailto'">
                  <label>Email
                    <input v-model="draft.target" class="input" type="email" placeholder="rrhh@empresa.com" />
                  </label>
                  <label>Asunto
                    <input
                      ref="mailSubjectInputEl"
                      v-model="draft.mailSubject"
                      class="input"
                      :placeholder="mailSubjectPh"
                      @focus="templateTarget = 'mailSubject'"
                    />
                  </label>
                  <label>Cuerpo
                    <textarea
                      ref="mailBodyInputEl"
                      v-model="draft.mailBody"
                      class="input"
                      rows="3"
                      :placeholder="mailBodyPh"
                      @focus="templateTarget = 'mailBody'"
                    />
                  </label>
                  <p class="field-hint">Plantillas (click para insertar en asunto o cuerpo):</p>
                  <div class="tpl-chips" role="group" aria-label="Plantillas de correo">
                    <button
                      v-for="t in hubTemplates"
                      :key="t.token"
                      type="button"
                      class="tpl-chip"
                      :class="{ off: !templateEnabled(t, 'text') }"
                      :disabled="!templateEnabled(t, 'text')"
                      :title="templateChipTitle(t, 'text')"
                      @click="insertTextTemplate(t.token)"
                    >
                      {{ t.label }}
                    </button>
                  </div>
                </template>

                <template v-else-if="draft.kind === 'tel'">
                  <label>Teléfono
                    <input v-model="draft.target" class="input" placeholder="+54 11 5555-5555" />
                  </label>
                </template>

                <template v-else-if="draft.kind === 'whatsapp'">
                  <label>Número (con código de país)
                    <input v-model="draft.target" class="input" placeholder="5491155555555" />
                  </label>
                  <label>Mensaje inicial
                    <textarea
                      ref="waTextInputEl"
                      v-model="draft.waText"
                      class="input"
                      rows="2"
                      :placeholder="waPh"
                      @focus="templateTarget = 'waText'"
                    />
                  </label>
                  <p class="field-hint">Plantillas (click para insertar en el mensaje):</p>
                  <div class="tpl-chips" role="group" aria-label="Plantillas de WhatsApp">
                    <button
                      v-for="t in hubTemplates"
                      :key="t.token"
                      type="button"
                      class="tpl-chip"
                      :class="{ off: !templateEnabled(t, 'text') }"
                      :disabled="!templateEnabled(t, 'text')"
                      :title="templateChipTitle(t, 'text')"
                      @click="insertTextTemplate(t.token)"
                    >
                      {{ t.label }}
                    </button>
                  </div>
                </template>

                <template v-else-if="draft.kind === 'copy'">
                  <label>Texto a copiar
                    <textarea
                      ref="copyTextInputEl"
                      v-model="draft.copyText"
                      class="input"
                      rows="2"
                      placeholder="CODIGO-BENEFICIO-2026"
                      @focus="templateTarget = 'copyText'"
                    />
                  </label>
                  <label>Mensaje al copiar
                    <input v-model="draft.copyMessage" class="input" placeholder="Código copiado" />
                  </label>
                  <p class="field-hint">Plantillas (click para insertar en el texto):</p>
                  <div class="tpl-chips" role="group" aria-label="Plantillas de copiar">
                    <button
                      v-for="t in hubTemplates"
                      :key="t.token"
                      type="button"
                      class="tpl-chip"
                      :class="{ off: !templateEnabled(t, 'text') }"
                      :disabled="!templateEnabled(t, 'text')"
                      :title="templateChipTitle(t, 'text')"
                      @click="insertTextTemplate(t.token)"
                    >
                      {{ t.label }}
                    </button>
                  </div>
                </template>

                <template v-else>
                  <p class="hub-muted">Elegí un tipo en la sección Tipo para configurar el link específico.</p>
                  <button type="button" class="btn-ghost sm" @click="goDraftSection('tipo')">Ir a Tipo</button>
                </template>
              </div>
            </section>

            <section v-if="draftSection === 'apariencia'" class="link-dlg-sec">
              <h3 class="link-dlg-sec-title">Apariencia</h3>
              <p class="link-dlg-sec-hint">
                La vista final está en
                <button type="button" class="link-dlg-inline" @click="goDraftSection('preview')">Previsualización</button>.
              </p>

              <fieldset class="icon-field">
                <legend>Icono</legend>
                <input
                  v-model="iconQuery"
                  class="input icon-search"
                  type="search"
                  placeholder="Buscar…"
                />
                <div class="icon-grid" role="listbox" aria-label="Iconos">
                  <button
                    v-for="opt in filteredIcons"
                    :key="opt.id"
                    type="button"
                    class="icon-opt"
                    :class="{ on: draft.icon === opt.id }"
                    :title="opt.name"
                    @click="draft.icon = opt.id"
                  >
                    <HubIcon :name="opt.id" :size="14" />
                  </button>
                </div>
              </fieldset>

              <div class="row2">
                <div class="size-field">
                  <span class="size-field-label">Tamaño (solo admin)</span>
                  <div class="tool-seg-opts size-seg" role="group" aria-label="Tamaño del icono">
                    <button
                      v-for="opt in draftIconSizeOpts"
                      :key="opt.value"
                      type="button"
                      class="tool-seg-btn"
                      :class="{ on: draft.iconSize === opt.value }"
                      :aria-pressed="draft.iconSize === opt.value"
                      @click="draft.iconSize = opt.value"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
                <label>Color
                  <span class="color-row">
                    <input
                      type="color"
                      class="color-swatch"
                      :value="draft.color || 'var(--brand-primary)'"
                      @input="draft.color = $event.target.value"
                    />
                    <input v-model="draft.color" class="input" placeholder="Marca" />
                  </span>
                  <button v-if="draft.color" type="button" class="btn-ghost sm" @click="draft.color = ''">Quitar color</button>
                </label>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="deleteConfirmOpen"
      class="hub-dlg-scrim hub-dlg-scrim--confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-delete-title"
      @click.self="closeDeleteConfirm"
      @keydown.escape.prevent="closeDeleteConfirm"
    >
      <div class="panel hub-confirm-panel">
        <div class="panel-head">
          <h2 id="hub-delete-title">Borrar enlace</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeDeleteConfirm">×</button>
        </div>
        <p class="hub-confirm-text">
          ¿Borrar «{{ deleteTarget?.titulo || 'este enlace' }}»? Esta acción no se puede deshacer.
        </p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="deleting" @click="closeDeleteConfirm">
            Cancelar
          </button>
          <button type="button" class="btn-primary danger" :disabled="deleting" @click="confirmDeleteLink">
            {{ deleting ? 'Borrando…' : 'Borrar' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import ScreenHelp from '../components/ScreenHelp.vue'
import HubIcon from '../components/HubIcon.vue'
import CfgInfoTip from '../components/CfgInfoTip.vue'
import { HUB_ICONS, resolveIconSize } from '../utils/hubIcons'
import { HUB_KINDS, HUB_KIND_GROUPS, kindLabel, kindShort, kindIcon, normalizeKindId } from '../utils/hubKinds'

const auth = useAuthStore()
const ICON_PX = { sm: 16, md: 20, lg: 26 }
const iconSizeOpts = [
  { value: 'sm', label: 'Chico' },
  { value: 'md', label: 'Medio' },
  { value: 'lg', label: 'Grande' },
]
const draftIconSizeOpts = [
  { value: 'inherit', label: 'Grupo' },
  { value: 'sm', label: 'Chico' },
  { value: 'md', label: 'Medio' },
  { value: 'lg', label: 'Grande' },
]
const iconOptions = HUB_ICONS
const kindGroups = HUB_KIND_GROUPS
/** Plantillas dinámicas al abrir el enlace. */
const hubTemplates = [
  { token: '{{usuario}}', label: 'usuario', hint: 'Usuario de login', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{legajo}}', label: 'legajo', hint: 'Legajo / id externo', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{nombre}}', label: 'nombre', hint: 'Nombre y apellido', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{primer_nombre}}', label: 'primer_nombre', hint: 'Solo el nombre de pila', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{apellido}}', label: 'apellido', hint: 'Apellido', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{iniciales}}', label: 'iniciales', hint: 'Iniciales (ej. JP)', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{email}}', label: 'email', hint: 'Email de la persona', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{telefono}}', label: 'telefono', hint: 'Teléfono', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{dni}}', label: 'dni', hint: 'Documento (DNI)', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{cuil}}', label: 'cuil', hint: 'CUIL / CUIT', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{cargo}}', label: 'cargo', hint: 'Cargo / puesto', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{sede}}', label: 'sede', hint: 'Sede / sucursal', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{fecha_ingreso}}', label: 'fecha_ingreso', hint: 'Fecha de ingreso (dd/mm/aaaa)', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{fecha_hoy}}', label: 'fecha_hoy', hint: 'Fecha de hoy (dd/mm/aaaa)', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{empCodigo}}', label: 'empCodigo', hint: 'Código de la comunidad', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{tenant}}', label: 'tenant', hint: 'Nombre de la comunidad', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{puntos}}', label: 'puntos', hint: 'Puntos (número)', kinds: ['url', 'webview', 'route', 'mailto', 'whatsapp', 'copy'], query: true },
  { token: '{{puntos_saludo}}', label: 'puntos_saludo', hint: 'Frase con puntos', kinds: ['mailto', 'whatsapp', 'copy'], query: false },
  { token: '{{si_puntos_gt:10:Tenés muchos}}', label: 'si puntos >', hint: 'Texto condicional según puntos', kinds: ['mailto', 'whatsapp', 'copy'], query: false },
]
const queryHelpExamples = [
  {
    label: 'Marcar de dónde vino el clic',
    code: '{"ref":"portal"}',
    result: 'https://vpn.empresa.com/login?ref=portal',
  },
  {
    label: 'Enviar el legajo de quien abre el enlace',
    code: '{"legajo":"{{legajo}}"}',
    result: 'https://rrhh.empresa.com/ficha?legajo=A12345',
  },
  {
    label: 'Varios datos a la vez',
    code: '{"u":"{{usuario}}","mail":"{{email}}"}',
    result: 'https://beneficios.empresa.com/?u=jperez&mail=jperez@empresa.com',
  },
]
const routeQueryHelpExamples = [
  {
    label: 'Abrir Solicitudes en la pestaña Abiertas',
    code: '{"tab":"abiertas"}',
    result: '/solicitudes?tab=abiertas',
  },
  {
    label: 'Pasar el usuario a la pantalla',
    code: '{"usuario":"{{usuario}}"}',
    result: '/docs?usuario=jperez',
  },
]
const destAiHelpItems = [
  'URL: “abrí https://vpn.empresa.com” o “portal de RRHH https://…”',
  'Correo: “mail a rrhh@empresa.com con asunto Consulta”',
  'WhatsApp: “WhatsApp al 54911… con mensaje Hola”',
  'Encuesta / solicitud / documento: “usá la encuesta Clima laboral”',
  'Ruta: “ir a /solicitudes” o “pantalla de vacaciones /ausencias”',
]
const destAiExamplesByKind = {
  url: 'Abrí la página de C5N (o https://www.c5n.com)',
  webview: 'Mostrá dentro de la app https://intranet.empresa.com',
  route: 'Que vaya a /solicitudes',
  request: 'Usá la solicitud de Vacaciones',
  survey: 'Abrí la encuesta Clima laboral',
  document: 'Abrí el documento Reglamento interno',
  post: 'Abrí la publicación del lanzamiento',
  mailto: 'Correo a rrhh@empresa.com asunto Consulta de {{nombre}}',
  tel: 'Llamar al +54 11 5555-5555',
  whatsapp: 'WhatsApp 5491155555555 mensaje Hola, soy {{nombre}}',
  copy: 'Copiar el código BENEFICIO-2026',
  sso: 'Abrí el acceso SSO del portal',
}

const destAiExample = computed(() => {
  const kind = draft.value?.kind
  return destAiExamplesByKind[kind] || 'Ej. abrí https://ejemplo.com o correo a rrhh@empresa.com'
})

const queryPlaceholder = '{"ref":"{{usuario}}"}'
const mailSubjectPh = 'Consulta de {{nombre}}'
const mailBodyPh = 'Hola, soy {{nombre}}…'
const waPh = 'Hola, soy {{nombre}} de {{tenant}}'
const iconQuery = ref('')
const queryJsonInputEl = ref(null)
const tituloInputEl = ref(null)
const subtituloInputEl = ref(null)
const mailSubjectInputEl = ref(null)
const mailBodyInputEl = ref(null)
const waTextInputEl = ref(null)
const copyTextInputEl = ref(null)
const templateTarget = ref('mailBody')
const titleTemplateTarget = ref('titulo')
const items = ref([])
const categories = ref([])
const options = ref({ requestTypes: [], surveys: [], documents: [], posts: [] })
const draft = ref(null)
const draftSection = ref('preview')
const draftSections = [
  { id: 'preview', label: 'Previsualización' },
  { id: 'config', label: 'Configuración' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'destino', label: 'Link específico' },
  { id: 'apariencia', label: 'Apariencia' },
]
const error = ref('')
const formError = ref('')
const autosaveMsg = ref('')
let autosaveMsgTimer = null
const saving = ref(false)
const deleteConfirmOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const tryingDraft = ref(false)
const tryDraftMsg = ref('')
const tryDraftIsError = ref(false)
const destAiPrompt = ref('')
const destAiBusy = ref(false)
const destAiMsg = ref('')
const destAiIsError = ref(false)
const loading = ref(true)
const busy = ref(false)
const dragLink = ref(null)
const dropLink = ref(null)
const dragGroup = ref(null)
const dropGroup = ref(null)
const renamingNombre = ref('')
const renameDraft = ref('')
const newGroupOpen = ref(false)
const newGroupDraft = ref('')
const newGroupInputEl = ref(null)
const muroPreviewCat = ref('')
const muroPreviewOpen = ref(false)

/** Color de marca de la comunidad (no el lila del admin). */
const muroBrandStyle = computed(() => {
  const b = auth.tenant?.branding || {}
  const primary = String(b.primary || b.primaryColor || '').trim()
  const color = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(primary)
    ? primary
    : '#0F766E'
  return {
    '--brand-primary': color,
    '--mp-accent': color,
  }
})
const selectedGroupNombre = ref('')

const aiOpen = ref(false)
const aiIntent = ref('edit')
const aiConfigured = ref(false)
const aiGuide = ref(null)
const aiPrompt = ref('')
const aiPlan = ref(null)
const aiBusy = ref(false)
const aiMode = ref('')
const aiError = ref('')
const aiInfo = ref('')

const aiExamples = computed(() => {
  if (aiIntent.value === 'create') {
    return aiGuide.value?.createExamples?.length
      ? aiGuide.value.createExamples
      : [
          'Creá el grupo Beneficios con Portal, Nómina y Vacaciones',
          'Nuevo grupo TI con VPN (https://vpn.empresa.com) y Helpdesk',
          'Agregá en RRHH el enlace Vacaciones apuntando a https://rrhh.empresa.com/vacaciones',
        ]
  }
  return aiGuide.value?.examples || [
    'Marcá como rápidos los 3 de más clics en cada grupo',
    'Poné todos los iconos en mediano y color var(--brand-primary)',
    'Ordená los grupos: Connectia, TI, RRHH, Comunicación',
  ]
})

function iconPx(size) {
  return ICON_PX[size] || ICON_PX.md
}

const catMeta = computed(() => Object.fromEntries(categories.value.map((c) => [c.nombre, c])))

const orderedCategories = computed(() =>
  [...categories.value].sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100) || a.nombre.localeCompare(b.nombre)),
)

watch(
  orderedCategories,
  (cats) => {
    if (!cats.length) {
      selectedGroupNombre.value = ''
      return
    }
    if (!cats.some((c) => c.nombre === selectedGroupNombre.value)) {
      selectedGroupNombre.value = cats[0].nombre
    }
  },
  { immediate: true },
)

const selectedGroup = computed(() =>
  orderedCategories.value.find((c) => c.nombre === selectedGroupNombre.value) || null,
)

function selectGroup(nombre) {
  selectedGroupNombre.value = nombre
  cancelRename()
}

const grouped = computed(() => {
  const byCat = {}
  for (const cat of orderedCategories.value) byCat[cat.nombre] = []
  for (const l of [...items.value].sort((a, b) => (a.order ?? 100) - (b.order ?? 100))) {
    const cat = l.category || 'General'
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat].push(l)
  }
  return byCat
})

/** Grupos visibles en el muro: activos, showOnMuro y con al menos un acceso rápido. */
const muroPreviewCats = computed(() =>
  orderedCategories.value.filter((c) => {
    if (c.activo === false || c.showOnMuro === false) return false
    const list = grouped.value[c.nombre] || []
    return list.some((l) => l.featured && l.activo !== false && !l.expired)
  }),
)

watch(
  muroPreviewCats,
  (cats) => {
    if (!cats.length) {
      muroPreviewCat.value = ''
      return
    }
    if (!cats.some((c) => c.nombre === muroPreviewCat.value)) {
      muroPreviewCat.value = cats[0].nombre
    }
  },
  { immediate: true },
)

const muroPreviewQuick = computed(() => {
  const cat = muroPreviewCat.value
  if (!cat) return []
  const list = (grouped.value[cat] || []).filter((l) => l.activo !== false && !l.expired)
  return list.filter((l) => l.featured)
})

const selectedLinks = computed(() => {
  const name = selectedGroupNombre.value
  if (!name) return []
  return grouped.value[name] || []
})

const selectedQuick = computed(() => selectedLinks.value.filter((l) => l.featured))
const selectedOther = computed(() => selectedLinks.value.filter((l) => !l.featured))

/** Índice en la lista completa del grupo (para drag & drop). */
function linkIndex(l) {
  return selectedLinks.value.findIndex((x) => x.id === l.id)
}

/** Al soltar en el área vacía de rápidos, insertar al inicio de esa zona. */
const selectedQuickDropIdx = computed(() => {
  const firstOther = selectedLinks.value.findIndex((l) => !l.featured)
  return firstOther < 0 ? selectedLinks.value.length : firstOther
})

const categoryOptions = computed(() => {
  const set = new Set(categories.value.map((c) => c.nombre))
  set.add('General')
  if (draft.value?.category) set.add(draft.value.category)
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
})

const filteredIcons = computed(() => {
  const q = iconQuery.value.trim().toLowerCase()
  if (!q) return iconOptions
  return iconOptions.filter((o) => o.name.toLowerCase().includes(q) || o.id.includes(q))
})

const previewSize = computed(() => {
  if (!draft.value) return 'md'
  const cat = catMeta.value[draft.value.category]
  return resolveIconSize(
    draft.value.iconSize === 'inherit' ? null : draft.value.iconSize,
    cat?.iconSize,
  )
})

function kindHint(id) {
  return HUB_KINDS.find((k) => k.id === id)?.hint || 'Subtítulo opcional'
}

function kindsByGroup(group) {
  return HUB_KINDS.filter((k) => k.group === group)
}

function setKind(id) {
  draft.value.kind = id
  if (id === 'mailto') templateTarget.value = 'mailBody'
  else if (id === 'whatsapp') templateTarget.value = 'waText'
  else if (id === 'copy') templateTarget.value = 'copyText'
  goDraftSection('destino')
}

function templateEnabled(t, mode) {
  const kind = draft.value?.kind
  if (!kind || !t?.kinds?.includes(kind)) return false
  if (mode === 'query') return Boolean(t.query)
  return true
}

function templateChipTitle(t, mode) {
  if (!templateEnabled(t, mode)) {
    if (mode === 'query' && t?.kinds?.includes(draft.value?.kind) && !t.query) {
      return 'No aplica a parámetros de URL (usala en correo / WhatsApp / copiar)'
    }
    return 'No aplica a este tipo de destino'
  }
  return `${t.hint} — inserta ${t.token}`
}

function insertAtInput(el, modelKey, token) {
  if (!draft.value) return
  const raw = String(draft.value[modelKey] || '')
  if (el && typeof el.selectionStart === 'number') {
    const start = el.selectionStart
    const end = el.selectionEnd ?? start
    draft.value[modelKey] = raw.slice(0, start) + token + raw.slice(end)
    const pos = start + token.length
    nextTick(() => {
      el.focus()
      try {
        el.setSelectionRange(pos, pos)
      } catch {
        /* ignore */
      }
    })
    return
  }
  draft.value[modelKey] = raw + token
}

function insertQueryTemplate(token) {
  const t = hubTemplates.find((x) => x.token === token)
  if (!templateEnabled(t, 'query') || !draft.value) return
  const key = String(t.label || 'ref')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 40) || 'ref'
  const raw = String(draft.value.queryJson || '').trim()
  let obj = {}
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = { ...parsed }
      else obj = {}
    } catch {
      obj = {}
    }
  }
  // Si la clave ya existe con el mismo valor, no duplicar; si existe otra, usar clave2
  let finalKey = key
  if (obj[finalKey] != null && String(obj[finalKey]) !== token) {
    let i = 2
    while (obj[`${key}${i}`] != null && i < 20) i += 1
    finalKey = `${key}${i}`
  }
  obj[finalKey] = token
  draft.value.queryJson = JSON.stringify(obj)
  nextTick(() => queryJsonInputEl.value?.focus())
}

function insertTitleTemplate(token) {
  if (!draft.value || !token) return
  const key = titleTemplateTarget.value === 'subtitulo' ? 'subtitulo' : 'titulo'
  const el = key === 'subtitulo' ? subtituloInputEl.value : tituloInputEl.value
  insertAtInput(el, key, token)
}

function insertTextTemplate(token) {
  const t = hubTemplates.find((x) => x.token === token)
  if (!templateEnabled(t, 'text')) return
  const kind = draft.value?.kind
  let key = 'mailBody'
  let el = mailBodyInputEl.value
  if (kind === 'mailto') {
    key = templateTarget.value === 'mailSubject' ? 'mailSubject' : 'mailBody'
    el = key === 'mailSubject' ? mailSubjectInputEl.value : mailBodyInputEl.value
  } else if (kind === 'whatsapp') {
    key = 'waText'
    el = waTextInputEl.value
  } else if (kind === 'copy') {
    key = 'copyText'
    el = copyTextInputEl.value
  }
  insertAtInput(el, key, token)
}

function memberAppBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && /localhost:5174/i.test(window.location.origin)) {
    return 'http://localhost:5173'
  }
  return String(import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
}

function digitsOnly(phone) {
  return String(phone || '').replace(/\D+/g, '')
}

function draftDestinationReady(d) {
  if (!d?.kind) return false
  const kind = d.kind
  if (kind === 'url' || kind === 'webview' || kind === 'route' || kind === 'mailto' || kind === 'tel' || kind === 'whatsapp') {
    return Boolean(String(d.target || '').trim())
  }
  if (kind === 'request') return Boolean(d.requestTypeId)
  if (kind === 'survey') return Boolean(d.surveyId)
  if (kind === 'document') return Boolean(d.docId)
  if (kind === 'post') return Boolean(d.postId)
  if (kind === 'copy') return Boolean(String(d.copyText || '').trim())
  if (kind === 'sso') return Boolean(String(d.target || '').trim())
  return false
}

const canTryDraft = computed(() => draftDestinationReady(draft.value))

/** Vista previa informativa: URL + parámetros extra (plantillas sin resolver). */
const draftUrlPreview = computed(() => {
  const d = draft.value
  if (!d || (d.kind !== 'url' && d.kind !== 'webview')) return ''
  const base = String(d.target || '').trim()
  if (!base) return ''
  const query = parseQueryJson(d.queryJson)
  if (!query || typeof query !== 'object' || !Object.keys(query).length) return base
  try {
    const u = new URL(base)
    for (const [k, v] of Object.entries(query)) {
      if (v == null || v === '') continue
      u.searchParams.set(String(k), String(v))
    }
    return decodeURIComponent(u.toString())
  } catch {
    const qs = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => [String(k), String(v)]),
    ).toString()
    if (!qs) return base
    return `${base}${base.includes('?') ? '&' : '?'}${qs}`
  }
})

function resolveDraftTryAction(d) {
  const body = (() => {
    const params = {}
    const query = parseQueryJson(d.queryJson)
    if (query) params.query = query
    let target = d.target || ''
    if (d.kind === 'request') {
      target = d.requestTypeId
      params.requestTypeId = d.requestTypeId
    } else if (d.kind === 'survey') {
      target = d.surveyId
      params.surveyId = d.surveyId
    } else if (d.kind === 'document') {
      target = d.docId
      params.docId = d.docId
    } else if (d.kind === 'post') {
      target = d.postId
      params.postId = d.postId
    } else if (d.kind === 'mailto') {
      if (d.mailSubject) params.subject = d.mailSubject
      if (d.mailBody) params.body = d.mailBody
    } else if (d.kind === 'whatsapp') {
      if (d.waText) params.text = d.waText
    } else if (d.kind === 'copy') {
      params.copyText = d.copyText
      params.message = d.copyMessage || 'Copiado al portapapeles'
      target = d.copyText
    }
    return { kind: d.kind, target, params, titulo: d.titulo }
  })()

  const kind = body.kind
  const target = String(body.target || '').trim()
  const p = body.params || {}

  switch (kind) {
    case 'route': {
      const path = target.startsWith('/') ? target : `/${target}`
      return { action: 'navigate', path, query: p.query }
    }
    case 'request':
      return { action: 'navigate', path: '/solicitudes', query: { nueva: '1', tipo: String(p.requestTypeId || target || '') } }
    case 'survey':
      return { action: 'navigate', path: `/encuestas/${p.surveyId || target}` }
    case 'document':
      return { action: 'navigate', path: '/docs', query: { doc: String(p.docId || target || '') } }
    case 'post':
      return { action: 'navigate', path: `/muro/${p.postId || target}` }
    case 'mailto': {
      const q = new URLSearchParams()
      if (p.subject) q.set('subject', p.subject)
      if (p.body) q.set('body', p.body)
      const qs = q.toString()
      return { action: 'external', url: `mailto:${target}${qs ? `?${qs}` : ''}` }
    }
    case 'tel':
      return { action: 'external', url: `tel:${digitsOnly(target)}` }
    case 'whatsapp': {
      const phone = digitsOnly(target)
      const text = p.text || ''
      return {
        action: 'external',
        url: text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/${phone}`,
      }
    }
    case 'copy':
      return { action: 'copy', text: p.copyText || target, message: p.message || 'Copiado al portapapeles' }
    case 'webview':
    case 'url': {
      let url = target
      if (p.query && typeof p.query === 'object') {
        try {
          const u = new URL(url)
          for (const [k, v] of Object.entries(p.query)) {
            if (v != null && v !== '') u.searchParams.set(k, String(v))
          }
          url = u.toString()
        } catch {
          const qs = new URLSearchParams(
            Object.entries(p.query)
              .filter(([, v]) => v != null && v !== '')
              .map(([k, v]) => [k, String(v)]),
          ).toString()
          if (qs) url += (url.includes('?') ? '&' : '?') + qs
        }
      }
      return { action: 'external', url }
    }
    case 'sso':
      return { action: 'sso' }
    default:
      return { action: 'external', url: target }
  }
}

async function tryDraftLink() {
  const d = draft.value
  if (!d || !canTryDraft.value || tryingDraft.value) return
  tryDraftMsg.value = ''
  tryDraftIsError.value = false
  tryingDraft.value = true
  try {
    const resolved = resolveDraftTryAction(d)
    if (resolved.action === 'sso') {
      tryDraftIsError.value = true
      tryDraftMsg.value = 'SSO solo se puede probar desde la app una vez guardado.'
      return
    }
    if (resolved.action === 'copy') {
      await navigator.clipboard.writeText(resolved.text || '')
      tryDraftMsg.value = resolved.message || 'Copiado al portapapeles'
      return
    }
    if (resolved.action === 'navigate') {
      const base = memberAppBaseUrl()
      const u = new URL(resolved.path || '/', base)
      if (resolved.query && typeof resolved.query === 'object') {
        for (const [k, v] of Object.entries(resolved.query)) {
          if (v != null && v !== '') u.searchParams.set(k, String(v))
        }
      }
      window.open(u.toString(), '_blank', 'noopener,noreferrer')
      tryDraftMsg.value = 'Se abrió la app en una pestaña nueva.'
      return
    }
    const url = resolved.url
    if (!url) {
      tryDraftIsError.value = true
      tryDraftMsg.value = 'Completá el destino para probarlo.'
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    tryDraftMsg.value = 'Se abrió el destino en una pestaña nueva.'
  } catch (e) {
    tryDraftIsError.value = true
    tryDraftMsg.value = e.message || 'No se pudo probar el enlace'
  } finally {
    tryingDraft.value = false
  }
}

function parseQueryJson(raw) {
  const s = String(raw || '').trim()
  if (!s) return undefined
  try {
    const obj = JSON.parse(s)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj
  } catch {
    /* ignore */
  }
  return undefined
}

function emptyDraft(overrides = {}) {
  return {
    titulo: '',
    subtitulo: '',
    kind: 'url',
    target: '',
    queryJson: '',
    requestTypeId: '',
    surveyId: '',
    docId: '',
    postId: '',
    mailSubject: '',
    mailBody: '',
    waText: '',
    copyText: '',
    copyMessage: 'Copiado al portapapeles',
    category: selectedGroupNombre.value || orderedCategories.value[0]?.nombre || 'General',
    icon: 'grid',
    color: '',
    iconSize: 'inherit',
    order: (items.value.at(-1)?.order || 0) + 10,
    visibleUntilDate: '2099-01-01',
    activo: true,
    featured: false,
    ...overrides,
  }
}

function resolvedSize(l, cat) {
  return resolveIconSize(l.iconSize, cat?.iconSize)
}

function cardStyle(l, cat) {
  const style = {}
  if (l.color) style['--accent'] = l.color
  return style
}

/** Acento por enlace en la preview del muro (igual que la app). */
function muroLinkAccentStyle(l) {
  const c = String(l?.color || '').trim()
  if (!c || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) return undefined
  return { '--accent': c }
}

function onDragEnd() {
  dragLink.value = null
  dropLink.value = null
  dragGroup.value = null
  dropGroup.value = null
}

function onLinkDragStart(l, cat, idx, e) {
  dragLink.value = { id: l.id, cat, idx }
  dragGroup.value = null
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', `link:${l.id}`)
}

function onLinkDragOver(cat, idx, e) {
  if (!dragLink.value) return
  e.dataTransfer.dropEffect = 'move'
  dropLink.value = { cat, idx }
  dropGroup.value = null
}

function onGridDragOver(cat, e) {
  if (!dragLink.value) return
  // Solo marcar “al final” si no estamos sobre una card
  if (e.target.closest?.('.hub-card')) return
  e.dataTransfer.dropEffect = 'move'
  dropLink.value = { cat, idx: null }
  dropGroup.value = null
}

async function onLinkDrop(toCat, toIdx) {
  const src = dragLink.value
  onDragEnd()
  if (!src || busy.value) return

  const fromList = [...(grouped.value[src.cat] || [])]
  const fromIdx = fromList.findIndex((x) => x.id === src.id)
  if (fromIdx < 0) return

  let insertAt = toIdx
  if (insertAt == null) insertAt = (grouped.value[toCat] || []).length

  // Misma lista: ajustar índice si removemos antes del destino
  if (src.cat === toCat) {
    if (fromIdx === insertAt || fromIdx + 1 === insertAt) return
    const next = [...fromList]
    const [moved] = next.splice(fromIdx, 1)
    if (fromIdx < insertAt) insertAt -= 1
    next.splice(insertAt, 0, moved)
    await persistLinkOrder(toCat, next)
    return
  }

  const toList = [...(grouped.value[toCat] || [])]
  const [moved] = fromList.splice(fromIdx, 1)
  toList.splice(Math.min(insertAt, toList.length), 0, moved)
  await persistMoveAcross(moved, toCat, fromList, toList)
}

async function persistLinkOrder(catName, orderedList) {
  const patch = orderedList.map((l, i) => ({ id: l.id, order: (i + 1) * 10 }))
  // Optimistic
  for (const row of patch) {
    const it = items.value.find((x) => x.id === row.id)
    if (it) it.order = row.order
  }
  busy.value = true
  try {
    await api.post('/admin/hub/reorder', { items: patch })
  } catch (e) {
    error.value = e.response?.data?.error || e.message
    await load()
  } finally {
    busy.value = false
  }
}

async function persistMoveAcross(moved, toCat, fromList, toList) {
  busy.value = true
  try {
    await api.patch(`/admin/hub/${moved.id}`, { category: toCat })
    const it = items.value.find((x) => x.id === moved.id)
    if (it) it.category = toCat
    const patch = [
      ...fromList.map((l, i) => ({ id: l.id, order: (i + 1) * 10 })),
      ...toList.map((l, i) => ({ id: l.id, order: (i + 1) * 10 })),
    ]
    for (const row of patch) {
      const rowItem = items.value.find((x) => x.id === row.id)
      if (rowItem) {
        rowItem.order = row.order
        if (row.id === moved.id) rowItem.category = toCat
      }
    }
    await api.post('/admin/hub/reorder', { items: patch })
  } catch (e) {
    error.value = e.response?.data?.error || e.message
    await load()
  } finally {
    busy.value = false
  }
}

function onGroupDragStart(nombre, idx, e) {
  dragGroup.value = nombre
  dragLink.value = null
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', `group:${nombre}`)
}

function onGroupDragOver(nombre, e) {
  if (!dragGroup.value || dragGroup.value === nombre) return
  // Evitar capturar cuando se arrastra un link
  if (dragLink.value) return
  e.dataTransfer.dropEffect = 'move'
  dropGroup.value = nombre
}

async function onGroupDrop(toNombre, toIdx) {
  if (dragLink.value) {
    await onLinkDrop(toNombre, (grouped.value[toNombre] || []).length)
    selectGroup(toNombre)
    return
  }
  const fromNombre = dragGroup.value
  onDragEnd()
  if (!fromNombre || fromNombre === toNombre || busy.value) return
  const list = [...orderedCategories.value]
  const fromIdx = list.findIndex((c) => c.nombre === fromNombre)
  if (fromIdx < 0) return
  const [moved] = list.splice(fromIdx, 1)
  let insertAt = list.findIndex((c) => c.nombre === toNombre)
  if (insertAt < 0) insertAt = Math.min(toIdx, list.length)
  list.splice(insertAt, 0, moved)
  list.forEach((c, i) => {
    c.orden = (i + 1) * 10
  })
  await persistCategories(list)
}

async function loadOptions() {
  try {
    const { data } = await api.get('/admin/hub/options')
    options.value = {
      requestTypes: data.requestTypes || [],
      surveys: data.surveys || [],
      documents: data.documents || [],
      posts: data.posts || [],
    }
  } catch {
    /* opciones no bloquean el ABM */
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/hub')
    items.value = data.items || []
    categories.value = data.categories || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function openNew() {
  formError.value = ''
  iconQuery.value = ''
  tryDraftMsg.value = ''
  tryDraftIsError.value = false
  destAiPrompt.value = ''
  destAiMsg.value = ''
  destAiIsError.value = false
  draftSection.value = 'preview'
  draft.value = emptyDraft()
}

function edit(l) {
  formError.value = ''
  iconQuery.value = ''
  tryDraftMsg.value = ''
  tryDraftIsError.value = false
  destAiPrompt.value = ''
  destAiMsg.value = ''
  destAiIsError.value = false
  draftSection.value = 'preview'
  const p = l.params || {}
  draft.value = emptyDraft({
    ...l,
    kind: l.kind || (l.openMode === 'internal' ? 'route' : 'url'),
    target: l.target || l.url || '',
    queryJson: p.query ? JSON.stringify(p.query) : '',
    requestTypeId: p.requestTypeId || (l.kind === 'request' ? l.target : '') || '',
    surveyId: p.surveyId || (l.kind === 'survey' ? l.target : '') || '',
    docId: p.docId || (l.kind === 'document' ? l.target : '') || '',
    postId: p.postId || (l.kind === 'post' ? l.target : '') || '',
    mailSubject: p.subject || '',
    mailBody: p.body || '',
    waText: p.text || '',
    copyText: p.copyText || p.text || (l.kind === 'copy' ? l.target : '') || '',
    copyMessage: p.message || 'Copiado al portapapeles',
    color: l.color || '',
    iconSize: l.iconSize || 'inherit',
    visibleUntilDate: l.visibleUntilDate || '2099-01-01',
  })
}

function closeDraft() {
  draft.value = null
  formError.value = ''
  autosaveMsg.value = ''
  if (autosaveMsgTimer) {
    clearTimeout(autosaveMsgTimer)
    autosaveMsgTimer = null
  }
  draftSection.value = 'preview'
  deleteConfirmOpen.value = false
  deleteTarget.value = null
  deleting.value = false
  tryDraftMsg.value = ''
  tryDraftIsError.value = false
  destAiPrompt.value = ''
  destAiMsg.value = ''
  destAiIsError.value = false
  destAiBusy.value = false
}

function buildSaveBody() {
  const d = draft.value
  const params = {}
  const query = parseQueryJson(d.queryJson)
  if (query) params.query = query

  let target = d.target || ''
  if (d.kind === 'request') {
    target = d.requestTypeId
    params.requestTypeId = d.requestTypeId
  } else if (d.kind === 'survey') {
    target = d.surveyId
    params.surveyId = d.surveyId
  } else if (d.kind === 'document') {
    target = d.docId
    params.docId = d.docId
  } else if (d.kind === 'post') {
    target = d.postId
    params.postId = d.postId
  } else if (d.kind === 'mailto') {
    if (d.mailSubject) params.subject = d.mailSubject
    if (d.mailBody) params.body = d.mailBody
  } else if (d.kind === 'whatsapp') {
    if (d.waText) params.text = d.waText
  } else if (d.kind === 'copy') {
    params.copyText = d.copyText
    params.message = d.copyMessage || 'Copiado al portapapeles'
    target = d.copyText
  }

  return {
    titulo: d.titulo,
    subtitulo: d.subtitulo,
    kind: d.kind,
    target,
    params,
    category: d.category,
    icon: d.icon,
    color: d.color || '',
    iconSize: d.iconSize === 'inherit' ? null : d.iconSize,
    order: d.order,
    visibleUntil: d.visibleUntilDate || '2099-01-01',
    activo: d.activo,
    featured: d.featured,
  }
}

function draftValidationError(d) {
  if (!d) return { section: 'config', message: 'Sin borrador' }
  if (!String(d.titulo || '').trim()) return { section: 'config', message: 'El título es requerido' }
  const kind = d.kind
  if (!kind) return { section: 'tipo', message: 'Elegí el tipo de enlace' }
  if ((kind === 'url' || kind === 'webview' || kind === 'route' || kind === 'mailto' || kind === 'tel' || kind === 'whatsapp') && !String(d.target || '').trim()) {
    return { section: 'destino', message: 'Completá el destino del enlace' }
  }
  if (kind === 'request' && !d.requestTypeId) return { section: 'destino', message: 'Elegí una plantilla de solicitud' }
  if (kind === 'survey' && !d.surveyId) return { section: 'destino', message: 'Elegí una encuesta' }
  if (kind === 'document' && !d.docId) return { section: 'destino', message: 'Elegí un documento' }
  if (kind === 'post' && !d.postId) return { section: 'destino', message: 'Elegí una publicación' }
  if (kind === 'copy' && !String(d.copyText || '').trim()) return { section: 'destino', message: 'Indicá el texto a copiar' }
  if (!d.visibleUntilDate) return { section: 'config', message: 'Indicá la fecha de vencimiento' }
  return null
}

function flashAutosave(msg) {
  autosaveMsg.value = msg
  if (autosaveMsgTimer) clearTimeout(autosaveMsgTimer)
  autosaveMsgTimer = setTimeout(() => {
    autosaveMsg.value = ''
    autosaveMsgTimer = null
  }, 2200)
}

/**
 * Persiste el borrador. Si close=true, cierra el modal (botón Guardar).
 * Si quiet=true, no salta de sección ni bloquea al fallar validación (cambio de apartado).
 */
async function persistDraft({ close = false, quiet = false } = {}) {
  const d = draft.value
  if (!d) return false
  const err = draftValidationError(d)
  if (err) {
    if (!quiet) {
      draftSection.value = err.section
      formError.value = err.message
    } else if (d.id) {
      flashAutosave(`Sin guardar: ${err.message}`)
    }
    return false
  }

  saving.value = true
  if (!quiet) formError.value = ''
  try {
    const body = buildSaveBody()
    if (draft.value.id) {
      await api.patch(`/admin/hub/${draft.value.id}`, body)
    } else {
      const { data } = await api.post('/admin/hub', body)
      const link = data?.link
      if (link?.id) draft.value.id = link.id
      else if (link?._id) draft.value.id = String(link._id)
    }
    await load()
    if (close) {
      closeDraft()
    } else {
      flashAutosave('Guardado')
    }
    return true
  } catch (e) {
    const msg = e.response?.data?.error || e.message
    if (quiet) flashAutosave(`No se pudo guardar: ${msg}`)
    else formError.value = msg
    return false
  } finally {
    saving.value = false
  }
}

async function goDraftSection(next) {
  if (!draft.value || !next || draftSection.value === next || saving.value) return
  await persistDraft({ close: false, quiet: true })
  if (draft.value) draftSection.value = next
}

async function save() {
  await persistDraft({ close: true, quiet: false })
}

function askDeleteLink(l) {
  if (!l?.id) return
  deleteTarget.value = { id: l.id, titulo: l.titulo || 'este enlace' }
  deleteConfirmOpen.value = true
}

function askDeleteDraft() {
  if (!draft.value?.id) return
  deleteTarget.value = { id: draft.value.id, titulo: draft.value.titulo || 'este enlace' }
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  if (deleting.value) return
  deleteConfirmOpen.value = false
  deleteTarget.value = null
}

async function confirmDeleteLink() {
  const target = deleteTarget.value
  if (!target?.id || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/admin/hub/${target.id}`)
    deleteConfirmOpen.value = false
    deleteTarget.value = null
    if (draft.value?.id && String(draft.value.id) === String(target.id)) closeDraft()
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
    if (draft.value?.id && String(draft.value.id) === String(target.id)) {
      formError.value = e.response?.data?.error || e.message
    }
    deleteConfirmOpen.value = false
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}

async function toggleLink(l) {
  if (busy.value) return
  busy.value = true
  try {
    await api.patch(`/admin/hub/${l.id}`, { activo: !l.activo })
    l.activo = !l.activo
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

function quickCount(catName) {
  return (grouped.value[catName] || []).filter((l) => l.featured).length
}

async function toggleQuick(l) {
  if (busy.value) return
  const next = !l.featured
  busy.value = true
  error.value = ''
  try {
    await api.patch(`/admin/hub/${l.id}`, { featured: next })
    l.featured = next
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function persistCategories(next) {
  busy.value = true
  try {
    await api.put('/admin/hub/categories', {
      categories: next.map((c) => ({
        nombre: c.nombre,
        orden: c.orden,
        activo: c.activo,
        showOnMuro: c.showOnMuro !== false,
        iconSize: c.iconSize,
      })),
    })
    categories.value = next.map((c) => ({ ...c }))
  } catch (e) {
    error.value = e.response?.data?.error || e.message
    await load()
  } finally {
    busy.value = false
  }
}

async function toggleGroup(cat) {
  const next = orderedCategories.value.map((c) =>
    c.nombre === cat.nombre ? { ...c, activo: !c.activo } : c,
  )
  await persistCategories(next)
}

async function toggleShowOnMuro(cat) {
  const next = orderedCategories.value.map((c) =>
    c.nombre === cat.nombre ? { ...c, showOnMuro: c.showOnMuro === false } : c,
  )
  await persistCategories(next)
}

async function setGroupIconSize(cat, iconSize) {
  const next = orderedCategories.value.map((c) =>
    c.nombre === cat.nombre ? { ...c, iconSize } : c,
  )
  await persistCategories(next)
}

async function startRename(cat) {
  cancelNewGroup()
  renamingNombre.value = cat.nombre
  renameDraft.value = cat.nombre
  await nextTick()
  const el = document.querySelector('.hub .rename-form input')
  el?.focus?.()
  el?.select?.()
}

function cancelRename() {
  renamingNombre.value = ''
  renameDraft.value = ''
}

async function confirmRename() {
  const from = renamingNombre.value
  const to = renameDraft.value.trim().slice(0, 80)
  if (!from || !to) {
    error.value = 'El nombre del grupo no puede estar vacío'
    return
  }
  if (to === from) {
    cancelRename()
    return
  }
  busy.value = true
  error.value = ''
  try {
    await api.post('/admin/hub/categories/rename', { from, to })
    cancelRename()
    selectedGroupNombre.value = to
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function startNewGroup() {
  cancelRename()
  newGroupOpen.value = true
  newGroupDraft.value = ''
  await nextTick()
  newGroupInputEl.value?.focus?.()
}

function cancelNewGroup() {
  newGroupOpen.value = false
  newGroupDraft.value = ''
}

async function confirmNewGroup() {
  const nombre = newGroupDraft.value.trim().slice(0, 80)
  if (!nombre) {
    error.value = 'Nombre requerido'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await api.post('/admin/hub/categories', { nombre })
    cancelNewGroup()
    await load()
    selectedGroupNombre.value = nombre
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function loadAiMeta() {
  try {
    const [status, guide] = await Promise.all([
      api.get('/admin/hub/ai-status'),
      api.get('/admin/hub/ai-guide'),
    ])
    aiConfigured.value = Boolean(status.data?.configured)
    aiGuide.value = guide.data?.guide || null
  } catch {
    aiConfigured.value = false
  }
}

function toggleAi(intent = 'edit') {
  const next = intent === 'create' ? 'create' : 'edit'
  if (aiOpen.value && aiIntent.value === next) {
    closeAi()
    return
  }
  aiIntent.value = next
  aiOpen.value = true
  aiPlan.value = null
  aiError.value = ''
  aiInfo.value = ''
  if (!aiGuide.value) loadAiMeta()
}

function closeAi() {
  aiOpen.value = false
}

function applyDestinationPatch(patch) {
  if (!draft.value || !patch || typeof patch !== 'object') return
  const keys = [
    'kind',
    'target',
    'queryJson',
    'requestTypeId',
    'surveyId',
    'docId',
    'postId',
    'mailSubject',
    'mailBody',
    'waText',
    'copyText',
    'copyMessage',
    'titulo',
    'subtitulo',
  ]
  for (const k of keys) {
    if (patch[k] !== undefined) draft.value[k] = patch[k]
  }
}

async function suggestDestinationAi() {
  if (!draft.value || destAiBusy.value) return
  const prompt = destAiPrompt.value.trim()
  if (prompt.length < 4) return
  destAiBusy.value = true
  destAiMsg.value = ''
  destAiIsError.value = false
  try {
    const d = draft.value
    const { data } = await api.post('/admin/hub/ai-suggest-destination', {
      prompt,
      draft: {
        titulo: d.titulo,
        subtitulo: d.subtitulo,
        kind: d.kind,
        category: d.category,
        target: d.target,
        queryJson: d.queryJson,
        requestTypeId: d.requestTypeId,
        surveyId: d.surveyId,
        docId: d.docId,
        postId: d.postId,
        mailSubject: d.mailSubject,
        mailBody: d.mailBody,
        waText: d.waText,
        copyText: d.copyText,
        copyMessage: d.copyMessage,
      },
    })
    const patch = data?.patch || {}
    if (!Object.keys(patch).length) {
      destAiIsError.value = true
      destAiMsg.value = data?.explanation || data?.error || 'No pude completar el destino'
      return
    }
    applyDestinationPatch(patch)
    destAiMsg.value = [data.summary, data.explanation, data.aiError].filter(Boolean).join(' · ')
  } catch (e) {
    destAiIsError.value = true
    destAiMsg.value = e.response?.data?.error || e.message || 'Error al completar con IA'
  } finally {
    destAiBusy.value = false
  }
}

function formatOp(op) {
  if (!op?.op) return JSON.stringify(op)
  if (op.op === 'updateLink') {
    return `updateLink ${op.id?.slice?.(-6) || op.id}: ${JSON.stringify(op.patch)}`
  }
  if (op.op === 'updateCategory') {
    return `updateCategory «${op.nombre}»: ${JSON.stringify(op.patch)}`
  }
  if (op.op === 'setFeatured') {
    return `setFeatured «${op.category}» → ${(op.linkIds || []).length} enlace(s)`
  }
  if (op.op === 'reorderLinks') {
    return `reorderLinks «${op.category}» (${(op.orderedIds || []).length})`
  }
  if (op.op === 'reorderCategories') {
    return `reorderCategories: ${(op.orderedNames || []).join(' → ')}`
  }
  if (op.op === 'renameCategory') {
    return `renameCategory «${op.from}» → «${op.to}»`
  }
  if (op.op === 'createCategory') {
    return `createCategory «${op.nombre}»${op.patch && Object.keys(op.patch).length ? `: ${JSON.stringify(op.patch)}` : ''}`
  }
  if (op.op === 'createLink') {
    const l = op.link || {}
    return `createLink «${l.titulo}» en ${l.category || '?'} → ${l.target || l.url || '(sin url)'}`
  }
  return JSON.stringify(op)
}

async function runAiPlan() {
  aiError.value = ''
  aiInfo.value = ''
  aiBusy.value = true
  aiMode.value = 'plan'
  try {
    const { data } = await api.post('/admin/hub/ai-plan', {
      prompt: aiPrompt.value,
      intent: aiIntent.value,
    })
    aiPlan.value = data
    if (!data.ops?.length) {
      aiInfo.value = data.explanation || 'Sin cambios sugeridos'
    } else {
      aiInfo.value = `${data.ops.length} operación(es) listas. Revisá y aplicá.`
    }
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message
  } finally {
    aiBusy.value = false
    aiMode.value = ''
  }
}

async function runAiApply() {
  aiError.value = ''
  aiInfo.value = ''
  aiBusy.value = true
  aiMode.value = 'apply'
  try {
    const body = aiPlan.value?.ops?.length
      ? { ops: aiPlan.value.ops }
      : { prompt: aiPrompt.value, apply: true, intent: aiIntent.value }
    const { data } = await api.post('/admin/hub/ai-apply', body)
    if (data.plan) aiPlan.value = data.plan
    if (Array.isArray(data.items)) items.value = data.items
    if (Array.isArray(data.categories)) categories.value = data.categories
    else await load()
    const createdCat = (data.results || []).find((r) => r.op === 'createCategory' && r.ok && r.nombre)
    if (createdCat?.nombre) selectedGroupNombre.value = createdCat.nombre
    else {
      const createdLink = (data.results || []).find((r) => r.op === 'createLink' && r.ok && r.category)
      if (createdLink?.category) selectedGroupNombre.value = createdLink.category
    }
    const errN = data.errors?.length || 0
    aiInfo.value = errN
      ? `Aplicadas ${data.applied || 0}. Avisos: ${data.errors.join(' · ')}`
      : `Listo: ${data.applied || 0} cambio(s) aplicados.`
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message
    if (e.response?.data?.plan) aiPlan.value = e.response.data.plan
  } finally {
    aiBusy.value = false
    aiMode.value = ''
  }
}

onMounted(async () => {
  await Promise.all([load(), loadOptions(), loadAiMeta()])
})
</script>

<style scoped>
.page-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 8px; width: 100%; }
.page-head-main { flex: 1; min-width: 0; width: 100%; }
.page-head h1 { margin: 0; font-family: var(--font-display, Fraunces, Georgia, serif); font-size: 1.45rem; }
.page-head-sum {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
  width: 100%;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.page-head p { margin: 4px 0 0; color: var(--ink-soft); font-size: 0.9rem; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.head-actions .btn-ghost.on {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 14%, var(--panel));
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  color: var(--primary, var(--brand-primary));
  font-weight: 700;
}

.ai-panel {
  width: min(640px, calc(100vw - 48px)) !important;
  max-height: min(70vh, 560px) !important;
  min-height: 0;
  height: fit-content;
  margin: 0;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  overflow: auto;
}
.ai-panel .panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ai-panel .panel-head h2 {
  flex: 1;
  min-width: 0;
}
.ai-panel .panel-head .btn-icon {
  margin-left: auto;
}
.ai-panel-lead {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.35;
}
.ai-panel-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.ai-panel-meta p {
  margin: 0;
  flex: 1;
  min-width: 200px;
  font-size: 0.86rem;
  color: var(--ink-soft);
}
.ai-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
  flex-shrink: 0;
}
.ai-badge[data-on='1'] {
  background: color-mix(in srgb, var(--brand-primary) 16%, var(--panel));
  color: var(--brand-primary);
}
.ai-guide {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
}
.ai-guide summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.84rem;
}
.ai-guide-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.ai-guide-list li {
  display: grid;
  gap: 2px;
  font-size: 0.82rem;
}
.ai-guide-list strong { color: var(--ink); }
.ai-guide-list span { color: var(--ink-soft); }
.ai-guide-sum {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.ai-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.ai-chip {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 6px 10px;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--ink);
  max-width: 100%;
  text-align: left;
}
.ai-chip:hover {
  border-color: var(--primary, var(--brand-primary));
  color: var(--primary, var(--brand-primary));
}
.ai-prompt-label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.ai-prompt {
  resize: vertical;
  min-height: 52px;
  max-height: 120px;
  font-weight: 400;
}
.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-actions-block {
  display: grid;
  gap: 6px;
}
.ai-actions-help {
  margin: 0;
}
.ai-actions-hint {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--ink-soft);
}
.ai-actions-hint strong {
  color: var(--ink);
  font-weight: 700;
}
.ai-actions-hint em {
  font-style: normal;
  font-weight: 650;
  color: var(--ink);
}
.ai-info {
  margin: 0;
  font-size: 0.85rem;
  color: var(--brand-primary);
  font-weight: 600;
}
.ai-plan {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
}
.ai-plan-sum { margin: 0 0 6px; font-size: 0.95rem; }
.ai-plan-exp { margin: 0 0 10px; font-size: 0.85rem; color: var(--ink-soft); }
.ai-ops {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.ai-ops code {
  font-size: 0.75rem;
  word-break: break-word;
}

.hub-hint {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.hub-workspace {
  display: grid;
  grid-template-columns: minmax(180px, 20%) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-top: 12px;
  min-height: 420px;
}
@media (max-width: 900px) {
  .hub-workspace {
    grid-template-columns: 1fr;
  }
}

.hub-groups {
  position: sticky;
  top: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  padding: 10px;
  max-height: calc(100vh - 120px);
  overflow: auto;
}
.hub-groups-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 2px;
  font-size: 0.82rem;
}
.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.group-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 4px;
  align-items: stretch;
  border-radius: 10px;
  padding: 2px;
  border: 1px solid transparent;
  transition: border-color 0.12s ease, background 0.12s ease, opacity 0.12s ease;
}
.group-item.on {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 28%, var(--line));
}
.group-item.off { opacity: 0.65; }
.group-item.off-muro {
  background: #fffbeb;
  border-color: #fcd34d;
}
.group-item.drop-group {
  border-color: var(--primary, var(--brand-primary));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, var(--brand-primary)) 22%, transparent);
}
.group-item.dragging { opacity: 0.45; }
.group-select {
  display: block;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 9px 8px 9px 6px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 650;
  color: inherit;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-main {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  padding: 12px 14px 16px;
  min-width: 0;
}
.hub-main-empty {
  display: grid;
  place-items: center;
  min-height: 240px;
}

.hub-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.hub-section:first-of-type {
  margin-top: 4px;
  padding-top: 0;
  border-top: 0;
}
.hub-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.hub-section-head h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 750;
}
.hub-section-hint {
  margin: 0 0 10px;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.hub-section-empty {
  margin: 8px 0 0;
  font-size: 0.82rem;
}

.muro-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 12px 16px;
  margin-top: 12px;
}
.muro-bar-actions {
  flex-shrink: 0;
  margin-left: auto;
}
.muro-preview-panel {
  width: min(380px, calc(100vw - 48px)) !important;
  max-height: min(70vh, 520px) !important;
  min-height: 0;
  height: fit-content;
  align-self: flex-start;
  padding: 14px 16px;
  gap: 8px;
}
.muro-preview-lead {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.muro-preview-empty {
  margin: 0;
  color: var(--warn);
}

/* Mirror de HubQuickStrip compact (muro U) */
.mp-hub.compact {
  --mp-accent: var(--brand-primary, #0f766e);
  margin: 0 -4px;
  padding: 10px 0 16px;
  border-radius: 12px;
  background: var(--brand-primary, #0f766e);
  overflow: hidden;
}
.mp-hub.compact .mp-shell {
  margin: 0 12px;
  padding: 2px 8px 6px;
  overflow: visible;
  border: 2px solid var(--brand-primary, #0f766e);
  border-radius: 14px;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
  background: var(--brand-primary, #0f766e);
  max-width: none;
}
.mp-hub.compact .mp-tabs {
  display: flex;
  align-items: stretch;
  padding: 0;
  gap: 0;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid color-mix(in srgb, #fff 28%, transparent);
}
.mp-hub.compact .mp-tabs::-webkit-scrollbar { display: none; }
.mp-hub.compact .mp-tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  padding: 5px 4px;
  border-radius: 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: color-mix(in srgb, #fff 62%, transparent);
  position: relative;
  line-height: 1.2;
}
.mp-hub.compact .mp-tab.on {
  font-weight: 650;
  color: #fff;
}
.mp-hub.compact .mp-tab.on::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: #fff;
  pointer-events: none;
}
.mp-hub.compact .mp-card {
  padding: 6px 2px 2px;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}
.mp-hub.compact .mp-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 2px 0;
  justify-content: flex-start;
  align-items: flex-start;
}
.mp-hub.compact .mp-actions::-webkit-scrollbar { display: none; }
.mp-hub.compact .mp-action {
  --tile-accent: var(--accent, var(--mp-accent));
  flex: 0 0 auto;
  min-width: 78px;
  max-width: 92px;
  width: 84px;
  min-height: 0;
  padding: 0;
  gap: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 0;
  background: transparent;
  color: var(--tile-accent);
  box-shadow: none;
  border: 0;
}
.mp-hub.compact .mp-action-ico {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #fff;
  color: var(--tile-accent);
  border: 1px solid #e8eef5;
  box-sizing: border-box;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.07);
  display: grid;
  place-items: center;
}
.mp-hub.compact .mp-action-label {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: color-mix(in srgb, #fff 88%, transparent);
  max-width: 100%;
  width: 100%;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mp-hub.compact .mp-empty {
  margin: 4px 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: color-mix(in srgb, #fff 78%, transparent);
  white-space: nowrap;
}

.cat-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
}
.cat-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cat-title strong { font-size: 1.05rem; }

.cat-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2);
}
.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink);
  border-radius: 10px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
}
.tool-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line-2));
}
.tool-btn:disabled { opacity: 0.45; cursor: default; }
.tool-ico {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.tool-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.tool-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 12px;
  padding: 6px 10px 6px 8px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  min-width: 118px;
  text-align: left;
}
.tool-toggle:disabled { opacity: 0.45; cursor: default; }
.tool-toggle.on {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, var(--line));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
}
.tool-toggle-track {
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--line-2);
  position: relative;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.tool-toggle.on .tool-toggle-track {
  background: var(--primary, var(--brand-primary));
}
.tool-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--panel);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
  transition: transform 0.15s ease;
}
.tool-toggle.on .tool-toggle-knob {
  transform: translateX(14px);
}
.tool-toggle-text {
  display: grid;
  gap: 0;
  line-height: 1.15;
}
.tool-toggle-text strong {
  font-size: 0.8rem;
  font-weight: 750;
}
.tool-toggle-text small {
  font-size: 0.68rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.tool-toggle.on .tool-toggle-text small {
  color: color-mix(in srgb, var(--primary, var(--brand-primary)) 70%, var(--ink));
}

.tool-seg {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.tool-seg-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.tool-seg-opts {
  display: inline-flex;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel);
}
.tool-seg-btn {
  border: 0;
  border-right: 1px solid var(--line);
  background: transparent;
  padding: 7px 12px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
  cursor: pointer;
  min-width: 36px;
}
.tool-seg-btn:last-child { border-right: 0; }
.tool-seg-btn:hover:not(:disabled):not(.on) {
  background: var(--panel-2);
  color: var(--ink);
}
.tool-seg-btn.on {
  background: var(--primary, var(--brand-primary));
  color: #fff;
}
.tool-seg-btn:disabled { opacity: 0.45; cursor: default; }
@media (max-width: 720px) {
  .tool-seg { margin-left: 0; width: 100%; justify-content: space-between; }
}

.rename-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.rename-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--ink-soft);
}
.rename-form input {
  min-width: 180px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 7px 10px;
  font: inherit;
  font-size: 0.9rem;
  color: var(--ink);
  background: var(--panel);
}
.rename-form input:focus {
  outline: 2px solid color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, transparent);
  border-color: var(--primary, var(--brand-primary));
}
.new-group-panel {
  width: min(400px, calc(100vw - 48px)) !important;
  max-height: min(50vh, 360px) !important;
  min-height: 0;
  height: fit-content;
  align-self: flex-start;
  padding: 14px 16px;
  gap: 8px;
}
.new-group-panel label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.new-group-lead {
  margin: 0;
  font-size: 0.86rem;
  color: var(--ink-soft);
}
.drag-handle {
  cursor: grab;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink-soft);
  border-radius: 8px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  letter-spacing: -1px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  user-select: none;
}
.drag-handle:active { cursor: grabbing; }
.drag-handle.card-drag {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  width: 26px;
  height: 26px;
  opacity: 0.75;
}
.hub-card:hover .drag-handle.card-drag {
  opacity: 1;
}
.cat-count {
  font-size: 0.72rem;
  background: var(--panel-2);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 2px 8px;
}
.cat-stat {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
  background: var(--panel-2);
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
}
.cat-stat.soft {
  color: var(--brand-primary);
  background: var(--ok-bg);
}
.pill.soft {
  font-size: 0.68rem;
  font-weight: 650;
  color: var(--brand-primary);
  background: var(--ok-bg);
  border-radius: 999px;
  padding: 2px 8px;
}
.pill.warn {
  font-size: 0.68rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--warn);
  background: var(--warn-bg);
  border-radius: 999px;
  padding: 2px 8px;
}

.hub-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-height: 24px;
  border-radius: 12px;
  transition: background 0.12s ease;
}
.hub-grid.drop-grid {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, transparent);
}
@media (min-width: 720px) {
  .hub-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (min-width: 1100px) {
  .hub-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (min-width: 1400px) {
  .hub-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

.hub-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  padding: 10px;
  padding-top: 12px;
  padding-bottom: 36px;
  border-radius: 12px;
  border: 2px solid var(--accent, var(--primary, var(--brand-primary)));
  background: var(--panel);
  color: inherit;
  cursor: pointer;
  min-height: 0;
  position: relative;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}
.card-kind {
  position: absolute;
  left: 10px;
  bottom: 10px;
  right: auto;
  top: auto;
  z-index: 1;
  max-width: calc(100% - 48px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  font-weight: 550;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-radius: 0;
  padding: 0;
  line-height: 1.2;
  border: 0;
  background: transparent;
  color: var(--ink-faint);
}
.card-kind[data-kind] {
  color: var(--ink-faint);
  background: transparent;
  border-color: transparent;
}
.hub-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px var(--sh);
}
.hub-card.inactive { opacity: 0.55; }
.hub-card.featured {
  border-color: var(--accent, var(--brand-primary));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, var(--brand-primary)) 25%, transparent);
}
.hub-card.dragging { opacity: 0.4; }
.hub-card.drop-before {
  border-color: var(--primary, var(--brand-primary));
  box-shadow: inset 3px 0 0 var(--primary, var(--brand-primary));
}
.hub-card.preview {
  cursor: default;
  pointer-events: none;
  margin-bottom: 4px;
  min-height: 88px;
}
.card-top {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}
.card-lead {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.card-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.card-ops {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  align-items: flex-start;
}
.card-ico-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-faint);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.card-ico-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}
.card-ico-btn:hover {
  background: var(--panel-2);
  color: var(--ink-soft);
}
.card-ico-btn.on {
  color: var(--primary, var(--brand-primary));
}
.card-ico-btn.on:hover {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, var(--panel));
  color: var(--primary, var(--brand-primary));
}
.card-ico-btn.danger {
  color: #f87171;
}
.card-ico-btn.danger:hover {
  background: var(--bad-bg);
  color: #ef4444;
}
.mini {
  width: 26px;
  height: 26px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  color: var(--ink-soft);
}
.mini:disabled { opacity: 0.35; cursor: default; }
.mini.on {
  color: var(--brand-primary);
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  background: var(--ok-bg);
}
.hub-ico {
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1.5px solid var(--accent, var(--primary, var(--brand-primary)));
  background: var(--panel);
  color: var(--accent, var(--primary, var(--brand-primary)));
  flex-shrink: 0;
  margin-bottom: 0;
}
.hub-ico[data-size='sm'] { width: 24px; height: 24px; }
.hub-ico[data-size='md'] { width: 28px; height: 28px; }
.hub-ico[data-size='lg'] { width: 34px; height: 34px; border-radius: 10px; }
.card-copy strong,
.hub-card strong {
  font-size: 0.82rem;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-copy small,
.hub-card small {
  color: var(--ink-soft);
  font-size: 0.7rem;
  line-height: 1.3;
  overflow: visible;
  text-overflow: unset;
  white-space: normal;
  max-width: 100%;
  word-break: break-word;
}
.card-foot { margin-top: auto; }
.hub-badge, .hub-meta {
  font-size: 0.7rem;
  color: var(--ink-soft);
}
.hub-badge {
  color: var(--warn);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.hub-badge.featured { color: var(--brand-primary); }
.hub-badge.temp { color: #0369a1; }
.field-hint {
  margin-top: 4px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--ink-soft);
}

.hub-muted { color: var(--ink-soft); }
.hub-muted.center { text-align: center; margin-top: 24px; }

.hub-dlg-scrim {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 72px 16px 40px;
  overflow: auto;
  /* Velo semitransparente: NO usar clase .sheet (style.css la pinta opaca con --panel) */
  background: rgba(15, 23, 42, 0.42);
}
.hub-dlg-scrim > .panel {
  width: min(440px, calc(100vw - 48px));
  max-height: min(70vh, 560px);
  min-height: 0;
  height: fit-content;
  align-self: flex-start;
  overflow: auto;
  background: var(--panel);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent),
    0 18px 48px rgba(0, 0, 0, 0.28);
}
.hub-dlg-scrim > .panel-wide {
  width: min(1100px, calc(100vw - 48px));
  max-height: min(82vh, 720px);
}
.hub-dlg-scrim > .panel.link-dlg {
  overflow: hidden;
  gap: 0;
}
.link-dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
}
.link-dlg-head h2 {
  margin: 0;
  font-size: 1.1rem;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-dlg-head-flags {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.link-dlg-flag {
  margin: 0;
  white-space: nowrap;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.link-dlg-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.link-dlg-err {
  margin: 0 0 10px;
  flex-shrink: 0;
}
.link-dlg-autosave {
  margin: 0 0 10px;
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.hub-dlg-scrim--confirm {
  z-index: 1300;
  align-items: center;
  padding: 24px 16px;
}
.hub-confirm-panel {
  width: min(400px, calc(100vw - 48px)) !important;
  max-height: none !important;
}
.hub-confirm-text {
  margin: 4px 0 12px;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--ink-soft);
}
.btn-primary.danger {
  background: var(--bad, #b91c1c);
  border-color: var(--bad, #b91c1c);
  color: #fff;
}
.btn-primary.danger:hover:not(:disabled) {
  filter: brightness(0.95);
}
.link-dlg-layout {
  display: grid;
  grid-template-columns: minmax(140px, 20%) minmax(0, 80%);
  gap: 14px;
  align-items: stretch;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.link-dlg-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  border-right: 1px solid var(--line);
  padding-right: 10px;
  overflow: auto;
}
.link-dlg-nav-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  line-height: 1.25;
}
.link-dlg-nav-item:hover {
  background: var(--panel-2);
  color: var(--ink);
}
.link-dlg-nav-item.on {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 14%, var(--panel));
  color: var(--primary, var(--brand-primary));
  box-shadow: inset 3px 0 0 var(--primary, var(--brand-primary));
}
.link-dlg-body {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}
.link-dlg-sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.link-dlg-sec-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 750;
}
.link-dlg-sec-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.35;
}
.draft-preview-wrap {
  border-radius: 12px;
  overflow: hidden;
}
.draft-preview-wrap .mp-hub.compact {
  margin: 0;
}
.draft-preview-card {
  max-width: 280px;
}
.draft-try-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.draft-try-msg {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.draft-try-msg.err {
  color: var(--bad);
}
.dest-ai {
  padding: 0;
  border: 1px dashed var(--line-2);
  border-radius: 12px;
  background: var(--panel-2);
  overflow: hidden;
}
.title-tpl {
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-2);
  overflow: hidden;
}
.title-tpl-summary {
  list-style: none;
  cursor: pointer;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}
.title-tpl-summary::-webkit-details-marker { display: none; }
.title-tpl-summary::before {
  content: '▸';
  font-size: 0.7rem;
  line-height: 1;
}
.title-tpl[open] .title-tpl-summary::before {
  content: '▾';
}
.title-tpl-body {
  padding: 0 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dest-ai-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  font-size: 0.88rem;
  font-weight: 700;
  user-select: none;
}
.dest-ai-summary::-webkit-details-marker { display: none; }
.dest-ai-summary::before {
  content: '▸';
  color: var(--ink-soft);
  font-size: 0.75rem;
  line-height: 1;
}
.dest-ai[open] .dest-ai-summary::before {
  content: '▾';
}
.dest-ai-summary-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dest-ai-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  padding-top: 10px;
}
.dest-ai-explain {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--ink-soft);
  font-weight: 500;
}
.dest-ai-label {
  margin: 0;
  gap: 6px;
}
.dest-ai-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.dest-ai-note {
  font-size: 0.75rem;
}
.dest-ai-msg {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.dest-ai-msg.err {
  color: var(--bad);
}
.url-preview {
  margin: -2px 0 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  display: grid;
  gap: 4px;
}
.url-preview-label {
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.url-preview-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--ink);
  word-break: break-all;
}
.query-field-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  flex-wrap: wrap;
}
.tpl-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tpl-chip {
  border: 1px solid var(--line-2);
  border-radius: 999px;
  background: var(--panel);
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  padding: 4px 9px;
  cursor: pointer;
  line-height: 1.2;
}
.tpl-chip:hover:not(:disabled):not(.off) {
  border-color: var(--primary, var(--brand-primary));
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
}
.tpl-chip.off,
.tpl-chip:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  text-decoration: line-through;
}
.link-dlg-inline {
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent, #5b4dff);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.link-dlg-next {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
.link-dlg-sec .hub-card.preview {
  max-width: 280px;
}
.link-dlg-sec .icon-grid {
  max-height: 160px;
  overflow: auto;
}
.panel-layout {
  display: grid;
  grid-template-columns: minmax(120px, 22%) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.panel-main, .panel-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  min-height: 0;
}
.panel-side {
  position: sticky;
  top: 0;
  max-height: min(60vh, 480px);
  overflow: auto;
  padding-right: 4px;
}
.panel-side .hub-card.preview {
  padding-bottom: 12px;
}
.panel-side .icon-grid {
  max-height: 160px;
  overflow: auto;
}
.kind-field, .dest-box {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  margin: 0;
}
.kind-field legend, .dest-title {
  font-size: 0.85rem;
  font-weight: 650;
  padding: 0 4px;
}
.dest-title { margin: 0 0 8px; }
.kind-group { margin-top: 8px; }
.kind-group-label {
  margin: 0 0 6px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  font-weight: 650;
}
.kind-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.kind-opt {
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-2);
  padding: 8px 10px;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
}
.kind-opt-ico {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--primary, var(--brand-primary)) 22%, var(--line));
}
.kind-opt-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kind-opt strong { font-size: 0.82rem; }
.kind-opt-copy > span { font-size: 0.68rem; color: var(--ink-soft); line-height: 1.25; }
.kind-opt.on {
  border-color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, var(--panel));
  box-shadow: inset 0 0 0 1px var(--primary, var(--brand-primary));
}
.kind-opt.on .kind-opt-ico {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 18%, var(--panel));
}
.kind-chip {
  display: inline-flex;
  margin-top: 4px;
  font-size: 0.65rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border-radius: 999px;
  padding: 2px 8px;
}
@media (max-width: 900px) {
  .link-dlg-layout {
    grid-template-columns: 1fr;
  }
  .link-dlg-head {
    flex-wrap: wrap;
  }
  .link-dlg-head h2 {
    flex: 1 1 100%;
  }
  .link-dlg-head-flags {
    flex: 1;
  }
  .link-dlg-nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding-right: 0;
    padding-bottom: 8px;
  }
  .link-dlg-nav-item {
    width: auto;
    flex: 1 1 auto;
    text-align: center;
    padding: 8px 10px;
    font-size: 0.8rem;
  }
  .link-dlg-nav-item.on {
    box-shadow: inset 0 -3px 0 var(--primary, var(--brand-primary));
  }
  .panel-layout { grid-template-columns: 1fr; }
  .panel-side {
    position: static;
    max-height: none;
    order: -1;
  }
  .kind-grid { grid-template-columns: 1fr; }
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.panel-head h2 { margin: 0; font-size: 1.1rem; }
.btn-icon {
  border: none;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ink-soft);
  padding: 0 4px;
}
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.size-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.size-field-label { color: var(--ink); }
.size-seg {
  width: fit-content;
  max-width: 100%;
}
.size-seg .tool-seg-btn {
  padding: 7px 10px;
  min-width: 0;
}
.color-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.color-swatch {
  width: 40px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  background: var(--panel);
  cursor: pointer;
  flex-shrink: 0;
}
.icon-field {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  margin: 0;
}
.icon-field legend {
  padding: 0 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.icon-search {
  margin: 0 0 8px;
}
.icon-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  max-height: 148px;
  overflow-y: auto;
  padding: 2px;
  scrollbar-gutter: stable;
}
.icon-opt {
  width: 100%;
  height: 28px;
  aspect-ratio: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-2);
  cursor: pointer;
  color: var(--brand-primary);
  display: grid;
  place-items: center;
  padding: 0;
}
.icon-opt.on {
  border-color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 12%, var(--panel));
  box-shadow: inset 0 0 0 1px var(--primary, var(--brand-primary));
}
.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  margin-top: 4px;
}
.input-title {
  font-size: 1.2rem;
  font-weight: 650;
  padding: 10px 12px;
  line-height: 1.3;
}
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.footer { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.spacer { flex: 1; }
.btn-primary, .btn-ghost {
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--panel);
  font: inherit;
}
.btn-primary { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost.danger { color: var(--bad); }
.btn-ghost.sm { padding: 6px 8px; font-size: 0.8rem; white-space: nowrap; }
.btn-primary.sm { padding: 6px 10px; font-size: 0.8rem; white-space: nowrap; }
.err { color: var(--bad); margin: 0; }
@media (max-width: 560px) {
  .icon-grid { grid-template-columns: repeat(8, 1fr); max-height: 140px; }
  .row2 { grid-template-columns: 1fr; }
}
</style>
