import type { Block } from '../models/document';

/** Divide el bloque solo en puntos solicitados por el editor.
 * Los elementos no son duplicados ni mutados. */
export function splitBlocksAtDividers(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => {
    const elements = block.elements ?? [];
    if (!elements.some((element) => element.type === 'pageBreak')) return [block];
    const groups: Array<{ items: Block['elements']; mode: 'auto' | 'always' }> = [
      { items: [], mode: 'auto' },
    ];
    for (const element of elements) {
      if (element.type === 'pageBreak') {
        // Divisores consecutivos se fusionan, priorizando el obligatorio.
        if (!groups[groups.length - 1].items?.length) {
          if (element.mode === 'always') groups[groups.length - 1].mode = 'always';
        } else {
          groups.push({ items: [], mode: element.mode });
        }
      } else {
        groups[groups.length - 1].items!.push(element);
      }
    }
    return groups.filter((group) => group.items?.length).map((group, index) => ({
      ...block,
      id: `${block.id}::page-part::${index}`,
      sourceId: block.id,
      title: index === 0 ? block.title : `${block.title} (continuación)`,
      // El contenido heredado y adjuntos se muestran solo en la primera parte.
      body: index === 0 ? block.body : '',
      image: index === 0 ? block.image : undefined,
      table: index === 0 ? block.table : undefined,
      checklist: index === 0 ? block.checklist : undefined,
      multipleChoice: index === 0 ? block.multipleChoice : undefined,
      suppressLegacyLines: true,
      elements: group.items,
      breakBefore: index === 0 ? undefined : group.mode,
      minHeight: 0,
    }));
  });
}
