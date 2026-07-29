import nodemailer from 'nodemailer'

/**
 * Mail transaccional — mismo patrón que Hiryx (Gmail + EMAIL_USER / EMAIL_PASSWORD).
 * No copiar el servicio completo de Talent; solo envío Connectia.
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
    })
  }

  get isConfigured() {
    return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
  }

  getBrandConfig(overrides = {}) {
    const webUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
    const brandName = String(overrides.brandName || process.env.BRAND_NAME || 'Connectia').trim()
    return { brandName, webUrl }
  }

  wrapHtml(subject, bodyHtml, brandOverrides = {}) {
    const { brandName, webUrl } = this.getBrandConfig(brandOverrides)
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 620px; margin: 0 auto; padding: 20px; background: #f0fdfa; }
    .card { background: #ffffff; border: 1px solid #ccfbf1; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #fff; padding: 24px; }
    .content { padding: 24px; color: #1f2937; font-size: 14px; }
    .btn { display: inline-block; background: #0f766e; color: #fff !important; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; margin: 16px 0; }
    .muted { color: #6b7280; font-size: 13px; }
    .box { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; word-break: break-all; }
    .footer { padding: 14px 24px; border-top: 1px solid #ccfbf1; color: #6b7280; font-size: 12px; background: #f0fdfa; }
    a { color: #0f766e; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><h2 style="margin:0;">${subject}</h2><div style="opacity:.9;font-size:13px;margin-top:4px;">${brandName}</div></div>
    <div class="content">${bodyHtml}</div>
    <div class="footer">Sitio: <a href="${webUrl}">${webUrl}</a><br>Email automático — no responder.</div>
  </div>
</body>
</html>`
  }

  /**
   * @param {string} userEmail
   * @param {{ nombre?: string, resetUrl: string, expiresInMinutes?: number, brandName?: string }} resetData
   */
  async sendPasswordResetEmail(userEmail, resetData) {
    if (!userEmail) {
      return { success: false, reason: 'No email provided' }
    }
    if (!this.isConfigured) {
      console.warn('[mail] EMAIL_USER / EMAIL_PASSWORD no configurados')
      return { success: false, reason: 'Mail not configured' }
    }

    const nombre = resetData?.nombre || 'Usuario'
    const resetUrl = resetData?.resetUrl || '#'
    const minutos = Number(resetData?.expiresInMinutes || 60)
    const brand = this.getBrandConfig({ brandName: resetData?.brandName })

    const text = [
      `Hola ${nombre},`,
      '',
      `Recibimos una solicitud para restablecer tu contraseña de ${brand.brandName}.`,
      '',
      'Para crear una nueva contraseña, ingresá al siguiente enlace:',
      resetUrl,
      '',
      `Este enlace vence en ${minutos} minutos.`,
      '',
      'Si no solicitaste este cambio, ignorá este mensaje.',
      '',
      `Equipo de ${brand.brandName}`,
    ].join('\n')

    const bodyHtml = `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña de <strong>${brand.brandName}</strong>.</p>
      <p>Hacé clic en el siguiente botón para crear una nueva contraseña:</p>
      <a class="btn" href="${resetUrl}">Restablecer contraseña</a>
      <p class="muted">Este enlace vence en ${minutos} minutos.</p>
      <p class="muted">Si no solicitaste este cambio, podés ignorar este mensaje.</p>
      <p class="muted">Si el botón no funciona, copiá y pegá este enlace:</p>
      <div class="box">${resetUrl}</div>
    `

    try {
      const subject = `Recuperación de contraseña — ${brand.brandName}`
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject,
        text,
        html: this.wrapHtml(subject, bodyHtml, { brandName: brand.brandName }),
      })
      console.log(`[mail] reset enviado a ${userEmail} id=${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[mail] error reset:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Avisa a un miembro de la audiencia que hay una encuesta para responder.
   * @param {string} userEmail
   * @param {{ nombre?: string, titulo: string, descripcion?: string, surveyUrl: string, brandName?: string }} data
   */
  async sendSurveyPublishedEmail(userEmail, data) {
    if (!userEmail) {
      return { success: false, reason: 'No email provided' }
    }
    if (!this.isConfigured) {
      console.warn('[mail] EMAIL_USER / EMAIL_PASSWORD no configurados — skip encuesta')
      return { success: false, reason: 'Mail not configured' }
    }

    const nombre = data?.nombre || 'Usuario'
    const titulo = data?.titulo || 'Nueva encuesta'
    const surveyUrl = data?.surveyUrl || '#'
    const descripcion = String(data?.descripcion || '').trim()
    const brand = this.getBrandConfig({ brandName: data?.brandName })

    const text = [
      `Hola ${nombre},`,
      '',
      `Hay una encuesta pendiente en ${brand.brandName}:`,
      titulo,
      descripcion ? `\n${descripcion}\n` : '',
      'Respondé acá:',
      surveyUrl,
      '',
      `Equipo de ${brand.brandName}`,
    ]
      .filter((line) => line !== '')
      .join('\n')

    const bodyHtml = `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Tenés una encuesta pendiente de respuesta en <strong>${brand.brandName}</strong>:</p>
      <p style="font-size:16px;font-weight:700;margin:12px 0;">${titulo}</p>
      ${descripcion ? `<p class="muted">${descripcion}</p>` : ''}
      <a class="btn" href="${surveyUrl}">Responder encuesta</a>
      <p class="muted">Si el botón no funciona, copiá y pegá este enlace:</p>
      <div class="box">${surveyUrl}</div>
    `

    try {
      const subject = `Encuesta pendiente: ${titulo} — ${brand.brandName}`
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject,
        text,
        html: this.wrapHtml(subject, bodyHtml, { brandName: brand.brandName }),
      })
      console.log(`[mail] encuesta enviada a ${userEmail} id=${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[mail] error encuesta:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Avisa a un miembro que hay una publicación nueva en el muro.
   * @param {string} userEmail
   * @param {{ nombre?: string, titulo: string, cuerpo?: string, postUrl: string, tipoLabel?: string, brandName?: string }} data
   */
  async sendPostPublishedEmail(userEmail, data) {
    if (!userEmail) {
      return { success: false, reason: 'No email provided' }
    }
    if (!this.isConfigured) {
      console.warn('[mail] EMAIL_USER / EMAIL_PASSWORD no configurados — skip publicación')
      return { success: false, reason: 'Mail not configured' }
    }

    const nombre = data?.nombre || 'Usuario'
    const titulo = data?.titulo || 'Nueva publicación'
    const postUrl = data?.postUrl || '#'
    const cuerpo = String(data?.cuerpo || '').trim()
    const tipoLabel = String(data?.tipoLabel || 'Publicación').trim()
    const brand = this.getBrandConfig({ brandName: data?.brandName })

    const text = [
      `Hola ${nombre},`,
      '',
      `Hay una nueva ${tipoLabel.toLowerCase()} en ${brand.brandName}:`,
      titulo,
      cuerpo ? `\n${cuerpo}\n` : '',
      'Leela acá:',
      postUrl,
      '',
      `Equipo de ${brand.brandName}`,
    ]
      .filter((line) => line !== '')
      .join('\n')

    const bodyHtml = `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Hay una nueva <strong>${tipoLabel.toLowerCase()}</strong> en <strong>${brand.brandName}</strong>:</p>
      <p style="font-size:16px;font-weight:700;margin:12px 0;">${titulo}</p>
      ${cuerpo ? `<p class="muted">${cuerpo}</p>` : ''}
      <a class="btn" href="${postUrl}">Ver en el muro</a>
      <p class="muted">Si el botón no funciona, copiá y pegá este enlace:</p>
      <div class="box">${postUrl}</div>
    `

    try {
      const subject = `${tipoLabel}: ${titulo} — ${brand.brandName}`
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject,
        text,
        html: this.wrapHtml(subject, bodyHtml, { brandName: brand.brandName }),
      })
      console.log(`[mail] publicación enviada a ${userEmail} id=${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[mail] error publicación:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Avisa al autor UGC que su publicación fue rechazada en moderación.
   * @param {string} userEmail
   * @param {{ nombre?: string, titulo: string, reason: string, mineUrl: string, brandName?: string }} data
   */
  async sendUgcRejectedEmail(userEmail, data) {
    if (!userEmail) {
      return { success: false, reason: 'No email provided' }
    }
    if (!this.isConfigured) {
      console.warn('[mail] EMAIL_USER / EMAIL_PASSWORD no configurados — skip ugc reject')
      return { success: false, reason: 'Mail not configured' }
    }

    const nombre = data?.nombre || 'Usuario'
    const titulo = data?.titulo || 'Tu publicación'
    const reason = String(data?.reason || 'No cumple las políticas del muro.').trim()
    const mineUrl = data?.mineUrl || '#'
    const brand = this.getBrandConfig({ brandName: data?.brandName })

    const text = [
      `Hola ${nombre},`,
      '',
      `Tu publicación en ${brand.brandName} no fue aprobada para el muro:`,
      `«${titulo}»`,
      '',
      `Motivo: ${reason}`,
      '',
      'Podés ver el estado de tus envíos acá:',
      mineUrl,
      '',
      `Equipo de ${brand.brandName}`,
    ].join('\n')

    const bodyHtml = `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Tu publicación en <strong>${brand.brandName}</strong> no fue aprobada para el muro:</p>
      <p style="font-size:16px;font-weight:700;margin:12px 0;">«${titulo}»</p>
      <div class="box"><strong>Motivo:</strong><br/>${reason}</div>
      <a class="btn" href="${mineUrl}">Ver mis envíos</a>
      <p class="muted">Si el botón no funciona, copiá y pegá este enlace:</p>
      <div class="box">${mineUrl}</div>
    `

    try {
      const subject = `Publicación no aprobada — ${brand.brandName}`
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject,
        text,
        html: this.wrapHtml(subject, bodyHtml, { brandName: brand.brandName }),
      })
      console.log(`[mail] ugc reject enviado a ${userEmail} id=${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[mail] error ugc reject:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Newsletter HTML ya armado (personalizado) + PDF adjunto.
   * @param {string} userEmail
   * @param {{ subject: string, text: string, html: string, pdfBuffer?: Buffer, filename?: string, brandName?: string }} data
   */
  async sendNewsletterEmail(userEmail, data) {
    if (!userEmail) {
      return { success: false, reason: 'No email provided' }
    }
    if (!this.isConfigured) {
      console.warn('[mail] EMAIL_USER / EMAIL_PASSWORD no configurados — skip newsletter')
      return { success: false, reason: 'Mail not configured' }
    }

    const subject = String(data?.subject || 'Newsletter').trim()
    const text = String(data?.text || '')
    const html = String(data?.html || '')
    const attachments = []
    if (data?.pdfBuffer && Buffer.isBuffer(data.pdfBuffer)) {
      attachments.push({
        filename: data.filename || 'newsletter.pdf',
        content: data.pdfBuffer,
        contentType: 'application/pdf',
      })
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject,
        text,
        html,
        attachments,
      })
      console.log(`[mail] newsletter enviado a ${userEmail} id=${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[mail] error newsletter:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Código para validar un email nuevo en el perfil.
   * @param {string} userEmail
   * @param {{ nombre?: string, code: string, expiresInMinutes?: number, brandName?: string }} data
   */
  async sendEmailVerificationCode(userEmail, data) {
    if (!userEmail) {
      return { success: false, reason: 'No email provided' }
    }
    if (!this.isConfigured) {
      console.warn('[mail] EMAIL_USER / EMAIL_PASSWORD no configurados — skip verify email')
      return { success: false, reason: 'Mail not configured' }
    }

    const nombre = data?.nombre || 'Usuario'
    const code = String(data?.code || '')
    const minutos = Number(data?.expiresInMinutes || 15)
    const brand = this.getBrandConfig({ brandName: data?.brandName })

    const text = [
      `Hola ${nombre},`,
      '',
      `Tu código para confirmar el email en ${brand.brandName} es: ${code}`,
      '',
      `Vence en ${minutos} minutos.`,
      '',
      'Si no pediste este cambio, ignorá el mensaje.',
      '',
      `Equipo de ${brand.brandName}`,
    ].join('\n')

    const bodyHtml = `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Usá este código para confirmar tu email en <strong>${brand.brandName}</strong>:</p>
      <div class="box" style="font-size:28px;font-weight:800;letter-spacing:0.2em;text-align:center;">${code}</div>
      <p class="muted">Vence en ${minutos} minutos.</p>
      <p class="muted">Si no pediste este cambio, ignorá el mensaje.</p>
    `

    try {
      const subject = `Código de verificación — ${brand.brandName}`
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject,
        text,
        html: this.wrapHtml(subject, bodyHtml, { brandName: brand.brandName }),
      })
      console.log(`[mail] email-verify enviado a ${userEmail} id=${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[mail] error email-verify:', error.message)
      return { success: false, error: error.message }
    }
  }
}

export const emailService = new EmailService()
