import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applySelfServiceLegajoPatch, SELF_SERVICE_KEYS } from '../lib/legajoSelfService.js'

describe('legajoSelfService', () => {
  it('permite solo claves de autoservicio', () => {
    assert.ok(SELF_SERVICE_KEYS.has('telefono'))
    assert.ok(SELF_SERVICE_KEYS.has('domicilios'))
    assert.equal(SELF_SERVICE_KEYS.has('dni'), false)
    assert.equal(SELF_SERVICE_KEYS.has('cuil'), false)
    assert.equal(SELF_SERVICE_KEYS.has('datosBancarios'), false)
    assert.equal(SELF_SERVICE_KEYS.has('numeroLegajo'), false)
  })

  it('no pisa DNI/banco/contratos aunque vengan en el body', () => {
    const doc = {
      telefono: '1100000000',
      genero: 'F',
      dni: '30111222',
      cuil: '27-30111222-3',
      numeroLegajo: '100',
      estadoLaboral: 'activo',
      datosBancarios: [{ banco: 'Galicia', cbu: '0070123456789012345678' }],
      contratos: [{ tipo: 'rel_dep', numero: '1' }],
      fichaMedica: {
        grupoSanguineo: 'A+',
        alergias: '',
        observaciones: 'Confidencial RRHH',
        contactoEmergenciaNombre: 'Ana',
        contactoEmergenciaTel: '111',
      },
      carrera: {
        capacitaciones: [{ nombre: 'Inducción' }],
        skills: [{ nombre: 'Excel', nivel: 'basico' }],
      },
      domicilios: [],
      familiares: [],
    }

    applySelfServiceLegajoPatch(doc, {
      telefono: '1199999999',
      genero: 'M',
      dni: '99999999',
      cuil: 'hack',
      numeroLegajo: 'HACK',
      estadoLaboral: 'baja',
      datosBancarios: [{ banco: 'Otro', cbu: '0000' }],
      contratos: [],
      fichaMedica: {
        grupoSanguineo: 'O+',
        contactoEmergenciaNombre: 'Luis',
        contactoEmergenciaTel: '222',
        observaciones: 'intento borrar',
      },
      carrera: {
        capacitaciones: [{ nombre: 'Fake' }],
        skills: [{ nombre: 'Python', nivel: 'avanzado' }],
      },
    })

    assert.equal(doc.telefono, '1199999999')
    assert.equal(doc.genero, 'M')
    assert.equal(doc.dni, '30111222')
    assert.equal(doc.cuil, '27-30111222-3')
    assert.equal(doc.numeroLegajo, '100')
    assert.equal(doc.estadoLaboral, 'activo')
    assert.equal(doc.datosBancarios[0].banco, 'Galicia')
    assert.equal(doc.contratos[0].tipo, 'rel_dep')
    assert.equal(doc.fichaMedica.observaciones, 'Confidencial RRHH')
    assert.equal(doc.fichaMedica.contactoEmergenciaNombre, 'Luis')
    assert.equal(doc.fichaMedica.grupoSanguineo, 'O+')
    assert.equal(doc.carrera.capacitaciones[0].nombre, 'Inducción')
    assert.equal(doc.carrera.skills[0].nombre, 'Python')
  })
})
