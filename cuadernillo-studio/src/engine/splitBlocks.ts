
import type {
  Block,
  ContentElement,
  WorkbookTable,
} from '../models/document';

import type { BlockMeasurements } from './paginate';

export type VisualBlock = Block & {
  sourceId?: string;
  suppressLegacyLines?: boolean;
};

/**
 * Divide textos por párrafos.
 * Los párrafos largos se separan por palabras.
 */
function splitText(
  value: string,
  maxChars = 420
): string[] {
  const paragraphs = value
    .split(/\n+/)
    .filter((part) => part.trim());

  const output: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      output.push(paragraph);
      continue;
    }

    let piece = '';

    for (const word of paragraph.split(/\s+/)) {
      if (
        piece &&
        piece.length + word.length + 1 > maxChars
      ) {
        output.push(piece);
        piece = '';
      }

      piece += (piece ? ' ' : '') + word;
    }

    if (piece) output.push(piece);
  }

  return output;
}

/**
 * Divide las tablas en grupos de filas,
 * conservando sus encabezados.
 */
function splitTable(
  table: WorkbookTable,
  maxRows = 3
): WorkbookTable[] {
  if (!table.rows.length) return [table];

  const chunks: WorkbookTable[] = [];

  for (let i = 0; i < table.rows.length; i += maxRows) {
    chunks.push({
      ...table,
      rows: table.rows.slice(i, i + maxRows),
    });
  }

  return chunks;
}

/**
 * Genera unidades de contenido que pueden medirse.
 *
 * No modifica los datos originales del bloque.
 */
export function createAtomicBlocks(
  block: Block
): VisualBlock[] {
  const id = block.id;
  const pieces: Array<Partial<Block>> = [];

  const add = (piece: Partial<Block>) => {
    pieces.push(piece);
  };

  const asText = (
    content: string
  ): ContentElement => ({
    id: `${id}:text:${pieces.length}`,
    type: 'text',
    content,
  });

  // Texto antiguo
  if (block.body.trim()) {
    for (const paragraph of splitText(block.body)) {
      add({
        elements: [asText(paragraph)],
      });
    }
  }

  // Imagen antigua
  if (block.image) {
    add({ image: block.image });
  }

  // Elementos nuevos
  for (const element of block.elements ?? []) {
    if (element.type === 'text') {
      for (const text of splitText(element.content)) {
        add({
          elements: [
            {
              ...element,
              id: `${element.id}:${pieces.length}`,
              content: text,
            },
          ],
        });
      }
    } else if (element.type === 'table') {
      for (const table of splitTable(element.table)) {
        add({
          elements: [
            {
              ...element,
              id: `${element.id}:${pieces.length}`,
              table,
            },
          ],
        });
      }
    } else {
      // Mantener juntas las preguntas y
      // sus líneas de respuesta.
      add({
        elements: [element],
      });
    }
  }

  // Tabla antigua
  if (block.table) {
    for (const table of splitTable(block.table)) {
      add({ table });
    }
  }

  // Lista de cotejo antigua
  if (block.checklist?.length) {
    for (
      let i = 0;
      i < block.checklist.length;
      i += 3
    ) {
      add({
        checklist: block.checklist.slice(i, i + 3),
      });
    }
  }

  // Ejercicio PISA antiguo
  if (block.multipleChoice) {
    add({
      multipleChoice: block.multipleChoice,
    });
  }

  // Compatibilidad con bloques antiguos vacíos
  if (
    pieces.length === 0 &&
    ['start', 'question', 'activity'].includes(block.kind)
  ) {
    add({
      elements: [
        {
          id: `${id}:legacy-lines`,
          type: 'question',
          text: '',
          answerLines: 2,
        },
      ],
    });
  }

  return pieces.map((piece, index): VisualBlock => ({
    ...block,
    id: `${id}::atomic::${index}`,
    sourceId: id,
    suppressLegacyLines: true,
    layout: 'full',
    minHeight: 0,
    body: '',
    image: undefined,
    elements: [],
    table: undefined,
    checklist: undefined,
    multipleChoice: undefined,
    ...piece,
  }));
}

/**
 * Solo fragmenta bloques demasiado grandes.
 *
 * Los demás mantienen la composición
 * automática original.
 */

export function splitOversizedBlocks(
  blocks: Block[],
  measurements: BlockMeasurements,
  capacity: number
): VisualBlock[] {
  const result: VisualBlock[] = [];

  // Margen de seguridad para fragmentos de bloques
  // que superan una página completa.
  const fragmentLimit = capacity * 0.85;

  for (const block of blocks) {
    const halfHeight =
      measurements[block.id]?.half ?? 0;

    const fullHeight =
      measurements[block.id]?.full ?? 0;

    // Conservar intactos los bloques que caben a media anchura.
    if (halfHeight > 0 && halfHeight <= capacity) {
      result.push(block);
      continue;
    }

    // Si solo caben a ancho completo, no hace falta dividirlos.
    if (fullHeight > 0 && fullHeight <= capacity) {
      result.push({ ...block, layout: 'full' });
      continue;
    }

    // Esperar a tener ambas medidas antes de fragmentar.
    if (halfHeight <= 0 || fullHeight <= 0) {
      result.push(block);
      continue;
    }

    // Obtener las unidades independientes:
    // textos, preguntas, grupos de filas, etc.
    const atoms = createAtomicBlocks(block);

    // Sin suficientes componentes no podemos
    // dividir el bloque de manera útil.
    if (atoms.length < 2) {
      result.push(block);
      continue;
    }

    let group: VisualBlock[] = [];
    let groupHeight = 0;
    let fragmentIndex = 0;

    const flush = () => {
      if (!group.length) return;

      result.push({
        ...block,
        id: `${block.id}::fragment::${fragmentIndex++}`,
        sourceId: block.id,
        suppressLegacyLines: true,
        layout: 'full',
        minHeight: 0,
        body: '',
        image: group.find(item => !!item.image)?.image,
        elements: group.flatMap(item => item.elements ?? []),
        table: group.find(item => !!item.table)?.table,
        checklist: group.flatMap(
          item => item.checklist ?? []
        ),
        multipleChoice: group.find(
          item => !!item.multipleChoice
        )?.multipleChoice,
      });

      group = [];
      groupHeight = 0;
    };

    for (const atom of atoms) {
      const atomHeight =
        measurements[atom.id]?.full ??
        fragmentLimit;

      // Evitar mezclar estructuras heredadas cuya
      // representación ocupa una posición fija.
      const incompatible =
        group.length > 0 &&
        (
          !!atom.table ||
          group.some(item => !!item.table) ||
          !!atom.multipleChoice ||
          group.some(item => !!item.multipleChoice) ||
          !!atom.checklist?.length ||
          group.some(item => !!item.checklist?.length)
        );

      if (
        group.length > 0 &&
        (
          groupHeight + atomHeight > fragmentLimit ||
          incompatible
        )
      ) {
        flush();
      }

      group.push(atom);
      groupHeight += atomHeight;
    }

    flush();
  }

  return result;
}
