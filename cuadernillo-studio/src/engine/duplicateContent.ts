
import type {
  Block,
  WorkbookSequence,
} from '../models/document';

export function duplicateBlockData(
  original: Block
): Block {
  const copy = structuredClone(original);

  return {
    ...copy,
    id: crypto.randomUUID(),

    // La copia debe ser un bloque independiente.
    sourceId: undefined,

    title: `${original.title} (copia)`,

    elements: copy.elements?.map((element) => {
      if (element.type === 'gallery') {
        return {
          ...element,
          id: crypto.randomUUID(),
          images: element.images.map((image) => ({
            ...image,
            id: crypto.randomUUID(),
          })),
        };
      }

      return {
        ...element,
        id: crypto.randomUUID(),
      };
    }),

    checklist: copy.checklist?.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })),
  };
}

export function duplicateSequenceData(
  original: WorkbookSequence
): WorkbookSequence {
  return {
    ...structuredClone(original),

    id: crypto.randomUUID(),
    title: `${original.title} (copia)`,

    blocks: original.blocks.map(duplicateBlockData),
  };
}
