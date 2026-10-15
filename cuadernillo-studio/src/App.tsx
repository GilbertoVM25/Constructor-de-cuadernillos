import { useEffect, useRef, useState } from 'react';
import type { Block, Workbook } from './models/document';
import { initialWorkbook } from './data/chemistry';
import { PagePreview } from './components/preview/PagePreview';
import { Inspector } from './components/editor/Inspector';
import './styles/editor.css';
import type { BlockKind } from './models/document';
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
  const [workbook, setWorkbook] = useState<Workbook>(() => {
    try {
      const saved = localStorage.getItem('cuadernillo-react');
      return saved ? (JSON.parse(saved) as Workbook) : initialWorkbook;
    } catch {
      return initialWorkbook;
    }
  });

  
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

  
  const update = (nextWorkbook: Workbook) => {
    if (nextWorkbook === workbook) return;

    const history = historyRef.current;

    history.past = [
      ...history.past.slice(-(MAX_HISTORY - 1)),
      workbook,
    ];

    history.future = [];

    setWorkbook(nextWorkbook);
    setHistoryVersion((version) => version + 1);
  };

  
  useEffect(() => {
    try {
      localStorage.setItem(
        'cuadernillo-react',
        JSON.stringify(workbook)
      );
    } catch (error) {
      console.error(
        'No se pudo guardar el cuadernillo:',
        error
      );
    }
  }, [workbook]);

  
  const undo = () => {
    const history = historyRef.current;

    if (history.past.length === 0) return;

    const previous = history.past.at(-1)!;

    history.past = history.past.slice(0, -1);
    history.future = [workbook, ...history.future];

    setWorkbook(previous);
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

    setWorkbook(next);
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
    const blob = new Blob([JSON.stringify(workbook, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'cuadernillo-quimica.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as Workbook;

      if (
        !imported ||
        !Array.isArray(imported.blocks) ||
        typeof imported.title !== 'string'
      ) {
        throw new Error('Formato inválido');
      }

      historyRef.current = {
        past: [],
        future: [],
      };

      setWorkbook(imported);
      setHistoryVersion((version) => version + 1);
      setSelected(null);
    } catch {
      alert('No se pudo leer el proyecto JSON');
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

          <button onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </header>

      
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
        />

        <Inspector
          workbook={workbook}
          selected={selectedBlock}
          onChange={update}
          onBlockChange={updateBlock}
        />
      </main>
    </>
  );
}
