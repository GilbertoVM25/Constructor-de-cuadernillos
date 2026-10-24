import type {
  Block,
  BlockKind,
  ContentElement,
  Workbook,
  WorkbookProject,
  WorkbookSequence,
  WorkbookTable,
  CoverSettings,
} from '../models/document';

type RecordValue = Record<string, unknown>;

const kinds: readonly string[] = [
  'purpose', 'pda', 'start', 'development', 'question',
  'case', 'activity', 'pisa', 'closing', 'application',
  'selfEvaluation', 'information',
];
const layouts = ['auto', 'half', 'full'] as const;
const columns = ['auto', 'left', 'right'] as const;
const responseStyles = ['lines', 'blank', 'grid', 'drawing'] as const;

function object(value: unknown, at: string): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${at}: se esperaba un objeto.`);
  }
  return value as RecordValue;
}
function str(value: unknown, at: string): string {
  if (typeof value !== 'string') throw new Error(`${at}: se esperaba texto.`);
  return value;
}
function optionalStr(value: unknown, at: string): string | undefined {
  return value === undefined ? undefined : str(value, at);
}
function nonnegative(value: unknown, at: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${at}: se esperaba un número no negativo.`);
  }
  return value;
}
function array(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${at}: se esperaba una lista.`);
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[], at: string): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) {
    throw new Error(`${at}: valor no reconocido (${String(value)}).`);
  }
  return value as T;
}
function id(value: unknown, ids: Set<string>): string {
  if (typeof value === 'string' && value.trim() && !ids.has(value)) {
    ids.add(value);
    return value;
  }
  const generated = crypto.randomUUID();
  ids.add(generated);
  return generated;
}
function table(value: unknown, at: string, ids: Set<string>): WorkbookTable {
  const v = object(value, at);
  const headers = array(v.headers, `${at}.headers`).map((x, i) => str(x, `${at}.headers[${i}]`));
  if (!headers.length) throw new Error(`${at}: la tabla no tiene columnas.`);
  const rows = array(v.rows, `${at}.rows`).map((row, i) =>
    array(row, `${at}.rows[${i}]`).map((cell, j) => str(cell, `${at}.rows[${i}][${j}]`))
  );
  return {
    id: id(v.id, ids), headers, rows,
    showHeaders: v.showHeaders === undefined ? true : v.showHeaders === true,
  };
}
function element(value: unknown, at: string, ids: Set<string>): ContentElement {
  const v = object(value, at);
  const elementId = id(v.id, ids);
  switch (v.type) {
    case 'text':
      return { id: elementId, type: 'text', content: str(v.content ?? '', `${at}.content`),
        richHtml: optionalStr(v.richHtml, `${at}.richHtml`) };
    case 'question':
      return { id: elementId, type: 'question', text: str(v.text ?? '', `${at}.text`),
        answerLines: nonnegative(v.answerLines ?? 0, `${at}.answerLines`),
        richHtml: optionalStr(v.richHtml, `${at}.richHtml`) };
    case 'table':
      return { id: elementId, type: 'table', table: table(v.table, `${at}.table`, ids) };
    case 'image':
      return { id: elementId, type: 'image', src: str(v.src ?? '', `${at}.src`),
        caption: str(v.caption ?? '', `${at}.caption`),
        width: Math.max(1, Math.min(100, nonnegative(v.width ?? 100, `${at}.width`))),
        align: choice(v.align ?? 'center', ['left', 'center', 'right'] as const, `${at}.align`) };
    case 'gallery':
      return { id: elementId, type: 'gallery', gap: nonnegative(v.gap ?? 8, `${at}.gap`),
        images: array(v.images, `${at}.images`).map((img, i) => {
          const item = object(img, `${at}.images[${i}]`);
          return { id: id(item.id, ids), src: str(item.src ?? '', `${at}.images[${i}].src`),
            caption: str(item.caption ?? '', `${at}.images[${i}].caption`) };
        }) };
    case 'responseArea':
      return { id: elementId, type: 'responseArea',
        style: choice(v.style ?? 'lines', responseStyles, `${at}.style`),
        height: Math.max(80, Math.min(500, nonnegative(v.height ?? 180, `${at}.height`))),
        label: str(v.label ?? '', `${at}.label`) };
    default:
      throw new Error(`${at}: tipo de elemento no reconocido (${String(v.type)}).`);
  }
}
function block(value: unknown, at: string, ids: Set<string>): Block {
  const v = object(value, at);
  const kind = choice(v.kind, kinds as BlockKind[], `${at}.kind`);
  const checklist = v.checklist === undefined ? undefined :
    array(v.checklist, `${at}.checklist`).map((raw, i) => {
      const item = object(raw, `${at}.checklist[${i}]`);
      return { id: id(item.id, ids), text: str(item.text, `${at}.checklist[${i}].text`) };
    });
  let multipleChoice: Block['multipleChoice'];
  if (v.multipleChoice !== undefined) {
    const mc = object(v.multipleChoice, `${at}.multipleChoice`);
    multipleChoice = {
      situation: str(mc.situation, `${at}.multipleChoice.situation`),
      question: str(mc.question, `${at}.multipleChoice.question`),
      options: array(mc.options, `${at}.multipleChoice.options`).map((x, i) =>
        str(x, `${at}.multipleChoice.options[${i}]`)),
      justificationLines: nonnegative(mc.justificationLines ?? 0, `${at}.multipleChoice.justificationLines`),
    };
  }
  return {
    id: id(v.id, ids), kind,
    title: str(v.title ?? '', `${at}.title`),
    body: str(v.body ?? '', `${at}.body`),
    column: choice(v.column ?? 'auto', columns, `${at}.column`),
    layout: choice(v.layout ?? (kind === 'purpose' || kind === 'pda' ? 'half' : 'auto'), layouts, `${at}.layout`),
    minHeight: nonnegative(v.minHeight ?? 90, `${at}.minHeight`),
    image: optionalStr(v.image, `${at}.image`),
    suppressLegacyLines: v.suppressLegacyLines === true ? true : undefined,
    table: v.table === undefined ? undefined : table(v.table, `${at}.table`, ids),
    checklist, multipleChoice,
    elements: v.elements === undefined ? [] : array(v.elements, `${at}.elements`).map((x, i) =>
      element(x, `${at}.elements[${i}]`, ids)),
  };
}
function sequence(value: unknown, index: number, ids: Set<string>): WorkbookSequence {
  const at = `Secuencia ${index + 1}`;
  const v = object(value, at);
  const blocks = array(v.blocks, `${at}.blocks`).map((x, i) => block(x, `${at}.bloque ${i + 1}`, ids));
  return {
    id: id(v.id, ids), sequence: index + 1,
    title: str(v.title, `${at}.title`), subtitle: str(v.subtitle, `${at}.subtitle`),
    blocks,
    contentNumber: v.contentNumber === undefined ? undefined : nonnegative(v.contentNumber, `${at}.contentNumber`),
    contentTitle: optionalStr(v.contentTitle, `${at}.contentTitle`),
  };
}
function cover(value: unknown): CoverSettings | undefined {
  if (value === undefined) return undefined;
  const v = object(value, 'Portada');
  return {
    title: str(v.title ?? '', 'Portada.title'),
    subtitle: str(v.subtitle ?? '', 'Portada.subtitle'),
    subject: str(v.subject ?? 'Química', 'Portada.subject'),
    grade: str(v.grade ?? '', 'Portada.grade'),
    school: str(v.school ?? '', 'Portada.school'),
    schoolYear: str(v.schoolYear ?? '', 'Portada.schoolYear'),
    author: str(v.author ?? '', 'Portada.author'),
    presentation: str(v.presentation ?? '', 'Portada.presentation'),
    template: v.template === undefined ? 'academic' : choice(v.template, ['academic','modern','minimal'] as const, 'Portada.template'),
    accentColor: str(v.accentColor ?? '#1766c2', 'Portada.accentColor'),
    coverImage: str(v.coverImage ?? '', 'Portada.coverImage'),
    schoolLogo: str(v.schoolLogo ?? '', 'Portada.schoolLogo'),
  };
}

/** Valida y normaliza sin sobrescribir preferencias de distribución explícitas. */
export function importWorkbookJSON(data: unknown): WorkbookProject {
  const v = object(data, 'JSON');
  const ids = new Set<string>();
  let sequences: WorkbookSequence[];
  if (Array.isArray(v.sequences)) {
    if (!v.sequences.length) throw new Error('El proyecto no contiene secuencias.');
    sequences = v.sequences.map((s, i) => sequence(s, i, ids));
  } else if (Array.isArray(v.blocks)) {
    // Proyecto antiguo de una sola secuencia.
    sequences = [sequence({ ...v, id: crypto.randomUUID() }, 0, ids)];
  } else {
    throw new Error('Formato no reconocido: faltan "sequences" o "blocks".');
  }
  return {
    id: crypto.randomUUID(),
    name: str(v.name ?? v.title ?? 'Mi cuadernillo', 'name'),
    sequences,
    cover: cover(v.cover),
  };
}
