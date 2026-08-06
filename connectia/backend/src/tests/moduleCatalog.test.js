import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CAPS,
  MODULE_PACKS,
  clampCapabilitiesToLicense,
  isUserMenuItemAllowed,
  mergeCapabilitiesPreservingExtras,
  resolveLicensedCapabilities,
  sanitizeModuleIds,
} from '../constants/moduleCatalog.js'

describe('moduleCatalog (ola 35)', () => {
  it('pack todo = DEFAULT_CAPS al crear comunidad', () => {
    assert.deepEqual(DEFAULT_CAPS, MODULE_PACKS.todo)
    assert.ok(DEFAULT_CAPS.includes('muro'))
    assert.ok(DEFAULT_CAPS.includes('beneficios'))
    assert.ok(DEFAULT_CAPS.includes('menu.dynamic'))
  })

  it('resolveLicensedCapabilities: basico / todo / personalizado', () => {
    assert.deepEqual(resolveLicensedCapabilities({ pack: 'basico' }).capabilities, MODULE_PACKS.basico)
    assert.deepEqual(resolveLicensedCapabilities({ pack: 'todo' }).capabilities, MODULE_PACKS.todo)
    const custom = resolveLicensedCapabilities({
      pack: 'personalizado',
      capabilities: ['muro', 'chat', 'fake'],
    })
    assert.equal(custom.pack, 'personalizado')
    assert.deepEqual(custom.capabilities, ['muro', 'chat'])
  })

  it('resolveLicensedCapabilities: sin pack → todo por defecto', () => {
    const r = resolveLicensedCapabilities({})
    assert.equal(r.pack, 'todo')
    assert.deepEqual(r.capabilities, MODULE_PACKS.todo)
  })

  it('resolveLicensedCapabilities: sin pack + caps → personalizado', () => {
    const r = resolveLicensedCapabilities({ capabilities: ['docs', 'hub'] })
    assert.equal(r.pack, 'personalizado')
    assert.deepEqual(r.capabilities, ['docs', 'hub'])
  })

  it('isUserMenuItemAllowed oculta módulos inactivos del menú U', () => {
    const caps = new Set(['muro', 'chat'])
    assert.equal(isUserMenuItemAllowed({ key: 'muro', route: '/muro' }, caps), true)
    assert.equal(isUserMenuItemAllowed({ key: 'beneficios', route: '/beneficios' }, caps), false)
    assert.equal(isUserMenuItemAllowed({ key: 'ayuda', route: '/ayuda' }, caps), true)
    assert.equal(
      isUserMenuItemAllowed({ key: 'beneficios.earn', route: '/beneficios?tab=earn' }, caps),
      false,
    )
  })

  it('sanitizeModuleIds descarta desconocidos y duplicados', () => {
    assert.deepEqual(sanitizeModuleIds(['muro', 'muro', 'nope', 'chat']), ['muro', 'chat'])
  })

  it('clampCapabilitiesToLicense: vacío = sin candado', () => {
    assert.deepEqual(clampCapabilitiesToLicense(['muro', 'chat', 'extra'], []), [
      'muro',
      'chat',
      'extra',
    ])
  })

  it('clampCapabilitiesToLicense: recorta catálogo y preserva extras', () => {
    assert.deepEqual(
      clampCapabilitiesToLicense(['muro', 'chat', 'beneficios', 'directorio', 'talento'], [
        'muro',
        'chat',
      ]),
      ['muro', 'chat', 'directorio', 'talento'],
    )
  })

  it('mergeCapabilitiesPreservingExtras: pack PLATFORM no pierde extras', () => {
    assert.deepEqual(
      mergeCapabilitiesPreservingExtras(['muro', 'chat'], ['muro', 'chat', 'beneficios', 'directorio']),
      ['muro', 'chat', 'directorio'],
    )
  })

  it('mergeCapabilitiesPreservingExtras: body con extras gana', () => {
    assert.deepEqual(
      mergeCapabilitiesPreservingExtras(['muro', 'cultura'], ['muro', 'directorio']),
      ['muro', 'cultura'],
    )
  })
})
