import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  generatePairingCode,
  generateDeviceCredential,
  hashDeviceCredential,
  isAllowedStreamUrl,
  resolveLiveEffectiveStatus,
  filterActivePlaylistItems,
  buildFeedManifest,
  buildWelcomeSlide,
  mergeWallAndExtras,
  tenantHasTvCap,
  tenantHasLiveCap,
  isCameraLive,
  isExternalLiveActive,
  isLiveVisibleToMembers,
  activateExternalLiveFields,
  deactivateExternalLiveFields,
  CAMERA_STREAM_URL,
  serializeLive,
  defaultIceServers,
  defaultTvPlaylistItems,
  defaultChannelConfig,
  defaultPresentationConfig,
  normalizeChannelConfig,
  normalizePresentationConfig,
  resolveTvMute,
  selectWallPosts,
  postToTvSlide,
  resolvePostCta,
  isPostTvEligible,
  serializePlaylist,
  scrubRickrollPlaylistItems,
  TV_DEMO_YOUTUBE_URL,
  PAIRING_TTL_MS,
  PAIRING_MAX_ATTEMPTS,
} from '../lib/tvLive.js'
import { userMatchesAudience } from '../lib/audience.js'
import { OLA26_MENU_ITEMS, OLA26_LIVE_MENU_KEYS } from '../lib/ensureOla26Menu.js'

/** Misma regla que GET /tv/playlists: activos + audiencia. */
function visiblePlaylistsForUser(playlists, user) {
  return (playlists || []).filter(
    (p) => p.activo !== false && userMatchesAudience(user, p.audience || { mode: 'all' }),
  )
}

/** Misma regla que POST /tv/pairing/confirm al validar playlistId. */
function canAssignPlaylist(user, playlist) {
  if (!playlist || playlist.activo === false) return false
  return userMatchesAudience(user, playlist.audience || { mode: 'all' })
}

describe('tvLive helpers', () => {
  it('pairing code es 6 dígitos', () => {
    for (let i = 0; i < 20; i++) {
      const c = generatePairingCode()
      assert.match(c, /^\d{6}$/)
    }
  })

  it('credential hash es estable y distinto del token', () => {
    const token = generateDeviceCredential()
    const h1 = hashDeviceCredential(token)
    const h2 = hashDeviceCredential(token)
    assert.equal(h1, h2)
    assert.notEqual(h1, token)
    assert.equal(h1.length, 64)
  })

  it('TTL y intentos de pairing según ADR', () => {
    assert.equal(PAIRING_TTL_MS, 5 * 60 * 1000)
    assert.equal(PAIRING_MAX_ATTEMPTS, 5)
  })

  it('allowlist stream URL', () => {
    assert.equal(isAllowedStreamUrl('https://www.youtube.com/watch?v=abc123'), true)
    assert.equal(isAllowedStreamUrl('https://youtu.be/abc123'), true)
    assert.equal(isAllowedStreamUrl('https://vimeo.com/123'), true)
    assert.equal(isAllowedStreamUrl('https://cdn.example.com/live.m3u8'), true)
    assert.equal(isAllowedStreamUrl('https://evil.example/stream'), false)
    assert.equal(isAllowedStreamUrl('javascript:alert(1)'), false)
  })

  it('resolveLiveEffectiveStatus respeta horarios', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    assert.equal(
      resolveLiveEffectiveStatus(
        {
          status: 'scheduled',
          startsAt: new Date('2026-07-30T11:00:00Z'),
          endsAt: new Date('2026-07-30T13:00:00Z'),
        },
        now,
      ),
      'live',
    )
    assert.equal(
      resolveLiveEffectiveStatus(
        {
          status: 'live',
          endsAt: new Date('2026-07-30T11:00:00Z'),
        },
        now,
      ),
      'ended',
    )
    assert.equal(resolveLiveEffectiveStatus({ status: 'draft' }, now), 'draft')
  })

  it('filterActivePlaylistItems ordena y filtra vigencia', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const items = filterActivePlaylistItems(
      [
        { type: 'text', text: 'b', order: 2, activo: true },
        { type: 'text', text: 'a', order: 1, activo: true },
        { type: 'text', text: 'off', order: 0, activo: false },
        {
          type: 'text',
          text: 'future',
          order: 0,
          activo: true,
          startsAt: new Date('2026-07-31T00:00:00Z'),
        },
      ],
      now,
    )
    assert.deepEqual(
      items.map((i) => i.text),
      ['a', 'b'],
    )
  })

  it('buildFeedManifest arma welcome + muro + curated', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const posts = [
      {
        _id: 'p1',
        titulo: 'Aviso planta',
        cuerpo: '<p>Usá casco</p>',
        tipo: 'aviso',
        status: 'published',
        audience: { mode: 'all' },
        publishedAt: new Date('2026-07-29T12:00:00Z'),
        imageUrl: 'https://cdn.example/a.jpg',
        pinned: true,
      },
      {
        _id: 'p2',
        titulo: 'Noticia',
        cuerpo: 'Hola',
        tipo: 'noticia',
        status: 'published',
        audience: { mode: 'all' },
        publishedAt: new Date('2026-07-28T12:00:00Z'),
      },
    ]
    const manifest = buildFeedManifest({
      playlist: {
        _id: 'pl1',
        version: 3,
        channel: defaultChannelConfig('Arcor'),
        items: [{ _id: 'i1', type: 'text', text: 'Slot fijo', durationSec: 10, order: 0, activo: true }],
        fallbackText: 'Safe',
      },
      device: { _id: 'd1', mute: true, orientation: 'landscape', name: 'Recepción', locationLabel: 'Hall' },
      tenant: { nombre: 'Arcor', branding: { logoUrl: 'https://cdn.example/logo.png' } },
      posts,
      now,
    })
    assert.equal(manifest.playlistVersion, 3)
    assert.match(manifest.etag, /^"tv-pl1-v3-/)
    assert.equal(manifest.brandName, 'Arcor')
    assert.equal(manifest.logoUrl, 'https://cdn.example/logo.png')
    assert.equal(manifest.items[0].type, 'welcome')
    assert.ok(manifest.items.some((i) => i.type === 'post' && i.title === 'Aviso planta'))
    assert.ok(manifest.items.some((i) => i.type === 'text' && i.body === 'Slot fijo'))
  })

  it('diapo extra texto lleva estilo propio (align/scale/logo)', () => {
    const channel = { ...defaultChannelConfig('Arcor'), welcomeEnabled: false, wallEnabled: false }
    const manifest = buildFeedManifest({
      playlist: {
        _id: 'pl1',
        version: 1,
        channel,
        items: [
          {
            _id: 'i1',
            type: 'text',
            text: 'Hola sede',
            durationSec: 12,
            order: 0,
            activo: true,
            textAlign: 'left',
            textValign: 'bottom',
            textScale: 'lg',
            showBrand: false,
            showTextLogo: true,
          },
        ],
        fallbackText: 'Safe',
      },
      device: { _id: 'd1', mute: true, orientation: 'landscape' },
      tenant: { nombre: 'Arcor' },
      posts: [],
      now: new Date('2026-07-30T12:00:00Z'),
    })
    const slide = manifest.items.find((i) => i.type === 'text' && i.body === 'Hola sede')
    assert.ok(slide)
    assert.equal(slide.textAlign, 'left')
    assert.equal(slide.textValign, 'bottom')
    assert.equal(slide.textScale, 'lg')
    assert.equal(slide.showBrand, false)
    assert.equal(slide.showTextLogo, true)
  })

  it('buildFeedManifest con extrasOnly no incluye pubs del muro', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const posts = [
      {
        _id: 'p1',
        titulo: 'Aviso planta',
        cuerpo: 'Usá casco',
        tipo: 'aviso',
        status: 'published',
        audience: { mode: 'all' },
        publishedAt: new Date('2026-07-29T12:00:00Z'),
        imageUrl: 'https://cdn.example/a.jpg',
      },
    ]
    const channel = { ...defaultChannelConfig('Arcor'), extrasOnly: true, welcomeEnabled: false }
    const manifest = buildFeedManifest({
      playlist: {
        _id: 'pl1',
        version: 1,
        channel,
        items: [{ _id: 'i1', type: 'text', text: 'Solo extra', durationSec: 10, order: 0, activo: true }],
        fallbackText: 'Safe',
      },
      device: { _id: 'd1', mute: true, orientation: 'landscape' },
      tenant: { nombre: 'Arcor' },
      posts,
      now,
    })
    assert.ok(manifest.channel.extrasOnly)
    assert.ok(manifest.items.every((i) => i.type !== 'post'))
    assert.ok(manifest.items.some((i) => i.type === 'text' && i.body === 'Solo extra'))
  })

  it('defaultTvPlaylistItems ya no usa rickroll', () => {
    const items = defaultTvPlaylistItems('Arcor')
    assert.ok(items.length >= 1)
    assert.equal(items.some((i) => /dQw4w9WgXcQ/i.test(i.url || '')), false)
    assert.equal(items.some((i) => i.type === 'youtube'), true)
  })

  it('buildWelcomeSlide respeta showLogo maestro y welcomeShowLogo', () => {
    const tenant = { nombre: 'Arcor', branding: { logoUrl: 'https://cdn.example/logo.png' } }
    const device = { name: 'Recepción', locationLabel: 'Hall' }
    const offGlobal = buildWelcomeSlide(tenant, device, {
      ...defaultChannelConfig('Arcor'),
      showLogo: false,
      presentation: { ...defaultPresentationConfig(), welcomeShowLogo: true },
    })
    assert.equal(offGlobal.showLogo, false)
    assert.equal(offGlobal.welcomeShowLogo, false)
    assert.equal(offGlobal.brandLogoUrl, '')

    const offWelcome = buildWelcomeSlide(tenant, device, {
      ...defaultChannelConfig('Arcor'),
      showLogo: true,
      presentation: { ...defaultPresentationConfig(), welcomeShowLogo: false },
    })
    assert.equal(offWelcome.showLogo, false)
    assert.equal(offWelcome.brandLogoUrl, '')

    const on = buildWelcomeSlide(tenant, device, {
      ...defaultChannelConfig('Arcor'),
      showLogo: true,
      presentation: { ...defaultPresentationConfig(), welcomeShowLogo: true },
    })
    assert.equal(on.showLogo, true)
    assert.equal(on.welcomeShowLogo, true)
    assert.equal(on.brandLogoUrl, 'https://cdn.example/logo.png')
  })

  it('wallExcludePostIds excluye pubs concretas del muro auto', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const posts = [
      {
        _id: 'keep',
        titulo: 'ok',
        status: 'published',
        tipo: 'noticia',
        audience: { mode: 'all' },
        publishedAt: new Date('2026-07-29T00:00:00Z'),
      },
      {
        _id: 'skip',
        titulo: 'excluida',
        status: 'published',
        tipo: 'noticia',
        audience: { mode: 'all' },
        publishedAt: new Date('2026-07-29T12:00:00Z'),
      },
    ]
    const selected = selectWallPosts(posts, {
      ...defaultChannelConfig('Arcor'),
      wallExcludePostIds: ['skip'],
    }, now)
    assert.equal(selected.some((p) => String(p._id) === 'skip'), false)
    assert.equal(selected.some((p) => String(p._id) === 'keep'), true)
    assert.equal(isPostTvEligible(posts[1], { ...defaultChannelConfig('Arcor'), wallExcludePostIds: ['skip'] }, now), false)
  })

  it('selectWallPosts prioriza pinned y excluye knowledge / member / restricted', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const selected = selectWallPosts(
      [
        {
          _id: 'a',
          titulo: 'vieja',
          status: 'published',
          tipo: 'noticia',
          audience: { mode: 'all' },
          publishedAt: new Date('2026-06-01T00:00:00Z'),
        },
        {
          _id: 'b',
          titulo: 'kb',
          status: 'published',
          tipo: 'noticia',
          isKnowledge: true,
          audience: { mode: 'all' },
          publishedAt: new Date('2026-07-29T00:00:00Z'),
        },
        {
          _id: 'm',
          titulo: 'ugc',
          status: 'published',
          tipo: 'noticia',
          origin: 'member',
          audience: { mode: 'all' },
          publishedAt: new Date('2026-07-29T00:00:00Z'),
        },
        {
          _id: 'r',
          titulo: 'privada',
          status: 'published',
          tipo: 'noticia',
          audience: { mode: 'users' },
          publishedAt: new Date('2026-07-29T00:00:00Z'),
        },
        {
          _id: 'c',
          titulo: 'pin',
          status: 'published',
          tipo: 'aviso',
          pinned: true,
          audience: { mode: 'all' },
          publishedAt: new Date('2026-07-20T00:00:00Z'),
        },
        {
          _id: 'd',
          titulo: 'ok',
          status: 'published',
          tipo: 'noticia',
          audience: { mode: 'all' },
          publishedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ],
      normalizeChannelConfig({ wallDays: 14, wallMax: 10 }),
      now,
    )
    assert.deepEqual(
      selected.map((p) => String(p._id)),
      ['c', 'd'],
    )
  })

  it('lista mixta intercala pub y diapo extra sin duplicar el extra', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const posts = [
      {
        _id: 'p1',
        titulo: 'Pub uno',
        status: 'published',
        tipo: 'noticia',
        audience: { mode: 'all' },
        publishedAt: now,
      },
    ]
    const channel = normalizeChannelConfig({
      contentMode: 'list',
      wallEnabled: true,
      welcomeEnabled: false,
      wallIncludeEntries: [
        { kind: 'extra', id: 'ex1' },
        { kind: 'post', id: 'p1' },
      ],
    })
    const manifest = buildFeedManifest({
      playlist: {
        _id: 'pl1',
        version: 1,
        channel,
        items: [
          { _id: 'ex1', type: 'text', text: 'Extra A', durationSec: 8, order: 0, activo: true },
          { _id: 'ex2', type: 'text', text: 'Extra B', durationSec: 8, order: 1, activo: true },
        ],
        fallbackText: 'Safe',
      },
      device: { _id: 'd1', mute: true, orientation: 'landscape' },
      tenant: { nombre: 'Arcor' },
      posts,
      now,
    })
    const typesBodies = manifest.items.map((i) => `${i.type}:${i.body || i.title || ''}`)
    assert.ok(typesBodies[0].startsWith('text:Extra A'))
    assert.ok(typesBodies.some((x) => x.includes('Pub uno')))
    assert.equal(manifest.items.filter((i) => i.body === 'Extra A').length, 1)
    assert.ok(manifest.items.some((i) => i.body === 'Extra B'))
  })

  it('lista controlada respeta orden y elegibilidad', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const posts = [
      {
        _id: 'p1',
        status: 'published',
        tipo: 'noticia',
        audience: { mode: 'all' },
        publishedAt: now,
      },
      {
        _id: 'p2',
        status: 'published',
        tipo: 'aviso',
        audience: { mode: 'restricted' },
        publishedAt: now,
      },
      {
        _id: 'p3',
        status: 'published',
        tipo: 'noticia',
        audience: { mode: 'all' },
        publishedAt: now,
      },
    ]
    const selected = selectWallPosts(
      posts,
      normalizeChannelConfig({
        contentMode: 'list',
        wallEnabled: true,
        wallIncludePostIds: ['p3', 'p2', 'p1'],
      }),
      now,
    )
    assert.deepEqual(
      selected.map((p) => String(p._id)),
      ['p3', 'p1'],
    )
  })

  it('isPostTvEligible bloquea audiencia no pública', () => {
    assert.equal(
      isPostTvEligible(
        { status: 'published', tipo: 'noticia', audience: { mode: 'users' } },
        defaultChannelConfig('X'),
      ),
      false,
    )
    assert.equal(
      isPostTvEligible(
        { status: 'published', tipo: 'noticia', audience: { mode: 'all' }, origin: 'admin' },
        defaultChannelConfig('X'),
      ),
      true,
    )
  })

  it('postToTvSlide limpia HTML y marca waitForEnd en video', () => {
    const slide = postToTvSlide({
      _id: 'x',
      titulo: 'Hola',
      cuerpo: '<b>Mundo</b> &amp; co',
      tipo: 'evento',
      imageUrl: 'https://cdn.example/x.jpg',
    })
    assert.equal(slide.type, 'post')
    assert.equal(slide.body, 'Mundo & co')
    assert.equal(slide.mediaKind, 'image')
    assert.equal(slide.cta, 'Más info en la app')
    assert.equal(slide.waitForEnd, false)
    assert.equal(resolvePostCta('beneficio', ''), 'Mirá beneficios en la app')
    assert.equal(resolvePostCta('noticia', 'Consultá la app'), 'Consultá la app')
    assert.equal(
      postToTvSlide(
        { _id: 'n', titulo: 'N', cuerpo: '', tipo: 'noticia', imageUrl: 'https://cdn.example/n.jpg' },
        { ctaMessage: ' Ver en la app ' },
      ).cta,
      'Ver en la app',
    )

    const vid = postToTvSlide(
      { _id: 'v', titulo: 'Clip', cuerpo: '', tipo: 'noticia', imageUrl: 'https://cdn.example/a.mp4' },
      { waitForVideoEnd: true },
    )
    assert.equal(vid.mediaKind, 'video')
    assert.equal(vid.waitForEnd, true)

    const yt = postToTvSlide(
      {
        _id: 'y',
        titulo: 'YT',
        cuerpo: '',
        tipo: 'general',
        imageUrl: 'https://www.youtube.com/watch?v=biLTCDFOuRY',
      },
      { durationSec: 5, waitForVideoEnd: true },
    )
    assert.equal(yt.mediaKind, 'youtube')
    assert.equal(yt.waitForEnd, true)
    // durationSec es tope de seguridad; el kiosk avanza al terminar el video.
    assert.equal(yt.durationSec, 5)
  })

  it('tenant caps', () => {
    assert.equal(tenantHasTvCap({ capabilities: ['tv.mode'] }), true)
    assert.equal(tenantHasTvCap({ capabilities: [] }), false)
    assert.equal(tenantHasLiveCap({ capabilities: ['live.stream'] }), true)
  })

  it('camera live sentinel y serialize', () => {
    assert.equal(isAllowedStreamUrl(CAMERA_STREAM_URL), true)
    assert.equal(isCameraLive({ source: 'camera', streamUrl: CAMERA_STREAM_URL }), true)
    assert.equal(isCameraLive({ source: 'external', streamUrl: 'https://youtu.be/x' }), false)
    const s = serializeLive({
      _id: 'abc',
      title: 'Hola',
      source: 'camera',
      streamUrl: CAMERA_STREAM_URL,
      status: 'live',
      viewCount: 2,
      createdByUserId: '111111111111111111111111',
    })
    assert.equal(s.source, 'camera')
    assert.equal(s.streamUrl, CAMERA_STREAM_URL)
    assert.equal(s.activo, true)
    assert.equal(s.createdByUserId, '111111111111111111111111')
    assert.ok(Array.isArray(defaultIceServers()))
    assert.ok(defaultIceServers().length >= 1)
  })

  it('biblioteca URL: activar / desactivar y reusar', () => {
    const doc = {
      source: 'external',
      streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'draft',
      activo: false,
    }
    assert.equal(isExternalLiveActive(doc), false)
    assert.equal(isLiveVisibleToMembers(doc), false)
    activateExternalLiveFields(doc)
    assert.equal(doc.activo, true)
    assert.equal(doc.status, 'live')
    assert.equal(isLiveVisibleToMembers(doc), true)
    const ser = serializeLive(doc)
    assert.equal(ser.activo, true)
    deactivateExternalLiveFields(doc)
    assert.equal(doc.activo, false)
    assert.equal(doc.status, 'draft')
    assert.equal(isLiveVisibleToMembers(doc), false)
    // legado sin campo activo
    assert.equal(isExternalLiveActive({ source: 'external', status: 'live' }), true)
    assert.equal(isExternalLiveActive({ source: 'external', status: 'draft', activo: false }), false)
  })

  it('presentation defaults y mute policy', () => {
    const p = normalizePresentationConfig({
      logoPosition: 'bl',
      mutePolicy: 'force-mute',
      accentColor: 'red',
      postLayout: 'nope',
      welcomeShowLogo: false,
      welcomeLogoScale: 'lg',
    })
    assert.equal(p.logoPosition, 'bl')
    assert.equal(p.mutePolicy, 'force-mute')
    assert.equal(p.accentColor, '#5eead4')
    assert.equal(p.postLayout, 'media-left')
    assert.equal(p.welcomeShowLogo, false)
    assert.equal(p.welcomeLogoScale, 'lg')
    assert.equal(resolveTvMute(false, { mutePolicy: 'force-mute' }), true)
    assert.equal(resolveTvMute(true, { mutePolicy: 'force-sound' }), false)
    assert.equal(resolveTvMute(false, { mutePolicy: 'device' }), false)
    const ch = normalizeChannelConfig({ presentation: { showClock: true, clockPosition: 'br' } })
    assert.equal(ch.presentation.showClock, true)
    assert.equal(ch.presentation.clockPosition, 'br')
    assert.equal(normalizePresentationConfig({ clockPosition: 'nope' }).clockPosition, 'tl')
    assert.equal(defaultChannelConfig('X').presentation.logoPosition, 'tr')
    assert.equal(defaultChannelConfig('X').presentation.logoScale, 'md')
    assert.equal(defaultChannelConfig('X').presentation.welcomeShowLogo, true)
    assert.equal(defaultChannelConfig('X').presentation.welcomeLogoScale, 'md')
    assert.equal(defaultChannelConfig('X').presentation.smallImageMode, 'contain')
    assert.equal(normalizePresentationConfig({}).smallImageMode, 'contain')
    assert.equal(normalizePresentationConfig({ logoScale: 'lg' }).logoScale, 'lg')
  })
})

describe('audiencia de canal (pairing)', () => {
  const areaA = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const areaB = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const userInA = { _id: '111111111111111111111111', areaId: areaA, groupIds: [] }
  const userInB = { _id: '222222222222222222222222', areaId: areaB, groupIds: [] }

  const playlists = [
    { _id: 'p1', name: 'Todos', activo: true, audience: { mode: 'all' } },
    { _id: 'p2', name: 'Solo área A', activo: true, audience: { mode: 'restricted', areaIds: [areaA] } },
    { _id: 'p3', name: 'Nadie', activo: true, audience: { mode: 'none' } },
    { _id: 'p4', name: 'Inactivo', activo: false, audience: { mode: 'all' } },
    {
      _id: 'p5',
      name: 'Solo user A',
      activo: true,
      audience: { mode: 'users', userIds: [String(userInA._id)] },
    },
  ]

  it('filtra canales visibles al emparejar por audiencia', () => {
    const forA = visiblePlaylistsForUser(playlists, userInA).map((p) => p.name)
    assert.deepEqual(forA, ['Todos', 'Solo área A', 'Solo user A'])

    const forB = visiblePlaylistsForUser(playlists, userInB).map((p) => p.name)
    assert.deepEqual(forB, ['Todos'])
  })

  it('rechaza playlistId fuera de audiencia o inactivo', () => {
    assert.equal(canAssignPlaylist(userInA, playlists[0]), true)
    assert.equal(canAssignPlaylist(userInA, playlists[1]), true)
    assert.equal(canAssignPlaylist(userInB, playlists[1]), false)
    assert.equal(canAssignPlaylist(userInA, playlists[2]), false)
    assert.equal(canAssignPlaylist(userInA, playlists[3]), false)
    assert.equal(canAssignPlaylist(userInB, playlists[4]), false)
    assert.equal(canAssignPlaylist(userInA, null), false)
  })

  it('serializePlaylist incluye audience (default all)', () => {
    const s = serializePlaylist({
      _id: 'cccccccccccccccccccccccc',
      name: 'Canal',
      version: 1,
      activo: true,
      items: [],
      channel: defaultChannelConfig('T'),
      fallbackText: 'x',
      updatedAt: new Date(),
    })
    assert.equal(s.audience.mode, 'all')
    assert.deepEqual(s.audience.areaIds, [])
  })
})

describe('ensureOla26Menu', () => {
  it('incluye U emparejar/en-vivo y A modo-tv/live', () => {
    const keys = OLA26_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('tv-emparejar'))
    assert.ok(keys.includes('en-vivo'))
    assert.ok(keys.includes('admin.tv'))
    assert.ok(keys.includes('admin.live'))
  })

  it('Live toggle usa menú en-vivo + admin.live (sin apagar TV)', () => {
    assert.deepEqual(OLA26_LIVE_MENU_KEYS, ['en-vivo', 'admin.live'])
    assert.ok(!OLA26_LIVE_MENU_KEYS.includes('tv-emparejar'))
    assert.ok(!OLA26_LIVE_MENU_KEYS.includes('admin.tv'))
  })
})
