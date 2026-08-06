/**
 * Genera visitas (SupTarea) a partir de programas recurrentes vencidos.
 */
import {
  SupVisitaRecurrencia,
  SupTarea,
  SupTemplate,
  SupSala,
} from '../models/Supervision.js'
import { snapshotMediciones, defaultStatusOnCreate } from '../lib/supervisionTasks.js'
import {
  computeNextRunAt,
  computeFechaLimiteFromPlazo,
} from '../lib/supervisionRecurrencia.js'
import { notifyTaskAssigned } from './notifySupervision.js'
import { Tenant } from '../models/Tenant.js'

/**
 * Procesa reglas con nextRunAt <= now.
 * @returns {Promise<Array<{ id: string, ok: boolean, error?: string, tareaId?: string }>>}
 */
export async function processDueSupervisionRecurrencias(now = new Date()) {
  const due = await SupVisitaRecurrencia.find({
    activo: true,
    enabled: true,
    nextRunAt: { $lte: now },
  })
    .limit(50)
    .exec()

  const results = []
  for (const rule of due) {
    try {
      const sala = await SupSala.findOne({
        _id: rule.salaId,
        tenantId: rule.tenantId,
        activo: true,
      })
      if (!sala) {
        rule.nextRunAt = computeNextRunAt(rule, now)
        rule.lastRunAt = now
        await rule.save()
        results.push({ id: String(rule._id), ok: false, error: 'Sala inválida' })
        continue
      }

      let medicionesSnapshot = []
      let templateId = null
      if (rule.templateId) {
        const tpl = await SupTemplate.findOne({
          _id: rule.templateId,
          tenantId: rule.tenantId,
          activo: true,
        })
        if (tpl) {
          templateId = tpl._id
          medicionesSnapshot = snapshotMediciones(tpl.mediciones)
        }
      }

      const asignadoId = rule.asignadoId || null
      const status = defaultStatusOnCreate({ usuarioAsignadoId: asignadoId })
      const fechaLimite = computeFechaLimiteFromPlazo(rule.plazoHoras, now)
      const creadorId = rule.creadorId || rule.asignadoId
      if (!creadorId) {
        rule.nextRunAt = computeNextRunAt(rule, now)
        rule.lastRunAt = now
        await rule.save()
        results.push({ id: String(rule._id), ok: false, error: 'Sin creador/asignado' })
        continue
      }

      const tarea = await SupTarea.create({
        tenantId: rule.tenantId,
        titulo: rule.titulo,
        descripcion: rule.descripcion || '',
        tipo: templateId ? 'template' : 'recurrente',
        fechaLimite,
        prioridad: rule.prioridad || 'media',
        status,
        salaId: sala._id,
        clienteId: rule.clienteId || null,
        creadorId,
        asignadoId,
        templateId,
        medicionesSnapshot,
        respuestas: medicionesSnapshot.map((m) => ({
          key: m.key,
          completada: false,
          valor: '',
          observacion: '',
        })),
        requiereFoto: Boolean(rule.requiereFoto),
        fechaAsignacion: asignadoId ? now : null,
        recurrenciaId: rule._id,
      })

      if (asignadoId) {
        const tenant = await Tenant.findById(rule.tenantId)
        if (tenant) {
          await notifyTaskAssigned({ tenant, tarea, assigneeId: asignadoId })
        }
      }

      rule.lastRunAt = now
      rule.nextRunAt = computeNextRunAt(rule, now)
      await rule.save()
      results.push({ id: String(rule._id), ok: true, tareaId: String(tarea._id) })
    } catch (err) {
      results.push({ id: String(rule._id), ok: false, error: err?.message || String(err) })
      try {
        rule.nextRunAt = computeNextRunAt(rule, new Date(now.getTime() + 3600_000))
        await rule.save()
      } catch {
        /* ignore */
      }
    }
  }
  return results
}
