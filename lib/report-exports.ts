import type { AdCreative } from './data';

export interface ReportSummary {
  id: number | string;
  name: string;
  date: string;
  type: string;
  status: string;
  pages: number;
  competitorName?: string;
  executiveSummary?: string;
  keyFindings?: string[];
  strategicRecommendations?: string[];
  formatBreakdown?: Array<{ format: string; percentage: number }>;
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function reportRows(report: ReportSummary, ads: AdCreative[]) {
  const rows: (string | number | undefined)[][] = [
    ['SPOTNXT AI COMPETITIVE INTELLIGENCE REPORT', ''],
    ['Report ID', report.id],
    ['Report Name', report.name],
    ['Report Date', report.date],
    ['Report Type', report.type],
    ['Competitor Focus', report.competitorName || 'Cross-Competitor Industry Benchmark'],
    ['Processing Status', report.status],
    ['Data Provenance', 'SpotNxt Intelligence Layer (Meta Ad Library Normalized Index)'],
    [],
  ];

  if (report.executiveSummary) {
    rows.push(['EXECUTIVE SUMMARY', '']);
    rows.push(['Summary', report.executiveSummary]);
    rows.push([]);
  }

  if (report.keyFindings && report.keyFindings.length > 0) {
    rows.push(['KEY FINDINGS & STRATEGIC OBSERVATIONS', '']);
    report.keyFindings.forEach((finding, idx) => {
      rows.push([`Finding #${idx + 1}`, finding]);
    });
    rows.push([]);
  }

  if (report.strategicRecommendations && report.strategicRecommendations.length > 0) {
    rows.push(['ACTIONABLE RECOMMENDATIONS', '']);
    report.strategicRecommendations.forEach((rec, idx) => {
      rows.push([`Recommendation #${idx + 1}`, rec]);
    });
    rows.push([]);
  }

  rows.push([
    'AD ARCHIVE EVIDENCE (CANONICAL RECORDS)',
    '',
  ]);
  rows.push([
    'Ad ID',
    'Competitor',
    'Platform',
    'Format',
    'Headline',
    'Body Copy',
    'CTA',
    'Duration (days)',
    'Est. Engagement (%)',
    'Impressions',
    'Status',
  ]);

  ads.forEach((ad) => {
    rows.push([
      ad.id,
      ad.competitorName,
      ad.platform,
      ad.format,
      ad.headline,
      ad.bodyCopy,
      ad.cta,
      ad.durationDays,
      ad.estimatedEngagement,
      ad.impressions,
      ad.status,
    ]);
  });

  return rows;
}

export function buildReportCsv(report: ReportSummary, ads: AdCreative[]) {
  return reportRows(report, ads).map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

function pdfText(value: unknown) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function wrap(text: string, max = 84) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export function buildReportPdf(report: ReportSummary, ads: AdCreative[]) {
  const lines: string[] = [
    '================================================================================',
    'SPOTNXT AI -- COMPETITIVE INTELLIGENCE EXECUTIVE REPORT',
    '================================================================================',
    '',
    `REPORT TITLE: ${report.name}`,
    `DATE: ${report.date}   |   TYPE: ${report.type}   |   STATUS: ${report.status}`,
    `FOCUS: ${report.competitorName || 'Cross-Competitor Market Benchmark'}`,
    `PROVENANCE: SpotNxt AI Intelligence Engine (Meta Ad Library Normalized Index)`,
    '',
    '--------------------------------------------------------------------------------',
    'SECTION 1: EXECUTIVE INTELLIGENCE SUMMARY',
    '--------------------------------------------------------------------------------',
    report.executiveSummary ||
      'This intelligence report synthesizes active and historical competitor advertising data indexed through the SpotNxt AI pipeline. The analysis extracts format distributions, messaging angles, offers, and whitespace opportunities to inform high-velocity marketing execution.',
    '',
  ];

  if (report.keyFindings && report.keyFindings.length > 0) {
    lines.push('--------------------------------------------------------------------------------');
    lines.push('SECTION 2: KEY STRATEGIC FINDINGS');
    lines.push('--------------------------------------------------------------------------------');
    report.keyFindings.forEach((finding, idx) => {
      lines.push(`[FINDING ${idx + 1}] ${finding}`);
    });
    lines.push('');
  }

  if (report.strategicRecommendations && report.strategicRecommendations.length > 0) {
    lines.push('--------------------------------------------------------------------------------');
    lines.push('SECTION 3: ACTIONABLE RECOMMENDATIONS (DATA -> INTERPRETATION -> ACTION)');
    lines.push('--------------------------------------------------------------------------------');
    report.strategicRecommendations.forEach((rec, idx) => {
      lines.push(`[ACTION ${idx + 1}] ${rec}`);
    });
    lines.push('');
  }

  lines.push('--------------------------------------------------------------------------------');
  lines.push('SECTION 4: ACTIVE AD ARCHIVE & CREATIVE EVIDENCE');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`Total Indexed Creatives Evaluated: ${ads.length}`);
  lines.push('');

  ads.slice(0, 35).forEach((ad, i) => {
    lines.push(
      `#${i + 1} [${ad.competitorName}] ${ad.headline || 'Untitled Ad'} | Format: ${ad.format} | CTA: ${ad.cta} | Platform: ${ad.platform}`
    );
    if (ad.bodyCopy) {
      lines.push(`    Copy: "${ad.bodyCopy.slice(0, 110)}${ad.bodyCopy.length > 110 ? '...' : ''}"`);
    }
    lines.push(`    Metrics: ~${ad.estimatedEngagement}% Engagement | ${ad.durationDays} Days Active | Status: ${ad.status}`);
    lines.push('');
  });

  lines.push('--------------------------------------------------------------------------------');
  lines.push('SECTION 5: DATA PROVENANCE & AUDIT TRAIL');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('Engine: SpotNxt AI Competitor Intelligence Engine (Track 1 Hackathon)');
  lines.push('Compliance: Official Meta Ad Library API schema with rate-limiting and token masking.');
  lines.push('Audit Status: Verified evidence citations mapped to canonical ad records.');
  lines.push('================================================================================');

  const wrappedLines = lines.flatMap((line) => wrap(line));

  const maxLines = 48;
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += maxLines) {
    pages.push(wrappedLines.slice(i, i + maxLines));
  }

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const catalogId = 1;
  const pagesId = 2;
  let nextId = 3;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjectIds.push(pageId);
    contentObjectIds.push(contentId);
    const commands = [
      'BT',
      '/F1 10 Tf',
      '45 750 Td',
      ...pageLines.flatMap((line, index) => [
        index === 0 ? '/F1 13 Tf' : line.startsWith('SECTION') || line.startsWith('====') ? '/F1 11 Tf' : '/F1 9 Tf',
        `(${pdfText(line)}) Tj`,
        '0 -13 Td',
      ]),
      'ET',
    ].join('\n');
    objects[contentId] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  pageObjectIds.forEach((pageId, index) => {
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${nextId} 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`;
  });
  const fontId = nextId;
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
