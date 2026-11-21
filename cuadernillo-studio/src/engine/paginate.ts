
import type { Block } from '../models/document';

export type BlockMeasurements = Record<
  string,
  { half: number; full: number; '30'?: number; '40'?: number; '60'?: number; '70'?: number }
>;

export type PageRow = {
  left?: Block;
  right?: Block;
  leftStack?: Block[];
  full?: Block;
  height: number;
  /** Proporción del bloque izquierdo; si falta se usa 50/50. */
  leftPercent?: number;
  equalHeight?: boolean;
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

/** Usa la altura medida al ancho real, sin extrapolar la altura a partir de 50 %. */
function atPercent(block: Block, measurements: BlockMeasurements, percent: number): number {
  if (percent === 50) return getHeight(block, measurements, 'half');
  const measured = measurements[block.id]?.[String(percent) as '30' | '40' | '60' | '70'];
  return measured && measured > 0 ? measured : getHeight(block, measurements, 'half');
}

/** Solo activa la pareja si los IDs siguen siendo adyacentes. */
function explicitRow(first: Block, second?: Block) {
  return first.rowLayout && second &&
    first.rowLayout.partnerId === (second.sourceId ?? second.id) &&
    second.breakBefore !== 'always'
      ? first.rowLayout
      : undefined;
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
    ? (row.leftPercent ? atPercent(row.left, measurements, row.leftPercent) : getHeight(row.left, measurements))
    : (row.leftStack ?? []).reduce(
        (sum, block, index) =>
          sum +
          getHeight(block, measurements) +
          (index ? GAP : 0),
        0
      );

  const right = row.right
    ? (row.leftPercent ? atPercent(row.right, measurements, 100 - row.leftPercent) : getHeight(row.right, measurements))
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

    // Pareja fija, antes de las decisiones automáticas.
    const explicit = explicitRow(first, second);
    if (explicit) {
      addRow({
        left: first, right: second,
        leftPercent: explicit.leftPercent,
        equalHeight: explicit.equalHeight,
        height: Math.max(
          atPercent(first, measurements, explicit.leftPercent),
          atPercent(second, measurements, 100 - explicit.leftPercent)
        ),
      });
      index += 2;
      continue;
    }

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
      !explicitRow(second, third) &&
      ![first, second, third].some((block) => block.kind === 'image' || Boolean(block.rowLayout)) &&
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
    if (second && !wantsFull(second) && !explicitRow(second, third)) {
      addRow({
        left: first,
        right: second,
        equalHeight: first.kind !== 'image' && second.kind !== 'image',
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
  gap = 10,
  continuationCapacity = capacity
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

  const hasTable = (block: Block): boolean =>
    Boolean(block.table) ||
    (block.elements ?? []).some((element) => element.type === 'table');

  const hasComplexContent = (block: Block): boolean =>
    block.kind === 'image' ||
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

    const pageCapacity = pages.length === 1 ? capacity : continuationCapacity;
    if (row.height > pageCapacity + 0.5) {
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

    const explicit = explicitRow(first, second);
    if (explicit) {
      const h1 = atPercent(first, measurements, explicit.leftPercent);
      const h2 = atPercent(second!, measurements, 100 - explicit.leftPercent);
      candidates.push({
        row: makeRow({
          left: first, right: second,
          leftPercent: explicit.leftPercent,
          equalHeight: explicit.equalHeight,
        }, Math.max(h1, h2)),
        consumed: 2,
        penalty: 0,
      });
      return candidates;
    }

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
      !wantsFull(second) &&
      second.breakBefore !== 'always' &&
      !explicitRow(second, third)
    ) {
      const h1 = height(first, 'half');
      const h2 = height(second, 'half');

      // Opción B: dos bloques en una fila.
      candidates.push({
        row: makeRow(
          {
            left: first,
            right: second,
            equalHeight: first.kind !== 'image' && second.kind !== 'image',
          },
          Math.max(h1, h2)
        ),
        consumed: 2,
        penalty:
          Math.abs(h1 - h2) /
          Math.max(h1, h2, 1) * 8,
      });

      // Opción C: dos apilados a la izquierda.
      // Excepción limitada: Inicio (con tabla estrecha) + Pregunta detonadora
      // pueden acompañar a Desarrollo. Las demás restricciones se conservan.
      const introWithDevelopment = Boolean(
        third &&
        first.kind === 'start' &&
        second.kind === 'question' &&
        third.kind === 'development' &&
        hasTable(first) &&
        !hasWideTable(first) &&
        !first.checklist &&
        !first.multipleChoice &&
        !hasComplexContent(second) &&
        !hasComplexContent(third)
      );

      if (
        third &&
        !wantsFull(third) &&
        third.breakBefore !== 'always' &&
        !first.rowLayout && !second.rowLayout &&
        ![first, second, third].some(
          (block) =>
            block.kind === 'purpose' ||
            block.kind === 'pda'
        ) &&
        (introWithDevelopment || ![first, second, third].some(hasComplexContent))
      ) {
        const h3 = height(third, 'half');
        const stack = h1 + gap + h2;
        const composed = Math.max(stack, h3);

        // Tolerancia de 2 px en la comparación de alturas: evita rechazarla
        // por diferencias mínimas de medición (636 frente a 637.1 px).
        const minRelativeHeight = Math.max(h1, h2) * 1.15;
        const suitable =
          h3 >= minRelativeHeight - (introWithDevelopment ? 2 : 0) &&
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
    initialRows: number,
    pageCapacity: number
  ): Plan => {
    // Solo proteger el cierre cuando se haya aplicado realmente la
    // nueva composición de Inicio + Pregunta + Desarrollo.
    const hasIntroStack = pages.some((page) => page.rows.some((row) =>
      row.leftStack?.[0]?.kind === 'start' &&
      row.leftStack?.[1]?.kind === 'question' &&
      row.right?.kind === 'development'
    ));

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

      // Un divisor obligatorio exige la nueva página; no se mezcla en el plan actual.
      if (flowBlocks[index]?.breakBefore === 'always' && rowsOnPage > 0) return best;

      for (const candidate of candidatesAt(index)) {
        const spacing = rowsOnPage > 0 ? gap : 0;
        const nextUsed =
          used + spacing + candidate.row.height;

        if (nextUsed > pageCapacity + 0.5) {
          continue;
        }

        // Si Cierre y Autoevaluación consecutivos caben juntos en una
        // página de continuación, no dejar la Autoevaluación huérfana.
        // No afecta cierres cuyos dos bloques realmente no caben juntos.
        const nextBlock = flowBlocks[index + candidate.consumed];
        if (
          hasIntroStack &&
          rowsOnPage > 0 &&
          flowBlocks[index]?.kind === 'closing' &&
          candidate.consumed === 1 &&
          nextBlock?.kind === 'selfEvaluation' &&
          nextBlock.breakBefore !== 'always'
        ) {
          const evaluationHeight = wantsFull(nextBlock)
            ? height(nextBlock, 'full')
            : height(nextBlock, 'half');
          const combinedHeight = candidate.row.height + gap + evaluationHeight;
          if (
            combinedHeight <= continuationCapacity + 0.5 &&
            nextUsed + gap + evaluationHeight > pageCapacity + 0.5
          ) {
            continue;
          }
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
          (value.used / Math.max(pageCapacity, 1)) * 100 -
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
    // La primera hoja reserva el encabezado completo; las otras, el compacto.
    const pageCapacity = pages.length === 1 ? capacity : continuationCapacity;

    const plan = findBestPlan(
      index,
      used,
      page.rows.length,
      pageCapacity
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

