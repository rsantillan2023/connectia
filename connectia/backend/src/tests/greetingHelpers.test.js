import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  localParts,
  shiftYmd,
  mdFromDate,
  yearsBetween,
  normalizeHours,
  applyTemplate,
  findUnknownTemplateVars,
  userMatchesEvent,
  validateGreetingRuleInput,
  normalizeGreetingRuleInput,
  buildRunKey,
  eventYmdForRun,
  inferGreetingMedia,
  resolveGreetingPostMedia,
  mergeRuleWithTypeDefaults,
} from '../lib/greetingHelpers.js'

describe('greetingHelpers', () => {
  it('normalizeHours limpia y ordena', () => {
    assert.deepEqual(normalizeHours(['9:00', '09:00', '18:30', '25:00']), ['09:00', '18:30'])
  })

  it('applyTemplate reemplaza variables', () => {
    assert.equal(
      applyTemplate('Hola {{nombre}} {{apellido}} ({{anios}})', {
        nombre: 'Ana',
        apellido: 'Pérez',
        anios: '3',
      }),
      'Hola Ana Pérez (3)',
    )
  })

  it('findUnknownTemplateVars detecta inválidas', () => {
    assert.deepEqual(findUnknownTemplateVars('{{nombre}} {{foo}}'), ['foo'])
  })

  it('mdFromDate usa UTC', () => {
    assert.deepEqual(mdFromDate(new Date('1990-07-28T12:00:00.000Z')), { month: 7, day: 28 })
  })

  it('shiftYmd y eventYmdForRun con daysBefore', () => {
    const base = { year: 2026, month: 7, day: 28 }
    assert.deepEqual(shiftYmd(base, 1), { year: 2026, month: 7, day: 29 })
    assert.deepEqual(eventYmdForRun(base, 1), { year: 2026, month: 7, day: 29 })
  })

  it('yearsBetween cuenta aniversarios', () => {
    assert.equal(yearsBetween(new Date('2020-07-28T12:00:00.000Z'), { year: 2026, month: 7, day: 28 }), 6)
    assert.equal(yearsBetween(new Date('2020-07-28T12:00:00.000Z'), { year: 2026, month: 7, day: 27 }), 5)
  })

  it('userMatchesEvent birthday', () => {
    const user = { fechaNacimiento: new Date('1990-07-28T12:00:00.000Z') }
    assert.equal(
      userMatchesEvent({
        eventType: 'birthday',
        eventYmd: { year: 2026, month: 7, day: 28 },
        user,
      }),
      true,
    )
    assert.equal(
      userMatchesEvent({
        eventType: 'birthday',
        eventYmd: { year: 2026, month: 7, day: 29 },
        user,
      }),
      false,
    )
  })

  it('userMatchesEvent work_anniversary exige >=1 año', () => {
    const user = { fechaIngreso: new Date('2026-07-28T12:00:00.000Z') }
    assert.equal(
      userMatchesEvent({
        eventType: 'work_anniversary',
        eventYmd: { year: 2026, month: 7, day: 28 },
        user,
      }),
      false,
    )
    user.fechaIngreso = new Date('2020-07-28T12:00:00.000Z')
    assert.equal(
      userMatchesEvent({
        eventType: 'work_anniversary',
        eventYmd: { year: 2026, month: 7, day: 28 },
        user,
      }),
      true,
    )
  })

  it('userMatchesEvent fixed_date', () => {
    assert.equal(
      userMatchesEvent({
        eventType: 'fixed_date',
        eventYmd: { year: 2026, month: 12, day: 24 },
        fixedDay: 24,
        fixedMonth: 12,
      }),
      true,
    )
  })

  it('validateGreetingRuleInput', () => {
    assert.equal(
      validateGreetingRuleInput({
        eventType: 'birthday',
        titulo: 'Hola {{nombre}}',
        hours: ['09:00'],
      }),
      null,
    )
    assert.match(
      validateGreetingRuleInput({
        eventType: 'birthday',
        titulo: 'Hola {{foo}}',
        hours: ['09:00'],
      }),
      /Variables/,
    )
  })

  it('normalizeGreetingRuleInput defaults', () => {
    const n = normalizeGreetingRuleInput({ eventType: 'birthday', titulo: 'X' })
    assert.deepEqual(n.hours, ['09:00'])
    assert.equal(n.activo, true)
  })

  it('buildRunKey estable', () => {
    assert.equal(
      buildRunKey({ ruleId: 'r1', eventType: 'birthday', dateKey: '2026-07-28', timeKey: '09:00', userId: 'u1' }),
      'r1:birthday:2026-07-28:09:00:u1',
    )
  })

  it('localParts no rompe', () => {
    const p = localParts(new Date('2026-07-28T12:00:00.000Z'), 'UTC')
    assert.equal(p.year, 2026)
    assert.equal(p.month, 7)
    assert.equal(p.day, 28)
  })

  it('inferGreetingMedia carrusel y video', () => {
    const c = inferGreetingMedia({
      mediaKind: 'carousel',
      imageUrls: ['/uploads/a.jpg', '/uploads/b.jpg'],
    })
    assert.equal(c.mediaKind, 'carousel')
    assert.equal(c.imageUrls.length, 2)
    const v = inferGreetingMedia({ mediaKind: 'youtube', imageUrl: 'https://youtu.be/abc1234' })
    assert.equal(v.mediaKind, 'youtube')
    assert.equal(v.layout, 'vertical')
  })

  it('resolveGreetingPostMedia: fixed / random / profile', () => {
    const fixed = resolveGreetingPostMedia({
      mediaPick: 'fixed',
      mediaKind: 'image',
      imageUrl: '/uploads/fixed.jpg',
    })
    assert.equal(fixed.imageUrl, '/uploads/fixed.jpg')

    const random = resolveGreetingPostMedia(
      {
        mediaPick: 'random',
        imageUrls: ['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg'],
      },
      null,
      { random: () => 0.5 },
    )
    assert.equal(random.imageUrl, '/uploads/b.jpg')
    assert.deepEqual(random.imageUrls, [])

    const profile = resolveGreetingPostMedia(
      {
        mediaPick: 'profile',
        imageUrls: ['/uploads/fallback.jpg'],
      },
      { avatarUrl: '/uploads/avatar.jpg' },
    )
    assert.equal(profile.imageUrl, '/uploads/avatar.jpg')

    const profileFallback = resolveGreetingPostMedia(
      { mediaPick: 'profile', imageUrl: '/uploads/fallback.jpg' },
      { avatarUrl: '' },
    )
    assert.equal(profileFallback.imageUrl, '/uploads/fallback.jpg')
  })

  it('validateGreetingRuleInput exige pool si random', () => {
    assert.match(
      validateGreetingRuleInput({
        eventType: 'birthday',
        titulo: 'Hola {{nombre}}',
        mediaPick: 'random',
        hours: ['09:00'],
      }) || '',
      /pool|imagen/i,
    )
    assert.equal(
      validateGreetingRuleInput({
        eventType: 'birthday',
        titulo: 'Hola {{nombre}}',
        mediaPick: 'random',
        imageUrls: ['/uploads/a.jpg', '/uploads/b.jpg'],
        hours: ['09:00'],
      }),
      null,
    )
  })

  it('userMatchesEvent daysAfter / customDate / manual', () => {
    const user = {
      fechaIngreso: new Date('2026-07-01T12:00:00.000Z'),
      customDates: { promocion: new Date('2024-07-28T12:00:00.000Z') },
    }
    assert.equal(
      userMatchesEvent({
        eventYmd: { year: 2026, month: 7, day: 31 },
        user,
        typeConfig: {
          key: 'onboarding30',
          dateSource: 'daysAfter',
          offsetDays: 30,
          offsetField: 'fechaIngreso',
        },
      }),
      true,
    )
    assert.equal(
      userMatchesEvent({
        eventYmd: { year: 2026, month: 7, day: 28 },
        user,
        typeConfig: {
          key: 'promo',
          dateSource: 'customDate',
          customDateKey: 'promocion',
          minYears: 0,
        },
      }),
      true,
    )
    assert.equal(
      userMatchesEvent({
        eventYmd: { year: 2026, month: 7, day: 28 },
        user,
        typeConfig: { key: 'm', dateSource: 'manual' },
        force: false,
      }),
      false,
    )
    assert.equal(
      userMatchesEvent({
        eventYmd: { year: 2026, month: 7, day: 28 },
        user,
        typeConfig: { key: 'm', dateSource: 'manual' },
        force: true,
      }),
      true,
    )
  })

  it('mergeRuleWithTypeDefaults hereda media y copy del tipo', () => {
    const merged = mergeRuleWithTypeDefaults(
      { titulo: '', cuerpo: '', imageUrl: '', mediaPick: 'fixed' },
      {
        key: 'birthday',
        dateSource: 'fechaNacimiento',
        defaultTitulo: '¡Feliz {{nombre}}!',
        defaultCuerpo: 'Saludos',
        imageUrl: '/uploads/cake.jpg',
        mediaPick: 'fixed',
        mediaKind: 'image',
      },
    )
    assert.equal(merged.titulo, '¡Feliz {{nombre}}!')
    assert.equal(merged.cuerpo, 'Saludos')
    assert.equal(merged.imageUrl, '/uploads/cake.jpg')
  })
})
