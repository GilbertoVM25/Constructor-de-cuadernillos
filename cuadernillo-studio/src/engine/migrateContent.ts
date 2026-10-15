
import type {
  Block,
  ContentElement,
  Workbook,
} from '../models/document';

/**
 * Convierte contenido antiguo al sistema
 * de elementos ordenables.
 *
 * La migración conserva el ID del bloque
 * y las preguntas estructuradas existentes.
 */
export function migrateBlockContent(
  block: Block
): Block {
  const elements: ContentElement[] = [
    ...(block.elements ?? []),
  ];

  let changed = false;

  // Convertir el campo body en texto editable.
  if (block.body.trim()) {
    elements.unshift({
      id: crypto.randomUUID(),
      type: 'text',
      content: block.body,
    });

    changed = true;
  }

  // Convertir tablas antiguas.
  // Las evaluaciones y ejercicios PISA se
  // conservarán por ahora en su formato anterior.
  if (block.table) {
    // No mover tablas que conviven con otros
    // formatos heredados, para evitar alterar
    // su orden visual.
    if (!block.checklist && !block.multipleChoice) {
      elements.push({
        id: crypto.randomUUID(),
        type: 'table',
        table: structuredClone(block.table),
      });

      changed = true;
    }
  }

  if (!changed) return block;

  return {
    ...block,
    body: '',
    table:
      !block.checklist && !block.multipleChoice
        ? undefined
        : block.table,
    elements,
  };
}

export function migrateWorkbookContent(
  workbook: Workbook
): Workbook {
  return {
    ...workbook,
    blocks: workbook.blocks.map(migrateBlockContent),
  };
}
