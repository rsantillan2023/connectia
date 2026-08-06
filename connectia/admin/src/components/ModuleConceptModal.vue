<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mcm-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc.prevent="open = false"
      @click.self="open = false"
    >
      <div class="mcm-modal">
        <header class="mcm-head">
          <div>
            <p class="mcm-kicker">Guía visual</p>
            <h2 :id="titleId">{{ title }}</h2>
            <p class="mcm-sub">{{ subtitle }}</p>
          </div>
          <button type="button" class="mcm-close" aria-label="Cerrar" @click="open = false">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <div class="mcm-body">
          <!-- Supervisión comercial -->
          <section v-if="kind === 'supervision'" class="mcm-diagram" aria-label="Guía de supervisión comercial">
            <div class="mcm-scene">
              <p class="mcm-scene-label">Empezá por acá</p>
              <h3>La historia (en una frase)</h3>
              <p>
                La marca <em>AquaPura</em> manda promotores a farmacias a controlar
                si el producto está bien exhibido. Este módulo sirve para
                <strong>definir locales, quién va, qué se revisa</strong> y después
                ver el resultado en la app (con checks y fotos).
              </p>
              <div class="mcm-cast">
                <span><strong>Lucas</strong> · promotor (hace la visita)</span>
                <span><strong>Marta</strong> · supervisora (pide y revisa)</span>
                <span><strong>Farmacia Centro</strong> · el local</span>
              </div>
            </div>

            <div class="mcm-lane">
              <h3>Diccionario rápido (qué significa cada pieza)</h3>
              <dl class="mcm-glossary">
                <div>
                  <dt>Cadena</dt>
                  <dd>La red o zona que agrupa locales.<br /><em>Ej.: Farmacias Salud</em></dd>
                </div>
                <div>
                  <dt>Sala</dt>
                  <dd>El local físico donde se trabaja.<br /><em>Ej.: Farmacia Centro</em></dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>La cuenta/marca que se atiende en ese local.<br /><em>Ej.: AquaPura</em></dd>
                </div>
                <div>
                  <dt>Asignación</dt>
                  <dd>
                    Une cliente + sala + personas.
                    <strong>No es una visita agendada</strong>: solo dice
                    “Lucas trabaja AquaPura en Farmacia Centro”.
                  </dd>
                </div>
                <div>
                  <dt>Plantilla</dt>
                  <dd>El formulario estándar de la visita.<br /><em>Ej.: producto · precio · foto</em></dd>
                </div>
                <div>
                  <dt>Tarea</dt>
                  <dd>Una visita concreta en la app (con fecha límite).<br /><em>Ej.: “Control hoy en Farmacia Centro”</em></dd>
                </div>
              </dl>
            </div>

            <div class="mcm-lane">
              <h3>Cómo se arma (3 capas)</h3>
              <ol class="mcm-layers">
                <li>
                  <span class="mcm-layer-n">1</span>
                  <div>
                    <strong>Lugar</strong>
                    <p>Cadena <em>Farmacias Salud</em> → sala <em>Farmacia Centro</em>.</p>
                  </div>
                </li>
                <li>
                  <span class="mcm-layer-n">2</span>
                  <div>
                    <strong>Gente</strong>
                    <p>
                      Cliente <em>AquaPura</em> asignado a esa sala, con
                      <em>Lucas</em> (operario) y <em>Marta</em> (supervisora).
                    </p>
                  </div>
                </li>
                <li>
                  <span class="mcm-layer-n">3</span>
                  <div>
                    <strong>Formulario</strong>
                    <p>
                      Plantilla <em>Control de exhibición</em>: ¿hay producto?
                      ¿precio visible? foto del exhibidor.
                    </p>
                  </div>
                </li>
              </ol>
              <p class="mcm-note">
                Sin estas 3 capas, en la app no hay “dónde ir”, “quién va” ni “qué chequear”.
              </p>
              <button type="button" class="mcm-graph-cta" @click="openGraph">
                <i class="fas fa-sitemap" aria-hidden="true"></i>
                Ver grafo de la estructura
                <span>Cadena → Subcadena → Sala → Cliente</span>
              </button>
            </div>

            <div class="mcm-lane mcm-lane--story">
              <h3>De punta a punta (qué se logra)</h3>
              <p class="mcm-goal">
                <strong>Resultado de negocio:</strong>
                Lucas recibe en el celular “Control AquaPura · Farmacia Centro”,
                completa checks + foto; Marta abre el resultado y sabe si la visita
                quedó bien — sin WhatsApp ni Excel.
              </p>
              <ol class="mcm-story-steps">
                <li>
                  <span class="mcm-step-who">Admin</span>
                  Carga cadena, sala, cliente AquaPura y asigna a Lucas/Marta.
                </li>
                <li>
                  <span class="mcm-step-who">Admin</span>
                  Crea la plantilla “Control de exhibición”.
                </li>
                <li>
                  <span class="mcm-step-who">Marta</span>
                  En la app crea una <strong>tarea</strong> (visita) con esa plantilla
                  para Lucas en Farmacia Centro.
                </li>
                <li>
                  <span class="mcm-step-who">Lucas</span>
                  Completa checks y sube la foto en el celular.
                </li>
                <li>
                  <span class="mcm-step-who">Marta</span>
                  Revisa el resultado: cumple / no cumple, con evidencia.
                </li>
              </ol>
              <p class="mcm-outcome">
                Recordá: la <strong>asignación</strong> es “quién trabaja dónde”;
                la <strong>tarea</strong> es “esta visita puntual”. No hay visitas
                recurrentes automáticas en este módulo.
              </p>
            </div>
          </section>

          <!-- Equipos -->
          <section v-else class="mcm-diagram" aria-label="Guía de equipos supervisor">
            <div class="mcm-scene">
              <p class="mcm-scene-label">Empezá por acá</p>
              <h3>La historia (en una frase)</h3>
              <p>
                Marta es supervisora de campo. Necesita ver
                <strong>solo a sus promotores</strong> (Lucas y Ana) y
                publicarles avisos sin molestar al resto de la empresa.
              </p>
              <div class="mcm-cast">
                <span><strong>Marta</strong> · supervisora</span>
                <span><strong>Lucas y Ana</strong> · su equipo</span>
                <span><strong>Mi equipo</strong> · hub en la app</span>
              </div>
            </div>

            <div class="mcm-lane">
              <h3>Diccionario rápido</h3>
              <dl class="mcm-glossary">
                <div>
                  <dt>Supervisor</dt>
                  <dd>Dueño del equipo en la app. Ve y publica solo a su alcance.</dd>
                </div>
                <div>
                  <dt>Equipo</dt>
                  <dd>Nombre + reglas de quién entra (el “alcance”).</dd>
                </div>
                <div>
                  <dt>Alcance</dt>
                  <dd>Áreas, grupos, clientes de Supervisión y/o personas a mano.</dd>
                </div>
                <div>
                  <dt>Miembros</dt>
                  <dd>La lista final que calcula el sistema al guardar.</dd>
                </div>
              </dl>
            </div>

            <div class="mcm-lane">
              <h3>Cómo se arma</h3>
              <ol class="mcm-layers">
                <li>
                  <span class="mcm-layer-n">1</span>
                  <div>
                    <strong>Equipo</strong>
                    <p>Creás <em>Campo Zona Norte</em> con supervisora <em>Marta</em>.</p>
                  </div>
                </li>
                <li>
                  <span class="mcm-layer-n">2</span>
                  <div>
                    <strong>Alcance</strong>
                    <p>Marcás personas <em>Lucas</em> y <em>Ana</em> (o un área / clientes).</p>
                  </div>
                </li>
                <li>
                  <span class="mcm-layer-n">3</span>
                  <div>
                    <strong>App</strong>
                    <p>Marta entra a <em>Mi equipo</em>, ve solo a ellos y les publica.</p>
                  </div>
                </li>
              </ol>
            </div>

            <div class="mcm-lane mcm-lane--story">
              <h3>De punta a punta (qué se logra)</h3>
              <p class="mcm-goal">
                <strong>Resultado de negocio:</strong>
                Marta coordina solo a su gente. Un aviso “para mi equipo” llega a
                Lucas y Ana; el resto de la empresa no lo ve.
              </p>
              <ol class="mcm-story-steps">
                <li>
                  <span class="mcm-step-who">Admin</span>
                  Crea el equipo y elige a Marta como supervisora.
                </li>
                <li>
                  <span class="mcm-step-who">Admin</span>
                  Define el alcance (personas / área / clientes) y guarda.
                </li>
                <li>
                  <span class="mcm-step-who">Sistema</span>
                  Calcula la lista final de miembros.
                </li>
                <li>
                  <span class="mcm-step-who">Marta</span>
                  En «Mi equipo» ve solo a Lucas y Ana.
                </li>
                <li>
                  <span class="mcm-step-who">Marta</span>
                  Publica un aviso: solo ellos lo reciben.
                </li>
              </ol>
            </div>
          </section>
        </div>

        <footer class="mcm-foot">
          <button
            v-if="kind === 'supervision'"
            type="button"
            class="btn-ghost"
            @click="openGraph"
          >
            <i class="fas fa-sitemap" aria-hidden="true"></i>
            Ver grafo
          </button>
          <span class="mcm-foot-spacer" aria-hidden="true" />
          <button type="button" class="btn-ghost" @click="open = false">Cerrar</button>
          <button type="button" class="btn-primary" @click="open = false">Ya entendí</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  /** 'supervision' | 'equipos' */
  kind: { type: String, required: true },
})

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['open-graph'])
const titleId = computed(() => `mcm-title-${props.kind}`)

const title = computed(() =>
  props.kind === 'supervision'
    ? 'Supervisión comercial, explicada fácil'
    : 'Equipos (supervisor), explicado fácil',
)

const subtitle = computed(() =>
  props.kind === 'supervision'
    ? 'Historia → diccionario → 3 capas → resultado en la app.'
    : 'Historia → diccionario → alcance → lo que ve Marta en «Mi equipo».',
)

function openGraph() {
  open.value = false
  emit('open-graph')
}

watch(open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.mcm-foot .btn-primary,
.mcm-foot .btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  padding: 0.5rem 0.95rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.mcm-foot .btn-primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.mcm-foot .btn-ghost {
  background: var(--panel);
  border-color: var(--line-2, var(--line));
  color: var(--ink);
}

.mcm-root {
  position: fixed;
  inset: 0;
  z-index: 100050;
  background: color-mix(in srgb, #000 55%, transparent);
  display: grid;
  place-items: center;
  padding: 1rem;
}
.mcm-modal {
  width: min(980px, 96vw);
  max-height: min(92vh, 900px);
  display: flex;
  flex-direction: column;
  background: var(--panel, #1e1a2b);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.mcm-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--brand-soft, var(--panel)) 55%, var(--panel));
  flex-shrink: 0;
}
.mcm-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-ink, var(--brand));
}
.mcm-head h2 {
  margin: 0;
  font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.25;
}
.mcm-sub {
  margin: 0.3rem 0 0;
  font-size: 0.86rem;
  color: var(--ink-soft);
}
.mcm-close {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  flex-shrink: 0;
}
.mcm-close:hover {
  border-color: var(--brand-line);
  color: var(--brand-ink);
}
.mcm-body {
  overflow: auto;
  padding: 1rem 1.25rem 1.25rem;
  flex: 1 1 auto;
}
.mcm-diagram {
  display: grid;
  gap: 0.85rem;
}

.mcm-scene {
  background: color-mix(in srgb, var(--brand-soft) 55%, var(--panel));
  border: 1px solid var(--brand-line);
  border-radius: 14px;
  padding: 1rem 1.1rem;
}
.mcm-scene-label {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-ink, var(--brand));
}
.mcm-scene h3 {
  margin: 0 0 0.45rem;
  font-size: 1rem;
}
.mcm-scene > p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink);
}
.mcm-scene em {
  font-style: normal;
  font-weight: 700;
  color: var(--brand-ink, var(--ink));
}
.mcm-cast {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}
.mcm-cast span {
  font-size: 0.78rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
}
.mcm-cast strong {
  color: var(--ink);
}

.mcm-lane {
  background: var(--panel-2, var(--canvas));
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0.9rem 1rem;
}
.mcm-lane h3 {
  margin: 0 0 0.7rem;
  font-size: 0.92rem;
  color: var(--ink);
}

.mcm-glossary {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .mcm-glossary {
    grid-template-columns: 1fr 1fr;
  }
}
.mcm-glossary > div {
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
}
.mcm-glossary dt {
  margin: 0 0 0.2rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-ink, var(--ink));
}
.mcm-glossary dd {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--ink-soft);
}
.mcm-glossary em {
  font-style: normal;
  font-weight: 600;
  color: var(--ink);
}

.mcm-layers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
.mcm-layers li {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
}
.mcm-layer-n {
  flex-shrink: 0;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  background: var(--brand);
  color: #fff;
}
.mcm-layers strong {
  display: block;
  font-size: 0.86rem;
  margin-bottom: 0.15rem;
}
.mcm-layers p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.mcm-layers em {
  font-style: normal;
  font-weight: 700;
  color: var(--brand-ink, var(--ink));
}

.mcm-note {
  margin: 0.65rem 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.45;
}

.mcm-lane--story {
  background: color-mix(in srgb, var(--brand-soft) 40%, var(--panel-2, var(--canvas)));
  border-color: var(--brand-line);
}
.mcm-goal {
  margin: 0 0 0.75rem;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--panel) 85%, var(--brand-soft));
  border: 1px solid var(--brand-line);
  font-size: 0.86rem;
  color: var(--ink);
  line-height: 1.45;
}
.mcm-goal strong {
  color: var(--brand-ink, var(--ink));
}
.mcm-story-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.mcm-story-steps li {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  font-size: 0.86rem;
  line-height: 1.4;
  color: var(--ink);
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--panel) 70%, transparent);
}
.mcm-step-who {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: var(--brand);
  color: #fff;
  margin-top: 0.1rem;
}
.mcm-outcome {
  margin: 0.85rem 0 0;
  font-size: 0.84rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.mcm-outcome strong {
  color: var(--ink);
}
.mcm-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--line);
  background: var(--panel);
  flex-shrink: 0;
  align-items: center;
}
.mcm-foot-spacer {
  flex: 1;
}
.mcm-graph-cta {
  margin-top: 0.85rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--brand) 45%, var(--line));
  background: var(--brand-soft);
  color: var(--brand-ink, var(--brand));
  font: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}
.mcm-graph-cta i {
  margin-right: 0.35rem;
}
.mcm-graph-cta span {
  display: block;
  margin-left: 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.85;
}
.mcm-graph-cta:hover {
  border-style: solid;
  border-color: var(--brand);
}
</style>
