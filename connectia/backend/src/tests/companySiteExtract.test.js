import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractBrandColors,
  extractCompanySiteHints,
  extractLogoCandidates,
} from '../lib/companySiteExtract.js'

describe('companySiteExtract', () => {
  it('prioriza logo svg y apple-touch-icon', () => {
    const html = `
      <html><head>
        <link rel="icon" href="/favicon.ico" sizes="16x16">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
        <link rel="icon" type="image/svg+xml" href="/brand-logo.svg">
        <meta property="og:image" content="https://cdn.example/hero-photo.jpg">
      </head>
      <body><img class="site-logo" src="/img/company-logo.png" alt="Logo"></body></html>
    `
    const logos = extractLogoCandidates(html, 'https://acme.com/')
    assert.ok(logos.length >= 2)
    assert.match(logos[0].url, /brand-logo\.svg|company-logo|apple-touch/i)
    const hints = extractCompanySiteHints(html, 'https://acme.com/')
    assert.ok(hints.logoUrl)
    assert.ok(!/hero-photo/.test(hints.logoUrl))
  })

  it('extrae theme-color y hex de CSS', () => {
    const html = `
      <meta name="theme-color" content="#E30613">
      <style>
        :root { --brand: #E30613; --dark: #8B0000; --bg: #ffffff; }
        .btn { color: #111111; }
      </style>
    `
    const colors = extractBrandColors(html)
    assert.equal(colors.primary, '#E30613')
    assert.ok(colors.secondary)
    assert.notEqual(colors.secondary, '#FFFFFF')
  })
})
