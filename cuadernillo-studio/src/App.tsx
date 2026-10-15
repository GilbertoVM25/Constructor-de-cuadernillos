import { useEffect, useRef, useState } from 'react';
// import type { Block, Workbook } from './models/document';
import { initialWorkbook } from './data/chemistry';
import { PagePreview } from './components/preview/PagePreview';
import { Inspector } from './components/editor/Inspector';
import './styles/editor.css';
import type { BlockKind } from './models/document';
import type {
  Block,
  Workbook,
  WorkbookProject,
  WorkbookSequence,
} from './models/document';
import {
  loadProject,
  newSequence,
  fromLegacyWorkbook,
  PROJECT_STORAGE_KEY,
} from './engine/project';
import { createBlockTemplate } from './blocks/blockTemplates';
import {
  migrateWorkbookContent,
} from './engine/migrateContent';

import {
  availableBlocks,
  blockRegistry,
} from './blocks/blockRegistry';


import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';

import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableLibraryBlock } from './components/editor/SortableLibraryBlock';


export default function App() {
  
  const [project, setProject] = useState<WorkbookProject>(
    () => loadProject(initialWorkbook)
  );

  const [activeSequenceId, setActiveSequenceId] = useState(
    () => project.sequences[0].id
  );

  
  const [pdfScope, setPdfScope] = useState<
    'all' | 'current'
  >('all');

  const [pdfPageCounts, setPdfPageCounts] = useState<
    Record<string, number>
  >({});

  const FIRST_PDF_PAGE = 5;


  const workbook =
    project.sequences.find(
      (sequence) => sequence.id === activeSequenceId
    ) ?? project.sequences[0];
  
  
  
  const pdfSequences =
    pdfScope === 'all'
      ? project.sequences
      : [workbook];

  // Numeración global del cuadernillo.
  // No depende de la opción de impresión.
  const sequenceStartPages = new Map<string, number>();

  let nextPageNumber = FIRST_PDF_PAGE;

  for (const sequence of project.sequences) {
    sequenceStartPages.set(
      sequence.id,
      nextPageNumber
    );

    nextPageNumber += pdfPageCounts[sequence.id] ?? 1;
  }


  
  const updatePdfPageCount = (
    sequenceId: string,
    count: number
  ) => {
    setPdfPageCounts((current) => {
      if (current[sequenceId] === count) {
        return current;
      }

      return {
        ...current,
        [sequenceId]: count,
      };
    });
  };

  
  const historyRef = useRef<{
    past: Workbook[];
    future: Workbook[];
  }>({
    past: [],
    future: [],
  });

  const [historyVersion, setHistoryVersion] = useState(0);

  const MAX_HISTORY = 50;

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;


  const [selected, setSelected] = useState<string | null>('c');
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [blockSearch, setBlockSearch] = useState('');

  
  
  const applyWorkbook = (nextWorkbook: Workbook) => {
    setProject((current) => ({
      ...current,
      sequences: current.sequences.map((sequence) =>
        sequence.id === activeSequenceId
          ? {
              ...nextWorkbook,
              id: sequence.id,
            }
          : sequence
      ),
    }));
  };

  const update = (nextWorkbook: Workbook) => {
    if (nextWorkbook === workbook) return;

    const history = historyRef.current;

    history.past = [
      ...history.past.slice(-(MAX_HISTORY - 1)),
      workbook,
    ];

    history.future = [];

    applyWorkbook(nextWorkbook);
    setHistoryVersion((version) => version + 1);
  };


  
  
  useEffect(() => {
    try {
      localStorage.setItem(
        PROJECT_STORAGE_KEY,
        JSON.stringify(project)
      );
    } catch (error) {
      console.error(
        'No se pudo guardar el proyecto:',
        error
      );
    }
  }, [project]);


  
  const undo = () => {
    const history = historyRef.current;

    if (history.past.length === 0) return;

    const previous = history.past.at(-1)!;

    history.past = history.past.slice(0, -1);
    history.future = [workbook, ...history.future];

    applyWorkbook(previous);
    setHistoryVersion((version) => version + 1);
  };

  const redo = () => {
    const history = historyRef.current;

    if (history.future.length === 0) return;

    const next = history.future[0];

    history.future = history.future.slice(1);
    history.past = [
      ...history.past.slice(-(MAX_HISTORY - 1)),
      workbook,
    ];

    applyWorkbook(next);
    setHistoryVersion((version) => version + 1);
  };

  
  const shortcutsRef = useRef({ undo, redo });

  shortcutsRef.current = { undo, redo };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey) return;

      const target = event.target;

      // Conservar el deshacer normal del navegador
      // mientras se escribe en campos de edición.
      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          target.closest('input, textarea, select')
        )
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        shortcutsRef.current.undo();
      }

      if (
        key === 'y' ||
        (key === 'z' && event.shiftKey)
      ) {
        event.preventDefault();
        shortcutsRef.current.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, []);



  const updateBlock = (id: string, patch: Partial<Block>) => {
    update({
      ...workbook,
      blocks: workbook.blocks.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    });
  };

  
    const migrateContent = () => {
    const confirmed = window.confirm(
        '¿Convertir el contenido antiguo al nuevo editor?\n\n' +
        'Se conservarán los bloques y sus identificadores. ' +
        'Te recomendamos exportar primero un respaldo JSON.'
    );

    if (!confirmed) return;

    const migrated = migrateWorkbookContent(workbook);

    update(migrated);

    alert('Migración de contenido completada.');
    };


  const selectedBlock = workbook.blocks.find((block) => block.id === selected);
  // const selectedIndex = workbook.blocks.findIndex((block) => block.id === selected);
  
  const blockSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredBlocks = workbook.blocks.filter((block) =>
    block.title
      .toLowerCase()
      .includes(blockSearch.trim().toLowerCase())
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = workbook.blocks.findIndex(
      (block) => block.id === active.id
    );

    const newIndex = workbook.blocks.findIndex(
      (block) => block.id === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    update({
      ...workbook,
      blocks: arrayMove(
        workbook.blocks,
        oldIndex,
        newIndex
      ),
    });
  };


  
    const addBlock = (kind: BlockKind) => {
    const definition = blockRegistry[kind];
    const template = createBlockTemplate(kind);

    const id = crypto.randomUUID();

    
    const newBlock: Block = {
    id,
    kind,
    title: definition.defaultTitle,
    body: template.body ?? '',
    column: 'auto',
    layout: 'auto',
    minHeight: definition.defaultHeight,
    elements: [],
    checklist: template.checklist,
    multipleChoice: template.multipleChoice,
    };


    update({
        ...workbook,
        blocks: [...workbook.blocks, newBlock],
    });

    setSelected(id);
    setShowBlockSelector(false);
    };

  
    const deleteBlock = () => {
    if (!selected) return;

    const block = workbook.blocks.find(
        (item) => item.id === selected
    );

    if (!block) return;

    const confirmed = window.confirm(
        `¿Estás seguro de eliminar "${block.title}"?\n\n` +
        'Esta acción eliminará también sus preguntas, ' +
        'tablas y demás contenido.'
    );

    if (!confirmed) return;

    // Eliminar el bloque seleccionado.
    const updatedBlocks = workbook.blocks.filter(
        (item) => item.id !== selected
    );

    // Guardar el cuadernillo actualizado.
    update({
        ...workbook,
        blocks: updatedBlocks,
    });

    // Seleccionar el bloque anterior o siguiente.
    const deletedIndex = workbook.blocks.findIndex(
        (item) => item.id === selected
    );

    const nextIndex = Math.min(
        deletedIndex,
        updatedBlocks.length - 1
    );

    setSelected(
        nextIndex >= 0
        ? updatedBlocks[nextIndex].id
        : null
    );
    };

        
    const resetHistory = () => {
      historyRef.current = {
        past: [],
        future: [],
      };

      setHistoryVersion((version) => version + 1);
    };

    const selectSequence = (id: string) => {
      if (id === activeSequenceId) return;

      setActiveSequenceId(id);
      setSelected(null);
      resetHistory();
    };

    
    const activeSequenceIndex = project.sequences.findIndex(
      (sequence) => sequence.id === activeSequenceId
    );

    const moveSequence = (direction: number) => {
      const target = activeSequenceIndex + direction;

      if (
        activeSequenceIndex < 0 ||
        target < 0 ||
        target >= project.sequences.length
      ) {
        return;
      }

      const reordered = [...project.sequences];

      const [moved] = reordered.splice(activeSequenceIndex, 1);
      reordered.splice(target, 0, moved);

      setProject((current) => ({
        ...current,
        sequences: reordered.map((sequence, index) => ({
          ...sequence,
          sequence: index + 1,
        })),
      }));

      resetHistory();
    };


    const addSequence = () => {
      const nextNumber =
        Math.max(
          0,
          ...project.sequences.map(
            (sequence) => sequence.sequence
          )
        ) + 1;

      const sequence = newSequence(nextNumber);

      setProject((current) => ({
        ...current,
        sequences: [...current.sequences, sequence],
      }));

      selectSequence(sequence.id);
    };

    const deleteSequence = () => {
      if (project.sequences.length <= 1) {
        alert('El cuadernillo debe conservar al menos una secuencia.');
        return;
      }

      const confirmed = window.confirm(
        `¿Eliminar la secuencia "${workbook.title}"?\n\n` +
        'También se eliminarán todos sus bloques.'
      );

      if (!confirmed) return;

      const remaining = project.sequences
      .filter(
        (sequence) => sequence.id !== activeSequenceId
      )
      .map((sequence, index) => ({
        ...sequence,
        sequence: index + 1,
      }));

      setProject((current) => ({
        ...current,
        sequences: remaining,
      }));

      setActiveSequenceId(remaining[0].id);
      setSelected(null);
      resetHistory();
    };

  
    const makeAllAutomatic = () => {
    update({
        ...workbook,
        blocks: workbook.blocks.map((block) => ({
        ...block,
        column: 'auto',
        })),
    });
    };


  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'cuadernillo-completo.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  
  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);

      if (!data || typeof data !== 'object') {
        throw new Error('Formato inválido');
      }

      const value = data as Record<string, unknown>;

      let imported: WorkbookProject;

      // Formato nuevo: proyecto con varias secuencias.
      if (Array.isArray(value.sequences)) {
        const sequences = value.sequences;

        if (
          sequences.length === 0 ||
          sequences.some(
            (sequence) =>
              !sequence ||
              typeof sequence !== 'object' ||
              !Array.isArray(sequence.blocks) ||
              typeof sequence.title !== 'string' ||
              typeof sequence.subtitle !== 'string'
          )
        ) {
          throw new Error('Secuencias inválidas');
        }

        const normalized = sequences.map(
          (sequence, index) => ({
            ...(sequence as WorkbookSequence),
            id: crypto.randomUUID(),
            sequence: index + 1,
          })
        );

        imported = {
          id: crypto.randomUUID(),
          name:
            typeof value.name === 'string'
              ? value.name
              : 'Mi cuadernillo',
          sequences: normalized,
        };
      }
      // Formato antiguo: una sola secuencia.
      else if (
        Array.isArray(value.blocks) &&
        typeof value.title === 'string' &&
        typeof value.subtitle === 'string'
      ) {
        imported = fromLegacyWorkbook(
          value as Workbook
        );
      } else {
        throw new Error('Formato no reconocido');
      }

      setProject(imported);
      setActiveSequenceId(imported.sequences[0].id);
      setSelected(null);
      resetHistory();
    } catch (error) {
      console.error(error);
      alert('No se pudo importar el proyecto JSON.');
    }
  };


  return (
    <>
      <header className="appbar">
        <strong>
          ▦ Cuadernillo Studio <small>React · Primera etapa</small>
        </strong>

        <div className="toolbar">
          {/* <button onClick={() => setShowBlockSelector(true)}>
            + Agregar bloque
            </button> */}
          
          
          <button
            type="button"
            className="history-button"
            onClick={undo}
            disabled={!canUndo}
            title="Deshacer"
          >
            ↶ Deshacer
          </button>

          <button
            type="button"
            className="history-button"
            onClick={redo}
            disabled={!canRedo}
            title="Rehacer"
          >
            ↷ Rehacer
          </button>

          <button onClick={exportJSON}>Exportar JSON</button>

            {/* <button onClick={makeAllAutomatic}>
            Distribuir automáticamente
            </button> */}

          <label className="file-button">
            Importar JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importJSON(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {/* <button onClick={migrateContent}>
            Migrar contenido
            </button> */}

          
          <div className="pdf-toolbar-actions">
            <select
              value={pdfScope}
              onChange={(event) =>
                setPdfScope(
                  event.target.value as 'all' | 'current'
                )
              }
              aria-label="Contenido del PDF"
            >
              <option value="all">
                Cuadernillo completo
              </option>

              <option value="current">
                Secuencia actual
              </option>
            </select>

            <button
              type="button"
              onClick={() => window.print()}
            >
              Imprimir / PDF
            </button>
          </div>

        </div>
      </header>

            
      <div className="sequence-toolbar">
        <div className="sequence-toolbar-info">
          <strong>{project.name}</strong>
          <span>
            {project.sequences.length} secuencias
          </span>
        </div>

        <select
          value={activeSequenceId}
          onChange={(event) =>
            selectSequence(event.target.value)
          }
          aria-label="Seleccionar secuencia"
        >
          {project.sequences.map((sequence) => (
            <option
              key={sequence.id}
              value={sequence.id}
            >
              Secuencia {sequence.sequence}: {sequence.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={activeSequenceIndex <= 0}
          onClick={() => moveSequence(-1)}
          title="Mover secuencia hacia arriba"
        >
          ↑
        </button>

        <button
          type="button"
          disabled={
            activeSequenceIndex < 0 ||
            activeSequenceIndex >= project.sequences.length - 1
          }
          onClick={() => moveSequence(1)}
          title="Mover secuencia hacia abajo"
        >
          ↓
        </button>

        <button
          type="button"
          onClick={addSequence}
        >
          + Nueva secuencia
        </button>

        <button
          type="button"
          className="sequence-delete-button"
          onClick={deleteSequence}
          disabled={project.sequences.length <= 1}
        >
          Eliminar secuencia
        </button>
      </div>

      
      <div className="sequence-content-settings">
        <label>
          Número de contenido
          <input
            type="number"
            min={1}
            value={workbook.contentNumber ?? ''}
            placeholder="Ej. 7"
            onChange={(event) =>
              update({
                ...workbook,
                contentNumber:
                  event.target.value === ''
                    ? undefined
                    : Math.max(1, Number(event.target.value)),
              })
            }
          />
        </label>

        <label>
          Nombre del contenido curricular
          <input
            type="text"
            value={workbook.contentTitle ?? ''}
            placeholder="Ej. La tabla periódica"
            onChange={(event) =>
              update({
                ...workbook,
                contentTitle: event.target.value,
              })
            }
          />
        </label>
      </div>


      
        {showBlockSelector && (
        <div
            className="block-selector-overlay"
            onClick={() => setShowBlockSelector(false)}
        >
            <div
            className="block-selector-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Agregar bloque"
            onClick={(event) => event.stopPropagation()}
            >
            <div className="block-selector-header">
                <div>
                <h2>Agregar bloque</h2>
                <p>Selecciona el tipo de contenido.</p>
                </div>

                <button
                type="button"
                onClick={() => setShowBlockSelector(false)}
                >
                ✕
                </button>
            </div>

            <div className="block-selector-grid">
                {availableBlocks.map((definition) => (
                <button
                    key={definition.kind}
                    type="button"
                    className="block-selector-item"
                    onClick={() => addBlock(definition.kind)}
                >
                    <strong>{definition.label}</strong>
                    <span>{definition.description}</span>
                </button>
                ))}
            </div>
            </div>
        </div>
        )}


      <main className="workspace">
        
      <aside className="library">
        <div className="library-header">
          <div>
            <h2>Bloques</h2>
            <span className="library-count">
              {workbook.blocks.length} bloques
            </span>
          </div>

          <button
            type="button"
            className="library-add-button"
            title="Agregar bloque"
            onClick={() => setShowBlockSelector(true)}
          >
            +
          </button>
        </div>

        <div className="library-search">
          <input
            type="search"
            placeholder="Buscar bloque..."
            value={blockSearch}
            onChange={(event) =>
              setBlockSearch(event.target.value)
            }
            aria-label="Buscar bloques"
          />
        </div>

        <div className="library-list">
          {filteredBlocks.length === 0 ? (
            <p className="library-empty">
              No se encontraron bloques.
            </p>
          ) : (
            <DndContext
              sensors={blockSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBlockDragEnd}
            >
              <SortableContext
                items={filteredBlocks.map(
                  (block) => block.id
                )}
                strategy={verticalListSortingStrategy}
              >
                {filteredBlocks.map((block) => (
                  <SortableLibraryBlock
                    key={block.id}
                    block={block}
                    selected={selected === block.id}
                    onSelect={setSelected}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="library-footer">
          <button
            type="button"
            className="delete-block-button"
            onClick={deleteBlock}
            disabled={!selectedBlock}
          >
            🗑 Eliminar bloque
          </button>

          {selectedBlock && (
            <p className="library-selection">
              Seleccionado: {selectedBlock.title}
            </p>
          )}
        </div>
      </aside>


        
        <PagePreview
          workbook={workbook}
          selected={selected}
          onSelect={setSelected}
          pageStart={
            sequenceStartPages.get(activeSequenceId) ??
            FIRST_PDF_PAGE
          }
          onPageCountChange={(count) =>
            updatePdfPageCount(activeSequenceId, count)
          }
        />


        <Inspector
          workbook={workbook}
          selected={selectedBlock}
          onChange={update}
          onBlockChange={updateBlock}
        />
      </main>
      
      
      <div className="pdf-print-root">
        {project.sequences.map((sequence) => {
          const shouldPrint =
            pdfScope === 'all' ||
            sequence.id === activeSequenceId;

          return (
            <div
              key={sequence.id}
              className={
                shouldPrint
                  ? 'pdf-sequence-container'
                  : 'pdf-sequence-container pdf-skip-sequence'
              }
            >
              <PagePreview
                workbook={sequence}
                selected={null}
                onSelect={() => {}}
                pageStart={
                  sequenceStartPages.get(sequence.id) ??
                  FIRST_PDF_PAGE
                }
                className="pdf-sequence-pages"
                onPageCountChange={(count) =>
                  updatePdfPageCount(sequence.id, count)
                }
              />
            </div>
          );
        })}
      </div>


    </>
  );
}
