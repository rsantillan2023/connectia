/**
 * Adapter mínimo Jira para portal de servicios (best-effort).
 * Config por tenant.jiraConfig o env:
 *   JIRA_BASE_URL · JIRA_EMAIL · JIRA_API_TOKEN · JIRA_PROJECT_KEY
 */
export function jiraConfigFrom(tenant) {
  const cfg = tenant?.jiraConfig || {}
  const baseUrl = String(cfg.baseUrl || process.env.JIRA_BASE_URL || '')
    .trim()
    .replace(/\/$/, '')
  const email = String(cfg.email || process.env.JIRA_EMAIL || '').trim()
  const apiToken = String(cfg.apiToken || process.env.JIRA_API_TOKEN || '').trim()
  const projectKey = String(cfg.projectKey || process.env.JIRA_PROJECT_KEY || '')
    .trim()
    .toUpperCase()
  const issueType = String(cfg.issueType || process.env.JIRA_ISSUE_TYPE || 'Task').trim()
  return { baseUrl, email, apiToken, projectKey, issueType }
}

export function jiraConfigured(tenant) {
  const c = jiraConfigFrom(tenant)
  return Boolean(c.baseUrl && c.email && c.apiToken && c.projectKey)
}

/**
 * Crea issue Jira desde una solicitud de servicio.
 * @returns {{ status, issueKey?, issueUrl?, error?, at }}
 */
export async function createJiraIssueFromServicio({
  tenant,
  request,
  catalog,
  area,
  fetchImpl = fetch,
}) {
  const at = new Date()
  if (!jiraConfigured(tenant)) {
    return { status: 'skipped', issueKey: '', issueUrl: '', error: '', at }
  }
  const c = jiraConfigFrom(tenant)
  const summary = `[Connectia #${request.number}] ${catalog?.label || 'Servicio'}`
  const description = [
    `Solicitud de servicio Connectia #${request.number}`,
    `Área: ${area?.name || ''}`,
    `Servicio: ${catalog?.label || ''}`,
    `Nota: ${request.note || ''}`,
    '',
    ...(request.formAnswers || []).map((a) => `${a.key}: ${a.value}`),
  ].join('\n')

  const auth = Buffer.from(`${c.email}:${c.apiToken}`).toString('base64')
  try {
    const res = await fetchImpl(`${c.baseUrl}/rest/api/2/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: c.projectKey },
          summary: summary.slice(0, 250),
          description: description.slice(0, 30000),
          issuetype: { name: c.issueType },
        },
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        status: 'error',
        issueKey: '',
        issueUrl: '',
        error: String(body?.errorMessages?.[0] || body?.message || `HTTP ${res.status}`).slice(
          0,
          500,
        ),
        at,
      }
    }
    const key = String(body.key || '')
    return {
      status: 'created',
      issueKey: key,
      issueUrl: key ? `${c.baseUrl}/browse/${key}` : '',
      error: '',
      at,
    }
  } catch (e) {
    return {
      status: 'error',
      issueKey: '',
      issueUrl: '',
      error: String(e?.message || e).slice(0, 500),
      at,
    }
  }
}
