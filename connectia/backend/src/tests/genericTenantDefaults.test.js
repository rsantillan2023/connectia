import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  adminUsuarioForCode,
  brandingFromProfile,
  buildTenantOnboardingSummary,
  heuristicCompanyProfile,
  isHexColor,
  normalizeCompanyProfile,
  normalizeOnboardingContext,
  sanitizeWebsiteUrl,
} from '../lib/genericTenantDefaults.js'

describe('genericTenantDefaults', () => {
  it('adminUsuarioForCode normaliza código', () => {
    assert.equal(adminUsuarioForCode('ACME'), 'admin.acme')
    assert.equal(adminUsuarioForCode('The Fork'), 'admin.thefork')
    assert.equal(adminUsuarioForCode(''), 'admin.tenant')
  })

  it('isHexColor valida hex', () => {
    assert.equal(isHexColor('#8554C9'), true)
    assert.equal(isHexColor('#fff'), true)
    assert.equal(isHexColor('teal'), false)
    assert.equal(isHexColor(''), false)
  })

  it('heuristicCompanyProfile arma defaults seguros', () => {
    const p = heuristicCompanyProfile('ACME', 'Acme Corp')
    assert.equal(p.brandName, 'Acme Corp')
    assert.equal(p.empCodigo, 'ACME')
    assert.equal(p.knownCompany, false)
    assert.ok(p.areas.length >= 4)
    assert.ok(p.groups.length >= 2)
    assert.match(p.welcomeTitle, /Acme Corp/)
  })

  it('normalizeCompanyProfile acepta áreas de IA y descarta colores inválidos', () => {
    const p = normalizeCompanyProfile(
      {
        knownCompany: true,
        industry: 'alimentos',
        primary: 'rojo',
        secondary: '#E30613',
        areas: [
          { key: 'rrhh', nombre: 'People', descripcion: 'HR' },
          { key: 'planta', nombre: 'Planta', descripcion: 'Ops' },
          { key: 'ventas', nombre: 'Ventas', descripcion: 'Sales' },
        ],
        groups: [
          { key: 'liderazgo', nombre: 'Liderazgo' },
          { key: 'planta_norte', nombre: 'Planta Norte' },
        ],
        welcomeTitle: 'Hola Acme',
        welcomeBody: 'Bienvenidos',
      },
      { empCodigo: 'ACME', nombre: 'Acme' },
    )
    assert.equal(p.knownCompany, true)
    assert.equal(p.industry, 'alimentos')
    assert.equal(p.primary, '#8554C9')
    assert.equal(p.secondary, '#E30613')
    assert.equal(p.areas.length, 3)
    assert.equal(p.areas[1].key, 'planta')
    assert.equal(p.groups.length, 2)
    assert.equal(p.welcomeTitle, 'Hola Acme')
  })

  it('brandingFromProfile incluye splash con color de marca', () => {
    const profile = normalizeCompanyProfile(
      { primary: '#E30613', secondary: '#8B0000', logoUrl: 'https://example.com/logo.svg' },
      { empCodigo: 'X', nombre: 'Marca X' },
    )
    const b = brandingFromProfile(profile)
    assert.equal(b.primary, '#E30613')
    assert.equal(b.splashTitle, 'Marca X')
    assert.equal(b.splash.textColor, '#E30613')
    assert.equal(b.splash.showLogo, true)
    assert.equal(b.logoUrl, 'https://example.com/logo.svg')
  })

  it('sanitizeWebsiteUrl acepta dominio sin protocolo', () => {
    assert.equal(sanitizeWebsiteUrl('www.arcor.com'), 'https://www.arcor.com/')
    assert.equal(sanitizeWebsiteUrl('https://arcor.com/es'), 'https://arcor.com/es')
    assert.equal(sanitizeWebsiteUrl(''), '')
    assert.equal(sanitizeWebsiteUrl('/local'), '')
  })

  it('normalizeOnboardingContext arma hints del operador', () => {
    const c = normalizeOnboardingContext({
      website: 'arcor.com',
      industryHint: 'alimentos',
      country: 'Argentina',
      notes: 'Plantas en Córdoba',
      logoUrl: 'https://cdn.example/logo.svg',
    })
    assert.equal(c.websiteUrl, 'https://arcor.com/')
    assert.equal(c.industryHint, 'alimentos')
    assert.equal(c.country, 'Argentina')
    assert.match(c.notes, /Córdoba/)
    assert.equal(c.hasHints, true)
  })

  it('buildTenantOnboardingSummary arma accesos y mensaje', () => {
    const o = buildTenantOnboardingSummary({
      empCodigo: 'ACME',
      nombre: 'Acme Corp',
      usedAi: true,
      profile: {
        knownCompany: true,
        industry: 'tech',
        description: 'Software',
        primary: '#111111',
        secondary: '#222222',
        logoUrl: 'https://cdn.example/logo.svg',
        areas: [{ nombre: 'RRHH' }, { nombre: 'IT' }],
        groups: [{ nombre: 'Liderazgo' }],
        welcomeTitle: 'Bienvenida Acme',
      },
      context: { websiteUrl: 'https://acme.com', country: 'Argentina', notes: 'Nota' },
      credentials: {
        empCodigo: 'ACME',
        adminUsuario: 'admin.acme',
        password: 'Demo1234!',
        sampleUsers: ['juan.perez'],
      },
      appUrl: 'http://localhost:5173',
      adminUrl: 'http://localhost:5174',
    })
    assert.equal(o.knownCompany, true)
    assert.equal(o.logoUrl, 'https://cdn.example/logo.svg')
    assert.deepEqual(o.areas, ['RRHH', 'IT'])
    assert.match(o.accessMessage, /admin\.acme/)
    assert.match(o.accessMessage, /Demo1234!/)
    assert.match(o.accessMessage, /localhost:5174/)
    assert.equal(o.credentials.adminUsuario, 'admin.acme')
  })
})
