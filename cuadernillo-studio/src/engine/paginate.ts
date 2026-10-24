
import type { Block } from '../models/document';

export type BlockMeasurements = Record<
  string,
  { half: number; full: number }
>;

export type PageRow = {
  left?: Block;
  right?: Block;
  leftStack?: Block[];
  full?: Block;
  height: number;
};

export type Page = {
  rows: PageRow[];
  oversize?: boolean;
};

const GAP = 10;

function estimateHeight(block: Block): number {
  const lines = block.body.split('\n').reduce(
    (total, line) =>
      total + Math.max(1, Math.ceil(line.length / 42)),
    0
  );

  const imageHeight =
    block.image &&
    ['case', 'development'].includes(block.kind)
      ? 145
      : 0;

  const answerHeight =
    ['start', 'question', 'activity'].includes(block.kind)
      ? 50
      : 0;

  return Math.max(
    block.minHeight,
    70 + lines * 19 + imageHeight + answerHeight
  );
}

function getHeight(
  block: Block,
  measurements: BlockMeasurements,
  width: 'half' | 'full' = 'half'
): number {
  return measurements[block.id]?.[width] ??
    estimateHeight(block);
}

function getLayout(block: Block): 'auto' | 'half' | 'full' {
  return block.layout ?? 'auto';
}

/**
 * Decide si un bloque necesita ancho completo.
 * Las preferencias manuales siempre tienen prioridad.
 */
function needsFullWidth(
  block: Block,
  measurements: BlockMeasurements,
  capacity: number
): boolean {
  const layout = getLayout(block);

  if (layout === 'full') return true;
  if (layout === 'half') return false;

  const half = getHeight(block, measurements, 'half');
  const full = getHeight(block, measurements, 'full');

  // Un bloque muy alto puede aprovechar mejor
  // toda la anchura de la página.
  return (
    half > capacity * 0.65 &&
    full < half * 0.75
  );
}

/**
 * Comprueba si una pila lateral aprovecha
 * mejor el espacio que dos filas normales.
 */
function shouldStack(
  first: Block,
  second: Block,
  third: Block,
  measurements: BlockMeasurements,
  capacity: number
): boolean {
  const h1 = getHeight(first, measurements);
  const h2 = getHeight(second, measurements);
  const h3 = getHeight(third, measurements);

  const stackHeight = h1 + h2 + GAP;
  const resultHeight = Math.max(stackHeight, h3);

  // El bloque lateral debe ser más grande
  // que cualquiera de los dos primeros.
  if (h3 < Math.max(h1, h2) * 1.15) {
    return false;
  }

  // Evitar composiciones demasiado desequilibradas.
  const ratio = stackHeight / h3;

  if (ratio < 0.55 || ratio > 1.7) {
    return false;
  }

  // No crear grupos que superen una página.
  if (resultHeight > capacity) {
    return false;
  }

  // Comparamos contra dos filas:
  // fila 1: primero + segundo
  // fila 2: tercero
  const normalHeight =
    Math.max(h1, h2) + GAP + h3;

  // La pila debe ofrecer una mejora apreciable.
  return resultHeight < normalHeight * 0.88;
}

/**
 * Calcula la altura de una composición completa.
 */
function rowHeight(
  row: PageRow,
  measurements: BlockMeasurements
): number {
  if (row.full) {
    return getHeight(row.full, measurements, 'full');
  }

  const left = row.left
    ? getHeight(row.left, measurements)
    : (row.leftStack ?? []).reduce(
        (sum, block, index) =>
          sum +
          getHeight(block, measurements) +
          (index ? GAP : 0),
        0
      );

  const right = row.right
    ? getHeight(row.right, measurements)
    : 0;

  return Math.max(left, right);
}

/**
 * Genera composiciones respetando el orden
 * original de los bloques.
 */
export function buildRows(
  blocks: Block[],
  measurements: BlockMeasurements = {},
  capacity = 905
): PageRow[] {
  const rows: PageRow[] = [];
  let index = 0;

  const wantsFull = (block: Block) =>
    needsFullWidth(block, measurements, capacity);

  const addRow = (row: PageRow) => {
    rows.push({
      ...row,
      height: rowHeight(row, measurements),
    });
  };

  while (index < blocks.length) {
    const first = blocks[index];
    const second = blocks[index + 1];
    const third = blocks[index + 2];

    // 1. Ancho completo.
    if (wantsFull(first)) {
      addRow({ full: first, height: 0 });
      index++;
      continue;
    }

    // 2. Dos bloques apilados junto a uno grande.
    if (
      second &&
      third &&
      !wantsFull(second) &&
      !wantsFull(third) &&
      shouldStack(
        first,
        second,
        third,
        measurements,
        capacity
      )
    ) {
      addRow({
        leftStack: [first, second],
        right: third,
        height: 0,
      });

      index += 3;
      continue;
    }

    // 3. Dos bloques en horizontal.
    if (second && !wantsFull(second)) {
      addRow({
        left: first,
        right: second,
        height: 0,
      });

      index += 2;
      continue;
    }

    // 4. Un bloque en media página.
    addRow({ left: first, height: 0 });
    index++;
  }

  return rows;
}

/**
 * Distribuye las composiciones entre páginas.
 */
export function paginateRows(
  rows: PageRow[],
  measuredHeights: number[],
  capacity: number,
  gap = GAP
): Page[] {
  const pages: Page[] = [{ rows: [] }];
  let used = 0;

  rows.forEach((row, index) => {
    const height =
      measuredHeights[index] > 0
        ? measuredHeights[index]
        : row.height;

    let page = pages[pages.length - 1];
    const spacing = page.rows.length ? gap : 0;

    if (
      page.rows.length > 0 &&
      used + spacing + height > capacity + 0.5
    ) {
      pages.push({ rows: [] });
      used = 0;
    }

    page = pages[pages.length - 1];

    used += (page.rows.length ? gap : 0) + height;
    page.rows.push({ ...row, height });

    if (height > capacity + 0.5) {
      page.oversize = true;
    }
  });

  return pages;
}

/** Mantiene compatibilidad con llamadas anteriores. */
export function paginate(
  blocks: Block[],
  capacity = 905
): Page[] {
  const rows = buildRows(blocks, {}, capacity);

  return paginateRows(rows, [], capacity);
}


/**
 * PAGINACIÓN ADAPTATIVA v0.6
 *
 * Evalúa composiciones según:
 * - Altura real de los bloques
 * - Espacio disponible en la página
 * - Orden original
 * - Preferencia manual de ancho
 */


export function paginateAdaptive(
  blocks: Block[],
  measurements: BlockMeasurements,
  capacity: number,
  gap = 10
): Page[] {
  const pages: Page[] = [{ rows: [] }];

  // Propósito y PDA son una pareja obligatoria.
  const purpose = blocks.find(
    (block) => block.kind === 'purpose'
  );

  const pda = blocks.find(
    (block) => block.kind === 'pda'
  );

  const hasHeader = Boolean(purpose && pda);

  const flowBlocks = hasHeader
    ? blocks.filter(
        (block) => block !== purpose && block !== pda
      )
    : blocks;

  const height = (
    block: Block,
    width: 'half' | 'full' = 'half'
  ) => getHeight(block, measurements, width);

  const hasWideTable = (block: Block): boolean =>
    (block.table?.headers.length ?? 0) >= 4 ||
    (block.elements ?? []).some(
      (element) =>
        element.type === 'table' &&
        element.table.headers.length >= 4
    );

  const hasComplexContent = (block: Block): boolean =>
    Boolean(block.table) ||
    Boolean(block.checklist) ||
    Boolean(block.multipleChoice) ||
    (block.elements ?? []).some(
      (element) => element.type === 'table'
    );

  const wantsFull = (block: Block): boolean => {
    if (block.layout === 'full') return true;
    if (block.layout === 'half') return false;

    if (hasWideTable(block)) return true;

    const half = height(block, 'half');
    const full = height(block, 'full');

    return (
      half > capacity * 0.65 &&
      full < half * 0.75
    );
  };

  const makeRow = (
    row: Omit<PageRow, 'height'>,
    rowHeight: number
  ): PageRow => ({
    ...row,
    height: rowHeight,
  });

  const newPage = () => {
    pages.push({ rows: [] });
  };

  const currentPage = () =>
    pages[pages.length - 1];

  const pageUsed = (page: Page): number =>
    page.rows.reduce(
      (sum, row, index) =>
        sum + row.height + (index > 0 ? gap : 0),
      0
    );

  const addRow = (row: PageRow) => {
    const page = currentPage();
    page.rows.push(row);

    if (row.height > capacity + 0.5) {
      page.oversize = true;
    }
  };

  // Primera fila fija.
  if (purpose && pda) {
    addRow(
      makeRow(
        {
          left: purpose,
          right: pda,
        },
        Math.max(
          height(purpose, 'half'),
          height(pda, 'half')
        )
      )
    );
  }

  type Candidate = {
    row: PageRow;
    consumed: number;
    penalty: number;
  };

  // Composiciones posibles desde un punto dado.
  const candidatesAt = (
    index: number
  ): Candidate[] => {
    const first = flowBlocks[index];
    const second = flowBlocks[index + 1];
    const third = flowBlocks[index + 2];

    if (!first) return [];

    const candidates: Candidate[] = [];

    if (wantsFull(first)) {
      candidates.push({
        row: makeRow(
          { full: first },
          height(first, 'full')
        ),
        consumed: 1,
        penalty: 0,
      });

      return candidates;
    }

    // Opción A: un bloque a media anchura.
    candidates.push({
      row: makeRow(
        { left: first },
        height(first, 'half')
      ),
      consumed: 1,
      penalty: 12,
    });

    if (
      second &&
      !wantsFull(second)
    ) {
      const h1 = height(first, 'half');
      const h2 = height(second, 'half');

      // Opción B: dos bloques en una fila.
      candidates.push({
        row: makeRow(
          {
            left: first,
            right: second,
          },
          Math.max(h1, h2)
        ),
        consumed: 2,
        penalty:
          Math.abs(h1 - h2) /
          Math.max(h1, h2, 1) * 8,
      });

      // Opción C: dos apilados a la izquierda.
      if (
        third &&
        !wantsFull(third) &&
        ![first, second, third].some(
          (block) =>
            block.kind === 'purpose' ||
            block.kind === 'pda' ||
            hasComplexContent(block)
        )
      ) {
        const h3 = height(third, 'half');
        const stack = h1 + gap + h2;
        const composed = Math.max(stack, h3);

        const suitable =
          h3 >= Math.max(h1, h2) * 1.15 &&
          stack / Math.max(h3, 1) >= 0.65 &&
          stack / Math.max(h3, 1) <= 1.45;

        const normal =
          Math.max(h1, h2) + gap + h3;

        if (
          suitable &&
          composed <= normal * 0.88
        ) {
          candidates.push({
            row: makeRow(
              {
                leftStack: [first, second],
                right: third,
              },
              composed
            ),
            consumed: 3,
            penalty: 5,
          });
        }
      }
    }

    return candidates;
  };

  type Plan = {
    rows: PageRow[];
    nextIndex: number;
    used: number;
    penalty: number;
  };

  const MAX_LOOKAHEAD_ROWS = 8;

  // Busca la composición más conveniente
  // sin modificar el orden de los bloques.
  const findBestPlan = (
    startIndex: number,
    initialUsed: number,
    initialRows: number
  ): Plan => {
    const evaluate = (
      index: number,
      used: number,
      rowsOnPage: number,
      depth: number
    ): Plan => {
      let best: Plan = {
        rows: [],
        nextIndex: index,
        used,
        penalty: 0,
      };

      if (
        depth >= MAX_LOOKAHEAD_ROWS ||
        index >= flowBlocks.length
      ) {
        return best;
      }

      for (const candidate of candidatesAt(index)) {
        const spacing = rowsOnPage > 0 ? gap : 0;
        const nextUsed =
          used + spacing + candidate.row.height;

        if (nextUsed > capacity + 0.5) {
          continue;
        }

        const next = evaluate(
          index + candidate.consumed,
          nextUsed,
          rowsOnPage + 1,
          depth + 1
        );

        const plan: Plan = {
          rows: [candidate.row, ...next.rows],
          nextIndex: next.nextIndex,
          used: next.used,
          penalty: candidate.penalty + next.penalty,
        };

        // Prioridad:
        // 1. Más bloques en la página.
        // 2. Mejor aprovechamiento del espacio.
        // 3. Menos composiciones forzadas.
        const score = (value: Plan) =>
          (value.nextIndex - startIndex) * 10000 +
          (value.used / Math.max(capacity, 1)) * 100 -
          value.penalty;

        if (score(plan) > score(best)) {
          best = plan;
        }
      }

      return best;
    };

    return evaluate(
      startIndex,
      initialUsed,
      initialRows,
      0
    );
  };

  let index = 0;

  while (index < flowBlocks.length) {
    const page = currentPage();
    const used = pageUsed(page);

    const plan = findBestPlan(
      index,
      used,
      page.rows.length
    );

    if (plan.rows.length > 0) {
      plan.rows.forEach(addRow);
      index = plan.nextIndex;
      continue;
    }

    // No cabe otra composición en esta página.
    if (page.rows.length > 0) {
      newPage();
      continue;
    }

    // Bloque indivisible más alto que una página.
    // Lo colocamos y marcamos el desbordamiento.
    const fallback = candidatesAt(index)[0];

    addRow(fallback.row);
    index += fallback.consumed;

    currentPage().oversize = true;

    if (index < flowBlocks.length) {
      newPage();
    }
  }

  return pages;
}

