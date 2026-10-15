
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

  let index = 0;
  let used = 0;

  const height = (
    block: Block,
    width: 'half' | 'full' = 'half'
  ): number => {
    return getHeight(block, measurements, width);
  };

  const layout = (block: Block) =>
    block.layout ?? 'auto';

  const wantsFull = (block: Block): boolean => {
    if (layout(block) === 'full') return true;
    if (layout(block) === 'half') return false;

    const half = height(block, 'half');
    const full = height(block, 'full');

    return (
      half > capacity * 0.65 &&
      full < half * 0.75
    );
  };

  const getRemaining = (): number =>
    capacity - used;

  const newPage = () => {
    pages.push({ rows: [] });
    used = 0;
  };

  const add = (row: PageRow, rowHeight: number) => {
    const page = pages[pages.length - 1];
    const spacing = page.rows.length ? gap : 0;

    page.rows.push({
      ...row,
      height: rowHeight,
    });

    used += spacing + rowHeight;

    if (rowHeight > capacity + 0.5) {
      page.oversize = true;
    }
  };

  while (index < blocks.length) {
    const first = blocks[index];
    const second = blocks[index + 1];
    const third = blocks[index + 2];

    const page = pages[pages.length - 1];
    const spacing = page.rows.length ? gap : 0;
    const available = getRemaining() - spacing;

    const h1 = height(first);

    // 1. Bloque de ancho completo
    if (wantsFull(first)) {
      const fullHeight = height(first, 'full');

      if (
        fullHeight > available &&
        page.rows.length > 0
      ) {
        newPage();
        continue;
      }

      add(
        { full: first, height: fullHeight },
        fullHeight
      );

      index++;
      continue;
    }

    // 2. Evaluar pila lateral de tres bloques
    if (
      second &&
      third &&
      !wantsFull(second) &&
      !wantsFull(third)
    ) {
      const h2 = height(second);
      const h3 = height(third);

      const stackHeight = h1 + h2 + gap;
      const composedHeight = Math.max(
        stackHeight,
        h3
      );

      const normalHeight =
        Math.max(h1, h2) + gap + h3;

      // El tercer bloque debe ser más alto que
      // los anteriores y tener tamaño compatible.
      const suitable =
        h3 >= Math.max(h1, h2) * 1.15 &&
        stackHeight / h3 >= 0.65 &&
        stackHeight / h3 <= 1.45;

      const useful =
        composedHeight <= normalHeight * 0.88;

      // Solo agrupar si cabe en una página.
      if (
        suitable &&
        useful &&
        composedHeight <= capacity + 0.5
      ) {
        if (composedHeight <= available + 0.5) {
          add(
            {
              leftStack: [first, second],
              right: third,
              height: composedHeight,
            },
            composedHeight
          );

          index += 3;
          continue;
        }

        // Si no cabe la pila, permitir que la
        // siguiente página la reciba completa.
        if (page.rows.length > 0) {
          newPage();
          continue;
        }
      }
    }

    // 3. Evaluar pareja horizontal
    if (second && !wantsFull(second)) {
      const h2 = height(second);
      const pairHeight = Math.max(h1, h2);

      if (pairHeight <= available + 0.5) {
        add(
          {
            left: first,
            right: second,
            height: pairHeight,
          },
          pairHeight
        );

        index += 2;
        continue;
      }

      // Si la pareja no cabe pero el primer
      // bloque sí, aprovechar el espacio
      // sin alterar el orden pedagógico.
      if (
        h1 <= available + 0.5 &&
        available >= 100
      ) {
        add(
          { left: first, height: h1 },
          h1
        );

        index++;
        continue;
      }
    }

    // 4. Bloque individual
    if (h1 <= available + 0.5) {
      add(
        { left: first, height: h1 },
        h1
      );

      index++;
      continue;
    }

    // 5. Trasladar a la siguiente página
    if (page.rows.length > 0) {
      newPage();
      continue;
    }

    // El bloque es demasiado grande para una
    // página. Se muestra advertencia.
    add(
      { left: first, height: h1 },
      h1
    );

    index++;
  }

  return pages;
}
