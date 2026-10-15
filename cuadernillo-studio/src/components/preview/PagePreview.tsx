import { blockThemes } from '../../styles/blockThemes';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  Block,
  Workbook,
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
};



function ContentElementsView({
  block,
}: {
  block: Block;
}) {
  const elements = block.elements ?? [];

  if (elements.length === 0) return null;

  return (
    <div className="workbook-elements">
      {elements.map((element) => {
        if (element.type === 'text') {
          return (
            <div
              className="workbook-text-element"
              key={element.id}
            >
              {element.content}
            </div>
          );
        }

        if (element.type === 'question') {
          return (
            <div
              className="educational-question"
              key={element.id}
            >
              <div className="educational-question-text">
                <span className="question-number">
                  •
                </span>

                <span>{element.text}</span>
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
        }

        if (element.type === 'table') {
          const table = element.table;

          return (
            <div
              className="workbook-table-container"
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
                          {row[columnIndex] || '\u00A0'}
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
              className="workbook-image-element"
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
        
        if (element.type === 'gallery') {
          return (
            <div
              className="workbook-gallery"
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
      <div className="pisa-situation">
        {exercise.situation}
      </div>

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
                  {cell || '\u00A0'}
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
}: {
  block: Block;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const isInformation = ['purpose', 'pda'].includes(
    block.kind
  );

  const hasPhoto = ['case', 'development'].includes(
    block.kind
  );

  const theme = blockThemes[block.kind];

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
        {block.image && !hasPhoto && (
          <img src={block.image} alt="" />
        )}

        <strong>{block.title}</strong>
      </div>

      <div className="block-body">
        {block.body}
      </div>

      
      {block.image && hasPhoto && (
        <img
          className="block-photo"
          src={block.image}
          alt=""
        />
      )}

      <ContentElementsView block={block} />

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
}: {
  blocks: Block[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="paper-stack">
      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          selected={selected === (block.sourceId ?? block.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function PageRowView({
  row,
  selected,
  onSelect,
}: {
  row: PageRow;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (row.full) {
    return (
      <div className="paper-row paper-row-full">
        <BlockCard
          block={row.full}
          selected={selected === (row.full.sourceId ?? row.full.id)}
          onSelect={onSelect}
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
          />
        )}

        {row.leftStack && (
          <BlockStack
            blocks={row.leftStack}
            selected={selected}
            onSelect={onSelect}
          />
        )}
      </div>

      <div className="paper-cell">
        {row.right && (
          <BlockCard
            block={row.right}
            selected={selected === (row.right.sourceId ?? row.right.id)}
            onSelect={onSelect}
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

function Footer({ page }: { page: number }) {
  return (
    <footer>
      Contenido 1&nbsp; | &nbsp;
      Los hitos del conocimiento científico
      y tecnológico
      <span>{page + 4}</span>
    </footer>
  );
}

export function PagePreview({
  workbook,
  selected,
  onSelect,
}: PreviewProps) {
  const [measurements, setMeasurements] = useState<{
    blocks: BlockMeasurements;
    capacity: number;
  }>({
    blocks: {},
    capacity: 905,
  });

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


  return (
    <div className="pages">
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
        <Footer page={0} />
      </div>

      {/* Páginas visibles. */}
      {pages.map((page, index) => (
        <div className="paper" key={index}>
          <Header workbook={workbook} />

          <div className="paper-rows">
            {page.rows.map((row, rowIndex) => (
              <PageRowView
                key={rowIndex}
                row={row}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          </div>

          {page.oversize && (
            <div className="pagination-warning">
              Una composición supera el espacio
              disponible en la página.
            </div>
          )}

          <Footer page={index} />
        </div>
      ))}
    </div>
  );
}
