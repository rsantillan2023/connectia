<template>
  <div class="page hub">
    <header class="page-head">
      <div>
        <h1>Enlaces</h1>
        <p>
          Arrastrá para reordenar. Marcá hasta 3 accesos rápidos por grupo (botones redondos en la app).
          En el <strong>muro</strong> el usuario no ve el grupo completo: solo esos rápidos. Podés sacar un
          grupo entero del muro sin ocultarlo de Enlaces.
        </p>
        <ScreenHelp
          purpose="Hub de enlaces: grupos (pestañas) y hasta 3 accesos rápidos por grupo que se ven como botones en el muro. El listado completo de tarjetas del admin no es lo que ve el usuario en el muro. Usá «Mostrar en muro» para decidir si la pestaña aparece arriba del feed."
          can-do="Elegir tipo de destino; marcar Acceso rápido (máx. 3 por grupo); mostrar u ocultar el grupo en el muro; arrastrar; iconos; colores; vencimiento; pedir cambios con IA."
        />
      </div>
    </header>

    <form v-if="newGroupOpen" class="rename-form new-group-form" @submit.prevent="confirmNewGroup">
      <label>
        Nombre del grupo
        <input
          ref="newGroupInputEl"
          v-model="newGroupDraft"
          type="text"
          maxlength="80"
          placeholder="Ej. RRHH"
          @keydown.escape.prevent="cancelNewGroup"
        />
      </label>
      <button type="submit" class="btn-primary sm" :disabled="busy">Crear</button>
      <button type="button" class="btn-ghost sm" :disabled="busy" @click="cancelNewGroup">Cancelar</button>
    </form>

    <section v-if="aiOpen" class="ai-panel">
      <div class="ai-panel-head">
        <div>
          <h2>Operador IA de Enlaces</h2>
          <p>
            Pedile cambios en lenguaje natural: colores, tamaños, qué marcar como rápido (máx. 3 por grupo),
            órdenes de pestañas/enlaces. Revisá el plan y aplicá.
          </p>
        </div>
        <span class="ai-badge" :data-on="aiConfigured ? '1' : '0'">
          {{ aiConfigured ? 'IA conectada' : 'Modo reglas locales' }}
        </span>
      </div>

      <details class="ai-guide" open>
        <summary>Qué se puede configurar</summary>
        <ul v-if="aiGuide?.fields?.length" class="ai-guide-list">
          <li v-for="f in aiGuide.fields" :key="f.id">
            <strong>{{ f.label }}</strong>
            <span>{{ f.values }}</span>
          </li>
        </ul>
        <p v-else class="hub-muted">Cargando guía…</p>
        <p v-if="aiGuide?.summary" class="ai-guide-sum">{{ aiGuide.summary }}</p>
      </details>

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

      <label class="ai-prompt-label">
        Pedido
        <textarea
          v-model="aiPrompt"
          class="input ai-prompt"
          rows="3"
          placeholder="Ej. Marcá como rápidos Portal, Nómina y Vacaciones en RRHH; iconos medianos y color #0F766E"
        />
      </label>

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
    </section>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="hub-muted">Cargando…</p>

    <div v-if="!loading" class="muro-bar">
      <section
        v-if="muroPreviewCats.length"
        class="muro-preview"
        aria-label="Vista previa del muro"
      >
        <div class="muro-preview-head">
          <h2>Así se ve en el muro</h2>
          <p>Colores y hasta 3 accesos rápidos por pestaña visible en el feed.</p>
        </div>
        <div class="mp-shell">
          <div class="mp-tabs" role="tablist">
            <button
              v-for="cat in muroPreviewCats"
              :key="cat.nombre"
              type="button"
              role="tab"
              class="mp-tab"
              :class="{ on: muroPreviewCat === cat.nombre }"
              @click="muroPreviewCat = cat.nombre"
            >
              {{ cat.nombre }}
            </button>
          </div>
          <div class="mp-card">
            <div class="mp-actions">
              <div
                v-for="l in muroPreviewQuick"
                :key="l.id"
                class="mp-action"
                :style="muroLinkAccentStyle(l)"
              >
                <span class="mp-action-ico" aria-hidden="true">
                  <HubIcon :name="l.icon" :size="26" />
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
      <div v-else class="muro-bar-spacer" aria-hidden="true" />

      <div class="head-actions muro-bar-actions">
        <button type="button" class="btn-ghost" :class="{ on: aiOpen }" @click="toggleAi">
          Ayuda con IA
        </button>
        <button type="button" class="btn-ghost" :disabled="busy" @click="startNewGroup">Nuevo grupo</button>
        <button type="button" class="btn-primary" @click="openNew">Nuevo enlace</button>
      </div>
    </div>

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
              <span class="cat-stat soft">{{ selectedQuick.length }}/3 en el muro</span>
            </header>
            <p class="hub-section-hint">
              Estos botones se muestran en el muro (máx. 3). La estrella marca o saca del muro.
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
                      :title="l.featured ? 'Sacar de accesos rápidos del muro' : 'Pasar al muro (máx. 3)'"
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
              Todavía no hay accesos rápidos. Tocá la estrella en otros enlaces (máx. 3).
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
                      :title="l.featured ? 'Sacar de accesos rápidos del muro' : 'Pasar al muro (máx. 3)'"
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

    <div v-if="draft" class="sheet" @click.self="closeDraft">
      <form class="panel panel-wide" @submit.prevent="save">
        <div class="panel-head">
          <h2>{{ draft.id ? 'Configurar enlace' : 'Nuevo enlace' }}</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeDraft">×</button>
        </div>

        <div class="panel-layout">
          <aside class="panel-side">
            <div
              class="hub-card preview"
              :style="draft.color ? { '--accent': draft.color } : undefined"
              aria-hidden="true"
            >
              <div class="card-lead">
                <span class="hub-ico" :data-size="previewSize">
                  <HubIcon :name="draft.icon" :size="iconPx(previewSize)" />
                </span>
                <div class="card-copy">
                  <strong>{{ draft.titulo || 'Título' }}</strong>
                  <small>{{ draft.subtitulo || kindHint(draft.kind) }}</small>
                </div>
              </div>
              <span class="kind-chip">{{ kindLabel(draft.kind) }}</span>
            </div>

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
                  <HubIcon :name="opt.id" :size="18" />
                </button>
              </div>
            </fieldset>

            <label>Tamaño (solo admin)
              <select v-model="draft.iconSize" class="input">
                <option value="inherit">Heredar del grupo</option>
                <option value="sm">Chico</option>
                <option value="md">Mediano</option>
                <option value="lg">Grande</option>
              </select>
            </label>
            <label>Color
              <span class="color-row">
                <input
                  type="color"
                  class="color-swatch"
                  :value="draft.color || '#0F766E'"
                  @input="draft.color = $event.target.value"
                />
                <input v-model="draft.color" class="input" placeholder="Marca" />
              </span>
              <button v-if="draft.color" type="button" class="btn-ghost sm" @click="draft.color = ''">Quitar color</button>
            </label>

            <label>Visible hasta
              <input v-model="draft.visibleUntilDate" type="date" class="input" required />
            </label>
            <button type="button" class="btn-ghost sm" @click="draft.visibleUntilDate = '2099-01-01'">Usar 1/1/2099</button>

            <label class="check"><input v-model="draft.activo" type="checkbox" /> Activo</label>
            <label class="check">
              <input v-model="draft.featured" type="checkbox" />
              Acceso rápido (máx. 3)
            </label>
          </aside>

          <div class="panel-main">
            <label>Título<input v-model="draft.titulo" class="input" required maxlength="120" /></label>
            <label>Subtítulo<input v-model="draft.subtitulo" class="input" maxlength="200" /></label>

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
                    <strong>{{ k.label }}</strong>
                    <span>{{ k.hint }}</span>
                  </button>
                </div>
              </div>
            </fieldset>

            <!-- Destino dinámico -->
            <div class="dest-box">
              <p class="dest-title">Destino</p>

              <template v-if="draft.kind === 'url' || draft.kind === 'webview'">
                <label>URL
                  <input v-model="draft.target" class="input" required placeholder="https://ejemplo.com/…" />
                </label>
                <label>Query extra (opcional, JSON)
                  <input v-model="draft.queryJson" class="input" :placeholder="queryPlaceholder" />
                </label>
                <p class="field-hint">Plantillas: {{ templateHints }}</p>
              </template>

              <template v-else-if="draft.kind === 'route'">
                <label>Ruta de la app
                  <input v-model="draft.target" class="input" required placeholder="/muro o /solicitudes" list="hub-routes" />
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
                <label>Query (JSON opcional)
                  <input v-model="draft.queryJson" class="input" placeholder='{"tab":"abiertas"}' />
                </label>
              </template>

              <template v-else-if="draft.kind === 'request'">
                <label>Plantilla de solicitud
                  <select v-model="draft.requestTypeId" class="input" required>
                    <option disabled value="">Elegí…</option>
                    <option v-for="t in options.requestTypes" :key="t.id" :value="t.id">
                      {{ t.nombre }}{{ t.area ? ` (${t.area})` : '' }}
                    </option>
                  </select>
                </label>
              </template>

              <template v-else-if="draft.kind === 'survey'">
                <label>Encuesta
                  <select v-model="draft.surveyId" class="input" required>
                    <option disabled value="">Elegí…</option>
                    <option v-for="s in options.surveys" :key="s.id" :value="s.id">
                      {{ s.titulo }} ({{ s.status }})
                    </option>
                  </select>
                </label>
              </template>

              <template v-else-if="draft.kind === 'document'">
                <label>Documento
                  <select v-model="draft.docId" class="input" required>
                    <option disabled value="">Elegí…</option>
                    <option v-for="d in options.documents" :key="d.id" :value="d.id">
                      {{ d.titulo }}{{ d.category ? ` · ${d.category}` : '' }}
                    </option>
                  </select>
                </label>
              </template>

              <template v-else-if="draft.kind === 'post'">
                <label>Publicación
                  <select v-model="draft.postId" class="input" required>
                    <option disabled value="">Elegí…</option>
                    <option v-for="p in options.posts" :key="p.id" :value="p.id">
                      {{ p.titulo }} ({{ p.status }})
                    </option>
                  </select>
                </label>
              </template>

              <template v-else-if="draft.kind === 'mailto'">
                <label>Email
                  <input v-model="draft.target" class="input" type="email" required placeholder="rrhh@empresa.com" />
                </label>
                <label>Asunto
                  <input v-model="draft.mailSubject" class="input" :placeholder="mailSubjectPh" />
                </label>
                <label>Cuerpo
                  <textarea v-model="draft.mailBody" class="input" rows="3" :placeholder="mailBodyPh" />
                </label>
                <p class="field-hint">Plantillas: {{ templateHints }}</p>
              </template>

              <template v-else-if="draft.kind === 'tel'">
                <label>Teléfono
                  <input v-model="draft.target" class="input" required placeholder="+54 11 5555-5555" />
                </label>
              </template>

              <template v-else-if="draft.kind === 'whatsapp'">
                <label>Número (con código de país)
                  <input v-model="draft.target" class="input" required placeholder="5491155555555" />
                </label>
                <label>Mensaje inicial
                  <textarea v-model="draft.waText" class="input" rows="2" :placeholder="waPh" />
                </label>
                <p class="field-hint">Plantillas: {{ templateHints }}</p>
              </template>

              <template v-else-if="draft.kind === 'copy'">
                <label>Texto a copiar
                  <textarea v-model="draft.copyText" class="input" rows="2" required placeholder="CODIGO-BENEFICIO-2026" />
                </label>
                <label>Mensaje al copiar
                  <input v-model="draft.copyMessage" class="input" placeholder="Código copiado" />
                </label>
              </template>
            </div>

            <div class="row2">
              <label>Grupo
                <input v-model="draft.category" class="input" list="hub-cats" />
              </label>
              <label>Orden<input v-model.number="draft.order" type="number" class="input" /></label>
            </div>
            <datalist id="hub-cats">
              <option v-for="c in categoryOptions" :key="c" :value="c" />
            </datalist>
          </div>
        </div>

        <div class="footer">
          <button v-if="draft.id" type="button" class="btn-ghost danger" @click="removeDraft">Borrar</button>
          <span class="spacer" />
          <button type="button" class="btn-ghost" @click="closeDraft">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">Guardar</button>
        </div>
        <p v-if="formError" class="err">{{ formError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import HubIcon from '../components/HubIcon.vue'
import { HUB_ICONS, resolveIconSize } from '../utils/hubIcons'
import { HUB_KINDS, HUB_KIND_GROUPS, kindLabel, kindShort, normalizeKindId } from '../utils/hubKinds'

const ICON_PX = { sm: 16, md: 20, lg: 26 }
const iconSizeOpts = [
  { value: 'sm', label: 'Chico' },
  { value: 'md', label: 'Medio' },
  { value: 'lg', label: 'Grande' },
]
const iconOptions = HUB_ICONS
const kindGroups = HUB_KIND_GROUPS
const templateHints = '{{usuario}} · {{legajo}} · {{nombre}} · {{email}} · {{empCodigo}} · {{tenant}}'
const queryPlaceholder = '{"ref":"mi-codigo"}'
const mailSubjectPh = 'Consulta de {{nombre}}'
const mailBodyPh = 'Hola, soy {{nombre}}…'
const waPh = 'Hola, soy {{nombre}} de {{tenant}}'
const iconQuery = ref('')
const items = ref([])
const categories = ref([])
const options = ref({ requestTypes: [], surveys: [], documents: [], posts: [] })
const draft = ref(null)
const error = ref('')
const formError = ref('')
const saving = ref(false)
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
const selectedGroupNombre = ref('')

const aiOpen = ref(false)
const aiConfigured = ref(false)
const aiGuide = ref(null)
const aiPrompt = ref('')
const aiPlan = ref(null)
const aiBusy = ref(false)
const aiMode = ref('')
const aiError = ref('')
const aiInfo = ref('')

const aiExamples = computed(() => aiGuide.value?.examples || [
  'Marcá como rápidos los 3 de más clics en cada grupo',
  'Poné todos los iconos en mediano y color #0F766E',
  'Ordená los grupos: Connectia, TI, RRHH, Comunicación',
])

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

/** Grupos que el usuario vería como pestañas en el muro. */
const muroPreviewCats = computed(() =>
  orderedCategories.value.filter((c) => c.activo !== false && c.showOnMuro !== false),
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

const muroPreviewQuick = computed(() => {
  const cat = muroPreviewCat.value
  if (!cat) return []
  const list = (grouped.value[cat] || []).filter((l) => l.activo !== false && !l.expired)
  const featured = list.filter((l) => l.featured)
  return (featured.length ? featured : list).slice(0, 3)
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
  return [...set].sort()
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
  draft.value = emptyDraft()
}

function edit(l) {
  formError.value = ''
  iconQuery.value = ''
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

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const body = buildSaveBody()
    if (draft.value.id) await api.patch(`/admin/hub/${draft.value.id}`, body)
    else await api.post('/admin/hub', body)
    closeDraft()
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function removeDraft() {
  if (!draft.value?.id) return
  if (!confirm(`¿Borrar “${draft.value.titulo}”?`)) return
  try {
    await api.delete(`/admin/hub/${draft.value.id}`)
    closeDraft()
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
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
  if (next && quickCount(l.category) >= 3) {
    error.value = `Ya hay 3 accesos rápidos en «${l.category}». Quitá uno antes.`
    return
  }
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

function toggleAi() {
  aiOpen.value = !aiOpen.value
  if (aiOpen.value && !aiGuide.value) loadAiMeta()
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
  return JSON.stringify(op)
}

async function runAiPlan() {
  aiError.value = ''
  aiInfo.value = ''
  aiBusy.value = true
  aiMode.value = 'plan'
  try {
    const { data } = await api.post('/admin/hub/ai-plan', { prompt: aiPrompt.value })
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
      : { prompt: aiPrompt.value, apply: true }
    const { data } = await api.post('/admin/hub/ai-apply', body)
    if (data.plan) aiPlan.value = data.plan
    if (Array.isArray(data.items)) items.value = data.items
    if (Array.isArray(data.categories)) categories.value = data.categories
    else await load()
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
.page-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 8px; }
.page-head h1 { margin: 0; font-family: var(--font-display, Fraunces, Georgia, serif); font-size: 1.45rem; }
.page-head p { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.head-actions .btn-ghost.on {
  background: color-mix(in srgb, var(--primary, #0F766E) 14%, #fff);
  border-color: color-mix(in srgb, var(--primary, #0F766E) 40%, #e2e8f0);
  color: var(--primary, #0F766E);
  font-weight: 700;
}

.ai-panel {
  margin: 12px 0 8px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--primary, #0F766E) 28%, #e2e8f0);
  border-radius: 16px;
  background: color-mix(in srgb, var(--primary, #0F766E) 5%, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.ai-panel-head h2 {
  margin: 0;
  font-size: 1.05rem;
}
.ai-panel-head p {
  margin: 4px 0 0;
  font-size: 0.86rem;
  color: #64748b;
}
.ai-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
}
.ai-badge[data-on='1'] {
  background: color-mix(in srgb, #0f766e 16%, #fff);
  color: #0f766e;
}
.ai-guide {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
}
.ai-guide summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
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
.ai-guide-list strong { color: #0f172a; }
.ai-guide-list span { color: #64748b; }
.ai-guide-sum {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: #475569;
}
.ai-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ai-chip {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  color: #334155;
  max-width: 100%;
  text-align: left;
}
.ai-chip:hover {
  border-color: var(--primary, #0F766E);
  color: var(--primary, #0F766E);
}
.ai-prompt-label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.ai-prompt {
  resize: vertical;
  min-height: 72px;
  font-weight: 400;
}
.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-info {
  margin: 0;
  font-size: 0.85rem;
  color: #0f766e;
  font-weight: 600;
}
.ai-plan {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}
.ai-plan-sum { margin: 0 0 6px; font-size: 0.95rem; }
.ai-plan-exp { margin: 0 0 10px; font-size: 0.85rem; color: #475569; }
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
  color: #64748b;
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
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
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
  background: color-mix(in srgb, var(--primary, #0F766E) 8%, #fff);
  border-color: color-mix(in srgb, var(--primary, #0F766E) 28%, #e2e8f0);
}
.group-item.off { opacity: 0.65; }
.group-item.off-muro {
  background: #fffbeb;
  border-color: #fcd34d;
}
.group-item.drop-group {
  border-color: var(--primary, #0F766E);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, #0F766E) 22%, transparent);
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
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
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
  border-top: 1px solid #e2e8f0;
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
  color: #64748b;
}
.hub-section-empty {
  margin: 8px 0 0;
  font-size: 0.82rem;
}

.muro-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  margin-top: 12px;
}
.muro-bar-actions {
  flex-shrink: 0;
  margin-left: auto;
}
.muro-bar-spacer {
  flex: 1;
  min-width: 0;
}
.muro-preview {
  margin: 0;
  padding: 12px 14px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  flex: 1 1 320px;
  min-width: 0;
  max-width: min(520px, 100%);
}
.muro-preview-head {
  margin-bottom: 10px;
}
.muro-preview-head h2 {
  margin: 0;
  font-size: 0.95rem;
}
.muro-preview-head p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #64748b;
}
.muro-preview-empty {
  margin: 0;
  flex: 1 1 240px;
  color: #b45309;
  align-self: center;
}
.mp-shell {
  max-width: 380px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--brand-primary, var(--primary, #0f766e));
}
.mp-tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding: 8px 8px 0;
  scrollbar-width: none;
}
.mp-tabs::-webkit-scrollbar { display: none; }
.mp-tab {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 8px 12px 10px;
  border-radius: 14px 14px 0 0;
  cursor: pointer;
}
.mp-tab.on {
  background: #fff;
  color: #1a1a1a;
  font-weight: 800;
}
.mp-card {
  background: #fff;
  padding: 12px 10px;
  border-radius: 0 14px 14px 14px;
}
.mp-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.mp-action {
  --tile-accent: var(--accent, var(--brand-primary, var(--primary, #0f766e)));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 76px;
  padding: 8px 4px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--tile-accent) 16%, #fff);
  color: var(--tile-accent);
}
.mp-action-ico {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  color: inherit;
}
.mp-action-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
  overflow-wrap: anywhere;
  color: color-mix(in srgb, var(--tile-accent) 72%, #0f172a);
}
.mp-empty {
  grid-column: 1 / -1;
  margin: 6px 0;
  text-align: center;
  color: #64748b;
  font-size: 0.82rem;
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
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  border-radius: 10px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
}
.tool-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary, #0F766E) 40%, #cbd5e1);
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
  border: 1px solid #e2e8f0;
  background: #fff;
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
  border-color: color-mix(in srgb, var(--primary, #0F766E) 35%, #e2e8f0);
  background: color-mix(in srgb, var(--primary, #0F766E) 8%, #fff);
}
.tool-toggle-track {
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.tool-toggle.on .tool-toggle-track {
  background: var(--primary, #0F766E);
}
.tool-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
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
  color: #64748b;
  font-weight: 600;
}
.tool-toggle.on .tool-toggle-text small {
  color: color-mix(in srgb, var(--primary, #0F766E) 70%, #0f172a);
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
  color: #64748b;
}
.tool-seg-opts {
  display: inline-flex;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.tool-seg-btn {
  border: 0;
  border-right: 1px solid #e2e8f0;
  background: transparent;
  padding: 7px 12px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  min-width: 36px;
}
.tool-seg-btn:last-child { border-right: 0; }
.tool-seg-btn:hover:not(:disabled):not(.on) {
  background: #f1f5f9;
  color: #0f172a;
}
.tool-seg-btn.on {
  background: var(--primary, #0F766E);
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
  color: #64748b;
}
.rename-form input {
  min-width: 180px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 7px 10px;
  font: inherit;
  font-size: 0.9rem;
  color: #0f172a;
  background: #fff;
}
.rename-form input:focus {
  outline: 2px solid color-mix(in srgb, var(--primary, #0F766E) 35%, transparent);
  border-color: var(--primary, #0F766E);
}
.new-group-form {
  margin: 12px 0 0;
  padding: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
}
.drag-handle {
  cursor: grab;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
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
  background: #f1f5f9;
  color: #64748b;
  border-radius: 999px;
  padding: 2px 8px;
}
.cat-stat {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
}
.cat-stat.soft {
  color: #0f766e;
  background: #ecfdf5;
}
.pill.soft {
  font-size: 0.68rem;
  font-weight: 650;
  color: #0f766e;
  background: #ecfdf5;
  border-radius: 999px;
  padding: 2px 8px;
}
.pill.warn {
  font-size: 0.68rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #b45309;
  background: #fff7ed;
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
  background: color-mix(in srgb, var(--primary, #0F766E) 8%, transparent);
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
  border: 2px solid var(--accent, var(--primary, #0F766E));
  background: #fff;
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
  color: #94a3b8;
}
.card-kind[data-kind] {
  color: #94a3b8;
  background: transparent;
  border-color: transparent;
}
.hub-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}
.hub-card.inactive { opacity: 0.55; }
.hub-card.featured {
  border-color: var(--accent, #0F766E);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, #0F766E) 25%, transparent);
}
.hub-card.dragging { opacity: 0.4; }
.hub-card.drop-before {
  border-color: var(--primary, #0F766E);
  box-shadow: inset 3px 0 0 var(--primary, #0F766E);
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
  color: #94a3b8;
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
  background: #f1f5f9;
  color: #64748b;
}
.card-ico-btn.on {
  color: var(--primary, #0F766E);
}
.card-ico-btn.on:hover {
  background: color-mix(in srgb, var(--primary, #0F766E) 10%, #fff);
  color: var(--primary, #0F766E);
}
.card-ico-btn.danger {
  color: #f87171;
}
.card-ico-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}
.mini {
  width: 26px;
  height: 26px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  color: #475569;
}
.mini:disabled { opacity: 0.35; cursor: default; }
.mini.on {
  color: #0f766e;
  border-color: color-mix(in srgb, #0f766e 40%, #e2e8f0);
  background: #ecfdf5;
}
.hub-ico {
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1.5px solid var(--accent, var(--primary, #0F766E));
  background: #fff;
  color: var(--accent, var(--primary, #0F766E));
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
  color: #64748b;
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
  color: #64748b;
}
.hub-badge {
  color: #b45309;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.hub-badge.featured { color: #0f766e; }
.hub-badge.temp { color: #0369a1; }
.field-hint {
  margin-top: 4px;
  font-size: 0.72rem;
  font-weight: 500;
  color: #64748b;
}

.hub-muted { color: #64748b; }
.hub-muted.center { text-align: center; margin-top: 24px; }

.sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 40;
  padding: 16px;
}
.panel {
  width: min(520px, 100%);
  max-height: min(92vh, 820px);
  overflow: auto;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel-wide {
  width: min(1100px, 100%);
  max-height: min(94vh, 920px);
}
.panel-layout {
  display: grid;
  grid-template-columns: minmax(180px, 20%) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.panel-main, .panel-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.panel-side {
  position: sticky;
  top: 0;
  max-height: min(78vh, 780px);
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
  border: 1px solid #e2e8f0;
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
  color: #64748b;
  font-weight: 650;
}
.kind-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.kind-opt {
  text-align: left;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  padding: 8px 10px;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kind-opt strong { font-size: 0.82rem; }
.kind-opt span { font-size: 0.68rem; color: #64748b; line-height: 1.25; }
.kind-opt.on {
  border-color: var(--primary, #0F766E);
  background: color-mix(in srgb, var(--primary, #0F766E) 10%, #fff);
  box-shadow: inset 0 0 0 1px var(--primary, #0F766E);
}
.kind-chip {
  display: inline-flex;
  margin-top: 4px;
  font-size: 0.65rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #0f766e;
  background: color-mix(in srgb, #0f766e 12%, #fff);
  border-radius: 999px;
  padding: 2px 8px;
}
@media (max-width: 900px) {
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
  color: #64748b;
  padding: 0 4px;
}
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.color-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.color-swatch {
  width: 40px;
  height: 36px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  flex-shrink: 0;
}
.icon-field {
  border: 1px solid #e2e8f0;
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
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  max-height: 148px;
  overflow-y: auto;
  padding: 2px;
  scrollbar-gutter: stable;
}
.icon-opt {
  aspect-ratio: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  color: #0f766e;
  display: grid;
  place-items: center;
}
.icon-opt.on {
  border-color: var(--primary, #0F766E);
  background: color-mix(in srgb, var(--primary, #0F766E) 12%, #fff);
  box-shadow: inset 0 0 0 1px var(--primary, #0F766E);
}
.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  margin-top: 4px;
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
  border: 1px solid #cbd5e1;
  background: #fff;
  font: inherit;
}
.btn-primary { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost.danger { color: #b91c1c; }
.btn-ghost.sm { padding: 6px 8px; font-size: 0.8rem; white-space: nowrap; }
.btn-primary.sm { padding: 6px 10px; font-size: 0.8rem; white-space: nowrap; }
.err { color: #b91c1c; margin: 0; }
@media (max-width: 560px) {
  .icon-grid { grid-template-columns: repeat(6, 1fr); max-height: 132px; }
  .row2 { grid-template-columns: 1fr; }
}
</style>
