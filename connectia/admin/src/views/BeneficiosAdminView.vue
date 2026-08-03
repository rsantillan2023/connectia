<template>
  <div>
    <AdminPageHeader title="Beneficios para miembros de la comunidad" />
    <ScreenHelp
      purpose="ABM del catálogo: tipos de beneficio, imagen, empresas asociadas, reglas de puntos y canjes."
      can-do="Crear beneficios paso a paso, ver previews, acreditar puntos y revisar canjes."
    />

    <nav class="ben-tabs" aria-label="Secciones de beneficios">
      <button type="button" :class="{ on: panel === 'list' }" @click="goCatalog">
        Listado de Beneficios
      </button>
      <button
        type="button"
        class="ben-tab-gestion"
        :class="{ on: panel === 'gestion' }"
        :title="attentionCount ? `${attentionCount} pendiente(s) de acción` : 'Gestión de Canjes'"
        @click="openGestion"
      >
        Gestión de Canjes
        <span
          v-if="attentionCount > 0"
          class="ben-attn-bell"
          :aria-label="`${attentionCount} pendientes`"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path
              d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22zm7-6.2V11a7 7 0 0 0-5-6.7V3.8a2 2 0 1 0-4 0v.5A7 7 0 0 0 5 11v4.8L3.4 17.4a1 1 0 0 0 .7 1.7h15.8a1 1 0 0 0 .7-1.7L19 15.8z"
            />
          </svg>
          <em>{{ attentionCount > 99 ? '99+' : attentionCount }}</em>
        </span>
      </button>
      <div class="ben-tabs-end">
        <button type="button" class="btn-primary ben-tab-new" @click="newChooserOpen = true">
          + Beneficio
        </button>
        <button
          type="button"
          class="ben-cfg-btn"
          :class="{ on: configOpen || isConfigPanel }"
          :aria-expanded="configOpen"
          aria-controls="ben-config-tabs"
          title="Configuración"
          @click="toggleConfig"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            />
          </svg>
          <span class="ben-cfg-btn__label">Configuración</span>
        </button>
      </div>
    </nav>

    <nav
      v-if="configOpen"
      id="ben-config-tabs"
      class="ben-tabs ben-tabs--config"
      aria-label="Configuración de beneficios"
    >
      <button type="button" :class="{ on: panel === 'types' }" @click="openOfferTypes">
        Tipos de Beneficios
      </button>
      <button type="button" :class="{ on: panel === 'categories' }" @click="openCategories">
        Categorías
      </button>
      <button type="button" :class="{ on: panel === 'rules' }" @click="openRules">
        Reglas de puntos
      </button>
      <button type="button" :class="{ on: panel === 'partners' }" @click="goPartners">
        Empresas asociadas
      </button>
      <button
        type="button"
        class="ben-cfg-seed"
        :disabled="busy"
        title="Cargar catálogo base de demo"
        aria-label="Cargar catálogo base de demo"
        @click="seedDefaults"
      >
        <svg
          v-if="!(busy && seeding)"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M12 3v12" />
          <path d="m8 11 4 4 4-4" />
          <path d="M4 19h16" />
          <path d="M6 19v2h12v-2" />
        </svg>
        <svg
          v-else
          class="spin"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
        <span>Catálogo base</span>
      </button>
    </nav>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <!-- Elegir cómo crear -->
    <div v-if="newChooserOpen" class="sheet-backdrop ben-chooser-backdrop" @click.self="newChooserOpen = false">
      <div class="ben-chooser" role="dialog" aria-modal="true" aria-labelledby="ben-new-title">
        <header class="ben-chooser-head">
          <div>
            <h2 id="ben-new-title">Nuevo beneficio</h2>
            <p>Elegí cómo querés crearlo.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="newChooserOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div class="ben-chooser-options">
          <button type="button" class="ben-chooser-opt" @click="chooseNewManual">
            <strong>Crear a mano</strong>
            <small>Wizard paso a paso: tipo, contenido, reglas, audiencia y publicación.</small>
          </button>
          <button type="button" class="ben-chooser-opt primary" @click="chooseNewAi">
            <strong>Crear con IA</strong>
            <small>Describí qué querés y la IA arma título, textos, tipo, puntos e imagen.</small>
          </button>
        </div>
        <footer class="ben-chooser-foot">
          <button type="button" class="btn-ghost" @click="newChooserOpen = false">Cancelar</button>
        </footer>
      </div>
    </div>

    <!-- Prompt IA -->
    <div v-if="aiCreateOpen" class="sheet-backdrop ben-chooser-backdrop" @click.self="closeAiCreate">
      <div class="ben-chooser ben-ai-create" role="dialog" aria-modal="true" aria-labelledby="ben-ai-title">
        <header class="ben-chooser-head">
          <div>
            <h2 id="ben-ai-title">Nuevo beneficio con IA</h2>
            <p>Contá qué beneficio querés. Buscamos imagen y completamos los campos.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeAiCreate">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <label class="lbl">
          ¿Qué querés crear?
          <textarea
            v-model="aiCreatePrompt"
            class="input"
            rows="4"
            maxlength="1500"
            placeholder="Ej.: Descuento 20% en farmacias del barrio, canjeable con puntos, foto de farmacia moderna…"
            :disabled="aiCreating"
          />
        </label>
        <p v-if="aiCreateError" class="text-sm text-red-600 mt-2">{{ aiCreateError }}</p>
        <div v-if="aiCreating" class="ben-ai-progress">
          <span class="spin" aria-hidden="true" />
          Generando borrador e imagen…
        </div>
        <footer class="ben-chooser-foot">
          <button type="button" class="btn-ghost" :disabled="aiCreating" @click="closeAiCreate">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="aiCreating || aiCreatePrompt.trim().length < 8"
            @click="runAiCreate"
          >
            {{ aiCreating ? 'Generando…' : 'Generar borrador' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Tipos de beneficios (nombres visibles) -->
    <section v-if="panel === 'types'" class="mt-4 panel">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 class="text-lg font-semibold">Tipos de Beneficios</h2>
          <p class="text-sm text-slate-500 mt-1">
            Definí cómo se llaman y describen los tipos en esta comunidad. El id interno no cambia.
          </p>
        </div>
        <button type="button" class="btn-primary" :disabled="busy" @click="saveOfferTypes">
          {{ busy ? 'Guardando…' : 'Guardar tipos' }}
        </button>
      </div>
      <div class="type-labels-grid">
        <article v-for="t in offerTypeDraft" :key="t.id" class="type-label-card" :data-type="t.id">
          <header class="type-label-head">
            <span class="type-label-icon" aria-hidden="true">
              <!-- informativo -->
              <svg v-if="t.id === 'informativo'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" stroke-linecap="round" />
                <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
              </svg>
              <!-- canjeable -->
              <svg v-else-if="t.id === 'canjeable'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                <circle cx="9" cy="12" r="6" />
                <circle cx="15" cy="12" r="6" />
                <path d="M9 10.5v3M15 10.5v3" stroke-linecap="round" />
              </svg>
              <!-- premio -->
              <svg v-else-if="t.id === 'premio'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                <path d="M12 8v13" />
                <path d="M8 21h8" stroke-linecap="round" />
                <path d="M7 8h10l-1.2 3.2a4 4 0 01-3.8 2.6h0a4 4 0 01-3.8-2.6L7 8z" />
                <path d="M9 4.5c0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5S13.7 2 12 2 9 3.1 9 4.5z" />
              </svg>
              <!-- geo -->
              <svg v-else-if="t.id === 'geo'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <!-- partner -->
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                <path d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.5 5.5" stroke-linecap="round" />
                <path d="M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07L13.5 18.5" stroke-linecap="round" />
              </svg>
            </span>
            <div class="type-label-titles">
              <p class="type-id">{{ t.id }}</p>
              <p class="type-kind-tag">{{ offerTypeKindLabel(t.id) }}</p>
            </div>
          </header>
          <p class="type-label-desc">{{ t.hint || 'Sin descripción corta' }}</p>
          <label class="lbl">
            Nombre visible
            <input v-model="t.label" class="input" maxlength="80" />
          </label>
          <label class="lbl">
            Descripción corta
            <textarea
              v-model="t.hint"
              class="input type-hint-input"
              rows="2"
              maxlength="240"
              placeholder="Cómo se explica este tipo en el wizard y en la app…"
            />
          </label>
          <p class="type-example">Ej.: {{ offerTypeExample(t.id) }}</p>
        </article>
      </div>
    </section>

    <!-- Categorías de beneficios -->
    <section v-if="panel === 'categories'" class="mt-4 panel cat-panel">
      <div class="cat-panel-head">
        <div>
          <h2 class="cat-panel-title">Categorías</h2>
          <p class="cat-panel-sub">
            Agrupan los beneficios en la app. Editá icono, nombre y un ejemplo corto.
          </p>
        </div>
        <div class="cat-panel-actions">
          <button type="button" class="btn-ghost" @click="openCategoryModal()">+ Categoría</button>
          <button type="button" class="btn-primary" :disabled="busy" @click="saveCategories">
            {{ busy ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>

      <div class="cat-preview-rail" aria-label="Vista previa en la app">
        <span class="cat-preview-rail-lbl">Así se ven</span>
        <div class="cat-preview-chips">
          <span
            v-for="(c, idx) in categoryDraft"
            :key="'prev-' + (c._key || c.id || idx)"
            class="cat-preview-chip"
          >
            <em aria-hidden="true">{{ c.emoji || '🏷️' }}</em>
            {{ c.label || 'Sin nombre' }}
          </span>
        </div>
      </div>

      <div v-if="categoryDraft.length" class="cat-cards" aria-label="Categorías">
        <article
          v-for="(c, idx) in categoryDraft"
          :key="c._key || c.id || idx"
          class="cat-card"
        >
          <header class="cat-card-head">
            <div class="cat-row-emoji">
              <button
                type="button"
                class="cat-emoji-btn"
                :title="'Cambiar icono'"
                :aria-expanded="categoryEmojiOpen === idx"
                aria-label="Cambiar icono"
                @click="toggleCategoryEmojiPicker(idx)"
              >
                {{ c.emoji || '🏷️' }}
              </button>
              <div v-if="categoryEmojiOpen === idx" class="cat-emoji-picker" @click.stop>
                <button
                  v-for="em in CAT_EMOJI_PRESETS"
                  :key="em"
                  type="button"
                  class="cat-emoji-opt"
                  :class="{ on: c.emoji === em }"
                  @click="pickCategoryEmoji(idx, em)"
                >
                  {{ em }}
                </button>
                <input
                  v-model="c.emoji"
                  class="input cat-emoji-free"
                  maxlength="4"
                  placeholder="Otro…"
                  aria-label="Emoji libre"
                  @input="c.emoji = String(c.emoji || '').slice(0, 4)"
                />
              </div>
            </div>
            <button
              type="button"
              class="icon-btn danger cat-card-del"
              :disabled="c.id === 'otros' || categoryDraft.length <= 1"
              :title="c.id === 'otros' ? '«Otros» no se puede eliminar' : 'Eliminar'"
              aria-label="Eliminar categoría"
              @click="askRemoveCategory(idx)"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </header>
          <div class="cat-row-fields">
            <label class="lbl">
              Nombre
              <input
                v-model="c.label"
                class="input"
                maxlength="80"
                placeholder="Ej. Bienestar"
                @blur="normalizeCategoryDraftId(c)"
              />
            </label>
            <label class="lbl">
              Ejemplo
              <input
                v-model="c.example"
                class="input"
                maxlength="160"
                placeholder="Ej.: 15% en supermercados"
              />
            </label>
          </div>
        </article>
      </div>
      <p v-else class="cat-empty">No hay categorías. Agregá una.</p>
    </section>

    <!-- Modal nueva categoría -->
    <div
      v-if="categoryModalOpen"
      class="sheet-backdrop ben-chooser-backdrop"
      @click.self="closeCategoryModal"
    >
      <div
        class="ben-chooser cat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-modal-title"
      >
        <header class="ben-chooser-head">
          <div>
            <h2 id="cat-modal-title">Nueva categoría</h2>
            <p>Icono, nombre y un ejemplo para la app.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeCategoryModal">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div class="cat-modal-body">
          <div class="cat-modal-emoji-block">
            <span class="cat-modal-emoji-preview" aria-hidden="true">{{ categoryModal.emoji || '🏷️' }}</span>
            <div class="cat-emoji-picker cat-emoji-picker--static">
              <button
                v-for="em in CAT_EMOJI_PRESETS"
                :key="'m-' + em"
                type="button"
                class="cat-emoji-opt"
                :class="{ on: categoryModal.emoji === em }"
                @click="categoryModal.emoji = em"
              >
                {{ em }}
              </button>
            </div>
            <input
              v-model="categoryModal.emoji"
              class="input cat-emoji-free"
              maxlength="4"
              placeholder="O escribí un emoji"
              aria-label="Emoji"
            />
          </div>
          <label class="lbl">
            Nombre
            <input
              v-model="categoryModal.label"
              class="input"
              maxlength="80"
              placeholder="Ej. Bienestar"
            />
          </label>
          <label class="lbl">
            Ejemplo
            <input
              v-model="categoryModal.example"
              class="input"
              maxlength="160"
              placeholder="Ej.: Gimnasio con convenio"
            />
          </label>
        </div>
        <footer class="ben-chooser-foot">
          <button type="button" class="btn-ghost" @click="closeCategoryModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="!canSaveCategoryModal" @click="confirmCategoryModal">
            Agregar
          </button>
        </footer>
      </div>
    </div>

    <!-- Confirmar eliminar categoría -->
    <div
      v-if="categoryDeleteOpen"
      class="sheet-backdrop ben-chooser-backdrop"
      @click.self="closeCategoryDelete"
    >
      <div class="ben-chooser cat-delete-modal" role="dialog" aria-modal="true" aria-labelledby="cat-del-title">
        <header class="ben-chooser-head">
          <div>
            <h2 id="cat-del-title">Eliminar categoría</h2>
            <p>Se quita del listado. Guardá después para aplicar.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeCategoryDelete">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div class="cat-delete-body">
          <div class="cat-delete-preview">
            <span class="cat-delete-emoji" aria-hidden="true">
              {{ categoryDeleteTarget?.emoji || '🏷️' }}
            </span>
            <div>
              <strong>{{ categoryDeleteTarget?.label || 'Sin nombre' }}</strong>
              <small v-if="categoryDeleteTarget?.example">{{ categoryDeleteTarget.example }}</small>
            </div>
          </div>
          <p class="cat-delete-warn">
            ¿Confirmás eliminar esta categoría? Los beneficios que la usen pueden quedar en «Otros» al guardar.
          </p>
        </div>
        <footer class="ben-chooser-foot">
          <button type="button" class="btn-ghost" @click="closeCategoryDelete">Cancelar</button>
          <button type="button" class="btn-danger" @click="confirmRemoveCategory">Sí, eliminar</button>
        </footer>
      </div>
    </div>

    <!-- Reglas de puntos -->
    <section v-if="panel === 'rules'" class="mt-4 panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Reglas de puntos por uso</h2>
          <p class="text-sm text-slate-500 mt-1">
            Sumá puntos cuando la comunidad publica, reacciona, comenta, guarda o comparte.
          </p>
          <p v-if="rulesMeta.walletEnabled === false" class="text-sm text-amber-700 mt-1">
            La billetera no está activa: las reglas no acreditarán hasta habilitarla en Comunidad.
          </p>
        </div>
        <button type="button" class="btn-ghost" :disabled="busy" @click="seedRules">Cargar defaults</button>
      </div>
      <table class="w-full text-sm mt-3">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Acción</th>
            <th class="p-2">Puntos</th>
            <th class="p-2">Tope/día</th>
            <th class="p-2">Activa</th>
            <th class="p-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.event" class="border-t">
            <td class="p-2">
              <div class="font-medium">{{ r.eventLabel || r.label }}</div>
            </td>
            <td class="p-2">
              <input v-model.number="r.points" class="input w-24" type="number" min="0" />
            </td>
            <td class="p-2">
              <input v-model="r.dailyCap" class="input w-24" type="number" min="0" placeholder="∞" />
            </td>
            <td class="p-2">
              <label class="inline-flex items-center gap-2">
                <input v-model="r.enabled" type="checkbox" />
                Sí
              </label>
            </td>
            <td class="p-2 text-right">
              <button type="button" class="btn-primary text-sm" :disabled="busy" @click="saveRule(r)">
                Guardar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Gestión de Canjes: puntos de miembros + canjes -->
    <section v-if="panel === 'gestion'" class="mt-4">
      <div class="gestion-head panel">
        <div>
          <h2 class="text-lg font-semibold">Gestión de Canjes</h2>
          <p class="text-sm text-slate-500 mt-1">
            Saldos de puntos de la comunidad y canjes realizados.
          </p>
        </div>
        <button type="button" class="btn-ghost" @click="exportCsv">Export CSV</button>
      </div>

      <div class="ben-tabs ben-tabs--sub mt-3" role="tablist" aria-label="Secciones de gestión">
        <button
          type="button"
          role="tab"
          :aria-selected="gestionTab === 'points'"
          :class="{ on: gestionTab === 'points' }"
          @click="gestionTab = 'points'"
        >
          Puntos de miembros
          <em v-if="wallets.length">{{ wallets.length }}</em>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="gestionTab === 'pendientes'"
          :class="{ on: gestionTab === 'pendientes' }"
          @click="gestionTab = 'pendientes'"
        >
          Pendientes
          <em v-if="attentionCount" class="attn">{{ attentionCount }}</em>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="gestionTab === 'canjes'"
          :class="{ on: gestionTab === 'canjes' }"
          @click="gestionTab = 'canjes'"
        >
          Canjes
          <em v-if="report.length">{{ report.length }}</em>
        </button>
      </div>

      <div v-if="gestionTab === 'points'" class="panel mt-3">
        <h3 class="font-semibold">Acreditar puntos</h3>
        <div class="grid gap-2 mt-2" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
          <input v-model="credit.q" class="input" placeholder="Buscar usuario…" @input="searchCreditUser" />
          <input v-model.number="credit.amount" class="input" type="number" placeholder="Monto (+ acredita / − desacredita)" />
          <input v-model="credit.concept" class="input" placeholder="Motivo (obligatorio)" maxlength="240" />
          <button type="button" class="btn-primary" :disabled="!credit.userId || busy" @click="doCredit">
            Aplicar
          </button>
        </div>
        <ul v-if="creditResults.length" class="user-results mt-2">
          <li v-for="u in creditResults" :key="u.id">
            <button type="button" @click="pickCreditUser(u)">
              {{ u.label }} <span class="muted">@{{ u.usuario }}</span>
            </button>
          </li>
        </ul>
        <p v-if="credit.userId" class="text-sm mt-2">Destino: <strong>{{ credit.userLabel }}</strong></p>

        <div class="wallet-table-head mt-4">
          <div>
            <h3 class="font-semibold">Saldos de la comunidad</h3>
            <p class="wallet-table-sub">
              {{ filteredWalletsTotal }} resultado{{ filteredWalletsTotal === 1 ? '' : 's' }}
              <span v-if="walletFiltersActive"> · filtrados</span>
              de {{ wallets.length }}
            </p>
          </div>
        </div>

        <div class="wallet-toolbar" role="search" aria-label="Buscar y filtrar saldos">
          <input
            v-model="walletQ"
            class="input wallet-search"
            type="search"
            placeholder="Buscar…"
            aria-label="Buscar miembro"
          />
          <select v-model="walletBalanceFilter" class="input" aria-label="Filtrar por saldo">
            <option value="">Saldo</option>
            <option value="positive">Con puntos</option>
            <option value="zero">Sin puntos</option>
            <option value="high">≥ 500</option>
          </select>
          <select v-model.number="walletPageSize" class="input wallet-page-size" aria-label="Filas por página">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <button
            v-if="walletFiltersActive"
            type="button"
            class="btn-ghost wallet-clear"
            @click="clearWalletFilters"
          >
            Limpiar
          </button>
        </div>

        <div class="wallet-table-wrap">
          <table class="w-full text-sm wallet-table">
            <thead class="bg-slate-50 text-left text-slate-500">
              <tr>
                <th class="p-2">
                  <button type="button" class="wallet-sort" @click="toggleWalletSort('usuario')">
                    Usuario
                    <span aria-hidden="true">{{ walletSortMark('usuario') }}</span>
                  </button>
                </th>
                <th class="p-2">
                  <button type="button" class="wallet-sort" @click="toggleWalletSort('nombre')">
                    Nombre
                    <span aria-hidden="true">{{ walletSortMark('nombre') }}</span>
                  </button>
                </th>
                <th class="p-2 wallet-col-balance">
                  <button type="button" class="wallet-sort" @click="toggleWalletSort('balance')">
                    Saldo
                    <span aria-hidden="true">{{ walletSortMark('balance') }}</span>
                  </button>
                </th>
                <th class="p-2 wallet-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in pagedWallets" :key="w.userId" class="border-t">
                <td class="p-2">{{ w.usuario || '—' }}</td>
                <td class="p-2">{{ w.nombre || '—' }}</td>
                <td class="p-2 font-semibold wallet-col-balance">{{ w.balance }}</td>
                <td class="p-2 wallet-col-actions">
                  <div class="wallet-row-actions">
                    <button
                      type="button"
                      class="wallet-act credit"
                      title="Acreditar puntos"
                      @click="openWalletAdjust(w, 'credit')"
                    >
                      Acreditar
                    </button>
                    <button
                      type="button"
                      class="wallet-act debit"
                      title="Desacreditar puntos"
                      :disabled="!(Number(w.balance) > 0)"
                      @click="openWalletAdjust(w, 'debit')"
                    >
                      Desacreditar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!pagedWallets.length" class="text-sm text-slate-500 mt-2">Sin saldos para mostrar.</p>

        <div v-if="walletPageCount > 1" class="wallet-pager">
          <button
            type="button"
            class="btn-ghost"
            :disabled="walletPage <= 1"
            @click="walletPage = Math.max(1, walletPage - 1)"
          >
            Anterior
          </button>
          <span class="wallet-pager-info">
            Página {{ walletPage }} de {{ walletPageCount }}
          </span>
          <button
            type="button"
            class="btn-ghost"
            :disabled="walletPage >= walletPageCount"
            @click="walletPage = Math.min(walletPageCount, walletPage + 1)"
          >
            Siguiente
          </button>
        </div>

        <!-- Modal acreditar / desacreditar -->
        <div
          v-if="walletAdjustOpen"
          class="sheet-backdrop ben-chooser-backdrop"
          @click.self="closeWalletAdjust"
        >
          <div
            class="ben-chooser wallet-adjust-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-adjust-title"
          >
            <header class="ben-chooser-head">
              <div>
                <h2 id="wallet-adjust-title">
                  {{ walletAdjust.mode === 'debit' ? 'Desacreditar puntos' : 'Acreditar puntos' }}
                </h2>
                <p>
                  {{ walletAdjust.userLabel || walletAdjust.usuario }}
                  <template v-if="walletAdjust.usuario"> · @{{ walletAdjust.usuario }}</template>
                  · saldo actual {{ walletAdjust.balance }} pts
                </p>
              </div>
              <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeWalletAdjust">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>
            <div class="wallet-adjust-body">
              <label class="lbl">
                Cantidad de puntos
                <input
                  v-model.number="walletAdjust.amount"
                  class="input"
                  type="number"
                  min="1"
                  step="1"
                  :disabled="busy"
                />
              </label>
              <label class="lbl">
                Motivo
                <textarea
                  v-model="walletAdjust.concept"
                  class="input"
                  rows="3"
                  maxlength="240"
                  placeholder="Ej.: Bonificación por campaña / Corrección de canje…"
                  :disabled="busy"
                />
              </label>
              <p v-if="walletAdjustError" class="text-sm text-red-600">{{ walletAdjustError }}</p>
            </div>
            <footer class="ben-chooser-foot">
              <button type="button" class="btn-ghost" :disabled="busy" @click="closeWalletAdjust">Cancelar</button>
              <button
                type="button"
                class="btn-primary"
                :class="{ 'btn-danger-solid': walletAdjust.mode === 'debit' }"
                :disabled="busy || !canSubmitWalletAdjust"
                @click="submitWalletAdjust"
              >
                {{
                  busy
                    ? 'Guardando…'
                    : walletAdjust.mode === 'debit'
                      ? 'Desacreditar'
                      : 'Acreditar'
                }}
              </button>
            </footer>
          </div>
        </div>
      </div>

      <div v-else-if="gestionTab === 'pendientes'" class="panel mt-3 attn-panel">
        <div class="attn-head">
          <div class="attn-head-main">
            <span class="attn-head-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85">
                <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22z" />
                <path d="M19 15.8V11a7 7 0 0 0-5-6.7V3.8a2 2 0 1 0-4 0v.5A7 7 0 0 0 5 11v4.8L3.4 17.4a1 1 0 0 0 .7 1.7h15.8a1 1 0 0 0 .7-1.7L19 15.8z" />
              </svg>
            </span>
            <div>
              <h3 class="attn-title">Pendientes de acción</h3>
              <p class="attn-sub">
                <template v-if="attentionCount">
                  {{ attentionCount }} ítem{{ attentionCount === 1 ? '' : 's' }} esperando tu revisión.
                </template>
                <template v-else>
                  Todo al día: no hay nada por aprobar ni en espera.
                </template>
              </p>
            </div>
          </div>
          <button type="button" class="btn-ghost attn-refresh" :disabled="busy" @click="loadAttention">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" stroke-linecap="round" />
              <path d="M21 4v5h-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Actualizar
          </button>
        </div>

        <div class="attn-grid">
          <section class="attn-card">
            <header class="attn-card-head">
              <span class="attn-card-ico redeem" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                  <circle cx="9" cy="12" r="5.5" />
                  <circle cx="15" cy="12" r="5.5" />
                  <path d="M9 10.5v3M15 10.5v3" stroke-linecap="round" />
                </svg>
              </span>
              <div class="min-w-0">
                <h4 class="attn-card-title">Canjes por aprobar</h4>
                <p class="attn-card-hint">Validá o rechazá canjes de la comunidad.</p>
              </div>
              <em v-if="pendingRedemptions.length" class="attn-card-count">{{ pendingRedemptions.length }}</em>
            </header>

            <table v-if="pendingRedemptions.length" class="w-full text-sm attn-table">
              <thead class="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th class="p-2">Fecha</th>
                  <th class="p-2">Miembro</th>
                  <th class="p-2">Beneficio</th>
                  <th class="p-2">Pts</th>
                  <th class="p-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pendingRedemptions" :key="r.id" class="border-t">
                  <td class="p-2">{{ formatDate(r.createdAt) }}</td>
                  <td class="p-2">
                    <div class="font-medium">{{ r.userLabel }}</div>
                    <div v-if="r.usuario" class="text-xs text-slate-500">@{{ r.usuario }}</div>
                  </td>
                  <td class="p-2">
                    {{ r.benefitTitulo }}
                    <div v-if="r.code" class="font-mono text-xs text-slate-500">{{ r.code }}</div>
                  </td>
                  <td class="p-2">{{ r.pointsSpent }}</td>
                  <td class="p-2 text-right whitespace-nowrap">
                    <button type="button" class="btn-primary text-sm" :disabled="busy" @click="approveRedemption(r)">
                      Aprobar
                    </button>
                    <button type="button" class="btn-ghost text-sm ml-1" :disabled="busy" @click="cancelRedemption(r)">
                      Rechazar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="attn-empty">
              <span class="attn-empty-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 12.5l2.2 2.2 4.8-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <strong>Nada por aprobar</strong>
              <p>Cuando un canje necesite revisión, va a aparecer acá.</p>
            </div>
          </section>

          <section class="attn-card">
            <header class="attn-card-head">
              <span class="attn-card-ico wait" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <div class="min-w-0">
                <h4 class="attn-card-title">Lista de espera</h4>
                <p class="attn-card-hint">Personas esperando stock o cupo.</p>
              </div>
              <em v-if="waitlistItems.length" class="attn-card-count">{{ waitlistItems.length }}</em>
            </header>

            <table v-if="waitlistItems.length" class="w-full text-sm attn-table">
              <thead class="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th class="p-2">Fecha</th>
                  <th class="p-2">Miembro</th>
                  <th class="p-2">Beneficio</th>
                  <th class="p-2">Estado</th>
                  <th class="p-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in waitlistItems" :key="w.id" class="border-t">
                  <td class="p-2">{{ formatDate(w.createdAt) }}</td>
                  <td class="p-2">
                    <div class="font-medium">{{ w.userLabel }}</div>
                    <div v-if="w.usuario" class="text-xs text-slate-500">@{{ w.usuario }}</div>
                  </td>
                  <td class="p-2">{{ w.benefitTitulo }}</td>
                  <td class="p-2">{{ w.status === 'notified' ? 'Notificado' : 'En espera' }}</td>
                  <td class="p-2 text-right whitespace-nowrap">
                    <button type="button" class="btn-primary text-sm" :disabled="busy" @click="fulfillWaitlist(w)">
                      Cumplir
                    </button>
                    <button type="button" class="btn-ghost text-sm ml-1" :disabled="busy" @click="cancelWaitlist(w)">
                      Cancelar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="attn-empty">
              <span class="attn-empty-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke-linecap="round" />
                  <circle cx="10" cy="7" r="3.5" />
                  <path d="M16.5 11.5l1.5 1.5 3-3" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <strong>Lista de espera vacía</strong>
              <p>Si alguien se anota sin stock, lo vas a ver en esta tarjeta.</p>
            </div>
          </section>
        </div>
      </div>

      <div v-else class="panel mt-3">
        <div class="flex justify-between items-center flex-wrap gap-2">
          <h3 class="font-semibold">Canjes recientes</h3>
          <button type="button" class="btn-ghost" :disabled="busy" @click="refreshGestionCanjes">
            Actualizar
          </button>
        </div>
        <div v-if="reportByLocation.length" class="mt-3 grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))">
          <div v-for="loc in reportByLocation" :key="loc.name" class="rounded-lg bg-slate-50 p-2 text-sm">
            <div class="text-slate-500 text-xs">{{ loc.name }}</div>
            <div class="font-semibold">{{ loc.count }}</div>
          </div>
        </div>
        <table class="w-full text-sm mt-2">
          <thead class="bg-slate-50 text-left text-slate-500">
            <tr>
              <th class="p-2">Fecha</th>
              <th class="p-2">Miembro</th>
              <th class="p-2">Beneficio</th>
              <th class="p-2">Sucursal</th>
              <th class="p-2">Código</th>
              <th class="p-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in report" :key="r.id" class="border-t">
              <td class="p-2">{{ formatDate(r.createdAt) }}</td>
              <td class="p-2">
                <div class="font-medium">{{ r.userLabel || '—' }}</div>
                <div v-if="r.usuario" class="text-xs text-slate-500">@{{ r.usuario }}</div>
              </td>
              <td class="p-2">{{ r.benefitTitulo }}</td>
              <td class="p-2">{{ r.locationName || '—' }}</td>
              <td class="p-2 font-mono text-xs">{{ r.code }}</td>
              <td class="p-2">{{ r.pointsSpent }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!report.length" class="text-sm text-slate-500 mt-2">Sin canjes en el período.</p>
      </div>
    </section>

    <!-- Empresas asociadas -->
    <section v-if="panel === 'partners'" class="mt-4 panel">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h2 class="text-lg font-semibold">Empresas asociadas</h2>
          <p class="text-sm text-slate-500 mt-1">
            Compañías y comercios vinculados a tu comunidad: logo, descripción y link a su portal o convenio.
            En la app se muestran como empresas asociadas.
          </p>
        </div>
        <div class="partner-head-actions">
          <button
            type="button"
            class="btn-ghost"
            :disabled="busy"
            title="Cargar empresas asociadas de demo"
            @click="seedPartners"
          >
            {{ busy && seedingPartners ? 'Cargando…' : 'Cargar empresas base' }}
          </button>
          <button type="button" class="btn-primary" @click="openPartnerModal">+ Empresa</button>
        </div>
      </div>

      <div class="partner-toolbar" role="search" aria-label="Buscar y filtrar empresas">
        <input
          v-model="partnerQ"
          class="input partner-search"
          type="search"
          placeholder="Buscar por nombre, URL o descripción…"
          aria-label="Buscar empresas asociadas"
        />
        <select v-model="partnerStatusFilter" class="input" aria-label="Estado">
          <option value="">Estado</option>
          <option value="1">Activas</option>
          <option value="0">Inactivas</option>
        </select>
        <select v-model="partnerImageFilter" class="input" aria-label="Imagen">
          <option value="">Imagen</option>
          <option value="1">Con logo</option>
          <option value="0">Sin logo</option>
        </select>
        <button
          v-if="partnerFiltersActive"
          type="button"
          class="btn-ghost"
          @click="clearPartnerFilters"
        >
          Limpiar
        </button>
      </div>
      <p class="partner-toolbar-meta">
        {{ filteredPartners.length }} de {{ partners.length }} empresa{{ partners.length === 1 ? '' : 's' }}
        <span v-if="partnerFiltersActive"> · filtradas</span>
      </p>

      <ul v-if="filteredPartners.length" class="mt-2 space-y-2">
        <li v-for="p in filteredPartners" :key="p.id" class="partner-row">
          <div class="partner-thumb">
            <img v-if="p.imageUrl" :src="p.imageUrl" alt="" @error="onThumbErr" />
            <span v-else>{{ (p.titulo || '?').slice(0, 1) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="partner-row-top">
              <strong>{{ p.titulo }}</strong>
              <span class="partner-status" :data-on="p.activo !== false ? '1' : '0'">
                {{ p.activo !== false ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
            <div v-if="p.descripcion" class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ p.descripcion }}</div>
            <a
              v-if="p.url"
              class="partner-url"
              :href="p.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ partnerHost(p.url) || p.url }}</a>
          </div>
          <button type="button" class="text-red-600 text-sm shrink-0" @click="deletePartner(p)">Eliminar</button>
        </li>
      </ul>
      <p v-else-if="partners.length" class="text-sm text-slate-500 mt-3">
        Ninguna empresa coincide con la búsqueda o los filtros.
      </p>
      <p v-else class="text-sm text-slate-500 mt-3">
        Todavía no hay empresas asociadas. Agregá una o cargá el catálogo base.
      </p>
    </section>

    <!-- Modal: agregar empresa asociada -->
    <div
      v-if="partnerModalOpen"
      class="sheet-backdrop ben-chooser-backdrop"
      @click.self="closePartnerModal"
    >
      <div
        class="ben-chooser partner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-modal-title"
      >
        <header class="ben-chooser-head">
          <div>
            <h2 id="partner-modal-title">Nueva empresa asociada</h2>
            <p>Nombre, link al portal y logo opcional.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closePartnerModal">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div class="partner-modal-body">
          <div class="partner-preview partner-preview--lg">
            <img v-if="partnerDraft.imageUrl" :src="partnerDraft.imageUrl" alt="" @error="onThumbErr" />
            <span v-else>Sin logo</span>
          </div>
          <div class="partner-modal-fields">
            <label class="lbl">
              Nombre de la empresa
              <input v-model="partnerDraft.titulo" class="input" placeholder="Ej. Farmacity" maxlength="120" />
            </label>
            <label class="lbl">
              Sitio o portal
              <input v-model="partnerDraft.url" class="input" placeholder="https://…" maxlength="500" />
            </label>
            <label class="lbl">
              Descripción breve
              <input v-model="partnerDraft.descripcion" class="input" placeholder="Qué ofrece a la comunidad" maxlength="400" />
            </label>
            <label class="lbl">
              URL de imagen
              <input v-model="partnerDraft.imageUrl" class="input" placeholder="https://… o subí un archivo" maxlength="500" />
            </label>
            <label class="file-lbl">
              Subir logo
              <input type="file" accept="image/*" @change="onPartnerImage" />
            </label>
          </div>
        </div>
        <footer class="ben-chooser-foot">
          <button type="button" class="btn-ghost" @click="closePartnerModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="busy || !canSavePartner" @click="savePartner">
            Agregar empresa
          </button>
        </footer>
      </div>
    </div>

    <!-- Catálogo: siempre misma grilla de cards + filtros combinados -->
    <template v-if="panel === 'list'">
      <div class="app-ben-home mt-4">
        <header class="app-ben-section-head">
          <div class="app-ben-section-titles">
            <h2 class="app-ben-section-title">Lista de Beneficios</h2>
            <p class="app-ben-section-sub">
              {{ items.length }} resultado{{ items.length === 1 ? '' : 's' }}
              <span v-if="filtersActive"> · filtrados</span>
            </p>
          </div>
          <span class="app-ben-section-badge">{{ items.length }}</span>
        </header>

        <div class="app-ben-filter-block">
          <p class="app-ben-filter-label">Categorías</p>
          <nav class="app-ben-tabs app-ben-tabs--cats" role="tablist" aria-label="Categorías">
            <button
              v-for="tab in catalogTabs"
              :key="tab.id"
              type="button"
              role="tab"
              class="app-ben-tab"
              :class="{ on: catalogSection === tab.id }"
              :aria-selected="catalogSection === tab.id"
              @click="catalogSection = tab.id"
            >
              <span class="app-ben-tab-emoji" aria-hidden="true">{{ tab.emoji || '🏷️' }}</span>
              <span class="app-ben-tab-label">{{ tab.label }}</span>
              <em class="app-ben-tab-count">{{ tab.items.length }}</em>
            </button>
          </nav>
        </div>

        <div class="app-ben-filter-block">
          <p class="app-ben-filter-label">Tipos</p>
          <nav class="app-ben-tabs app-ben-tabs--types" role="group" aria-label="Tipos de beneficio">
            <button
              type="button"
              class="app-ben-tab"
              :class="{ on: !offerTypeFilter }"
              @click="clearOfferTypeFilter"
            >
              <span class="app-ben-tab-label">Todos</span>
            </button>
            <button
              v-for="t in offerTypes"
              :key="'type-' + t.id"
              type="button"
              class="app-ben-tab"
              :class="{ on: offerTypeFilter === t.id }"
              :title="t.hint || t.label"
              @click="toggleQuickType(t.id)"
            >
              <span class="app-ben-tab-label">{{ t.label }}</span>
            </button>
          </nav>
        </div>

        <div class="ben-filters ben-filters--inline" role="search" aria-label="Búsqueda y filtros">
          <div class="ben-filters-combos">
            <input
              v-model="q"
              class="input ben-filters-search"
              type="search"
              placeholder="Buscar…"
              aria-label="Buscar beneficios"
              @keyup.enter="load"
            />
            <select v-model="status" class="input" aria-label="Estado" @change="load">
              <option value="">Estado</option>
              <option value="published">Publicados</option>
              <option value="draft">Borrador</option>
              <option value="archived">Archivados</option>
            </select>
            <select v-model="kindFilter" class="input" aria-label="Clase" @change="load">
              <option value="">Clase</option>
              <option value="benefit">Beneficios</option>
              <option value="reward">Premios</option>
            </select>
            <button type="button" class="btn-ghost ben-filters-btn" @click="load">Buscar</button>
            <button
              v-if="filtersActive"
              type="button"
              class="btn-ghost ben-filters-btn"
              title="Limpiar filtros"
              @click="clearFilters"
            >
              Limpiar
            </button>
          </div>
          <div class="ben-filters-quick" role="group" aria-label="Estado rápido">
            <button
              type="button"
              class="quick-chip"
              :class="{ on: status === 'published' }"
              @click="toggleQuickStatus('published')"
            >
              Publicados
            </button>
            <button
              type="button"
              class="quick-chip"
              :class="{ on: status === 'draft' }"
              @click="toggleQuickStatus('draft')"
            >
              Borradores
            </button>
            <button
              type="button"
              class="quick-chip"
              :class="{ on: status === 'archived' }"
              @click="toggleQuickStatus('archived')"
            >
              Archivados
            </button>
            <button
              type="button"
              class="quick-chip"
              :class="{ on: kindFilter === 'reward' }"
              @click="toggleQuickKind('reward')"
            >
              Premios
            </button>
          </div>
        </div>

        <div class="app-ben-tab-panel" role="tabpanel">
          <div class="app-ben-panel-head">
            <h2 class="app-ben-rail-title">
              <span class="app-ben-tab-emoji" aria-hidden="true">{{ activeCatalogTab?.emoji || '🏷️' }}</span>
              {{ activeCatalogTab?.label || 'Listado de Beneficios' }}
            </h2>
            <span class="app-ben-rail-count">{{ activeCatalogItems.length }}</span>
          </div>

          <div v-if="activeCatalogItems.length" class="app-ben-grid">
            <div v-for="d in activeCatalogItems" :key="catalogSection + '-' + d.id" class="app-ben-offer-wrap">
              <button type="button" class="app-ben-offer" @click="openEdit(d)">
                <div class="app-ben-offer-brand" :style="brandStyle(d)">
                  <img v-if="d.imageUrl" :src="d.imageUrl" alt="" @error="onThumbErr" />
                  <span v-else>{{ (d.partnerName || d.titulo || '?').slice(0, 1) }}</span>
                  <em class="app-ben-type-badge" :data-type="d.offerType || 'informativo'">
                    {{ offerTypeShortLabel(d.offerType) }}
                  </em>
                </div>
                <div class="app-ben-offer-body">
                  <strong>{{ offerHeadline(d) }}</strong>
                  <p>{{ excerpt(d.descripcion || d.condiciones, 72) }}</p>
                </div>
              </button>
              <div class="app-ben-offer-foot">
                <span class="app-ben-status" :data-st="d.status">{{ d.statusLabel || statusLabel(d.status) }}</span>
                <div class="app-ben-offer-foot-end">
                  <span v-if="benefitPointsLabel(d)" class="app-ben-pts">{{ benefitPointsLabel(d) }}</span>
                  <div class="app-ben-icon-actions">
                    <button
                      v-if="benefitTypeTraits(d).length"
                      type="button"
                      class="icon-btn"
                      title="Ver detalles"
                      aria-label="Ver detalles"
                      @click="openTraitsModal(d)"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn" title="Editar" aria-label="Editar" @click="openEdit(d)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn" title="Duplicar" aria-label="Duplicar" @click="duplicate(d)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn" title="Simular" aria-label="Simular" @click="openSimulate(d)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" stroke="none" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn danger" title="Archivar" aria-label="Archivar" @click="archive(d)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="app-ben-empty">
            {{ filtersActive ? 'No hay beneficios con esos filtros.' : 'No hay beneficios en esta sección.' }}
          </p>
        </div>
      </div>

      <!-- Modal atributos del beneficio -->
      <div
        v-if="traitsModalItem"
        class="sheet-backdrop ben-chooser-backdrop"
        @click.self="closeTraitsModal"
      >
        <div
          class="ben-chooser traits-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="traits-modal-title"
        >
          <header class="ben-chooser-head">
            <div>
              <h2 id="traits-modal-title">{{ offerHeadline(traitsModalItem) }}</h2>
              <p>
                <span class="traits-modal-type" :data-type="traitsModalItem.offerType || 'informativo'">
                  {{ offerTypeShortLabel(traitsModalItem.offerType) }}
                </span>
                <span v-if="benefitPointsLabel(traitsModalItem)"> · {{ benefitPointsLabel(traitsModalItem) }}</span>
              </p>
            </div>
            <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeTraitsModal">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          <div class="traits-modal-body" :data-type="traitsModalItem.offerType || 'informativo'">
            <span
              v-for="(trait, ti) in benefitTypeTraits(traitsModalItem)"
              :key="'tm-' + ti"
              class="app-ben-trait"
            >
              {{ trait }}
            </span>
          </div>
          <footer class="ben-chooser-foot">
            <button type="button" class="btn-ghost" @click="closeTraitsModal">Cerrar</button>
            <button type="button" class="btn-primary" @click="editFromTraitsModal">Editar</button>
          </footer>
        </div>
      </div>
    </template>

    <!-- Wizard -->
    <div v-if="draft" class="sheet-backdrop" @click.self="closeWizard">
      <div class="sheet sheet-wide">
        <div class="flex justify-between items-start gap-3 mb-3">
          <div>
            <h2 class="text-lg font-semibold">{{ draft.id ? 'Editar' : 'Nuevo' }} beneficio</h2>
            <p class="text-xs text-slate-500 mt-0.5">Paso {{ step }} de {{ steps.length }} · {{ steps[step - 1].title }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="closeWizard">Cerrar</button>
        </div>

        <ol class="wiz-steps" aria-label="Pasos">
          <li v-for="(s, i) in steps" :key="s.id" :class="{ on: step === i + 1, done: step > i + 1 }">
            <button type="button" :disabled="i + 1 > maxReachableStep" @click="goStep(i + 1)">
              <span class="n">{{ i + 1 }}</span>
              {{ s.short }}
            </button>
          </li>
        </ol>

        <div class="wiz-layout" :class="{ 'wiz-layout--types': step === 1 }">
          <div class="wiz-main">
            <!-- 1 Tipo -->
            <section v-if="step === 1" class="wiz-pane">
              <h3>¿Qué tipo de beneficio es?</h3>
              <p class="hint-block">Elegí el tipo como en el sistema anterior. Después solo pedimos lo necesario.</p>
              <div class="type-grid">
                <button
                  v-for="t in offerTypes"
                  :key="t.id"
                  type="button"
                  class="type-card"
                  :class="{ on: draft.offerType === t.id }"
                  :data-type="t.id"
                  @click="pickOfferType(t.id)"
                >
                  <span class="type-card-icon" aria-hidden="true">
                    <svg v-if="t.id === 'informativo'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5" stroke-linecap="round" />
                      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
                    </svg>
                    <svg v-else-if="t.id === 'canjeable'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85">
                      <circle cx="9" cy="12" r="6" />
                      <circle cx="15" cy="12" r="6" />
                      <path d="M9 10.5v3M15 10.5v3" stroke-linecap="round" />
                    </svg>
                    <svg v-else-if="t.id === 'premio'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85">
                      <path d="M12 8v13" />
                      <path d="M8 21h8" stroke-linecap="round" />
                      <path d="M7 8h10l-1.2 3.2a4 4 0 01-3.8 2.6h0a4 4 0 01-3.8-2.6L7 8z" />
                      <path d="M9 4.5c0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5S13.7 2 12 2 9 3.1 9 4.5z" />
                    </svg>
                    <svg v-else-if="t.id === 'geo'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85">
                      <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85">
                      <path d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.5 5.5" stroke-linecap="round" />
                      <path d="M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07L13.5 18.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <div class="type-card-copy">
                    <strong>{{ t.label }}</strong>
                    <span>{{ t.hint }}</span>
                    <em class="type-card-example">Ej.: {{ offerTypeExample(t.id) }}</em>
                  </div>
                </button>
              </div>
            </section>

            <!-- 2 Contenido + imagen -->
            <section v-else-if="step === 2" class="wiz-pane">
              <h3>Contenido e imagen</h3>
              <p class="hint-block">Así se ve en la app del miembro (preview a la derecha).</p>
              <div class="flex flex-wrap gap-2 mb-2">
                <input v-model="aiPrompt" class="input flex-1 min-w-[180px]" placeholder="Pedile a la IA un borrador…" />
                <button type="button" class="btn-ghost" :disabled="busy" @click="runAiDraft">Redactar con IA</button>
              </div>
              <label class="lbl">Título<input v-model="draft.titulo" class="input" maxlength="160" /></label>
              <label class="lbl">
                Nombre comercial (muro)
                <input
                  v-model="draft.nombreComercial"
                  class="input"
                  maxlength="120"
                  placeholder="Cómo se ve en el muro de la app"
                />
              </label>
              <p class="hint-block text-xs">Si lo dejás vacío, en el muro se usa el título.</p>
              <label class="lbl">Descripción<textarea v-model="draft.descripcion" class="input" rows="3" /></label>
              <label class="lbl">Condiciones<textarea v-model="draft.condiciones" class="input" rows="2" /></label>
              <div class="lbl">
                <span class="lbl-text">Categoría</span>
                <div class="cat-picker" role="group" aria-label="Categoría del beneficio">
                  <button
                    v-for="c in categories"
                    :key="c.id"
                    type="button"
                    class="cat-picker-btn"
                    :class="{ on: draft.categoria === c.id }"
                    :aria-pressed="draft.categoria === c.id"
                    @click="draft.categoria = c.id"
                  >
                    <span class="cat-picker-emoji" aria-hidden="true">{{ c.emoji || categoryEmoji(c.id) }}</span>
                    <span class="cat-picker-label">{{ c.label }}</span>
                  </button>
                </div>
              </div>
              <label class="lbl">
                Imagen (URL)
                <input v-model="draft.imageUrl" class="input" placeholder="https://… o subí un archivo" />
              </label>
              <label class="file-lbl mt-1">
                Subir imagen
                <input type="file" accept="image/*" @change="onImageFile" />
              </label>
            </section>

            <!-- 3 Reglas según tipo -->
            <section v-else-if="step === 3" class="wiz-pane">
              <h3>Reglas del tipo «{{ currentOfferLabel }}»</h3>

              <template v-if="needsPoints">
                <div class="grid gap-2" style="grid-template-columns: 1fr 1fr 1fr">
                  <label class="lbl">
                    Costo en puntos
                    <input v-model.number="draft.costoPuntos" type="number" min="0" class="input" />
                  </label>
                  <label class="lbl">Stock<input v-model="draft.stock" class="input" placeholder="Sin límite" /></label>
                  <label class="lbl">Cupo total<input v-model="draft.cupo" class="input" placeholder="Sin límite" /></label>
                </div>
                <div class="grid gap-2 mt-2" style="grid-template-columns: 1fr 1fr 1fr 1fr">
                  <label class="lbl">
                    Límite / persona
                    <input v-model="draft.limitePorUsuario" class="input" placeholder="∞" />
                  </label>
                  <label class="lbl">Límite / día<input v-model="draft.limitePorDia" class="input" placeholder="∞" /></label>
                  <label class="lbl">Límite / sem<input v-model="draft.limitePorSemana" class="input" placeholder="∞" /></label>
                  <label class="lbl">Límite / mes<input v-model="draft.limitePorMes" class="input" placeholder="∞" /></label>
                </div>
                <label class="check mt-2"><input v-model="draft.allowWaitlist" type="checkbox" /> Lista de espera si no hay stock</label>
                <label class="lbl mt-2">PIN comercio (validar canje)<input v-model="draft.merchantPin" class="input" placeholder="Opcional" /></label>
                <p class="hint-block">Al canjear, la app genera un código/QR local para presentar.</p>
              </template>

              <template v-else-if="draft.offerType === 'informativo'">
                <p class="hint-block">
                  Convenio informativo: no gasta puntos. El miembro lee detalle y condiciones.
                </p>
                <label class="lbl">
                  Partner (opcional)
                  <input v-model="draft.partnerName" class="input" placeholder="Nombre del comercio" />
                </label>
              </template>

              <div class="grid gap-2 mt-2" style="grid-template-columns: 1fr 1fr">
                <label class="lbl">Vigencia desde<input v-model="draft.vigenciaDesde" type="date" class="input" /></label>
                <label class="lbl">Vigencia hasta<input v-model="draft.vigenciaHasta" type="date" class="input" /></label>
              </div>

              <h4 class="mt-3 text-sm font-semibold">Días y horario</h4>
              <div class="flex flex-wrap gap-2 mt-1">
                <label v-for="(lab, idx) in dayLabels" :key="idx" class="check">
                  <input type="checkbox" :value="idx" v-model="draft.daysOfWeek" />
                  {{ lab }}
                </label>
              </div>
              <div class="grid gap-2 mt-2" style="grid-template-columns: 1fr 1fr">
                <label class="lbl">Desde<input v-model="draft.timeFrom" type="time" class="input" /></label>
                <label class="lbl">Hasta<input v-model="draft.timeTo" type="time" class="input" /></label>
              </div>
              <label class="check mt-2"><input v-model="draft.excludeHolidays" type="checkbox" /> Excluir feriados AR</label>
              <label class="check"><input v-model="draft.requireUserSede" type="checkbox" /> Solo sede del colaborador</label>

              <template v-if="draft.offerType === 'geo' || draft.locations?.length || draft.sucursal">
                <h4 class="mt-3 text-sm font-semibold">Sucursales</h4>
                <div v-for="(loc, i) in draft.locations" :key="loc.id || i" class="loc-row mt-2">
                  <input v-model="loc.name" class="input" placeholder="Nombre sede" />
                  <input v-model="loc.lat" class="input" placeholder="Lat" />
                  <input v-model="loc.lng" class="input" placeholder="Lng" />
                  <input v-model="loc.stock" class="input" placeholder="Stock sede" />
                  <button type="button" class="btn-ghost" @click="draft.locations.splice(i, 1)">×</button>
                </div>
                <button type="button" class="btn-ghost mt-2" @click="addLocation">+ Sucursal</button>
                <label class="lbl mt-2">Sucursal principal (legacy)<input v-model="draft.sucursal" class="input" /></label>
                <div class="grid gap-2" style="grid-template-columns: 1fr 1fr">
                  <label class="lbl">Latitud<input v-model="draft.lat" class="input" placeholder="-34.60" /></label>
                  <label class="lbl">Longitud<input v-model="draft.lng" class="input" placeholder="-58.38" /></label>
                </div>
                <label class="lbl">Radio canje (km)<input v-model="draft.redeemRadiusKm" class="input" placeholder="Sin geocerca" /></label>
              </template>

              <template v-if="draft.offerType === 'partner'">
                <label class="lbl">Nombre del partner<input v-model="draft.partnerName" class="input" /></label>
                <label class="lbl">
                  URL del partner
                  <input v-model="draft.partnerUrl" class="input" placeholder="https://…" />
                </label>
              </template>

              <label v-if="!needsPoints && draft.offerType !== 'informativo'" class="lbl mt-2">
                Partner (opcional)
                <input v-model="draft.partnerName" class="input" />
              </label>

              <div v-if="draft.id" class="mt-3">
                <label class="lbl">Códigos de lote (uno por línea)
                  <textarea v-model="codesText" class="input" rows="3" placeholder="ABC-001&#10;ABC-002" />
                </label>
                <button type="button" class="btn-ghost mt-1" :disabled="busy" @click="uploadCodes">Cargar códigos</button>
              </div>
            </section>

            <!-- 4 Audiencia -->
            <section v-else-if="step === 4" class="wiz-pane">
              <h3>¿Quién lo ve?</h3>
              <fieldset class="audience">
                <div class="audience-modes">
                  <button type="button" :class="{ on: draft.audience.mode === 'all' }" @click="setAudMode('all')">
                    Toda la comunidad
                  </button>
                  <button
                    type="button"
                    :class="{ on: draft.audience.mode === 'restricted' }"
                    @click="setAudMode('restricted')"
                  >
                    Áreas / grupos
                  </button>
                  <button type="button" :class="{ on: draft.audience.mode === 'users' }" @click="setAudMode('users')">
                    Personas
                  </button>
                </div>
                <div v-if="draft.audience.mode === 'restricted'" class="aud-lists">
                  <div>
                    <p class="hint">Áreas</p>
                    <label v-for="a in org.areas" :key="a.id" class="check">
                      <input type="checkbox" :value="a.id" v-model="draft.audience.areaIds" />
                      {{ a.nombre }}
                    </label>
                  </div>
                  <div>
                    <p class="hint">Grupos</p>
                    <label v-for="g in org.groups" :key="g.id" class="check">
                      <input type="checkbox" :value="g.id" v-model="draft.audience.groupIds" />
                      {{ g.nombre }}
                    </label>
                  </div>
                </div>
                <div v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'" class="mt-2">
                  <input
                    v-model="audienceUserQuery"
                    class="input"
                    placeholder="Buscar personas…"
                    @input="searchAudienceUsers"
                  />
                  <ul class="user-results">
                    <li v-for="u in audienceUserResults" :key="u.id">
                      <button
                        type="button"
                        :disabled="draft.audience.userIds.includes(u.id)"
                        @click="addAudienceUser(u)"
                      >
                        + {{ u.label }}
                      </button>
                    </li>
                  </ul>
                  <div class="chips">
                    <span v-for="u in selectedAudienceUsers" :key="u.id" class="chip">
                      {{ u.label }}
                      <button type="button" @click="removeAudienceUser(u.id)">×</button>
                    </span>
                  </div>
                </div>
              </fieldset>
            </section>

            <!-- 5 Publicar -->
            <section v-else class="wiz-pane">
              <h3>Publicar</h3>
              <p class="hint-block">Revisá el detalle como lo ve el miembro y elegí el estado.</p>
              <label class="lbl">
                Estado
                <select v-model="draft.status" class="input">
                  <option value="draft">Borrador (solo admin)</option>
                  <option value="published">Publicado (visible en la app)</option>
                  <option value="archived">Archivado</option>
                </select>
              </label>
              <label class="lbl mt-2">
                Publicar programado
                <input v-model="draft.scheduledPublishAt" type="datetime-local" class="input" />
              </label>
              <label class="check mt-3">
                <input v-model="draft.destacado" type="checkbox" />
                Destacar en el catálogo
              </label>
              <ul class="summary mt-3">
                <li><strong>Tipo:</strong> {{ currentOfferLabel }}</li>
                <li><strong>Categoría:</strong> {{ previewCategoryLabel || '—' }}</li>
                <li><strong>Audiencia:</strong> {{ audienceLabel({ audience: draft.audience }) }}</li>
              </ul>
            </section>

            <div class="wiz-nav">
              <button type="button" class="btn-ghost" :disabled="step === 1" @click="step -= 1">Atrás</button>
              <div class="flex gap-2">
                <button v-if="step < steps.length" type="button" class="btn-primary" :disabled="!canAdvance" @click="nextStep">
                  Siguiente
                </button>
                <button v-else type="button" class="btn-primary" :disabled="busy || !canSave" @click="save">
                  {{ busy ? 'Guardando…' : 'Guardar' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Preview: muro (pasos 1–4) o detalle completo (Publicar) -->
          <aside
            v-if="step > 1"
            class="wiz-preview"
            :class="{ 'wiz-preview--detail': step === steps.length }"
          >
            <p class="preview-label">{{ step === steps.length ? 'Detalle en la app' : 'Vista en la app' }}</p>

            <div v-if="step === steps.length" class="wiz-phone" aria-label="Preview del detalle del beneficio">
              <div class="wiz-phone-frame">
                <header class="wiz-phone-nav">
                  <span class="wiz-phone-nav-ico" aria-hidden="true">‹</span>
                  <strong>{{ currentOfferLabel }}</strong>
                  <span class="wiz-phone-nav-ico" aria-hidden="true">↗</span>
                </header>

                <div class="wiz-phone-hero" :style="!draft.imageUrl ? brandStyle(draft) : undefined">
                  <img v-if="draft.imageUrl" :src="draft.imageUrl" alt="" @error="onThumbErr" />
                  <span v-else class="wiz-phone-hero-fallback">{{ (previewBrandName || '?').slice(0, 1) }}</span>
                  <em v-if="draft.destacado" class="wiz-phone-dest">Destacado</em>
                </div>

                <div class="wiz-phone-body">
                  <article class="wiz-phone-card">
                    <div class="wiz-phone-card-head">
                      <div>
                        <strong class="wiz-phone-brand">{{ previewBrandName }}</strong>
                        <span class="wiz-phone-cat">
                          <span aria-hidden="true">{{ categoryEmoji(draft.categoria) }}</span>
                          {{ previewCategoryLabel || 'Categoría' }}
                        </span>
                      </div>
                      <span class="wiz-phone-badge">{{ previewDayBadge }}</span>
                    </div>
                    <p class="wiz-phone-main">{{ draft.titulo || 'Título del beneficio' }}</p>
                    <p v-if="draft.nombreComercial && draft.nombreComercial !== draft.titulo" class="wiz-phone-muro">
                      En el muro: {{ draft.nombreComercial }}
                    </p>
                    <p v-if="draft.descripcion" class="wiz-phone-line">{{ excerpt(draft.descripcion, 110) }}</p>
                    <p v-if="needsPoints && draft.costoPuntos" class="wiz-phone-line">{{ draft.costoPuntos }} pts</p>
                  </article>

                  <section class="wiz-phone-sec">
                    <h4>Pagá con</h4>
                    <p>{{ previewPayWith }}</p>
                  </section>

                  <section v-if="previewValidity || draft.timeFrom || draft.timeTo || previewUsage" class="wiz-phone-sec">
                    <h4>Podés usarlo</h4>
                    <p v-if="previewUsage">{{ previewUsage }}</p>
                    <p v-if="previewValidity">{{ previewValidity }}</p>
                    <p v-if="draft.timeFrom || draft.timeTo">
                      {{ draft.timeFrom || '00:00' }}–{{ draft.timeTo || '23:59' }}
                    </p>
                  </section>

                  <section v-if="previewLocations.length || draft.sucursal" class="wiz-phone-sec">
                    <h4>Sucursales</h4>
                    <ul v-if="previewLocations.length" class="wiz-phone-locs">
                      <li v-for="(loc, i) in previewLocations" :key="loc.id || i">
                        {{ loc.name || 'Sucursal' }}
                        <span v-if="loc.stock !== '' && loc.stock != null">· stock {{ loc.stock }}</span>
                      </li>
                    </ul>
                    <p v-else-if="draft.sucursal">{{ draft.sucursal }}</p>
                  </section>

                  <section v-if="draft.condiciones || draft.descripcion" class="wiz-phone-sec">
                    <h4>Condiciones de uso</h4>
                    <p>{{ draft.condiciones || draft.descripcion }}</p>
                  </section>

                  <div class="wiz-phone-actions">
                    <button type="button" class="wiz-phone-cta ghost" disabled>☆ Favorito</button>
                    <button type="button" class="wiz-phone-cta" disabled>{{ previewRedeemLabel }}</button>
                    <a
                      v-if="draft.partnerUrl"
                      class="wiz-phone-link"
                      :href="draft.partnerUrl"
                      target="_blank"
                      rel="noopener"
                    >Ir al partner</a>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="u-card">
              <div class="u-thumb">
                <img v-if="draft.imageUrl" :src="draft.imageUrl" alt="" @error="onThumbErr" />
                <span v-else>Sin imagen</span>
              </div>
              <div class="u-main">
                <p class="preview-muro-lbl">En el muro</p>
                <strong>{{ draft.nombreComercial || draft.titulo || 'Nombre comercial' }}</strong>
                <p class="ben-meta">
                  <span class="ben-pill">{{ currentOfferLabel }}</span>
                  <span v-if="Number(draft.costoPuntos) > 0">{{ draft.costoPuntos }} pts</span>
                </p>
                <p class="ben-desc">{{ excerpt(draft.descripcion || 'La descripción aparece acá…') }}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'

const DEFAULT_OFFER_TYPES = [
  {
    id: 'informativo',
    label: 'Informativo / convenio',
    hint: 'Descuento o perk sin gastar puntos. Solo lectura y condiciones.',
  },
  {
    id: 'canjeable',
    label: 'Canjeable con puntos',
    hint: 'Se canjea con puntos: código/QR, stock y cupos.',
  },
  {
    id: 'premio',
    label: 'Premio / recompensa',
    hint: 'Catálogo de premios canjeables (gift card, día libre…).',
  },
  {
    id: 'geo',
    label: 'Con ubicación',
    hint: 'Sucursal o punto en el mapa de la app.',
  },
  {
    id: 'partner',
    label: 'Link / empresa asociada',
    hint: 'Abre URL de una empresa asociada; ideal con imagen y nombre.',
  },
]

const steps = [
  { id: 'tipo', short: 'Tipo', title: 'Elegir tipo' },
  { id: 'contenido', short: 'Contenido', title: 'Contenido e imagen' },
  { id: 'reglas', short: 'Reglas', title: 'Reglas del tipo' },
  { id: 'audiencia', short: 'Audiencia', title: 'Quién lo ve' },
  { id: 'publicar', short: 'Publicar', title: 'Revisar y publicar' },
]

const items = ref([])
const categories = ref([])
const offerTypes = ref([...DEFAULT_OFFER_TYPES])
const offerTypeDraft = ref(DEFAULT_OFFER_TYPES.map((t) => ({ ...t })))
const categoryDraft = ref([])
const categoryDeleteOpen = ref(false)
const categoryDeleteIdx = ref(-1)
const categoryEmojiOpen = ref(-1)
const categoryModalOpen = ref(false)
const categoryModal = ref({ emoji: '🏷️', label: '', example: '' })
const categoryDeleteTarget = computed(() => {
  const i = categoryDeleteIdx.value
  if (i < 0) return null
  return categoryDraft.value[i] || null
})
const canSaveCategoryModal = computed(() => Boolean(String(categoryModal.value.label || '').trim()))
let categoryKeySeq = 0

const CAT_EMOJI_PRESETS = [
  '🏷️', '🛒', '💊', '🍔', '⛽', '📚', '📱', '🎁', '🍿',
  '✈️', '🏋️', '🎬', '☕', '🏠', '💡', '🎧', '👗', '🧸',
]
const org = ref({ areas: [], groups: [] })
const q = ref('')
const offerTypeFilter = ref('')
const status = ref('')
const categoriaFilter = ref('')
const kindFilter = ref('')
const destacadoFilter = ref('')
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const seeding = ref(false)
const seedingPartners = ref(false)
const draft = ref(null)
const aiPrompt = ref('')
const newChooserOpen = ref(false)
const aiCreateOpen = ref(false)
const aiCreatePrompt = ref('')
const aiCreateError = ref('')
const aiCreating = ref(false)
const codesText = ref('')
const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const report = ref([])
const reportByLocation = ref([])
const step = ref(1)
const panel = ref('list')
const gestionTab = ref('points')
const walletQ = ref('')
const walletBalanceFilter = ref('')
const walletSortKey = ref('balance')
const walletSortDir = ref('desc')
const walletPage = ref(1)
const walletPageSize = ref(20)
const pendingRedemptions = ref([])
const waitlistItems = ref([])
const attentionCount = ref(0)
let attentionTimer = null
const configOpen = ref(false)
const CONFIG_PANELS = new Set(['types', 'categories', 'rules', 'partners'])
const isConfigPanel = computed(() => CONFIG_PANELS.has(panel.value))
const wallets = ref([])
const partners = ref([])
const partnerDraft = ref({ titulo: '', url: '', descripcion: '', imageUrl: '' })
const partnerModalOpen = ref(false)
const partnerQ = ref('')
const partnerStatusFilter = ref('')
const partnerImageFilter = ref('')

const partnerFiltersActive = computed(
  () => Boolean(partnerQ.value.trim() || partnerStatusFilter.value || partnerImageFilter.value),
)

const canSavePartner = computed(
  () => Boolean(String(partnerDraft.value.titulo || '').trim() && String(partnerDraft.value.url || '').trim()),
)

const filteredPartners = computed(() => {
  const q = partnerQ.value.trim().toLowerCase()
  const st = partnerStatusFilter.value
  const img = partnerImageFilter.value
  return (partners.value || []).filter((p) => {
    if (st === '1' && p.activo === false) return false
    if (st === '0' && p.activo !== false) return false
    const hasImg = Boolean(String(p.imageUrl || '').trim())
    if (img === '1' && !hasImg) return false
    if (img === '0' && hasImg) return false
    if (!q) return true
    const hay = `${p.titulo || ''} ${p.url || ''} ${p.descripcion || ''}`.toLowerCase()
    return hay.includes(q)
  })
})

function partnerHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function blankPartnerDraft() {
  return { titulo: '', url: '', descripcion: '', imageUrl: '' }
}

function openPartnerModal() {
  partnerDraft.value = blankPartnerDraft()
  partnerModalOpen.value = true
  error.value = ''
}

function closePartnerModal() {
  partnerModalOpen.value = false
  partnerDraft.value = blankPartnerDraft()
}

function clearPartnerFilters() {
  partnerQ.value = ''
  partnerStatusFilter.value = ''
  partnerImageFilter.value = ''
}
const credit = ref({ q: '', userId: '', userLabel: '', amount: 500, concept: '' })
const creditResults = ref([])
let creditTimer = null
const walletAdjustOpen = ref(false)
const walletAdjustError = ref('')
const walletAdjust = ref({
  mode: 'credit',
  userId: '',
  usuario: '',
  userLabel: '',
  balance: 0,
  amount: 100,
  concept: '',
})

const canSubmitWalletAdjust = computed(() => {
  const a = walletAdjust.value
  const amount = Math.floor(Number(a.amount))
  const concept = String(a.concept || '').trim()
  if (!a.userId || !concept || concept.length < 3) return false
  if (!Number.isFinite(amount) || amount <= 0) return false
  if (a.mode === 'debit' && amount > Number(a.balance || 0)) return false
  return true
})

function openWalletAdjust(w, mode = 'credit') {
  walletAdjustError.value = ''
  walletAdjust.value = {
    mode: mode === 'debit' ? 'debit' : 'credit',
    userId: w.userId,
    usuario: w.usuario || '',
    userLabel: w.nombre || w.usuario || 'Miembro',
    balance: Number(w.balance) || 0,
    amount: mode === 'debit' ? Math.min(100, Math.max(1, Number(w.balance) || 1)) : 100,
    concept: mode === 'debit' ? '' : '',
  }
  walletAdjustOpen.value = true
}

function closeWalletAdjust() {
  if (busy.value) return
  walletAdjustOpen.value = false
  walletAdjustError.value = ''
}

async function submitWalletAdjust() {
  if (!canSubmitWalletAdjust.value || busy.value) return
  const a = walletAdjust.value
  const amountAbs = Math.floor(Number(a.amount))
  const signed = a.mode === 'debit' ? -amountAbs : amountAbs
  const concept = String(a.concept || '').trim()
  busy.value = true
  walletAdjustError.value = ''
  error.value = ''
  try {
    const { data } = await api.post('/admin/benefits/credit', {
      userId: a.userId,
      amount: signed,
      concept,
      idempotencyKey: `admin-${a.mode}:${a.userId}:${Date.now()}`,
    })
    okMsg.value =
      a.mode === 'debit'
        ? `Desacreditados ${amountAbs} pts · saldo ${data.balance}`
        : `Acreditados ${amountAbs} pts · saldo ${data.balance}`
    walletAdjustOpen.value = false
    await loadWallets()
  } catch (e) {
    walletAdjustError.value = e.response?.data?.error || 'No se pudo actualizar el saldo'
  } finally {
    busy.value = false
  }
}
const rules = ref([])
const rulesMeta = ref({ walletEnabled: true })
const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserCache = ref({})
let audienceTimer = null

function goCatalog() {
  panel.value = 'list'
  configOpen.value = false
}

async function openGestion() {
  configOpen.value = false
  panel.value = 'gestion'
  await loadAttention()
  gestionTab.value = attentionCount.value > 0 ? 'pendientes' : 'points'
}

function toggleConfig() {
  if (configOpen.value) {
    configOpen.value = false
    if (isConfigPanel.value) panel.value = 'list'
    return
  }
  configOpen.value = true
  if (!isConfigPanel.value) openOfferTypes()
}

function goPartners() {
  configOpen.value = true
  panel.value = 'partners'
}

const walletFiltersActive = computed(
  () => Boolean(String(walletQ.value || '').trim() || walletBalanceFilter.value),
)

const filteredWallets = computed(() => {
  let list = [...(wallets.value || [])]
  const qv = String(walletQ.value || '').trim().toLowerCase()
  if (qv) {
    list = list.filter((w) => {
      const blob = `${w.usuario || ''} ${w.nombre || ''}`.toLowerCase()
      return blob.includes(qv)
    })
  }
  const bf = walletBalanceFilter.value
  if (bf === 'positive') list = list.filter((w) => Number(w.balance) > 0)
  else if (bf === 'zero') list = list.filter((w) => Number(w.balance) === 0)
  else if (bf === 'high') list = list.filter((w) => Number(w.balance) >= 500)

  const key = walletSortKey.value
  const dir = walletSortDir.value === 'asc' ? 1 : -1
  list.sort((a, b) => {
    let av = a?.[key]
    let bv = b?.[key]
    if (key === 'balance') {
      av = Number(av) || 0
      bv = Number(bv) || 0
      return (av - bv) * dir
    }
    av = String(av || '').toLowerCase()
    bv = String(bv || '').toLowerCase()
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })
  return list
})

const filteredWalletsTotal = computed(() => filteredWallets.value.length)

const walletPageCount = computed(() =>
  Math.max(1, Math.ceil(filteredWalletsTotal.value / Math.max(1, Number(walletPageSize.value) || 20))),
)

const pagedWallets = computed(() => {
  const size = Math.max(1, Number(walletPageSize.value) || 20)
  const page = Math.min(Math.max(1, walletPage.value), walletPageCount.value)
  const start = (page - 1) * size
  return filteredWallets.value.slice(start, start + size)
})

function toggleWalletSort(key) {
  if (walletSortKey.value === key) {
    walletSortDir.value = walletSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    walletSortKey.value = key
    walletSortDir.value = key === 'balance' ? 'desc' : 'asc'
  }
}

function walletSortMark(key) {
  if (walletSortKey.value !== key) return '↕'
  return walletSortDir.value === 'asc' ? '↑' : '↓'
}

function clearWalletFilters() {
  walletQ.value = ''
  walletBalanceFilter.value = ''
  walletPage.value = 1
}

watch([walletQ, walletBalanceFilter, walletPageSize], () => {
  walletPage.value = 1
})

watch(walletPageCount, (n) => {
  if (walletPage.value > n) walletPage.value = n
})

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function audienceLabel(d) {
  const a = d?.audience
  if (!a || a.mode === 'all') return 'Todos'
  if (a.mode === 'users') return `${(a.userIds || []).length} personas`
  if (a.mode === 'none') return 'Nadie'
  const n = (a.areaIds?.length || 0) + (a.groupIds?.length || 0) + (a.userIds?.length || 0)
  return `Segmentado (${n})`
}

function statusLabel(s) {
  if (s === 'published') return 'Publicado'
  if (s === 'archived') return 'Archivado'
  return 'Borrador'
}

function offerTypeKindLabel(id) {
  if (id === 'premio') return 'Premio (reward)'
  if (id === 'canjeable') return 'Canje con puntos'
  if (id === 'geo') return 'Con mapa'
  if (id === 'partner') return 'Empresa asociada'
  return 'Informativo'
}

function offerTypeShortLabel(id) {
  if (id === 'premio') return 'Premio'
  if (id === 'canjeable') return 'Canje'
  if (id === 'geo') return 'Ubicación'
  if (id === 'partner') return 'Partner'
  return 'Info'
}

function benefitPointsLabel(item) {
  const pts = Number(item?.costoPuntos) || 0
  return pts > 0 ? `${pts} pts` : ''
}

const traitsModalItem = ref(null)

function openTraitsModal(item) {
  traitsModalItem.value = item || null
}

function closeTraitsModal() {
  traitsModalItem.value = null
}

function editFromTraitsModal() {
  const item = traitsModalItem.value
  closeTraitsModal()
  if (item) openEdit(item)
}

/** Atributos del tipo (sin puntos: esos van junto al estado). */
function benefitTypeTraits(item) {
  if (!item) return []
  const t = item.offerType || 'informativo'
  const traits = []

  if (t === 'canjeable' || t === 'premio') {
    if (item.stock != null) traits.push(`Stock ${item.stock}`)
    else traits.push('Stock ∞')
    if (item.cupo != null) traits.push(`Cupo ${item.cupo}`)
    if (item.limitePorUsuario != null) traits.push(`Máx ${item.limitePorUsuario}/u`)
    if (item.redeemCount) traits.push(`${item.redeemCount} canjes`)
    if (item.allowWaitlist) traits.push('Espera')
    if (item.hasMerchantPin) traits.push('PIN')
  } else if (t === 'geo') {
    const locs = Array.isArray(item.locations) ? item.locations.length : 0
    if (item.sucursal) traits.push(item.sucursal)
    else if (locs) traits.push(locs === 1 ? '1 sede' : `${locs} sedes`)
    else if (item.hasLocation) traits.push('En mapa')
    else traits.push('Sin sede')
    if (item.redeemRadiusKm != null) traits.push(`${item.redeemRadiusKm} km`)
    if (item.stock != null) traits.push(`Stock ${item.stock}`)
  } else if (t === 'partner') {
    if (item.partnerName) traits.push(item.partnerName)
    if (item.partnerUrl) {
      try {
        const host = new URL(item.partnerUrl).hostname.replace(/^www\./, '')
        if (host) traits.push(host)
      } catch {
        traits.push('Con link')
      }
    } else {
      traits.push('Sin URL')
    }
  } else if (item.partnerName || item.limitePorUsuario != null) {
    if (item.partnerName) traits.push(item.partnerName)
    if (item.limitePorUsuario != null) traits.push(`Máx ${item.limitePorUsuario}/u`)
  }

  if (item.destacado) traits.push('Destacado')
  return traits.slice(0, 5)
}

function offerTypeExample(id) {
  const map = {
    informativo: '20% off en farmacias del barrio',
    canjeable: 'Almuerzo en el comedor por 150 pts',
    premio: 'Gift card $5.000 por 800 pts',
    geo: 'Descuento en estación YPF · CABA',
    partner: 'Portal de empresa asociada',
  }
  return map[id] || 'Beneficio para la comunidad'
}

function categoryExample(id) {
  const fromDraft = (categoryDraft.value || []).find((c) => c && c.id === id)
  if (fromDraft?.example) return fromDraft.example
  const fromList = (categories.value || []).find((c) => c && c.id === id)
  if (fromList?.example) return fromList.example
  const map = {
    descuentos: '15% en supermercados adheridos',
    salud: 'Gimnasio y óptica con convenio',
    gastronomia: 'Menú del día en el comedor',
    transporte: 'Nafta y movilidad corporativa',
    educacion: 'Cursos e idiomas online',
    tecnologia: 'Notebooks y auriculares',
    premios: 'Gift cards y días libres',
    otros: 'Merchandising y extras',
  }
  return map[id] || 'Beneficios de esta categoría'
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function excerpt(t, n = 90) {
  const s = String(t || '').trim()
  if (s.length <= n) return s
  return `${s.slice(0, n)}…`
}

function onThumbErr(e) {
  e.target.style.display = 'none'
}

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => audienceUserCache.value[id] || { id, label: id })
})

const currentOfferLabel = computed(() => {
  const id = draft.value?.offerType
  return offerTypes.value.find((t) => t.id === id)?.label || 'Beneficio'
})

const needsPoints = computed(() => {
  const t = draft.value?.offerType
  return t === 'canjeable' || t === 'premio'
})

const previewBrandName = computed(() =>
  String(draft.value?.partnerName || draft.value?.nombreComercial || draft.value?.titulo || 'Beneficio').trim(),
)

const previewCategoryLabel = computed(() => {
  const id = draft.value?.categoria
  if (!id) return ''
  return categories.value.find((c) => c.id === id)?.label || String(id).replace(/_/g, ' ')
})

const previewDayBadge = computed(() => {
  const days = draft.value?.daysOfWeek || []
  if (!days.length || days.length >= 7) return 'Todos los días'
  const labels = [...days]
    .map((d) => dayLabels[Number(d)])
    .filter(Boolean)
  if (!labels.length) return 'Todos los días'
  if (labels.length === 1) return labels[0]
  if (labels.length <= 3) return labels.join(', ')
  return `${labels[0]} +${labels.length - 1}`
})

const previewValidity = computed(() => {
  const until = draft.value?.vigenciaHasta
  if (!until) return ''
  const d = new Date(`${until}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `Válido hasta el ${dd}/${mm}/${d.getFullYear()}`
})

const previewUsage = computed(() => {
  const d = draft.value
  if (!d) return ''
  if (d.limitePorMes !== '' && d.limitePorMes != null) {
    const n = Number(d.limitePorMes)
    return `${n} ${n === 1 ? 'vez' : 'veces'} por mes`
  }
  if (d.limitePorSemana !== '' && d.limitePorSemana != null) {
    const n = Number(d.limitePorSemana)
    return `${n} ${n === 1 ? 'vez' : 'veces'} por semana`
  }
  if (d.limitePorDia !== '' && d.limitePorDia != null) {
    const n = Number(d.limitePorDia)
    return `${n} ${n === 1 ? 'vez' : 'veces'} por día`
  }
  if (d.limitePorUsuario !== '' && d.limitePorUsuario != null) {
    return `Hasta ${d.limitePorUsuario} por usuario`
  }
  return ''
})

const previewPayWith = computed(() => {
  const d = draft.value
  if (!d) return 'Medio de pago del comercio'
  if (needsPoints.value && Number(d.costoPuntos) > 0) return 'Puntos Connectia'
  if (d.partnerName) return `Tarjeta / app ${d.partnerName}`
  return 'Medio de pago del comercio'
})

const previewRedeemLabel = computed(() => {
  const c = Number(draft.value?.costoPuntos) || 0
  if (needsPoints.value && c > 0) return `Canjear por ${c} pts`
  return 'Obtener código'
})

const previewLocations = computed(() =>
  (draft.value?.locations || []).filter((l) => String(l?.name || '').trim() || l?.lat || l?.lng),
)

const canAdvance = computed(() => {
  if (!draft.value) return false
  if (step.value === 1) return Boolean(draft.value.offerType)
  if (step.value === 2) return Boolean(draft.value.titulo?.trim())
  if (step.value === 3 && draft.value.offerType === 'partner') {
    return Boolean(String(draft.value.partnerUrl || '').trim())
  }
  if (step.value === 3 && draft.value.offerType === 'geo') {
    const hasSuc = Boolean(String(draft.value.sucursal || '').trim())
    const hasCoords =
      draft.value.lat !== '' &&
      draft.value.lng !== '' &&
      Number.isFinite(Number(draft.value.lat)) &&
      Number.isFinite(Number(draft.value.lng))
    return hasSuc || hasCoords
  }
  if (step.value === 3 && needsPoints.value) {
    return Number(draft.value.costoPuntos) > 0
  }
  return true
})

const canSave = computed(() => Boolean(draft.value?.titulo?.trim() && draft.value?.offerType))

const filtersActive = computed(
  () =>
    Boolean(
      q.value.trim() ||
        offerTypeFilter.value ||
        status.value ||
        kindFilter.value,
    ),
)

const destacadosRail = computed(() => (items.value || []).filter((d) => d.destacado))

const categoryRails = computed(() => {
  const list = items.value || []
  const byCat = new Map()
  for (const it of list) {
    const id = it.categoria || 'otros'
    if (!byCat.has(id)) byCat.set(id, [])
    byCat.get(id).push(it)
  }
  const order = categories.value.length ? categories.value.map((c) => c.id) : [...byCat.keys()]
  const rails = []
  for (const id of order) {
    const group = byCat.get(id)
    if (!group?.length) continue
    const label =
      categories.value.find((c) => c.id === id)?.label ||
      String(id).replace(/_/g, ' ')
    rails.push({ id, label, items: group })
  }
  for (const [id, group] of byCat) {
    if (rails.some((r) => r.id === id)) continue
    rails.push({
      id,
      label: String(id).replace(/_/g, ' '),
      items: group,
    })
  }
  return rails
})

const catalogSection = ref('todos')

const catalogTabs = computed(() => {
  const list = items.value || []
  const tabs = [
    {
      id: 'todos',
      label: 'Todos',
      emoji: '📋',
      items: list,
    },
  ]
  if (destacadosRail.value.length) {
    tabs.push({
      id: 'destacados',
      label: 'Destacados',
      emoji: categoryEmoji('destacados'),
      items: destacadosRail.value,
    })
  }
  for (const rail of categoryRails.value) {
    tabs.push({
      id: rail.id,
      label: rail.label,
      emoji: categoryEmoji(rail.id),
      items: rail.items,
    })
  }
  return tabs
})

const activeCatalogTab = computed(
  () => catalogTabs.value.find((t) => t.id === catalogSection.value) || catalogTabs.value[0] || null,
)

const activeCatalogItems = computed(() => activeCatalogTab.value?.items || [])

watch(
  catalogTabs,
  (tabs) => {
    if (!tabs.length) return
    if (!tabs.some((t) => t.id === catalogSection.value)) {
      catalogSection.value = tabs[0].id
    }
  },
  { immediate: true },
)

const maxReachableStep = computed(() => {
  if (!draft.value?.offerType) return 1
  if (!draft.value?.titulo?.trim()) return 2
  return steps.length
})

function categoryEmoji(id) {
  const fromList = (categories.value || []).find((c) => c && c.id === id)
  if (fromList?.emoji) return fromList.emoji
  const map = {
    destacados: '✨',
    gastronomia: '🍔',
    descuentos: '🛒',
    salud: '💊',
    transporte: '⛽',
    educacion: '📚',
    tecnologia: '📱',
    premios: '🎁',
    otros: '🍿',
  }
  return map[id] || '🏷️'
}

function offerHeadline(item) {
  const t = String(item?.nombreComercial || item?.titulo || '').trim()
  if (t.length <= 28) return t
  return `${t.slice(0, 27)}…`
}

function brandStyle(item) {
  const c = String(item?.partnerName || item?.categoria || '').toLowerCase()
  if (/personal|claro|movistar/.test(c) || item?.categoria === 'tecnologia') {
    return { background: 'color-mix(in srgb, var(--brand-primary, #0f766e) 80%, #0f172a)' }
  }
  if (/dia|super|gastro/.test(c) || item?.categoria === 'gastronomia') {
    return { background: 'color-mix(in srgb, var(--brand-primary, #0f766e) 70%, #dc2626)' }
  }
  if (/puma|nafta|combustible|transp/.test(c) || item?.categoria === 'transporte') {
    return { background: 'color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #0f172a)' }
  }
  return { background: 'var(--brand-primary, #0f766e)', color: '#fff' }
}

async function load() {
  error.value = ''
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (offerTypeFilter.value) params.offerType = offerTypeFilter.value
    if (status.value) params.status = status.value
    if (kindFilter.value) params.kind = kindFilter.value
    const { data } = await api.get('/admin/benefits', { params })
    items.value = data.items || []
    categories.value = data.categories || []
    if (data.offerTypes?.length) {
      offerTypes.value = data.offerTypes
      if (panel.value !== 'types') {
        offerTypeDraft.value = data.offerTypes.map((t) => ({
          id: t.id,
          kind: t.kind,
          label: t.label,
          hint: t.hint || '',
        }))
      }
    }
    org.value = data.org || { areas: [], groups: [] }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
  }
}

function clearFilters() {
  q.value = ''
  offerTypeFilter.value = ''
  status.value = ''
  categoriaFilter.value = ''
  kindFilter.value = ''
  destacadoFilter.value = ''
  catalogSection.value = 'todos'
  load()
}

function clearOfferTypeFilter() {
  if (!offerTypeFilter.value) return
  offerTypeFilter.value = ''
  load()
}

function toggleQuickStatus(value) {
  status.value = status.value === value ? '' : value
  load()
}

function toggleQuickType(id) {
  offerTypeFilter.value = offerTypeFilter.value === id ? '' : id
  load()
}

function toggleQuickKind(value) {
  kindFilter.value = kindFilter.value === value ? '' : value
  load()
}

function blankDraft(offerType = 'informativo') {
  return {
    titulo: '',
    nombreComercial: '',
    descripcion: '',
    condiciones: '',
    offerType,
    kind: offerType === 'premio' ? 'reward' : 'benefit',
    categoria: offerType === 'premio' ? 'premios' : 'otros',
    costoPuntos: offerType === 'premio' ? 500 : offerType === 'canjeable' ? 100 : 0,
    stock: '',
    cupo: '',
    limitePorUsuario: '',
    limitePorDia: '',
    limitePorSemana: '',
    limitePorMes: '',
    vigenciaDesde: '',
    vigenciaHasta: '',
    scheduledPublishAt: '',
    daysOfWeek: [],
    timeFrom: '',
    timeTo: '',
    excludeHolidays: false,
    requireUserSede: false,
    allowWaitlist: false,
    merchantPin: '',
    redeemRadiusKm: '',
    locations: [],
    status: 'published',
    imageUrl: '',
    partnerName: '',
    partnerUrl: '',
    lat: '',
    lng: '',
    sucursal: '',
    destacado: false,
    audience: emptyAudience(),
  }
}

function toDateInput(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function toDateTimeLocal(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openNew() {
  draft.value = blankDraft('informativo')
  codesText.value = ''
  aiPrompt.value = ''
  step.value = 1
}

function chooseNewManual() {
  newChooserOpen.value = false
  openNew()
}

function chooseNewAi() {
  newChooserOpen.value = false
  aiCreateError.value = ''
  aiCreatePrompt.value = ''
  aiCreateOpen.value = true
}

function closeAiCreate() {
  if (aiCreating.value) return
  aiCreateOpen.value = false
  aiCreateError.value = ''
}

function applyAiDraftFields(d = {}) {
  const offerType = ['informativo', 'canjeable', 'premio', 'geo', 'partner'].includes(d.offerType)
    ? d.offerType
    : 'informativo'
  const next = blankDraft(offerType)
  if (d.titulo) next.titulo = String(d.titulo).slice(0, 160)
  if (d.nombreComercial) next.nombreComercial = String(d.nombreComercial).slice(0, 120)
  if (d.descripcion) next.descripcion = String(d.descripcion)
  if (d.condiciones) next.condiciones = String(d.condiciones)
  if (d.categoria) next.categoria = String(d.categoria)
  if (d.costoPuntos != null && d.costoPuntos !== '') next.costoPuntos = Number(d.costoPuntos) || 0
  if (d.stock != null && d.stock !== '') next.stock = d.stock
  if (d.partnerName) next.partnerName = String(d.partnerName)
  if (d.partnerUrl) next.partnerUrl = String(d.partnerUrl)
  if (d.sucursal) next.sucursal = String(d.sucursal)
  if (d.imageUrl) next.imageUrl = String(d.imageUrl)
  next.destacado = Boolean(d.destacado)
  next.kind = offerType === 'premio' ? 'reward' : 'benefit'
  return next
}

async function runAiCreate() {
  const prompt = aiCreatePrompt.value.trim()
  if (prompt.length < 8 || aiCreating.value) return
  aiCreating.value = true
  aiCreateError.value = ''
  try {
    const { data } = await api.post('/admin/benefits/ai-draft', {
      prompt,
      findImage: true,
    })
    const d = data.draft || {}
    draft.value = applyAiDraftFields(d)
    codesText.value = ''
    aiPrompt.value = prompt
    step.value = draft.value.titulo?.trim() ? 2 : 1
    aiCreateOpen.value = false
    okMsg.value = d.imageUrl
      ? `Borrador IA listo (${d.source || 'ok'}) · imagen incluida`
      : `Borrador IA listo (${d.source || 'ok'})`
  } catch (e) {
    aiCreateError.value = e.response?.data?.error || 'IA no disponible. Probá de nuevo o creá a mano.'
  } finally {
    aiCreating.value = false
  }
}

function openEdit(d) {
  const aud = d.audience || emptyAudience()
  draft.value = {
    id: d.id,
    titulo: d.titulo,
    nombreComercial: d.nombreComercial || '',
    descripcion: d.descripcion,
    condiciones: d.condiciones,
    offerType: d.offerType || 'informativo',
    kind: d.kind,
    categoria: d.categoria,
    costoPuntos: d.costoPuntos,
    stock: d.stock == null ? '' : d.stock,
    cupo: d.cupo == null ? '' : d.cupo,
    limitePorUsuario: d.limitePorUsuario == null ? '' : d.limitePorUsuario,
    limitePorDia: d.limitePorDia == null ? '' : d.limitePorDia,
    limitePorSemana: d.limitePorSemana == null ? '' : d.limitePorSemana,
    limitePorMes: d.limitePorMes == null ? '' : d.limitePorMes,
    vigenciaDesde: toDateInput(d.vigenciaDesde),
    vigenciaHasta: toDateInput(d.vigenciaHasta),
    scheduledPublishAt: toDateTimeLocal(d.scheduledPublishAt),
    daysOfWeek: [...(d.daysOfWeek || [])],
    timeFrom: d.timeFrom || '',
    timeTo: d.timeTo || '',
    excludeHolidays: Boolean(d.excludeHolidays),
    requireUserSede: Boolean(d.requireUserSede),
    allowWaitlist: Boolean(d.allowWaitlist),
    merchantPin: '',
    redeemRadiusKm: d.redeemRadiusKm == null ? '' : d.redeemRadiusKm,
    locations: (d.locations || []).map((l) => ({
      id: l.id,
      name: l.name || '',
      lat: l.lat ?? '',
      lng: l.lng ?? '',
      stock: l.stock == null ? '' : l.stock,
    })),
    status: d.status,
    imageUrl: d.imageUrl,
    partnerName: d.partnerName,
    partnerUrl: d.partnerUrl,
    lat: d.lat ?? '',
    lng: d.lng ?? '',
    sucursal: d.sucursal || '',
    destacado: Boolean(d.destacado),
    audience: {
      mode: aud.mode || 'all',
      areaIds: (aud.areaIds || []).map(String),
      groupIds: (aud.groupIds || []).map(String),
      userIds: (aud.userIds || []).map(String),
    },
  }
  codesText.value = ''
  aiPrompt.value = ''
  step.value = 2
  if (draft.value.audience.userIds.length) hydrateAudienceUsers(draft.value.audience.userIds)
}

function addLocation() {
  if (!draft.value.locations) draft.value.locations = []
  draft.value.locations.push({
    id: `loc-${Date.now()}`,
    name: '',
    lat: '',
    lng: '',
    stock: '',
  })
}

function numOrNull(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function closeWizard() {
  draft.value = null
  step.value = 1
}

function pickOfferType(id) {
  const prev = draft.value
  const next = blankDraft(id)
  if (prev) {
    next.id = prev.id
    next.titulo = prev.titulo
    next.descripcion = prev.descripcion
    next.condiciones = prev.condiciones
    next.imageUrl = prev.imageUrl
    next.audience = prev.audience
    next.status = prev.status
    next.destacado = prev.destacado
    if (id === 'premio' || id === 'canjeable') {
      next.costoPuntos = Number(prev.costoPuntos) > 0 ? prev.costoPuntos : next.costoPuntos
      next.stock = prev.stock
      next.limitePorUsuario = prev.limitePorUsuario
    }
    if (id === 'geo') {
      next.lat = prev.lat
      next.lng = prev.lng
      next.sucursal = prev.sucursal
    }
    if (id === 'partner' || id === 'informativo') {
      next.partnerName = prev.partnerName
      next.partnerUrl = prev.partnerUrl
    }
    if (prev.categoria) next.categoria = prev.categoria
  }
  draft.value = next
}

function nextStep() {
  if (!canAdvance.value) return
  if (step.value < steps.length) step.value += 1
}

function goStep(n) {
  if (n >= 1 && n <= maxReachableStep.value) step.value = n
}

function setAudMode(mode) {
  draft.value.audience = {
    mode,
    areaIds: mode === 'restricted' ? draft.value.audience.areaIds : [],
    groupIds: mode === 'restricted' ? draft.value.audience.groupIds : [],
    userIds: mode === 'users' || mode === 'restricted' ? draft.value.audience.userIds : [],
  }
}

async function hydrateAudienceUsers(ids) {
  try {
    const { data } = await api.get('/admin/benefits/audience-candidates', {
      params: { ids: ids.join(',') },
    })
    const cache = { ...audienceUserCache.value }
    for (const u of data.items || []) cache[u.id] = u
    audienceUserCache.value = cache
  } catch {
    /* ignore */
  }
}

function searchAudienceUsers() {
  clearTimeout(audienceTimer)
  audienceTimer = setTimeout(async () => {
    const qv = audienceUserQuery.value.trim()
    if (qv.length < 2) {
      audienceUserResults.value = []
      return
    }
    const { data } = await api.get('/admin/benefits/audience-candidates', { params: { q: qv } })
    audienceUserResults.value = data.items || []
  }, 250)
}

function addAudienceUser(u) {
  audienceUserCache.value = { ...audienceUserCache.value, [u.id]: u }
  if (!draft.value.audience.userIds.includes(u.id)) draft.value.audience.userIds.push(u.id)
}

function removeAudienceUser(id) {
  draft.value.audience.userIds = draft.value.audience.userIds.filter((x) => x !== id)
}

async function uploadImage(file) {
  const fd = new FormData()
  fd.append('files', file)
  const { data } = await api.post('/admin/benefits/upload', fd)
  return data.url || data.urls?.[0] || ''
}

async function onImageFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  try {
    draft.value.imageUrl = await uploadImage(file)
    okMsg.value = 'Imagen subida'
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo subir la imagen'
  }
}

async function onPartnerImage(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    partnerDraft.value.imageUrl = await uploadImage(file)
    okMsg.value = 'Imagen de partner subida'
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo subir la imagen'
  }
}

async function save() {
  if (!canSave.value) {
    error.value = 'Completá tipo y título'
    return
  }
  if (draft.value.offerType === 'partner' && !String(draft.value.partnerUrl || '').trim()) {
    error.value = 'URL del partner obligatoria'
    step.value = 3
    return
  }
  busy.value = true
  error.value = ''
  try {
    const body = {
      ...draft.value,
      offerType: draft.value.offerType,
      stock: numOrNull(draft.value.stock),
      cupo: numOrNull(draft.value.cupo),
      limitePorUsuario: numOrNull(draft.value.limitePorUsuario),
      limitePorDia: numOrNull(draft.value.limitePorDia),
      limitePorSemana: numOrNull(draft.value.limitePorSemana),
      limitePorMes: numOrNull(draft.value.limitePorMes),
      redeemRadiusKm: numOrNull(draft.value.redeemRadiusKm),
      lat: numOrNull(draft.value.lat),
      lng: numOrNull(draft.value.lng),
      vigenciaDesde: draft.value.vigenciaDesde || null,
      vigenciaHasta: draft.value.vigenciaHasta || null,
      scheduledPublishAt: draft.value.scheduledPublishAt
        ? new Date(draft.value.scheduledPublishAt).toISOString()
        : null,
      daysOfWeek: (draft.value.daysOfWeek || []).map(Number).filter((d) => d >= 0 && d <= 6),
      locations: (draft.value.locations || []).map((l) => ({
        id: l.id,
        name: l.name,
        lat: numOrNull(l.lat),
        lng: numOrNull(l.lng),
        stock: numOrNull(l.stock),
      })),
      bumpCondiciones: true,
      costoPuntos: needsPoints.value ? Number(draft.value.costoPuntos) || 0 : Number(draft.value.costoPuntos) || 0,
    }
    if (!body.merchantPin) delete body.merchantPin
    if (draft.value.offerType === 'informativo') body.costoPuntos = 0
    if (draft.value.id) {
      await api.patch(`/admin/benefits/${draft.value.id}`, body)
      okMsg.value = 'Beneficio actualizado'
    } else {
      await api.post('/admin/benefits', body)
      okMsg.value = 'Beneficio creado'
    }
    closeWizard()
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    busy.value = false
  }
}

async function duplicate(d) {
  busy.value = true
  try {
    const { data } = await api.post(`/admin/benefits/${d.id}/duplicate`)
    okMsg.value = 'Copia creada en borrador'
    await load()
    if (data.item) openEdit(data.item)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo duplicar'
  } finally {
    busy.value = false
  }
}

async function openSimulate(d) {
  const sede = window.prompt('Sede del colaborador (vacío = cualquiera)', '') ?? ''
  try {
    const { data } = await api.post('/admin/benefits/simulate', {
      benefitId: d.id,
      sede,
    })
    const r = data.result || {}
    okMsg.value = r.ok
      ? `Simulación OK — disponible ahora: ${r.availableNow ? 'sí' : 'no'}`
      : `No elegible: ${r.reason}`
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al simular'
  }
}

async function runAiDraft() {
  if (!draft.value) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/benefits/ai-draft', {
      prompt: aiPrompt.value || draft.value.titulo || 'beneficio corporativo',
      offerType: draft.value.offerType,
      findImage: true,
    })
    const d = data.draft || {}
    if (d.titulo) draft.value.titulo = d.titulo
    if (d.nombreComercial) draft.value.nombreComercial = d.nombreComercial
    if (d.descripcion) draft.value.descripcion = d.descripcion
    if (d.condiciones) draft.value.condiciones = d.condiciones
    if (d.categoria) draft.value.categoria = d.categoria
    if (d.costoPuntos != null && d.costoPuntos !== '') draft.value.costoPuntos = Number(d.costoPuntos) || 0
    if (d.stock != null && d.stock !== '') draft.value.stock = d.stock
    if (d.partnerName) draft.value.partnerName = d.partnerName
    if (d.partnerUrl) draft.value.partnerUrl = d.partnerUrl
    if (d.sucursal) draft.value.sucursal = d.sucursal
    if (d.imageUrl) draft.value.imageUrl = d.imageUrl
    if (d.destacado != null) draft.value.destacado = Boolean(d.destacado)
    okMsg.value = d.imageUrl
      ? `Borrador IA (${d.source || 'ok'}) · imagen incluida`
      : `Borrador IA (${d.source || 'ok'})`
  } catch (e) {
    error.value = e.response?.data?.error || 'IA no disponible'
  } finally {
    busy.value = false
  }
}

async function uploadCodes() {
  if (!draft.value?.id || !codesText.value.trim()) return
  busy.value = true
  try {
    const { data } = await api.post(`/admin/benefits/${draft.value.id}/codes`, { text: codesText.value })
    okMsg.value = `Códigos: ${data.created} nuevos, ${data.skipped} omitidos`
    codesText.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar códigos'
  } finally {
    busy.value = false
  }
}

async function exportCsv() {
  try {
    const { data } = await api.get('/admin/benefits/export', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'beneficios-canjes.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo exportar'
  }
}

async function archive(d) {
  if (!confirm(`Archivar «${d.titulo}»?`)) return
  try {
    await api.delete(`/admin/benefits/${d.id}`)
    okMsg.value = 'Archivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo archivar'
  }
}

async function seedDefaults() {
  error.value = ''
  okMsg.value = ''
  // Ir ya al listado (como esperás al tocar el botón)
  goCatalog()
  closeWizard()
  q.value = ''
  offerTypeFilter.value = ''
  status.value = ''
  categoriaFilter.value = ''
  kindFilter.value = ''
  destacadoFilter.value = ''
  catalogSection.value = 'todos'
  seeding.value = true
  busy.value = true
  try {
    const { data } = await api.post('/admin/benefits/seed-defaults')
    const created = Number(data.created) || 0
    const skipped = Number(data.skipped) || 0
    const partnersCreated = Number(data.partnersCreated) || 0
    okMsg.value =
      created > 0 || partnersCreated > 0
        ? `Catálogo base: ${created} beneficios nuevos · ${partnersCreated} empresas asociadas (${skipped} beneficios ya existían).`
        : `Catálogo base al día: ${skipped} beneficios ya estaban cargados.`
    await load()
    try {
      await loadPartners()
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } catch (e) {
    error.value =
      e.response?.data?.error ||
      e.message ||
      'No se pudo cargar el catálogo base. Revisá la conexión con el API.'
    try {
      await load()
    } catch {
      /* ignore */
    }
  } finally {
    seeding.value = false
    busy.value = false
  }
}

async function openOfferTypes() {
  configOpen.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/benefits/offer-types')
    const items = data.items?.length ? data.items : offerTypes.value
    offerTypeDraft.value = items.map((t) => ({
      id: t.id,
      kind: t.kind,
      label: t.label,
      hint: t.hint || '',
    }))
    offerTypes.value = items
    panel.value = 'types'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar los tipos'
  }
}

function slugCatId(label) {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

function mapCategoryDraft(items) {
  return (items || []).map((c) => ({
    _key: `cat-${++categoryKeySeq}`,
    _locked: Boolean(c.id),
    id: c.id || '',
    label: c.label || '',
    emoji: c.emoji || categoryEmoji(c.id) || '🏷️',
    example: c.example || categoryExample(c.id) || '',
  }))
}

async function openCategories() {
  configOpen.value = true
  error.value = ''
  categoryEmojiOpen.value = -1
  try {
    const { data } = await api.get('/admin/benefits/categories')
    const items = data.items?.length ? data.items : categories.value
    categoryDraft.value = mapCategoryDraft(items)
    if (data.items?.length) categories.value = data.items
    panel.value = 'categories'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las categorías'
  }
}

function blankCategoryModal() {
  return { emoji: '🏷️', label: '', example: '' }
}

function openCategoryModal() {
  categoryModal.value = blankCategoryModal()
  categoryModalOpen.value = true
  categoryEmojiOpen.value = -1
}

function closeCategoryModal() {
  categoryModalOpen.value = false
  categoryModal.value = blankCategoryModal()
}

function confirmCategoryModal() {
  const label = String(categoryModal.value.label || '').trim()
  if (!label) return
  categoryDraft.value.push({
    _key: `cat-${++categoryKeySeq}`,
    _locked: false,
    id: '',
    label,
    emoji: String(categoryModal.value.emoji || '').trim().slice(0, 4) || '🏷️',
    example: String(categoryModal.value.example || '').trim().slice(0, 160),
  })
  closeCategoryModal()
}

function toggleCategoryEmojiPicker(idx) {
  categoryEmojiOpen.value = categoryEmojiOpen.value === idx ? -1 : idx
}

function pickCategoryEmoji(idx, em) {
  const row = categoryDraft.value[idx]
  if (!row) return
  row.emoji = em
  categoryEmojiOpen.value = -1
}

function askRemoveCategory(idx) {
  const row = categoryDraft.value[idx]
  if (!row || row.id === 'otros' || categoryDraft.value.length <= 1) return
  categoryDeleteIdx.value = idx
  categoryDeleteOpen.value = true
  categoryEmojiOpen.value = -1
}

function closeCategoryDelete() {
  categoryDeleteOpen.value = false
  categoryDeleteIdx.value = -1
}

function confirmRemoveCategory() {
  const idx = categoryDeleteIdx.value
  const row = categoryDraft.value[idx]
  if (!row || row.id === 'otros' || categoryDraft.value.length <= 1) {
    closeCategoryDelete()
    return
  }
  categoryDraft.value.splice(idx, 1)
  closeCategoryDelete()
  okMsg.value = `Categoría «${row.label || row.id}» quitada del borrador. Guardá para aplicar.`
}

function normalizeCategoryDraftId(c) {
  if (!c || c._locked) return
  if (!String(c.id || '').trim() && c.label) c.id = slugCatId(c.label)
  else if (c.id) c.id = slugCatId(c.id)
}

async function saveCategories() {
  busy.value = true
  error.value = ''
  okMsg.value = ''
  categoryEmojiOpen.value = -1
  try {
    const payload = categoryDraft.value
      .map((c) => {
        const label = String(c.label || '').trim()
        let id = String(c.id || '').trim()
        if (!id && label) id = slugCatId(label)
        return {
          id,
          label,
          emoji: String(c.emoji || '').trim().slice(0, 8) || '🏷️',
          example: String(c.example || '').trim().slice(0, 160),
        }
      })
      .filter((c) => c.label && c.id)
    if (!payload.length) {
      error.value = 'Agregá al menos una categoría con nombre'
      return
    }
    const { data } = await api.put('/admin/benefits/categories', { categories: payload })
    categories.value = data.items || payload
    categoryDraft.value = mapCategoryDraft(data.items || payload)
    okMsg.value = 'Categorías guardadas'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron guardar las categorías'
  } finally {
    busy.value = false
  }
}

async function saveOfferTypes() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.put('/admin/benefits/offer-types', {
      offerTypes: offerTypeDraft.value.map((t) => ({
        id: t.id,
        label: t.label,
        hint: t.hint,
      })),
    })
    offerTypes.value = data.items || offerTypeDraft.value
    offerTypeDraft.value = (data.items || offerTypeDraft.value).map((t) => ({ ...t }))
    okMsg.value = 'Tipos de beneficios guardados para esta comunidad'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron guardar los nombres'
  } finally {
    busy.value = false
  }
}

async function loadWallets() {
  const { data } = await api.get('/admin/benefits/wallets')
  wallets.value = data.items || []
}

async function loadPartners() {
  const { data } = await api.get('/admin/benefits/partners')
  partners.value = data.items || []
}

async function seedPartners() {
  error.value = ''
  okMsg.value = ''
  seedingPartners.value = true
  busy.value = true
  try {
    const { data } = await api.post('/admin/benefits/partners/seed-defaults')
    const created = Number(data.created) || 0
    const skipped = Number(data.skipped) || 0
    okMsg.value =
      created > 0
        ? `Empresas asociadas: ${created} nuevas (${skipped} ya existían).`
        : `Empresas asociadas al día: ${skipped} ya estaban cargadas.`
    await loadPartners()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las empresas asociadas'
  } finally {
    seedingPartners.value = false
    busy.value = false
  }
}

async function refreshGestionCanjes() {
  const { data } = await api.get('/admin/benefits/report')
  report.value = data.items || []
  reportByLocation.value = data.byLocation || []
}

async function loadAttention() {
  try {
    const { data } = await api.get('/admin/benefits/attention')
    pendingRedemptions.value = data.pendingRedemptions || []
    waitlistItems.value = data.waitlist || []
    attentionCount.value = Number(data.attentionCount) || 0
  } catch {
    /* silencioso en poll */
  }
}

async function approveRedemption(r) {
  busy.value = true
  error.value = ''
  try {
    await api.post(`/admin/benefits/redemptions/${r.id}/approve`)
    okMsg.value = `Canje aprobado: ${r.benefitTitulo || r.code}`
    await loadAttention()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo aprobar'
  } finally {
    busy.value = false
  }
}

async function cancelRedemption(r) {
  if (!confirm(`Rechazar canje de «${r.benefitTitulo || r.code}»?`)) return
  busy.value = true
  error.value = ''
  try {
    await api.post(`/admin/benefits/redemptions/${r.id}/cancel`)
    okMsg.value = 'Canje rechazado'
    await loadAttention()
    await refreshGestionCanjes()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo rechazar'
  } finally {
    busy.value = false
  }
}

async function fulfillWaitlist(w) {
  busy.value = true
  error.value = ''
  try {
    await api.post(`/admin/benefits/waitlist/${w.id}/fulfill`)
    okMsg.value = `Lista de espera cumplida: ${w.userLabel}`
    await loadAttention()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo marcar como cumplida'
  } finally {
    busy.value = false
  }
}

async function cancelWaitlist(w) {
  if (!confirm(`Cancelar espera de «${w.userLabel}»?`)) return
  busy.value = true
  error.value = ''
  try {
    await api.post(`/admin/benefits/waitlist/${w.id}/cancel`)
    okMsg.value = 'Espera cancelada'
    await loadAttention()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cancelar'
  } finally {
    busy.value = false
  }
}

function searchCreditUser() {
  clearTimeout(creditTimer)
  creditTimer = setTimeout(async () => {
    const qv = credit.value.q.trim()
    if (qv.length < 2) {
      creditResults.value = []
      return
    }
    const { data } = await api.get('/admin/benefits/audience-candidates', { params: { q: qv } })
    creditResults.value = data.items || []
  }, 250)
}

function pickCreditUser(u) {
  credit.value.userId = u.id
  credit.value.userLabel = u.label
  credit.value.q = u.usuario
  creditResults.value = []
}

async function openRules() {
  configOpen.value = true
  panel.value = 'rules'
  await loadRules()
}

async function loadRules() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/points-rules')
    rules.value = (data.items || []).map((r) => ({
      ...r,
      dailyCap: r.dailyCap == null ? '' : r.dailyCap,
    }))
    rulesMeta.value = { walletEnabled: data.walletEnabled !== false }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las reglas'
  }
}

async function saveRule(r) {
  busy.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const dailyCap =
      r.dailyCap === '' || r.dailyCap == null || Number.isNaN(Number(r.dailyCap))
        ? null
        : Number(r.dailyCap)
    const { data } = await api.put(`/admin/points-rules/${r.event}`, {
      points: Number(r.points) || 0,
      dailyCap,
      enabled: Boolean(r.enabled),
      label: r.label || r.eventLabel,
    })
    okMsg.value = `Regla «${data.rule?.eventLabel || r.event}» guardada`
    await loadRules()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar la regla'
  } finally {
    busy.value = false
  }
}

async function seedRules() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/points-rules/seed')
    okMsg.value = `Defaults: ${data.created} nuevas, ${data.skipped} ya existían`
    await loadRules()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron crear defaults'
  } finally {
    busy.value = false
  }
}

async function doCredit() {
  const amount = Number(credit.value.amount)
  const concept = String(credit.value.concept || '').trim()
  if (!credit.value.userId) {
    error.value = 'Elegí un miembro'
    return
  }
  if (!Number.isFinite(amount) || amount === 0) {
    error.value = 'Ingresá un monto distinto de 0'
    return
  }
  if (concept.length < 3) {
    error.value = 'Agregá un motivo (mín. 3 caracteres)'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/benefits/credit', {
      userId: credit.value.userId,
      amount,
      concept,
      idempotencyKey: `admin-credit:${credit.value.userId}:${Date.now()}`,
    })
    okMsg.value = `Saldo actualizado: ${data.balance} pts`
    await loadWallets()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo acreditar'
  } finally {
    busy.value = false
  }
}

async function savePartner() {
  if (!canSavePartner.value) {
    error.value = 'Nombre y URL son obligatorios'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await api.post('/admin/benefits/partners', partnerDraft.value)
    partnerDraft.value = blankPartnerDraft()
    partnerModalOpen.value = false
    okMsg.value = 'Empresa asociada agregada'
    await loadPartners()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar la empresa'
  } finally {
    busy.value = false
  }
}

async function deletePartner(p) {
  if (!confirm(`Eliminar «${p.titulo}»?`)) return
  await api.delete(`/admin/benefits/partners/${p.id}`)
  await loadPartners()
}

onMounted(async () => {
  await load()
  await loadAttention()
  attentionTimer = setInterval(() => {
    loadAttention()
  }, 45000)
})

onUnmounted(() => {
  if (attentionTimer) clearInterval(attentionTimer)
  attentionTimer = null
})

watch(panel, async (p) => {
  if (CONFIG_PANELS.has(p)) configOpen.value = true
  if (p === 'gestion') {
    error.value = ''
    try {
      await Promise.all([loadWallets(), refreshGestionCanjes(), loadAttention()])
    } catch (e) {
      error.value = e.response?.data?.error || 'No se pudo cargar la gestión de canjes'
    }
  }
  if (p === 'partners') await loadPartners()
})
</script>

<style scoped>
.btn-primary {
  border-radius: 0.5rem;
  background: var(--brand-primary);
  color: #fff;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}
.btn-ghost {
  border-radius: 0.5rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  padding: 0.5rem 0.85rem;
  font-size: 0.875rem;
}
.btn-ghost.btn-icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  padding: 0;
  color: var(--ink-soft);
}
.btn-ghost.btn-icon-only:hover:not(:disabled) {
  color: var(--brand-primary);
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line-2));
}
.btn-ghost.btn-icon-only:disabled {
  opacity: 0.55;
}
.spin {
  animation: ben-spin 0.8s linear infinite;
}
@keyframes ben-spin {
  to {
    transform: rotate(360deg);
  }
}
.ben-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 1rem 0 0.35rem;
  align-items: center;
}
.ben-tabs--config {
  margin: 0 0 0.85rem;
  padding: 0.45rem;
  border-radius: 0.75rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
}
.ben-tabs--sub {
  margin: 0;
}
.ben-tabs em {
  font-style: normal;
  background: var(--panel-2);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.ben-tabs button.on em {
  background: color-mix(in srgb, #fff 22%, transparent);
  color: inherit;
}
.gestion-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.attn-panel {
  padding: 1rem 1.05rem 1.15rem;
}
.attn-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.attn-head-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
}
.attn-head-ico {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.7rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--line));
}
.attn-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.attn-sub {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.35;
}
.attn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.attn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.75rem;
}
.attn-card {
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  background: var(--panel);
  padding: 0.85rem;
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.attn-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}
.attn-card-ico {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.65rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.attn-card-ico.redeem {
  color: #d97706;
  background: color-mix(in srgb, #d97706 12%, #fff);
  border: 1px solid color-mix(in srgb, #d97706 28%, var(--line));
}
.attn-card-ico.wait {
  color: #2563eb;
  background: color-mix(in srgb, #2563eb 12%, #fff);
  border: 1px solid color-mix(in srgb, #2563eb 28%, var(--line));
}
.attn-card-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 750;
  color: var(--ink);
}
.attn-card-hint {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.3;
}
.attn-card-count {
  margin-left: auto;
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 750;
  min-width: 1.4rem;
  text-align: center;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--line));
}
.attn-table {
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  overflow: hidden;
}
.attn-empty {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.35rem;
  padding: 1.35rem 1rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--brand-primary) 4%, var(--panel-2, #f8fafc));
  border: 1px dashed color-mix(in srgb, var(--brand-primary) 18%, var(--line));
}
.attn-empty-ico {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 0.15rem;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 22%, var(--line));
}
.attn-empty strong {
  font-size: 0.9rem;
  font-weight: 750;
  color: var(--ink);
}
.attn-empty p {
  margin: 0;
  max-width: 16rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--ink-soft);
}
.wallet-table-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
}
.wallet-table-sub {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.wallet-toolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  align-items: center;
  margin: 0.65rem 0 0.45rem;
  width: 100%;
  min-width: 0;
}
.wallet-toolbar .input,
.wallet-toolbar .btn-ghost {
  font-size: 0.72rem;
  padding: 0.28rem 0.45rem;
  height: 1.85rem;
  line-height: 1.2;
  border-radius: 0.4rem;
}
.wallet-search {
  flex: 1 1 auto;
  min-width: 0;
  max-width: none;
}
.wallet-toolbar select.input {
  width: auto;
  min-width: 0;
  flex: 0 1 auto;
  max-width: 7.5rem;
}
.wallet-page-size {
  min-width: 0 !important;
  max-width: 3.5rem !important;
  flex: 0 0 auto !important;
}
.wallet-clear {
  flex: 0 0 auto;
  white-space: nowrap;
  padding: 0.28rem 0.5rem !important;
  font-size: 0.72rem !important;
}
.wallet-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
}
.wallet-table {
  margin: 0;
}
.wallet-table thead {
  background: var(--panel-2, #f8fafc);
}
.wallet-sort {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-weight: 650;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.wallet-sort:hover {
  color: var(--brand-primary);
}
.wallet-sort span {
  font-size: 0.7rem;
  opacity: 0.7;
}
.wallet-col-balance {
  text-align: right;
  white-space: nowrap;
}
.wallet-col-actions {
  width: 1%;
  white-space: nowrap;
  text-align: right;
}
.wallet-row-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  justify-content: flex-end;
}
.wallet-act {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 0.5rem;
  padding: 0.28rem 0.55rem;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  cursor: pointer;
  line-height: 1.2;
}
.wallet-act.credit {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.wallet-act.credit:hover {
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel));
}
.wallet-act.debit {
  border-color: color-mix(in srgb, #dc2626 28%, var(--line));
  color: #b91c1c;
  background: color-mix(in srgb, #dc2626 6%, var(--panel));
}
.wallet-act.debit:hover:not(:disabled) {
  background: color-mix(in srgb, #dc2626 12%, var(--panel));
}
.wallet-act:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.wallet-adjust-modal {
  width: min(440px, 100%);
}
.wallet-adjust-body {
  display: grid;
  gap: 0.65rem;
}
.btn-danger-solid {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
  color: #fff !important;
}
.btn-danger-solid:hover:not(:disabled) {
  background: #b91c1c !important;
  border-color: #b91c1c !important;
}
.wallet-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.wallet-pager-info {
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.ben-tab-gestion {
  position: relative;
}
.ben-attn-bell {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.12rem;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 0 0 2px var(--panel, #fff);
  pointer-events: none;
}
.ben-attn-bell em {
  font-style: normal;
  background: transparent !important;
  color: #fff !important;
  padding: 0 !important;
  font-size: 0.62rem !important;
}
.ben-tabs em.attn {
  background: #dc2626;
  color: #fff;
}
.ben-tabs button {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ink);
  cursor: pointer;
}
.ben-tabs button.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.ben-tabs-end {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.ben-tab-new {
  border-radius: 999px !important;
  padding: 0.4rem 0.85rem !important;
  font-size: 0.82rem !important;
  white-space: nowrap;
}
.ben-cfg-btn {
  border: 1px solid var(--line) !important;
  background: var(--panel) !important;
  color: var(--ink-soft) !important;
  border-radius: 999px !important;
}
.ben-cfg-btn.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel)) !important;
  color: var(--brand-primary) !important;
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line)) !important;
}
.ben-cfg-btn__label {
  font-size: 0.82rem;
}
.ben-cfg-seed {
  margin-left: auto !important;
  color: var(--ink-soft) !important;
}
.ben-cfg-seed:hover:not(:disabled) {
  color: var(--brand-primary) !important;
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line)) !important;
}
.ben-cfg-seed:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.cat-panel {
  padding: 1rem 1.05rem 1.15rem;
}
.cat-panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.cat-panel-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.cat-panel-sub {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.35;
  max-width: 36rem;
}
.cat-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.cat-preview-rail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem 0.65rem;
  margin-bottom: 0.9rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--brand-primary) 5%, var(--panel-2, #f8fafc));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 12%, var(--line));
}
.cat-preview-rail-lbl {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  flex: 0 0 auto;
}
.cat-preview-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}
.cat-preview-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 650;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--ink);
  white-space: nowrap;
}
.cat-preview-chip em {
  font-style: normal;
  line-height: 1;
}
.cat-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: stretch;
}
.cat-card {
  min-width: 0;
  display: grid;
  gap: 0.55rem;
  align-content: start;
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  padding: 0.7rem 0.7rem 0.75rem;
  background: var(--panel);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.cat-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.35rem;
}
.cat-card-del {
  flex: 0 0 auto;
}
.cat-row-emoji {
  position: relative;
  flex: 0 0 auto;
}
.cat-emoji-btn {
  width: 2.85rem;
  height: 2.85rem;
  border-radius: 0.8rem;
  border: 1px solid var(--line);
  background: var(--panel-2);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}
.cat-emoji-btn:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
}
.cat-emoji-picker {
  position: absolute;
  z-index: 8;
  top: calc(100% + 0.35rem);
  left: 0;
  width: min(14.5rem, 72vw);
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}
.cat-emoji-picker--static {
  position: static;
  width: 100%;
  box-shadow: none;
  margin-bottom: 0.35rem;
}
.cat-emoji-opt {
  width: 2rem;
  height: 2rem;
  border: 1px solid transparent;
  border-radius: 0.45rem;
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}
.cat-emoji-opt:hover,
.cat-emoji-opt.on {
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--line));
}
.cat-emoji-free {
  width: 100%;
  margin-top: 0.15rem;
  font-size: 0.8rem;
  padding: 0.3rem 0.45rem;
  height: auto;
}
.cat-row-fields {
  min-width: 0;
  display: grid;
  gap: 0.4rem;
}
.cat-row-fields .lbl {
  font-size: 0.68rem;
  gap: 0.15rem;
}
.cat-row-fields .input {
  font-size: 0.78rem;
  padding: 0.35rem 0.45rem;
}
@media (max-width: 1200px) {
  .cat-cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 960px) {
  .cat-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .cat-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 480px) {
  .cat-cards {
    grid-template-columns: 1fr;
  }
}
.cat-empty {
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.cat-modal {
  width: min(460px, 100%);
}
.cat-modal-body {
  display: grid;
  gap: 0.65rem;
  padding: 0.2rem 0 0.35rem;
}
.cat-modal-emoji-block {
  display: grid;
  gap: 0.4rem;
  justify-items: start;
}
.cat-modal-emoji-preview {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.85rem;
  border: 1px solid var(--line);
  background: var(--panel-2);
  display: grid;
  place-items: center;
  font-size: 1.5rem;
}
.cat-delete-modal {
  width: min(420px, 100%);
}
.cat-delete-body {
  display: grid;
  gap: 0.75rem;
}
.cat-delete-preview {
  --cat-accent: var(--brand-primary, #0f766e);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--cat-accent) 8%, var(--panel));
}
.cat-delete-preview[data-cat='descuentos'] { --cat-accent: #ea580c; }
.cat-delete-preview[data-cat='salud'] { --cat-accent: #059669; }
.cat-delete-preview[data-cat='gastronomia'] { --cat-accent: #dc2626; }
.cat-delete-preview[data-cat='transporte'] { --cat-accent: #2563eb; }
.cat-delete-preview[data-cat='educacion'] { --cat-accent: #7c3aed; }
.cat-delete-preview[data-cat='tecnologia'] { --cat-accent: #0891b2; }
.cat-delete-preview[data-cat='premios'] { --cat-accent: #ca8a04; }
.cat-delete-preview[data-cat='otros'] { --cat-accent: #64748b; }
.cat-delete-emoji {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  background: color-mix(in srgb, var(--cat-accent) 14%, #fff);
  border: 1px solid color-mix(in srgb, var(--cat-accent) 28%, var(--line));
  flex: 0 0 auto;
}
.cat-delete-preview strong {
  display: block;
  font-size: 0.95rem;
  color: var(--ink);
}
.cat-delete-preview small {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: var(--ink-soft);
}
.cat-delete-warn {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--ink-soft);
}
.btn-danger {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #fff;
  border-radius: 0.55rem;
  padding: 0.45rem 0.85rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 650;
  cursor: pointer;
}
.btn-danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
.cat-empty {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.cat-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.35rem;
}
.cat-picker-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--line);
  background: var(--panel-2, #f8fafc);
  color: var(--ink);
  border-radius: 0.75rem;
  padding: 0.45rem 0.7rem;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.2;
  transition: border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
}
.cat-picker-btn:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  color: var(--brand-primary);
}
.cat-picker-btn.on {
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border-color: color-mix(in srgb, var(--brand-primary) 50%, var(--line));
  color: var(--brand-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-primary) 25%, transparent);
}
.cat-picker-emoji {
  font-size: 1.05rem;
  line-height: 1;
  flex: 0 0 auto;
}
.cat-picker-label {
  white-space: nowrap;
}
.lbl-text {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.cat-id {
  margin: 0 0 0.25rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
@media (max-width: 640px) {
  .ben-cfg-btn__label {
    display: none;
  }
  .ben-tabs-end {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
  .ben-cfg-seed {
    margin-left: 0 !important;
  }
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  width: 100%;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1rem;
}
.lbl {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin-top: 0.5rem;
}
.file-lbl {
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.file-lbl input[type='file'] {
  font-size: 0.8rem;
}
.ben-filters--inline {
  display: grid;
  gap: 0.4rem;
  padding: 0.55rem 0.85rem 0.7rem;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel-2) 70%, var(--panel));
}
.ben-filters-combos {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  align-items: center;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.ben-filters-combos .input,
.ben-filters-combos .btn-ghost,
.ben-filters-combos .btn-primary {
  flex: 1 1 0;
  min-width: 0;
  font-size: 0.72rem;
  padding: 0.28rem 0.4rem;
  height: 1.85rem;
  line-height: 1.2;
  border-radius: 0.4rem;
}
.ben-filters-search {
  flex: 1.4 1 0;
  min-width: 0;
  max-width: none;
}
.ben-filters-combos select.input {
  min-width: 0;
  max-width: none;
}
.ben-filters-btn {
  flex: 0 0 auto !important;
  white-space: nowrap;
  padding: 0.28rem 0.5rem !important;
}
.ben-filters-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.22rem 0.5rem;
  font-size: 0.7rem;
  cursor: pointer;
  line-height: 1.2;
  white-space: nowrap;
}
.quick-chip:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  color: var(--brand-primary);
}
.quick-chip.on {
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  color: var(--brand-primary);
  font-weight: 600;
}

/* —— Listado de beneficios —— */
.app-ben-filter-block {
  border-bottom: 1px solid var(--line);
  padding: 0.45rem 0 0.15rem;
  background: var(--panel);
}
.app-ben-filter-label {
  margin: 0;
  padding: 0 0.85rem 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.app-ben-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem 0.75rem;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--brand-primary) 4%, var(--panel));
}
.app-ben-section-head--flat {
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 0.85rem 0.85rem 0 0;
  margin: 0;
  background: color-mix(in srgb, var(--brand-primary) 4%, var(--panel));
}
.app-ben-section-titles {
  min-width: 0;
}
.app-ben-section-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.25;
}
.app-ben-section-sub {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
  line-height: 1.3;
}
.app-ben-section-badge {
  flex: 0 0 auto;
  min-width: 2rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--line));
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  line-height: 1.2;
}
.app-ben-hint {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  color: var(--ink-faint);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.app-ben-home {
  display: grid;
  gap: 0;
  padding: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  overflow: hidden;
}
.app-ben-home > .app-ben-hint {
  padding: 0.65rem 1rem 0.35rem;
  margin: 0;
}
.app-ben-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.35rem;
  overflow-x: auto;
  padding: 0.2rem 0.85rem 0.55rem;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}
.app-ben-tabs--types .app-ben-tab {
  font-size: 0.74rem;
  padding: 0.32rem 0.65rem;
}
.app-ben-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.2;
  white-space: nowrap;
}
.app-ben-tab:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  color: var(--brand-primary);
}
.app-ben-tab.on {
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--line));
  color: var(--brand-primary);
}
.app-ben-tab-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  font-size: 1rem;
  line-height: 1;
  flex: 0 0 auto;
}
.app-ben-tab-count {
  font-style: normal;
  font-size: 0.7rem;
  font-weight: 700;
  min-width: 1.25rem;
  text-align: center;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: inherit;
}
.app-ben-tab-panel {
  padding: 0.85rem 1rem 1rem;
  display: grid;
  gap: 0.75rem;
  min-height: 12rem;
}
.app-ben-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.app-ben-panel-head .app-ben-rail-title,
.app-ben-panel-head .app-ben-rail-count {
  margin: 0;
}
.app-ben-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 1.35rem 0.75rem;
  align-items: stretch;
}
.app-ben-empty {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.app-ben-rail {
  min-width: 0;
}
.app-ben-rail-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 1rem;
}
.app-ben-rail-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.02em;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.app-ben-rail-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.app-ben-rail-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: thin;
  padding: 0 1rem 10px;
  scroll-snap-type: x mandatory;
}
.app-ben-offer-wrap {
  min-width: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.app-ben-offer {
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  padding: 0;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.app-ben-offer-brand {
  position: relative;
  height: 88px;
  flex: 0 0 88px;
  display: grid;
  place-items: center;
  background: #fff;
  overflow: hidden;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 800;
}
.app-ben-type-badge {
  position: absolute;
  left: 0.4rem;
  top: 0.4rem;
  z-index: 1;
  margin: 0;
  font-style: normal;
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.02em;
  line-height: 1.2;
  padding: 0.18rem 0.42rem;
  border-radius: 999px;
  color: #fff;
  background: color-mix(in srgb, var(--type-accent, #0f766e) 92%, #0f172a);
  border: 1px solid color-mix(in srgb, #fff 35%, transparent);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  max-width: calc(100% - 0.8rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-ben-type-badge[data-type='informativo'] { --type-accent: #0f766e; }
.app-ben-type-badge[data-type='canjeable'] { --type-accent: #d97706; }
.app-ben-type-badge[data-type='premio'] { --type-accent: #7c3aed; }
.app-ben-type-badge[data-type='geo'] { --type-accent: #2563eb; }
.app-ben-type-badge[data-type='partner'] { --type-accent: #db2777; }
.app-ben-offer-brand img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.app-ben-offer-body {
  padding: 10px 10px 12px;
  display: grid;
  gap: 4px;
  background: #fff;
  flex: 1 1 auto;
  align-content: start;
  min-height: 4.6rem;
}
.app-ben-offer-body strong {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
  line-height: 1.2;
  min-height: calc(1.2em * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.app-ben-offer-body p {
  margin: 0;
  font-size: 0.72rem;
  color: #334155;
  line-height: 1.25;
  min-height: calc(1.25em * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.app-ben-offer-foot {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  flex: 0 0 auto;
  min-height: 1.7rem;
}
.app-ben-offer-foot-end {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
  flex: 0 0 auto;
}
.app-ben-pts {
  font-size: 0.72rem;
  font-weight: 750;
  color: #d97706;
  white-space: nowrap;
  line-height: 1.2;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, #d97706 12%, var(--panel));
  border: 1px solid color-mix(in srgb, #d97706 28%, var(--line));
}
.app-ben-trait {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.2;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  color: var(--type-accent, #0f766e);
  background: color-mix(in srgb, var(--type-accent, #0f766e) 12%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--type-accent, #0f766e) 28%, var(--line));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.traits-modal {
  width: min(420px, 100%);
}
.traits-modal-type {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 750;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  color: #fff;
  background: var(--type-accent, #0f766e);
  vertical-align: middle;
}
.traits-modal-type[data-type='informativo'],
.traits-modal-body[data-type='informativo'] { --type-accent: #0f766e; }
.traits-modal-type[data-type='canjeable'],
.traits-modal-body[data-type='canjeable'] { --type-accent: #d97706; }
.traits-modal-type[data-type='premio'],
.traits-modal-body[data-type='premio'] { --type-accent: #7c3aed; }
.traits-modal-type[data-type='geo'],
.traits-modal-body[data-type='geo'] { --type-accent: #2563eb; }
.traits-modal-type[data-type='partner'],
.traits-modal-body[data-type='partner'] { --type-accent: #db2777; }
.traits-modal-body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  padding: 0.35rem 0 0.5rem;
  min-height: 2.5rem;
}
.app-ben-icon-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  padding: 0;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}
.icon-btn:hover {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.icon-btn.danger:hover {
  background: color-mix(in srgb, #dc2626 12%, transparent);
  color: #dc2626;
}
.app-ben-status {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.08rem 0.35rem;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
}
.app-ben-status[data-st='published'] {
  background: color-mix(in srgb, var(--brand-primary) 14%, #fff);
  color: var(--brand-primary);
}
.app-ben-status[data-st='draft'] {
  background: #fef3c7;
  color: #92400e;
}
.app-ben-status[data-st='archived'] {
  background: #f1f5f9;
  color: #64748b;
}

.ben-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
  margin: 0.2rem 0;
}
.ben-pill {
  background: var(--ok-bg);
  color: var(--brand-primary);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-weight: 500;
}
.ben-desc {
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin: 0;
  line-height: 1.35;
}
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
}
.ben-chooser-backdrop {
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 50;
}
.ben-chooser {
  width: min(440px, 100%);
  background: var(--panel, #fff);
  border-radius: 16px;
  border: 1px solid var(--line, #e2e8f0);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  padding: 1.1rem 1.15rem 1rem;
}
.ben-chooser-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.ben-chooser-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
}
.ben-chooser-head p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--ink-soft, #64748b);
}
.ben-chooser-options {
  display: grid;
  gap: 0.55rem;
}
.ben-chooser-opt {
  text-align: left;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--panel-2, #f8fafc);
  border-radius: 12px;
  padding: 0.85rem 0.95rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.ben-chooser-opt:hover {
  border-color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, var(--panel, #fff));
}
.ben-chooser-opt.primary {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 45%, var(--line, #e2e8f0));
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, var(--panel, #fff));
}
.ben-chooser-opt strong {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
}
.ben-chooser-opt small {
  display: block;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--ink-soft, #64748b);
}
.ben-chooser-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.9rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line, #e2e8f0);
}
.ben-ai-create .lbl {
  display: block;
  margin-top: 0.25rem;
}
.ben-ai-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.65rem;
  font-size: 0.8rem;
  color: var(--ink-soft, #64748b);
}
.sheet {
  width: min(480px, 100%);
  height: 100%;
  background: var(--panel);
  overflow: auto;
  padding: 1.25rem;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
}
.sheet-wide {
  width: min(920px, 100%);
}
.wiz-steps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0 0 1rem;
  padding: 0;
}
.wiz-steps button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--line);
  background: var(--panel-2);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.72rem;
  color: var(--ink-soft);
}
.wiz-steps li.on button {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.wiz-steps li.done button {
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  color: var(--brand-primary);
}
.wiz-steps .n {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.wiz-layout {
  display: grid;
  grid-template-columns: 1fr minmax(220px, 260px);
  gap: 1rem;
  align-items: start;
}
.wiz-layout:has(.wiz-preview--detail) {
  grid-template-columns: minmax(240px, 0.85fr) minmax(300px, 360px);
}
@media (max-width: 720px) {
  .wiz-layout,
  .wiz-layout:has(.wiz-preview--detail) {
    grid-template-columns: 1fr;
  }
}
.wiz-pane h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
}
.loc-row {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 0.8fr 0.7fr auto;
  gap: 0.35rem;
  align-items: center;
}
@media (max-width: 720px) {
  .loc-row {
    grid-template-columns: 1fr 1fr;
  }
}
.hint-block {
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin: 0 0 0.75rem;
}
.type-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.4rem;
}
@media (max-width: 900px) {
  .type-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.type-labels-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
}
@media (max-width: 1100px) {
  .type-labels-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .type-labels-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.type-label-card {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.55rem 0.55rem 0.6rem;
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--type-accent, var(--brand-primary)) 7%, var(--panel)) 0%, var(--panel) 48%);
  display: grid;
  gap: 0.4rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  min-width: 0;
  font-size: 0.78rem;
}
.type-label-card:hover {
  border-color: color-mix(in srgb, var(--type-accent, var(--brand-primary)) 35%, var(--line));
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}
.type-label-card[data-type='informativo'] { --type-accent: #0f766e; }
.type-label-card[data-type='canjeable'] { --type-accent: #d97706; }
.type-label-card[data-type='premio'] { --type-accent: #7c3aed; }
.type-label-card[data-type='geo'] { --type-accent: #2563eb; }
.type-label-card[data-type='partner'] { --type-accent: #db2777; }
.type-label-card .lbl {
  font-size: 0.7rem;
  gap: 0.2rem;
}
.type-label-card .input {
  font-size: 0.75rem;
  padding: 0.3rem 0.45rem;
}
.type-label-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.type-label-icon {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 0.5rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--type-accent, var(--brand-primary));
  background: color-mix(in srgb, var(--type-accent, var(--brand-primary)) 14%, #fff);
  border: 1px solid color-mix(in srgb, var(--type-accent, var(--brand-primary)) 28%, var(--line));
}
.type-label-titles {
  min-width: 0;
  display: grid;
  gap: 0.05rem;
}
.type-id {
  margin: 0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--type-accent, var(--ink-soft));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.type-kind-tag {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.type-label-desc {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
  padding: 0.4rem 0.45rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--type-accent, var(--brand-primary)) 8%, var(--panel-2, #f8fafc));
  border: 1px solid color-mix(in srgb, var(--type-accent, var(--brand-primary)) 16%, var(--line));
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.type-hint-input {
  min-height: 2.6rem;
  line-height: 1.3;
  resize: vertical;
}
.type-example {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.3;
  color: var(--ink-soft);
  font-style: italic;
}
.type-card {
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  padding: 0.45rem 0.5rem;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  --type-accent: var(--brand-primary);
  min-width: 0;
}
.type-card[data-type='informativo'] { --type-accent: #0f766e; }
.type-card[data-type='canjeable'] { --type-accent: #d97706; }
.type-card[data-type='premio'] { --type-accent: #7c3aed; }
.type-card[data-type='geo'] { --type-accent: #2563eb; }
.type-card[data-type='partner'] { --type-accent: #db2777; }
.type-card-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.45rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--type-accent);
  background: color-mix(in srgb, var(--type-accent) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--type-accent) 24%, var(--line));
}
.type-card-icon svg {
  width: 14px;
  height: 14px;
}
.type-card-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  width: 100%;
}
.type-card strong {
  font-size: 0.72rem;
  color: var(--ink);
  line-height: 1.2;
}
.type-card span {
  font-size: 0.65rem;
  line-height: 1.25;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.type-card-example {
  font-size: 0.62rem;
  font-style: italic;
  color: var(--ink-faint, #94a3b8);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.type-card.on {
  border-color: var(--type-accent);
  background: color-mix(in srgb, var(--type-accent) 8%, var(--panel));
  box-shadow: 0 0 0 1px var(--type-accent);
}
.wiz-layout--types {
  grid-template-columns: 1fr;
}
.wiz-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
}
.wiz-preview {
  position: sticky;
  top: 0;
  background: var(--panel-2);
  border: 1px dashed var(--line-2);
  border-radius: 0.85rem;
  padding: 0.75rem;
}
.wiz-preview--detail {
  border-style: solid;
  background: #e8eef5;
  padding: 0.85rem;
}
.wiz-phone {
  display: flex;
  justify-content: center;
}
.wiz-phone-frame {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border: 1px solid #dbe3ec;
  border-radius: 1.35rem;
  overflow: hidden;
  box-shadow:
    0 0 0 8px #0f172a,
    0 18px 40px rgba(15, 23, 42, 0.22);
}
.wiz-phone-nav {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 4px;
  padding: 0.55rem 0.45rem;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}
.wiz-phone-nav strong {
  text-align: center;
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wiz-phone-nav-ico {
  display: grid;
  place-items: center;
  color: #0f172a;
  font-size: 1.1rem;
  line-height: 1;
}
.wiz-phone-hero {
  position: relative;
  height: 150px;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.wiz-phone-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.wiz-phone-hero-fallback {
  font-size: 2.5rem;
  font-weight: 800;
  opacity: 0.9;
}
.wiz-phone-dest {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  font-style: normal;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
}
.wiz-phone-body {
  padding: 0.85rem 0.9rem 1.1rem;
  display: grid;
  gap: 0.85rem;
  max-height: min(52vh, 420px);
  overflow: auto;
  background: #fff;
}
.wiz-phone-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 15px;
  display: grid;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.wiz-phone-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.wiz-phone-brand {
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}
.wiz-phone-cat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}
.wiz-phone-badge {
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 700;
  color: #0f766e;
  background: color-mix(in srgb, #0f766e 10%, #fff);
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  white-space: nowrap;
}
.wiz-phone-main {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.wiz-phone-muro {
  margin: 0;
  font-size: 0.72rem;
  color: #64748b;
}
.wiz-phone-line {
  margin: 0;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.35;
}
.wiz-phone-sec h4 {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: #0f172a;
}
.wiz-phone-sec p {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.4;
  white-space: pre-wrap;
}
.wiz-phone-locs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.wiz-phone-locs li {
  font-size: 0.8rem;
  color: #475569;
  padding: 0.35rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #f8fafc;
}
.wiz-phone-actions {
  display: grid;
  gap: 0.4rem;
}
.wiz-phone-cta {
  border: 0;
  border-radius: 0.65rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  cursor: default;
  opacity: 0.92;
}
.wiz-phone-cta.ghost {
  background: #f1f5f9;
  color: #0f172a;
}
.wiz-phone-link {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--brand-primary, #0f766e);
  text-decoration: underline;
  padding: 0.25rem;
}
.preview-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  margin: 0 0 0.5rem;
}
.preview-muro-lbl {
  margin: 0 0 2px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}
.u-card {
  display: flex;
  gap: 0.65rem;
  background: var(--panel);
  border-radius: 0.75rem;
  padding: 0.5rem;
  border: 1px solid var(--line);
}
.u-thumb {
  width: 72px;
  min-width: 72px;
  height: 72px;
  border-radius: 0.65rem;
  overflow: hidden;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-faint);
  font-size: 0.7rem;
}
.u-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.u-main {
  min-width: 0;
}
.u-main strong {
  font-size: 0.85rem;
}
.summary {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  background: var(--panel-2);
  border-radius: 0.65rem;
  font-size: 0.85rem;
}
.summary li {
  margin: 0.25rem 0;
}
.audience {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.75rem;
}
.audience-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.audience-modes button {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
}
.audience-modes button.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.aud-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.check {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
.hint {
  font-size: 0.75rem;
  color: var(--ink-soft);
  margin: 0;
}
.user-results {
  list-style: none;
  margin: 0.35rem 0;
  padding: 0;
}
.user-results button {
  border: none;
  background: var(--panel-2);
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.8rem;
  margin-top: 0.2rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.35rem;
}
.chip {
  background: var(--ok-bg);
  color: var(--brand-primary);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}
.chip button {
  border: none;
  background: transparent;
  color: var(--brand-primary);
}
.muted {
  color: var(--ink-faint);
}
.partner-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.partner-toolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  align-items: center;
  margin: 0.75rem 0 0.25rem;
  width: 100%;
  min-width: 0;
}
.partner-toolbar .input,
.partner-toolbar .btn-ghost {
  font-size: 0.72rem;
  padding: 0.28rem 0.45rem;
  height: 1.85rem;
  line-height: 1.2;
  border-radius: 0.4rem;
}
.partner-search {
  flex: 1 1 auto;
  min-width: 0;
}
.partner-toolbar select.input {
  width: auto;
  min-width: 0;
  flex: 0 1 auto;
  max-width: 7.5rem;
}
.partner-toolbar-meta {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.partner-row {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  padding: 0.55rem 0.65rem;
}
.partner-row-top {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}
.partner-status {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  line-height: 1.2;
}
.partner-status[data-on='1'] {
  color: #0f766e;
  background: color-mix(in srgb, #0f766e 12%, var(--panel));
  border: 1px solid color-mix(in srgb, #0f766e 28%, var(--line));
}
.partner-status[data-on='0'] {
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}
.partner-url {
  display: inline-block;
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: var(--brand-primary);
  text-decoration: none;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.partner-url:hover {
  text-decoration: underline;
}
.partner-thumb {
  width: 56px;
  min-width: 56px;
  height: 56px;
  border-radius: 0.65rem;
  overflow: hidden;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-faint);
  font-size: 1rem;
  font-weight: 750;
}
.partner-thumb img,
.partner-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.partner-preview {
  width: 72px;
  min-width: 72px;
  height: 72px;
  border-radius: 0.65rem;
  overflow: hidden;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-faint);
  font-size: 0.7rem;
}
.partner-preview--lg {
  width: 88px;
  min-width: 88px;
  height: 88px;
}
.partner-modal {
  width: min(520px, 100%);
}
.partner-modal-body {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  padding: 0.15rem 0 0.35rem;
}
.partner-modal-fields {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.55rem;
}
@media (max-width: 560px) {
  .partner-modal-body {
    flex-direction: column;
    align-items: stretch;
  }
  .partner-toolbar {
    flex-wrap: wrap;
  }
}
</style>
