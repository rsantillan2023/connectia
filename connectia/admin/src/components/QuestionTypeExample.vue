<template>
  <div class="qte" :class="`qte-${tipo}`" aria-hidden="true">
    <!-- Texto corto -->
    <template v-if="tipo === 'text'">
      <div class="qte-field">¿Cuál es tu área?</div>
    </template>

    <!-- Texto largo -->
    <template v-else-if="tipo === 'textarea'">
      <div class="qte-area">
        Contame qué mejorarías…
        <span class="qte-caret" />
      </div>
    </template>

    <!-- Número -->
    <template v-else-if="tipo === 'number'">
      <div class="qte-field qte-num">
        <span>3</span>
        <span class="qte-spin">▴▾</span>
      </div>
    </template>

    <!-- Sí / No -->
    <template v-else-if="tipo === 'yesno'">
      <div class="qte-row">
        <span class="qte-chip on">Sí</span>
        <span class="qte-chip">No</span>
      </div>
    </template>

    <!-- Opción única -->
    <template v-else-if="tipo === 'single'">
      <div class="qte-opts">
        <span class="qte-opt"><i class="qte-radio on" /> Bueno</span>
        <span class="qte-opt"><i class="qte-radio" /> Regular</span>
      </div>
    </template>

    <!-- Opción múltiple -->
    <template v-else-if="tipo === 'multiple'">
      <div class="qte-opts">
        <span class="qte-opt"><i class="qte-check on" /> Salud</span>
        <span class="qte-opt"><i class="qte-check" /> Capacit.</span>
      </div>
    </template>

    <!-- Rating -->
    <template v-else-if="tipo === 'rating'">
      <div class="qte-stars">
        <span v-for="n in 5" :key="n" :class="{ on: n <= 4 }">★</span>
      </div>
    </template>

    <!-- Fecha -->
    <template v-else-if="tipo === 'date'">
      <div class="qte-field qte-with-ico">
        <span>12/08/2026</span>
        <i class="fas fa-calendar-alt" />
      </div>
    </template>

    <!-- Hora -->
    <template v-else-if="tipo === 'time'">
      <div class="qte-field qte-with-ico">
        <span>14:30</span>
        <i class="fas fa-clock" />
      </div>
    </template>

    <!-- Fecha y hora -->
    <template v-else-if="tipo === 'datetime'">
      <div class="qte-field qte-with-ico qte-sm">
        <span>12/08 · 14:30</span>
        <i class="fas fa-calendar-check" />
      </div>
    </template>

    <!-- Email -->
    <template v-else-if="tipo === 'email'">
      <div class="qte-field qte-with-ico qte-sm">
        <span>ana@empresa.com</span>
        <i class="fas fa-envelope" />
      </div>
    </template>

    <!-- Teléfono -->
    <template v-else-if="tipo === 'phone'">
      <div class="qte-field qte-with-ico">
        <span>+54 11 …</span>
        <i class="fas fa-phone" />
      </div>
    </template>

    <!-- Geopoint -->
    <template v-else-if="tipo === 'geopoint'">
      <div class="qte-geo">
        <i class="fas fa-map-marker-alt" />
        <span>Usar mi ubicación</span>
      </div>
    </template>

    <template v-else>
      <div class="qte-field">…</div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  tipo: { type: String, required: true },
})
</script>

<style scoped>
.qte {
  width: 100%;
  pointer-events: none;
  user-select: none;
}
.qte-field,
.qte-area,
.qte-geo {
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  background: var(--panel, #fff);
  color: var(--ink-soft, #64748b);
  font-size: 0.68rem;
  line-height: 1.2;
}
.qte-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 28px;
  padding: 5px 8px;
}
.qte-field.qte-sm {
  font-size: 0.62rem;
}
.qte-area {
  min-height: 40px;
  padding: 6px 8px;
  position: relative;
}
.qte-caret {
  display: inline-block;
  width: 1px;
  height: 0.85em;
  margin-left: 1px;
  background: var(--primary, #2563eb);
  vertical-align: text-bottom;
  animation: qte-blink 1s step-end infinite;
}
@keyframes qte-blink {
  50% { opacity: 0; }
}
.qte-num {
  max-width: 64px;
  font-weight: 700;
  color: var(--ink, #0f172a);
}
.qte-spin {
  font-size: 0.55rem;
  letter-spacing: -0.05em;
  opacity: 0.55;
}
.qte-with-ico i {
  font-size: 0.7rem;
  opacity: 0.55;
  flex-shrink: 0;
}
.qte-row {
  display: flex;
  gap: 6px;
}
.qte-chip {
  flex: 1;
  text-align: center;
  padding: 5px 6px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--panel, #fff);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--ink-soft, #64748b);
}
.qte-chip.on {
  border-color: color-mix(in srgb, var(--primary, #2563eb) 45%, var(--line, #e2e8f0));
  background: color-mix(in srgb, var(--primary, #2563eb) 12%, var(--panel, #fff));
  color: var(--primary, #2563eb);
}
.qte-opts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.qte-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.68rem;
  color: var(--ink, #0f172a);
  padding: 3px 4px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--line, #e2e8f0) 35%, transparent);
}
.qte-radio,
.qte-check {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border: 1.5px solid color-mix(in srgb, var(--ink-soft, #64748b) 70%, transparent);
  display: inline-block;
  position: relative;
  box-sizing: border-box;
}
.qte-radio {
  border-radius: 50%;
}
.qte-check {
  border-radius: 3px;
}
.qte-radio.on {
  border-color: var(--primary, #2563eb);
}
.qte-radio.on::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: var(--primary, #2563eb);
}
.qte-check.on {
  border-color: var(--primary, #2563eb);
  background: var(--primary, #2563eb);
}
.qte-check.on::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 3px;
  height: 6px;
  border: solid #fff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}
.qte-stars {
  display: flex;
  gap: 2px;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--line, #e2e8f0) 20%, #cbd5e1);
}
.qte-stars .on {
  color: #f59e0b;
}
.qte-geo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 5px 8px;
  font-weight: 700;
  color: var(--primary, #2563eb);
  border-style: dashed;
}
.qte-geo i {
  font-size: 0.75rem;
}
</style>
