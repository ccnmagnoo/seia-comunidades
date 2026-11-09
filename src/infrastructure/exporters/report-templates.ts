import type { ProjectDetail } from '../../shared/filters';

const KIND_LABELS: Record<string, string> = {
  solicitud_pac: 'Solicitud PAC',
  observacion: 'Observación',
  informe: 'Informe',
  resolucion: 'Resolución',
  registro: 'Registro',
  notificacion: 'Notificación',
  acreditacion: 'Acreditación',
  otro: 'Documento',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutral',
  negative: 'Negativo',
};

export function buildHtmlReport(detail: ProjectDetail, generatedAt: string): string {
  const { project, pac, observations, timeline, notes } = detail;
  const title = escapeHtml(project.name);
  const documents = pac
    .map(
      (document) => `
      <tr>
        <td>${document.it}</td>
        <td>${escapeHtml(KIND_LABELS[document.kind] ?? document.kind)}</td>
        <td>${escapeHtml(document.title)}</td>
        <td>${escapeHtml(document.from)}</td>
        <td>${document.recipientsCount}</td>
        <td>${formatDateTime(document.recordDate)}</td>
      </tr>`,
    )
    .join('');

  const observationCards = observations
    .map(
      (observation) => `
      <article class="observation">
        <header>
          <span class="pill">${escapeHtml(observation.category)}</span>
          <span class="pill">${escapeHtml(SENTIMENT_LABELS[observation.sentiment] ?? observation.sentiment)}</span>
          <span class="muted">${formatDate(observation.date)}</span>
        </header>
        <h4>${escapeHtml(observation.sender)}</h4>
        <p class="subject">${escapeHtml(observation.subject ?? '')}</p>
        <p class="content">${escapeHtml(observation.content || observation.summary)}</p>
        <p class="meta">Importancia: ${Math.round(observation.importance * 100)}% · Palabras clave: ${escapeHtml(observation.keywords.join(', '))}</p>
      </article>`,
    )
    .join('');

  const timelineItems = timeline
    .map(
      (event) => `
      <li>
        <span class="date">${formatDate(event.date)}</span>
        <strong>${escapeHtml(event.title)}</strong>
        <span class="muted">${escapeHtml(event.description ?? '')}</span>
      </li>`,
    )
    .join('');

  const noteItems = notes
    .map(
      (note) => `
      <article class="note">
        <header><strong>${escapeHtml(note.author)}</strong> · ${formatDateTime(note.updatedAt)} · ${note.priority}</header>
        <p>${escapeHtml(note.content)}</p>
      </article>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8" />
<title>Reporte PAC · ${title}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 11px; line-height: 1.5; margin: 0; }
  h1, h2, h3, h4, p { margin: 0; }
  h1 { font-size: 22px; line-height: 1.2; }
  h2 { font-size: 14px; margin: 22px 0 8px; color: #0f172a; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px; }
  h3 { font-size: 12px; margin: 12px 0 4px; }
  .cover { background: #0f172a; color: #fff; padding: 22px; border-radius: 10px; }
  .cover .eyebrow { color: #7dd3fc; text-transform: uppercase; letter-spacing: .14em; font-size: 9px; font-weight: 700; }
  .cover h1 { margin-top: 8px; color: #fff; }
  .cover .meta { color: #cbd5e1; margin-top: 8px; }
  .badges { margin-top: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(125,211,252,.16); color: #bae6fd; font-size: 9px; margin-right: 5px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
  .cell { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
  .cell .label { font-size: 8px; text-transform: uppercase; letter-spacing: .12em; color: #64748b; }
  .cell .value { margin-top: 3px; font-weight: 600; color: #0f172a; }
  .description { margin-top: 14px; padding: 12px; border-left: 4px solid #0ea5e9; background: #f8fafc; white-space: pre-line; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #475569; }
  .observation { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px; margin-top: 8px; page-break-inside: avoid; }
  .observation header { display: flex; align-items: center; gap: 6px; }
  .observation h4 { margin-top: 5px; font-size: 11px; }
  .observation .subject { color: #64748b; font-size: 10px; }
  .observation .content { margin-top: 5px; white-space: pre-line; }
  .observation .meta { margin-top: 5px; color: #64748b; font-size: 9px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 8px; font-weight: 700; text-transform: uppercase; }
  .muted { color: #64748b; }
  .timeline { list-style: none; padding: 0; margin: 8px 0 0; }
  .timeline li { border-left: 2px solid #bae6fd; padding: 0 0 8px 10px; }
  .timeline .date { display: block; color: #0284c7; font-size: 9px; }
  .note { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-top: 6px; }
  .note header { color: #64748b; font-size: 9px; margin-bottom: 4px; }
  .footer { margin-top: 20px; color: #94a3b8; font-size: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">Reporte de Participación Ciudadana · SEIA</div>
    <h1>${title}</h1>
    <div class="meta">${escapeHtml(project.owner.name)} · ${escapeHtml(project.location.commune)}, ${escapeHtml(project.location.region)}</div>
    <div class="badges">
      <span class="badge">${escapeHtml(project.status)}</span>
      <span class="badge">${escapeHtml(project.workflow)}</span>
      <span class="badge">Expediente ${escapeHtml(project.id)}</span>
    </div>
  </section>

  <div class="grid">
    <div class="cell"><div class="label">Inversión</div><div class="value">${formatMoney(project.details.investmentMM)}</div></div>
    <div class="cell"><div class="label">Fecha presentación</div><div class="value">${formatDate(project.details.presentationDate)}</div></div>
    <div class="cell"><div class="label">Días legales</div><div class="value">${project.details.legalDays ?? '—'}</div></div>
    <div class="cell"><div class="label">Documentos PAC</div><div class="value">${pac.length}</div></div>
    <div class="cell"><div class="label">Observaciones</div><div class="value">${observations.length}</div></div>
    <div class="cell"><div class="label">Último registro</div><div class="value">${formatDate(project.pac.lastRecordAt)}</div></div>
  </div>

  <h2>Descripción del proyecto</h2>
  <div class="description">${escapeHtml(project.details.description ?? 'Sin descripción almacenada.')}</div>

  <h2>Documentos PAC</h2>
  <table>
    <thead><tr><th>#</th><th>Tipo</th><th>Título</th><th>Remitente</th><th>Dest.</th><th>Fecha</th></tr></thead>
    <tbody>${documents || '<tr><td colspan="6">Sin documentos.</td></tr>'}</tbody>
  </table>

  <h2>Observaciones ciudadanas</h2>
  ${observationCards || '<p class="muted">Sin observaciones registradas.</p>'}

  <h2>Línea de tiempo</h2>
  <ul class="timeline">${timelineItems || '<li class="muted">Sin eventos.</li>'}</ul>

  <h2>Notas internas</h2>
  ${noteItems || '<p class="muted">Sin notas internas.</p>'}

  <div class="footer">
    Generado el ${formatDateTime(generatedAt)} · Fuente: portal SEIA · Documento local, sin valor oficial.
  </div>
</body>
</html>`;
}

export function buildMarkdownReport(detail: ProjectDetail, generatedAt: string): string {
  const { project, pac, observations, timeline, notes } = detail;
  const lines: string[] = [];

  lines.push(`# ${project.name}`, '');
  lines.push(`**Expediente:** ${project.id}  `);
  lines.push(`**Titular:** ${project.owner.name}  `);
  lines.push(`**Ubicación:** ${project.location.commune}, ${project.location.region}  `);
  lines.push(`**Estado:** ${project.status} · **${project.workflow}**  `);
  lines.push(`**Generado:** ${formatDateTime(generatedAt)}`, '');
  lines.push('## Detalle', '');
  lines.push(`- Inversión: ${formatMoney(project.details.investmentMM)}`);
  lines.push(`- Presentación: ${formatDate(project.details.presentationDate)}`);
  lines.push(`- Días legales: ${project.details.legalDays ?? '—'}`);
  lines.push(`- Documentos PAC: ${pac.length}`);
  lines.push(`- Observaciones: ${observations.length}`);
  lines.push(`- Último registro: ${formatDate(project.pac.lastRecordAt)}`, '');
  lines.push('## Descripción', '', project.details.description ?? 'Sin descripción.', '');

  lines.push('## Documentos PAC', '');
  if (pac.length === 0) lines.push('Sin documentos.', '');
  else {
    lines.push('| # | Tipo | Título | Remitente | Fecha |');
    lines.push('|---|---|---|---|---|');
    for (const document of pac) {
      lines.push(
        `| ${document.it} | ${KIND_LABELS[document.kind] ?? document.kind} | ${md(document.title)} | ${md(document.from)} | ${formatDate(document.recordDate)} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Observaciones ciudadanas', '');
  if (observations.length === 0) lines.push('Sin observaciones.', '');
  for (const observation of observations) {
    lines.push(`### ${observation.sender} · ${formatDate(observation.date)}`, '');
    lines.push(`**Categoría:** ${observation.category} · **Sentimiento:** ${SENTIMENT_LABELS[observation.sentiment] ?? observation.sentiment} · **Importancia:** ${Math.round(observation.importance * 100)}%`, '');
    lines.push(observation.content || observation.summary, '');
    if (observation.keywords.length > 0) {
      lines.push(`**Palabras clave:** ${observation.keywords.join(', ')}`, '');
    }
  }

  lines.push('## Línea de tiempo', '');
  for (const event of timeline) {
    lines.push(`- **${formatDate(event.date)}** · ${event.title}${event.description ? ` — ${event.description}` : ''}`);
  }
  lines.push('');

  lines.push('## Notas internas', '');
  if (notes.length === 0) lines.push('Sin notas.', '');
  for (const note of notes) {
    lines.push(`- **${note.author}** (${note.priority}, ${formatDateTime(note.updatedAt)}): ${note.content}`);
  }
  lines.push('', '---', '_Documento generado localmente desde el portal SEIA. Sin valor oficial._');

  return lines.join('\n');
}

export function buildCsvReport(detail: ProjectDetail): string {
  const { project, observations, pac } = detail;

  if (observations.length > 0) {
    const header = [
      'id',
      'proyecto_id',
      'proyecto',
      'fecha',
      'remitente',
      'categoria',
      'subcategoria',
      'sentimiento',
      'importancia',
      'resumen',
      'contenido',
      'documento_url',
    ];
    const rows = observations.map((observation) => [
      observation.id,
      project.id,
      project.name,
      observation.date,
      observation.sender,
      observation.category,
      observation.subcategory ?? '',
      observation.sentiment,
      String(observation.importance),
      observation.summary,
      observation.content,
      observation.sourceUrl,
    ]);
    return toCsv([header, ...rows]);
  }

  const header = [
    'id',
    'proyecto_id',
    'proyecto',
    'registro',
    'tipo',
    'titulo',
    'remitente',
    'destinatarios',
    'fecha',
    'url',
  ];
  const rows = pac.map((document) => [
    document.id,
    project.id,
    project.name,
    document.register,
    document.kind,
    document.title,
    document.from,
    String(document.recipientsCount),
    document.recordDate,
    document.link,
  ]);
  return toCsv([header, ...rows]);
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
}

function md(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoney(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
