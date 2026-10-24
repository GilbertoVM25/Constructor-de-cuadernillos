import { blockThemes } from '../../styles/blockThemes';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { TextImageView } from '../editor/TextImageView';
import { CardGridView } from '../editor/CardGridView';

import { blockIcons } from '../../styles/blockIcons';

import DOMPurify from 'dompurify';

import type {
  Block,
  Workbook,
  QuestionElement,
  ContentElement,
} from '../../models/document';

import {
  paginateAdaptive,
  type PageRow,
  type BlockMeasurements,
} from '../../engine/paginate';

import {
  createAtomicBlocks,
  splitOversizedBlocks,
} from '../../engine/splitBlocks';


function cleanRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'sub',
      'sup',
      'ul',
      'ol',
      'li',
    ],
    ALLOWED_ATTR: [],
  });
}


const colors: Record<string, string> = {
  purpose: '#f8d9a3',
  pda: '#f8d9a3',
  start: '#0b5acb',
  development: '#f04b17',
  question: '#ff511c',
  case: '#60349c',
  activity: '#0863db',
};


type PreviewProps = {
  workbook: Workbook;
  selected: string | null;
  onSelect: (id: string) => void;

  pageStart?: number;
  className?: string;
  onPageCountChange?: (count: number) => void;

  selectedElementId?: string | null;

  onSelectElement?: (
    blockId: string,
    elementId: string
  ) => void;
};





type ElementSelectionProps = {
  selectedElementId?: string | null;
  onSelectElement?: (
    blockId: string,
    elementId: string
  ) => void;
};

function TableCellContent({ table, row, column, text }: {
  table: { cellImages?: Record<string, { src: string; width?: number; align?: 'left' | 'center' | 'right' }> };
  row: number;
  column: number;
  text: string;
}) {
  const image = table.cellImages?.[`${row}:${column}`];
  return (
    <div className="workbook-table-cell-content">
      {image?.src && (
        <img
          className="workbook-table-cell-image"
          src={image.src}
          alt="Ilustración de la celda"
          style={{ width: `${Math.max(20, Math.min(100, image.width ?? 85))}%`,
            alignSelf: image.align === 'left' ? 'flex-start' : image.align === 'right' ? 'flex-end' : 'center' }}
        />
      )}
      {text && <span className="workbook-table-cell-text">{text}</span>}
      {!text && !image?.src && '\u00A0'}
    </div>
  );
}

function ContentElementsView({
  block,
  selectedElementId,
  onSelectElement,
}: {
  block: Block;
} & ElementSelectionProps) {

  const elements = block.elements ?? [];

  
  const selectElement = (
    event: React.MouseEvent,
    elementId: string
  ) => {
    if (!onSelectElement) return;

    event.stopPropagation();

    onSelectElement(
      block.sourceId ?? block.id,
      elementId
    );
  };

  const elementClass = (
    id: string,
    baseClass: string
  ) => {
    if (!onSelectElement) return baseClass;

    return `${baseClass} preview-selectable-element ${
      selectedElementId === id
        ? 'preview-element-selected'
        : ''
    }`;
  };


  const renderQuestion = (element: QuestionElement) => (
<div
              className={elementClass(
                element.id,
                `educational-question ${element.answerPosition === 'inline' ? 'question-inline' : ''}`
              )}
              onClick={(event) =>
                selectElement(event, element.id)
              }
              key={element.id}
            >
              <div className="educational-question-text">
                <span className="question-number">
                  •
                </span>

                
                {element.richHtml != null ? (
                  <div
                    className="rich-text-rendered"
                    dangerouslySetInnerHTML={{
                      __html: cleanRichHtml(element.richHtml),
                    }}
                  />
                ) : (
                  <span>{element.text}</span>
                )}

              </div>

              {element.answerLines > 0 && (
                <div className="question-answer">
                  {Array.from({
                    length: Math.min(
                      20,
                      Math.max(0, element.answerLines)
                    ),
                  }).map((_, index) => (
                    <div
                      className="question-answer-line"
                      key={index}
                    />
                  ))}
                </div>
              )}
            </div>
  );

  // Solo preguntas half consecutivas comparten fila; nunca se reordenan.
  const grouped: Array<ContentElement | [QuestionElement, QuestionElement]> = [];
  for (let i = 0; i < elements.length; i++) {
    const current = elements[i];
    const next = elements[i + 1];
    if (current.type === 'question' && current.width === 'half' &&
        next?.type === 'question' && next.width === 'half') {
      grouped.push([current, next]);
      i++;
    } else {
      grouped.push(current);
    }
  }

  if (elements.length === 0) return null;

  return (
    <div className="workbook-elements">
      {grouped.map((entry) => {
        if (Array.isArray(entry)) {
          return <div className="question-pair" key={`${entry[0].id}-${entry[1].id}`}>
            {entry.map(renderQuestion)}
          </div>;
        }
        const element = entry;
        if (element.type === 'text') {
          return (
            <div
              className={elementClass(
                element.id,
                'workbook-text-element'
              )}
              onClick={(event) =>
                selectElement(event, element.id)
              }
              key={element.id}
            >
              
              {element.richHtml != null ? (
                <div
                  className="rich-text-rendered"
                  dangerouslySetInnerHTML={{
                    __html: cleanRichHtml(element.richHtml),
                  }}
                />
              ) : (
                element.content
              )}

            </div>
          );
        }

        if (element.type === 'question') return renderQuestion(element);

        if (element.type === 'table') {
          const table = element.table;

          return (
            <div
              className={elementClass(
                element.id,
                'workbook-table-container'
              )}
              onClick={(event) =>
                selectElement(event, element.id)
              }
              key={element.id}
            >
              <table className="workbook-data-table">
                {table.showHeaders && (
                  <thead>
                    <tr>
                      {table.headers.map((header, index) => (
                        <th key={index} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}

                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {table.headers.map((_, columnIndex) => (
                        <td key={columnIndex}>
                          <TableCellContent table={table} row={rowIndex} column={columnIndex} text={row[columnIndex] ?? ''} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        
        if (element.type === 'image') {
          return (
            <figure
              className={elementClass(
                element.id,
                'workbook-image-element'
              )}
              onClick={(event) =>
                selectElement(event, element.id)
              }
              key={element.id}
              style={{
                width: `${element.width}%`,
                alignSelf:
                  element.align === 'left'
                    ? 'flex-start'
                    : element.align === 'right'
                      ? 'flex-end'
                      : 'center',
              }}
            >
              {element.src ? (
                <img
                  src={element.src}
                  alt={element.caption || 'Imagen educativa'}
                  className="workbook-element-image"
                />
              ) : (
                <div className="workbook-image-placeholder">
                  Imagen sin seleccionar
                </div>
              )}

              {element.caption.trim() && (
                <figcaption>
                  {element.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        if (element.type === 'textImage') {
          return (
            <TextImageView
              key={element.id}
              value={element}
              className={elementClass(element.id, '')}
              onClick={event => selectElement(event, element.id)}
            />
          );
        }
        
        if (element.type === 'gallery') {
          return (
            <div
              className={elementClass(
                element.id,
                'workbook-gallery'
              )}
              onClick={(event) =>
                selectElement(event, element.id)
              }
              key={element.id}
              style={{
                gridTemplateColumns:
                  `repeat(${element.images.length}, minmax(0, 1fr))`,
                gap: `${element.gap}px`,
              }}
            >
              {element.images.map((image) => (
                <figure
                  className="workbook-gallery-item"
                  key={image.id}
                >
                  {image.src ? (
                    <img
                      src={image.src}
                      alt={image.caption || 'Imagen educativa'}
                    />
                  ) : (
                    <div className="workbook-image-placeholder">
                      Imagen sin seleccionar
                    </div>
                  )}

                  {image.caption.trim() && (
                    <figcaption>{image.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          );
        }
        
        if (element.type === 'cardGrid') {
          return <CardGridView
            key={element.id}
            value={element}
            className={elementClass(element.id, '')}
            onClick={(event) => selectElement(event, element.id)}
          />;
        }

        if (element.type === 'responseArea') {
          const areaHeight = Math.max(
            80,
            Math.min(500, element.height)
          );

          return (
            <div
              key={element.id}
              className={elementClass(
                element.id,
                'workbook-response-element'
              )}
              onClick={(event) =>
                selectElement(event, element.id)
              }
            >
              {element.label && (
                <div className="workbook-response-label">
                  {element.label}
                </div>
              )}

              <div
                className={`workbook-response-area response-style-${element.style}`}
                style={{ height: areaHeight }}
              >
                {element.style === 'lines' && (
                  <div className="workbook-response-lines">
                    {Array.from({
                      length: Math.floor(
                        (areaHeight - 12) / 28
                      ),
                    }).map((_, index) => (
                      <div
                        key={index}
                        className="workbook-response-line"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}



function ChecklistView({ block }: { block: Block }) {
  if (!block.checklist) return null;

  return (
    <div className="workbook-checklist">
      <table>
        <thead>
          <tr>
            <th>Criterio</th>
            <th>Logrado</th>
            <th>En proceso</th>
            <th>Necesito apoyo</th>
          </tr>
        </thead>

        <tbody>
          {block.checklist.map((item) => (
            <tr key={item.id}>
              <td>{item.text}</td>
              <td className="check-cell">☐</td>
              <td className="check-cell">☐</td>
              <td className="check-cell">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MultipleChoiceView({
  block,
}: {
  block: Block;
}) {
  const exercise = block.multipleChoice;

  if (!exercise) return null;

  return (
    <div className="workbook-multiple-choice">
      {exercise.situation?.trim() && (
        <div className="pisa-situation">
          {exercise.situation}
        </div>
      )}

      <p className="pisa-question">
        {exercise.question}
      </p>

      <div className="pisa-options">
        {exercise.options.map((option, index) => (
          <div className="pisa-option" key={index}>
            <span className="option-marker">
              {String.fromCharCode(65 + index)}.
            </span>

            <span>{option}</span>
          </div>
        ))}
      </div>

      {exercise.justificationLines > 0 && (
        <div className="pisa-justification">
          <strong>Justifica tu respuesta:</strong>

          {Array.from({
            length: exercise.justificationLines,
          }).map((_, index) => (
            <div
              className="question-answer-line"
              key={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function WorkbookTableView({
  block,
}: {
  block: Block;
}) {
  const table = block.table;

  if (!table) return null;

  return (
    <div className="workbook-table-container">
      <table className="workbook-data-table">
        {table.showHeaders && (
          <thead>
            <tr>
              {table.headers.map((header, index) => (
                <th key={index} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, columnIndex) => (
                <td key={columnIndex}>
                  <TableCellContent table={table} row={rowIndex} column={columnIndex} text={cell ?? ''} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function BlockCard({
  block,
  selected,
  onSelect,
  selectedElementId,
  onSelectElement,
}: {
  block: Block;
  selected: boolean;
  onSelect: (id: string) => void;
} & ElementSelectionProps) {
  const isInformation = ['purpose', 'pda'].includes(
    block.kind
  );

  const hasPhoto = ['case', 'development'].includes(
    block.kind
  );

  const theme = blockThemes[block.kind];

  const headingIcon = blockIcons[block.kind];

  return (
    <div
      className={`block-card ${selected ? 'selected' : ''}`}
      style={{
        borderColor: theme.border,
        backgroundColor: theme.background,
        minHeight: block.minHeight,
      }}
      onClick={() => onSelect(block.sourceId ?? block.id)}
    >
      <div
        className="block-title"
        style={{
          backgroundColor: theme.headerBackground,
          color: theme.headerText,
        }}
      >
        
      
      {headingIcon && (
        <img
          className="block-type-icon"
          src={headingIcon}
          alt=""
          aria-hidden="true"
        />
      )}

      <strong>{block.title}</strong>

      </div>

      {block.body?.trim() && (
        <div className="block-body">
          {block.body}
        </div>
      )}

      
      {block.image && hasPhoto && (
        <img
          className="block-photo"
          src={block.image}
          alt=""
        />
      )}

      <ContentElementsView
        block={block}
        selectedElementId={selectedElementId}
        onSelectElement={onSelectElement}
      />

      <ChecklistView block={block} />
      <MultipleChoiceView block={block} />
      <WorkbookTableView block={block} />

      {!block.suppressLegacyLines &&
      (!block.elements || block.elements.length === 0) &&
      ['start', 'question', 'activity'].includes(block.kind) && (
        <div className="answer-lines">
          ____________________________
          <br />
          ____________________________
        </div>
      )}

    </div>
  );
}

function BlockStack({
  blocks,
  selected,
  onSelect,
  selectedElementId,
  onSelectElement,
}: {
  blocks: Block[];
  selected: string | null;
  onSelect: (id: string) => void;
} & ElementSelectionProps) {
  return (
    <div className="paper-stack">
      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          selected={selected === (block.sourceId ?? block.id)}
          onSelect={onSelect}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
        />
      ))}
    </div>
  );
}

function PageRowView({
  row,
  selected,
  onSelect,
  selectedElementId,
  onSelectElement,
}: {
  row: PageRow;
  selected: string | null;
  onSelect: (id: string) => void;
} & ElementSelectionProps) {
  if (row.full) {
    return (
      <div className="paper-row paper-row-full">
        <BlockCard
          block={row.full}
          selected={selected === (row.full.sourceId ?? row.full.id)}
          onSelect={onSelect}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
        />
      </div>
    );
  }

  return (
    <div className="paper-row">
      <div className="paper-cell">
        {row.left && (
          <BlockCard
            block={row.left}
            selected={selected === (row.left.sourceId ?? row.left.id)}
            onSelect={onSelect}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
          />
        )}

        {row.leftStack && (
          <BlockStack
            blocks={row.leftStack}
            selected={selected}
            onSelect={onSelect}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
          />
        )}
      </div>

      <div className="paper-cell">
        {row.right && (
          <BlockCard
            block={row.right}
            selected={selected === (row.right.sourceId ?? row.right.id)}
            onSelect={onSelect}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
          />
        )}
      </div>
    </div>
  );
}

function Header({
  workbook,
}: {
  workbook: Workbook;
}) {
  return (
    <div className="paper-head">
      <div className="sequence">
        SECUENCIA {workbook.sequence}
      </div>

      <div>
        <h1>{workbook.title}</h1>
        <p>{workbook.subtitle}</p>
      </div>

      <div className="subject">
        Química
        <small>Nivel Secundaria</small>
      </div>
    </div>
  );
}



function Footer({
  pageNumber,
  workbook,
}: {
  pageNumber: number;
  workbook: Workbook;
}) {
  return (
    <footer>
      <span className="footer-content">
        {workbook.contentNumber
          ? `Contenido ${workbook.contentNumber}`
          : 'Contenido sin asignar'}

        {workbook.contentTitle?.trim()
          ? ` · ${workbook.contentTitle}`
          : ''}
      </span>

      <span>{pageNumber}</span>
    </footer>
  );
}



export function PagePreview({
  workbook,
  selected,
  onSelect,
  pageStart = 5,
  className = '',
  onPageCountChange,
  selectedElementId = null,
  onSelectElement,
}: PreviewProps) {
  const [measurements, setMeasurements] = useState<{
    blocks: BlockMeasurements;
    capacity: number;
  }>({
    blocks: {},
    capacity: 905,
  });

  const [showPaginationDebug, setShowPaginationDebug] = useState(false);

  const measurementRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  /*
   * Mide los bloques a dos anchuras:
   * media página y página completa.
   */
  useLayoutEffect(() => {
    const container = measurementRef.current;
    const probe = probeRef.current;

    if (!container || !probe) return;

    let frame = 0;
    let active = true;

    const calculate = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        if (!active) return;

        const next: BlockMeasurements = {};

        const elements =
          container.querySelectorAll<HTMLElement>(
            '[data-measure-id]'
          );

        elements.forEach((element) => {
          const id = element.dataset.measureId;
          const width = element.dataset.measureWidth as
            | 'half'
            | 'full';

          if (!id || !width) return;

          next[id] ??= { half: 0, full: 0 };

          next[id][width] =
            element.getBoundingClientRect().height;
        });

        const region =
          probe.querySelector<HTMLElement>(
            '.paper-rows'
          );

        const capacity =
          region?.getBoundingClientRect().height ??
          905;

        setMeasurements((previous) => {
          const sameCapacity =
            Math.abs(previous.capacity - capacity) < 0.5;

          const sameBlocks = workbook.blocks.every(
            (block) => {
              const old = previous.blocks[block.id];
              const current = next[block.id];

              return (
                old &&
                current &&
                Math.abs(old.half - current.half) < 0.5 &&
                Math.abs(old.full - current.full) < 0.5
              );
            }
          );

          if (
            sameCapacity &&
            sameBlocks &&
            Object.keys(previous.blocks).length ===
              workbook.blocks.length
          ) {
            return previous;
          }

          return {
            blocks: next,
            capacity,
          };
        });
      });
    };

    const observer = new ResizeObserver(calculate);

    container
      .querySelectorAll(
        '.block-card, .block-body, img'
      )
      .forEach((element) => observer.observe(element));

    observer.observe(probe);

    calculate();
    void document.fonts?.ready.then(calculate);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [workbook]);

  
  const pages = useMemo(
    () =>
      paginateAdaptive(
        workbook.blocks,
        measurements.blocks,
        measurements.capacity
      ),
    [workbook.blocks, measurements]
  );

  useEffect(() => {
    onPageCountChange?.(pages.length);
  }, [pages.length, onPageCountChange]);

  // Distribuye una parte del espacio libre entre las líneas de respuesta.
  // Una fila horizontal crece según la columna con MÁS líneas, no la suma
  // de ambas: así el cálculo es conservador y evita desbordamientos.
  const pageAnswerExtras = useMemo(() => {
    const countLines = (block: Block): number => {
      const questions = (block.elements ?? []).reduce(
        (total, element) =>
          total + (element.type === 'question'
            ? (element.answerPosition === 'inline' ? 0 : Math.min(20, Math.max(0, element.answerLines)))
            : 0),
        0
      );
      const pisa = Math.max(
        0,
        block.multipleChoice?.justificationLines ?? 0
      );
      return questions + pisa;
    };

    const linesInRow = (row: PageRow): number => {
      if (row.full) return countLines(row.full);
      const left = row.left
        ? countLines(row.left)
        : (row.leftStack ?? []).reduce(
            (total, block) => total + countLines(block),
            0
          );
      const right = row.right ? countLines(row.right) : 0;
      // En una misma fila se aprovecha el incremento más alto.
      return Math.max(left, right);
    };

    return pages.map((page) => {
      if (page.oversize) return 0;

      const used = page.rows.reduce(
        (sum, row, index) =>
          sum + row.height + (index > 0 ? 10 : 0),
        0
      );
      const free = Math.max(0, measurements.capacity - used);
      const effectiveLines = page.rows.reduce(
        (total, row) => total + linesInRow(row),
        0
      );

      // La última parte de la página debe quedar libre como margen seguro.
      const reserve = 45;
      const usable = Math.max(0, free - reserve);
      if (!effectiveLines || usable < 16) return 0;

      // Hasta 14 px más por línea (42 px en total en la CSS actual).
      // Dejamos otro 20 % del margen utilizable sin asignar.
      return Math.max(
        0,
        Math.min(14, Math.floor((usable * 0.8) / effectiveLines))
      );
    });
  }, [pages, measurements.capacity]);


  return (
    <div className={`pages ${className}`}>
      {onSelectElement && (
        <div className="pagination-debug-controls">
          <button
            type="button"
            onClick={() => setShowPaginationDebug((current) => !current)}
          >
            {showPaginationDebug ? 'Ocultar diagnóstico' : 'Diagnosticar paginación'}
          </button>

          {showPaginationDebug && (
            <div className="pagination-debug-report">
              <strong>Diagnóstico de esta secuencia</strong>
              <p>
                Área disponible: {Math.round(measurements.capacity)} px ·
                Páginas: {pages.length} ·
                Bloques: {workbook.blocks.length}
              </p>
              {pages.map((page, pageIndex) => {
                const used = page.rows.reduce(
                  (sum, row, rowIndex) =>
                    sum + row.height + (rowIndex > 0 ? 10 : 0),
                  0
                );
                const remaining = measurements.capacity - used;
                return (
                  <div key={pageIndex} className="pagination-debug-page">
                    <strong>
                      Página {pageStart + pageIndex}: usados {Math.round(used)} px,
                      libres {Math.round(remaining)} px
                      {page.oversize ? ' · DESBORDAMIENTO' : ''}
                      {' · ampliación por línea: +' + (pageAnswerExtras[pageIndex] ?? 0) + ' px'}
                    </strong>
                    {page.rows.map((row, rowIndex) => {
                      const rowBlocks = row.full
                        ? [row.full]
                        : [...(row.leftStack ?? (row.left ? [row.left] : [])),
                           ...(row.right ? [row.right] : [])];
                      return (
                        <div key={rowIndex}>
                          Fila {rowIndex + 1} ({Math.round(row.height)} px):{' '}
                          {rowBlocks.map((block) => block.title).join(' | ')}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <details>
                <summary>Alturas medidas de todos los bloques</summary>
                {workbook.blocks.map((block) => {
                  const size = measurements.blocks[block.id];
                  return (
                    <div key={block.id}>
                      {block.title}: media {Math.round(size?.half ?? 0)} px,
                      completa {Math.round(size?.full ?? 0)} px,
                      preferencia {block.layout ?? 'auto'}
                    </div>
                  );
                })}
              </details>
            </div>
          )}
        </div>
      )}
      {/* Bloques invisibles para medir alturas. */}
      <div
        className="pagination-measurer"
        aria-hidden="true"
        ref={measurementRef}
      >
        {workbook.blocks.map((block) => (
          <div
            className="measure-half"
            key={`half-${block.id}`}
          >
            <div className="paper-cell">
              <div
                data-measure-id={block.id}
                data-measure-width="half"
              >
                <BlockCard
                  block={block}
                  selected={false}
                  onSelect={() => {}}
                />
              </div>
            </div>
          </div>
        ))}

        {workbook.blocks.map((block) => (
          <div
            className="measure-full"
            key={`full-${block.id}`}
          >
            <div
              data-measure-id={block.id}
              data-measure-width="full"
            >
              <BlockCard
                block={block}
                selected={false}
                onSelect={() => {}}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Medición del espacio imprimible. */}
      <div
        className="pagination-probe paper"
        aria-hidden="true"
        ref={probeRef}
      >
        <Header workbook={workbook} />
        <div className="paper-rows" />
        <Footer
          pageNumber={pageStart}
          workbook={workbook}
        />
      </div>

      {/* Páginas visibles. */}
      {pages.map((page, index) => (
        <div
          className="paper"
          key={index}
          style={{
            '--answer-line-extra': `${pageAnswerExtras[index] ?? 0}px`,
          } as React.CSSProperties}
        >
          <Header workbook={workbook} />

          <div className="paper-rows">
            {page.rows.map((row, rowIndex) => (
              <PageRowView
                key={rowIndex}
                row={row}
                selected={selected}
                onSelect={onSelect}
                selectedElementId={selectedElementId}
                onSelectElement={onSelectElement}
              />
            ))}
          </div>

          {page.oversize && (
            <div className="pagination-warning">
              Una composición supera el espacio
              disponible en la página.
            </div>
          )}

          <Footer
            pageNumber={pageStart + index}
            workbook={workbook}
          />
        </div>
      ))}
    </div>
  );
}
