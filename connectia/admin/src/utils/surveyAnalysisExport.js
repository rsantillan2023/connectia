import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
} from 'docx'
import { jsPDF } from 'jspdf'

function safeName(titulo) {
  return String(titulo || 'encuesta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60)
}

function stamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || ''
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

/** Secciones normalizadas del análisis IA para PDF/DOCX. */
export function buildAnalysisSections(analysis, meta = {}) {
  const a = analysis || {}
  const sections = []

  sections.push({
    title: 'Resumen ejecutivo',
    paragraphs: [String(a.resumenEjecutivo || 'Sin resumen.')],
  })

  const hallazgos = a.cuantitativo?.hallazgos || []
  const metricas = a.cuantitativo?.metricasClave || []
  const cuantLines = [
    ...hallazgos.map((h) => `• ${h}`),
    ...metricas.map((m) => {
      if (typeof m === 'string') return `• ${m}`
      return `• ${m.etiqueta || ''}: ${m.valor || ''}${m.lectura ? ` — ${m.lectura}` : ''}`
    }),
  ]
  sections.push({
    title: 'Análisis cuantitativo',
    paragraphs: cuantLines.length ? cuantLines : ['Sin hallazgos cuantitativos.'],
  })

  const temas = a.cualitativo?.temas || []
  const citas = a.cualitativo?.citasRepresentativas || []
  const cualLines = []
  if (a.cualitativo?.tonoGeneral) cualLines.push(`Tono general: ${a.cualitativo.tonoGeneral}`)
  for (const t of temas) {
    cualLines.push(
      `• ${t.tema || 'Tema'}${t.frecuenciaAprox ? ` (${t.frecuenciaAprox})` : ''}: ${t.evidencia || ''}`,
    )
  }
  for (const c of citas) cualLines.push(`“${c}”`)
  sections.push({
    title: 'Análisis cualitativo',
    paragraphs: cualLines.length ? cualLines : ['Sin hallazgos cualitativos.'],
  })

  const riesgos = a.riesgosOAlertas || []
  if (riesgos.length) {
    sections.push({
      title: 'Riesgos o alertas',
      paragraphs: riesgos.map((r) => `• ${r}`),
    })
  }

  const recs = a.recomendaciones || []
  sections.push({
    title: 'Recomendaciones',
    paragraphs: recs.length ? recs.map((r) => `• ${r}`) : ['Sin recomendaciones.'],
  })

  const cierre = []
  if (a.confianza) cierre.push(`Confianza del análisis: ${a.confianza}`)
  if (a.limitaciones) cierre.push(`Limitaciones: ${a.limitaciones}`)
  if (meta.metaLine) cierre.push(String(meta.metaLine))
  if (meta.segmentLabel) cierre.push(`Segmento: ${meta.segmentLabel}`)
  if (cierre.length) {
    sections.push({ title: 'Notas', paragraphs: cierre })
  }

  return {
    docTitle: `Informe IA — ${meta.surveyTitle || 'Encuesta'}`,
    generatedAt: new Date().toLocaleString('es-AR'),
    sections,
    fileBase: `informe-ia-${safeName(meta.surveyTitle)}-${stamp()}`,
  }
}

/**
 * Arma specs de gráficos a partir de resultados + participación.
 */
export function buildChartSpecs(results = {}) {
  const specs = []
  const part = results.segment || results.participation || {}
  const answered = Number(part.answered ?? results.participation?.answered ?? 0)
  const invited = Number(part.invited ?? results.participation?.invited ?? 0)
  const pending = Math.max(0, invited - answered)

  if (invited > 0 || answered > 0) {
    specs.push({
      id: 'participation',
      title: 'Participación',
      subtitle: invited
        ? `${answered} de ${invited} · ${part.rate != null ? `${part.rate}%` : ''}`
        : `${answered} respuestas`,
      bars: [
        { label: 'Respondieron', value: answered, color: '#0F766E' },
        { label: 'Pendientes', value: pending, color: '#94A3B8' },
      ],
    })
  }

  const questions = Array.isArray(results.byQuestion) ? results.byQuestion : []
  for (const q of questions) {
    if (!q || q.count === 0) continue

    if (q.tipo === 'rating' || q.tipo === 'number') {
      if (q.average == null) continue
      const max = q.tipo === 'rating' ? 5 : Math.max(q.max || 0, q.average, 1)
      specs.push({
        id: q.questionId,
        title: q.texto,
        subtitle: `Promedio ${Number(q.average).toFixed(2)} · n=${q.count}${q.grupo ? ` · ${q.grupo}` : ''}`,
        bars: [{ label: 'Promedio', value: Number(q.average), color: '#0F766E' }],
        valueMax: max,
      })
      continue
    }

    if (q.tipo === 'yesno') {
      specs.push({
        id: q.questionId,
        title: q.texto,
        subtitle: `n=${q.count}${q.grupo ? ` · ${q.grupo}` : ''}`,
        bars: [
          { label: 'Sí', value: Number(q.yes || 0), color: '#0F766E' },
          { label: 'No', value: Number(q.no || 0), color: '#F97316' },
        ],
      })
      continue
    }

    if (q.options && typeof q.options === 'object') {
      const entries = Object.entries(q.options)
        .map(([label, value]) => ({ label: String(label), value: Number(value) || 0, color: '#0F766E' }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
      if (!entries.length) continue
      specs.push({
        id: q.questionId,
        title: q.texto,
        subtitle: `n=${q.count}${q.grupo ? ` · ${q.grupo}` : ''}`,
        bars: entries.map((e, i) => ({
          ...e,
          color: ['#0F766E', '#14B8A6', '#0369A1', '#7C3AED', '#DB2777', '#EA580C', '#65A30D', '#475569'][
            i % 8
          ],
        })),
      })
    }
  }

  return specs.slice(0, 12)
}

/** Renderiza un gráfico de barras horizontales a PNG (data URL). */
export function renderBarChartPng(spec, { width = 900, height } = {}) {
  const bars = (spec.bars || []).filter((b) => Number.isFinite(b.value))
  const rowH = 36
  const padTop = 56
  const padBottom = 28
  const padLeft = 16
  const padRight = 16
  const labelW = 150
  const h = height || padTop + padBottom + Math.max(1, bars.length) * rowH
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = h
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, h)

  ctx.fillStyle = '#0F172A'
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif'
  const title = String(spec.title || 'Gráfico').slice(0, 90)
  ctx.fillText(title.length < String(spec.title || '').length ? `${title}…` : title, padLeft, 28)

  if (spec.subtitle) {
    ctx.fillStyle = '#64748B'
    ctx.font = '14px Helvetica, Arial, sans-serif'
    ctx.fillText(String(spec.subtitle).slice(0, 110), padLeft, 48)
  }

  const maxVal = Math.max(
    spec.valueMax || 0,
    ...bars.map((b) => b.value),
    1,
  )
  const chartX = padLeft + labelW
  const chartW = width - chartX - padRight - 40

  bars.forEach((b, i) => {
    const y = padTop + i * rowH
    ctx.fillStyle = '#334155'
    ctx.font = '13px Helvetica, Arial, sans-serif'
    const lab = String(b.label || '').slice(0, 22)
    ctx.fillText(lab, padLeft, y + 18)

    const bw = Math.max(2, (b.value / maxVal) * chartW)
    ctx.fillStyle = b.color || '#0F766E'
    roundRect(ctx, chartX, y + 4, bw, 20, 6)
    ctx.fill()

    ctx.fillStyle = '#0F172A'
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif'
    ctx.fillText(String(b.value), chartX + bw + 8, y + 18)
  })

  return {
    title: spec.title,
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height: h,
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function renderAllCharts(results) {
  return buildChartSpecs(results).map((spec) => renderBarChartPng(spec))
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Informe completo: análisis IA + gráficos de resultados.
 * @param {'pdf'|'docx'} format
 */
export async function downloadAiReport({ analysis, results, meta = {}, format = 'pdf' }) {
  const charts = renderAllCharts(results || {})
  if (format === 'docx') return downloadAnalysisDocx(analysis, meta, charts)
  return downloadAnalysisPdf(analysis, meta, charts)
}

export async function downloadAnalysisDocx(analysis, meta = {}, charts = []) {
  const built = buildAnalysisSections(analysis, meta)
  const children = [
    new Paragraph({
      text: built.docTitle,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generado: ${built.generatedAt} · Connectia`,
          italics: true,
          size: 20,
          color: '64748B',
        }),
      ],
      spacing: { after: 400 },
    }),
  ]

  for (const sec of built.sections) {
    children.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
      }),
    )
    for (const line of sec.paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: String(line), size: 22 })],
          spacing: { after: 80 },
        }),
      )
    }
  }

  if (charts.length) {
    children.push(
      new Paragraph({
        text: 'Gráficos de resultados',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
      }),
    )
    for (const chart of charts) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: 'png',
              data: dataUrlToUint8Array(chart.dataUrl),
              transformation: {
                width: 520,
                height: Math.round((520 / chart.width) * chart.height),
              },
              altText: { title: chart.title || 'Gráfico', description: chart.title || 'Gráfico', name: chart.title || 'chart' },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
      )
    }
  }

  const doc = new Document({
    creator: 'Connectia',
    title: built.docTitle,
    description: 'Informe de encuesta generado con IA',
    sections: [{ properties: {}, children }],
  })

  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${built.fileBase}.docx`)
  return `${built.fileBase}.docx`
}

export async function downloadAnalysisPdf(analysis, meta = {}, charts = []) {
  const built = buildAnalysisSections(analysis, meta)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const maxW = pageW - margin * 2
  let y = margin

  const ensureSpace = (need = 20) => {
    if (y + need > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const writeWrapped = (text, { size = 11, style = 'normal', color = [15, 23, 42], gap = 6 } = {}) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text || ''), maxW)
    for (const line of lines) {
      ensureSpace(size + 6)
      doc.text(line, margin, y)
      y += size + 4
    }
    y += gap
  }

  writeWrapped(built.docTitle, { size: 16, style: 'bold', gap: 4 })
  writeWrapped(`Generado: ${built.generatedAt} · Connectia`, {
    size: 9,
    style: 'italic',
    color: [100, 116, 139],
    gap: 14,
  })

  // KPIs rápidos si hay participación
  const part = meta.participation || {}
  if (part.answered != null || part.invited != null) {
    writeWrapped('Indicadores de participación', { size: 13, style: 'bold', color: [15, 118, 110], gap: 4 })
    writeWrapped(
      `Respondieron: ${part.answered ?? '—'} · Invitados: ${part.invited ?? '—'} · Tasa: ${part.rate != null ? `${part.rate}%` : '—'}`,
      { size: 10, gap: 10 },
    )
  }

  for (const sec of built.sections) {
    writeWrapped(sec.title, { size: 13, style: 'bold', color: [15, 118, 110], gap: 6 })
    for (const line of sec.paragraphs) {
      writeWrapped(line, { size: 10, gap: 2 })
    }
    y += 8
  }

  if (charts.length) {
    writeWrapped('Gráficos de resultados', { size: 13, style: 'bold', color: [15, 118, 110], gap: 10 })
    for (const chart of charts) {
      const imgW = maxW
      const imgH = (imgW / chart.width) * chart.height
      ensureSpace(imgH + 16)
      doc.addImage(chart.dataUrl, 'PNG', margin, y, imgW, imgH)
      y += imgH + 18
    }
  }

  ensureSpace(24)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 14
  writeWrapped(
    'Documento generado automáticamente por Connectia. Revisá cifras contra los resultados de la encuesta.',
    { size: 8, color: [100, 116, 139], gap: 0 },
  )

  doc.save(`${built.fileBase}.pdf`)
  return `${built.fileBase}.pdf`
}
