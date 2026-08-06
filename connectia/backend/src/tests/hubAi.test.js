import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { heuristicPlan, HUB_AI_GUIDE, heuristicSuggestDestination } from '../services/hubAi.js'

describe('hubAi', () => {
  const snap = {
    categories: [
      { nombre: 'TI', orden: 10, activo: true, iconSize: 'md' },
      { nombre: 'RRHH', orden: 20, activo: true, iconSize: 'md' },
    ],
    links: [
      {
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        titulo: 'Portal',
        category: 'RRHH',
        icon: 'grid',
        color: '',
        order: 10,
        featured: false,
        clickCount: 5,
      },
      {
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        titulo: 'Nómina',
        category: 'RRHH',
        icon: 'file',
        color: '',
        order: 20,
        featured: false,
        clickCount: 9,
      },
      {
        id: 'cccccccccccccccccccccccc',
        titulo: 'VPN',
        category: 'TI',
        icon: 'lock',
        color: '',
        order: 10,
        featured: true,
        clickCount: 2,
      },
    ],
  }

  it('heuristicPlan oculta un grupo solo del muro', () => {
    const plan = heuristicPlan('No muestres el grupo RRHH en el muro', snap)
    const op = plan.ops.find((o) => o.op === 'updateCategory' && o.nombre === 'RRHH')
    assert.ok(op)
    assert.equal(op.patch.showOnMuro, false)
  })

  it('expone guía con campos clave', () => {
    assert.ok(HUB_AI_GUIDE.fields.some((f) => f.id === 'featured'))
    assert.ok(HUB_AI_GUIDE.fields.some((f) => f.id === 'showOnMuro'))
    assert.ok(HUB_AI_GUIDE.examples.length >= 3)
  })

  it('heuristicPlan marca rápidos por clics', () => {
    const plan = heuristicPlan('Dejá los rápidos con más clics', snap)
    const feat = plan.ops.find((o) => o.op === 'setFeatured' && o.category === 'RRHH')
    assert.ok(feat)
    assert.equal(feat.linkIds[0], 'bbbbbbbbbbbbbbbbbbbbbbbb')
  })

  it('heuristicPlan crea grupo y enlaces', () => {
    const plan = heuristicPlan(
      'Creá el grupo Beneficios con Portal, Nómina y Vacaciones',
      snap,
      '',
      'create',
    )
    assert.ok(plan.ops.some((o) => o.op === 'createCategory' && o.nombre === 'Beneficios'))
    const links = plan.ops.filter((o) => o.op === 'createLink')
    assert.equal(links.length, 3)
    assert.equal(links[0].link.category, 'Beneficios')
    assert.equal(links[0].link.titulo, 'Portal')
  })

  it('heuristicPlan crea enlace en grupo existente con URL', () => {
    const plan = heuristicPlan(
      'Agregá en RRHH el enlace Vacaciones apuntando a https://rrhh.empresa.com/vacaciones',
      snap,
      '',
      'create',
    )
    assert.ok(!plan.ops.some((o) => o.op === 'createCategory'))
    const link = plan.ops.find((o) => o.op === 'createLink')
    assert.ok(link)
    assert.equal(link.link.category, 'RRHH')
    assert.equal(link.link.titulo, 'Vacaciones')
    assert.equal(link.link.target, 'https://rrhh.empresa.com/vacaciones')
  })

  it('expone ops de alta en la guía', () => {
    assert.ok(HUB_AI_GUIDE.ops.some((o) => o.includes('createCategory')))
    assert.ok(HUB_AI_GUIDE.ops.some((o) => o.includes('createLink')))
    assert.ok(HUB_AI_GUIDE.createExamples?.length >= 2)
  })

  it('heuristicPlan renombra enlace existente (también con intent create)', () => {
    const plan = heuristicPlan('Renombrá el enlace Portal a Intranet RRHH', snap, '', 'create')
    const op = plan.ops.find((o) => o.op === 'updateLink' && o.id === 'aaaaaaaaaaaaaaaaaaaaaaaa')
    assert.ok(op)
    assert.equal(op.patch.titulo, 'Intranet RRHH')
  })

  it('heuristicSuggestDestination completa URL', () => {
    const r = heuristicSuggestDestination(
      'Portal VPN https://vpn.empresa.com/login',
      { kind: 'url' },
      {},
    )
    assert.equal(r.patch.target, 'https://vpn.empresa.com/login')
  })

  it('heuristicSuggestDestination completa mailto', () => {
    const r = heuristicSuggestDestination(
      'correo a rrhh@empresa.com asunto: Consulta',
      { kind: 'mailto' },
      {},
    )
    assert.equal(r.patch.target, 'rrhh@empresa.com')
    assert.match(r.patch.mailSubject || '', /Consulta/i)
  })

  it('heuristicSuggestDestination elige encuesta del catálogo', () => {
    const r = heuristicSuggestDestination(
      'usá la encuesta Clima laboral',
      { kind: 'survey' },
      { surveys: [{ id: 's1', titulo: 'Clima laboral' }, { id: 's2', titulo: 'Onboarding' }] },
    )
    assert.equal(r.patch.surveyId, 's1')
  })

  it('heuristicPlan crea acceso a Beneficios con puntos y usuario (no tel)', () => {
    const plan = heuristicPlan(
      'quiero un nuevo enlace en el grupo Mis enlaces que me permita llamar a Beneficios pero en el texto del enlace se vean cuantos puntos tengo y entre con mi user a Beneficios',
      snap,
      '',
      'create',
    )
    const link = plan.ops.find((o) => o.op === 'createLink')
    assert.ok(link)
    assert.equal(link.link.kind, 'route')
    assert.equal(link.link.target, '/beneficios')
    assert.equal(link.link.category, 'Mis enlaces')
    assert.match(link.link.subtitulo || '', /puntos/)
    assert.equal(link.link.params?.query?.usuario, '{{usuario}}')
    assert.ok(!plan.ops.some((o) => o.op === 'createLink' && o.link?.kind === 'tel'))
  })
})
