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
  CoverSettings
} from './models/document';
import {
  loadProject,
  newSequence,
  fromLegacyWorkbook,
  PROJECT_STORAGE_KEY,
} from './engine/project';
import { createBlockTemplate } from './blocks/blockTemplates';
import { importWorkbookJSON } from './engine/importWorkbookJSON';
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

import {
  IndexPages,
  getIndexPageCount,
} from './components/preview/IndexPages';

import {
  CoverPage,
  PresentationPage,
} from './components/preview/PreliminaryPages';

import { PdfExportDialog } from './components/editor/PdfExportDialog';

import {
  ACTIVE_PROJECT_KEY,
  initializeProjectStorage,
  saveProject,
  getProject,
  getProjectSummaries,
  deleteStoredProject,
  type ProjectSummary,
} from './engine/projectStorage';

import {
  ProjectManager,
} from './components/editor/ProjectManager';

import {
  duplicateBlockData,
  duplicateSequenceData,
} from './engine/duplicateContent';



export default function App() {
  
  const [project, setProject] = useState<WorkbookProject>(
    () => loadProject(initialWorkbook)
  );

  const [activeSequenceId, setActiveSequenceId] = useState(
    () => project.sequences[0].id
  );

  
  const [storageReady, setStorageReady] =
    useState(false);
  
  const saveRevisionRef = useRef(0);
  
  const [saveStatus, setSaveStatus] = useState<
    'loading' | 'saving' | 'saved' | 'error'
  >('loading');

  const [projectList, setProjectList] =
    useState<ProjectSummary[]>([]);

  const [showProjectManager, setShowProjectManager] =
    useState(false);

  const [newProjectName, setNewProjectName] =
    useState('');

  const [projectManagerBusy, setProjectManagerBusy] =
    useState(false);
  
  
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const legacy = loadProject(initialWorkbook);

        const result = await initializeProjectStorage(
          legacy
        );

        if (cancelled) return;

        setProject(result.activeProject);
        setActiveSequenceId(
          result.activeProject.sequences[0].id
        );

        setSelected(null);
        setProjectList(result.projects);

        localStorage.setItem(
          ACTIVE_PROJECT_KEY,
          result.activeProject.id
        );

        setSaveStatus('saved');
        setStorageReady(true);
      } catch (error) {
        console.error(
          'No se pudo cargar el almacenamiento:',
          error
        );

        if (!cancelled) {
          setSaveStatus('error');
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  
  const [pdfScope, setPdfScope] = useState<
    'all' | 'current'
  >('all');

  const [includeIndex, setIncludeIndex] = useState(true);

  const [pdfPageCounts, setPdfPageCounts] = useState<
    Record<string, number>
  >({});

  const [firstPdfPage, setFirstPdfPage] = useState(5);
  const FIRST_PDF_PAGE = firstPdfPage;


  const workbook =
    project.sequences.find(
      (sequence) => sequence.id === activeSequenceId
    ) ?? project.sequences[0];
  
  
  const [showPdfSettings, setShowPdfSettings] =
    useState(false);

  const [includeCover, setIncludeCover] =
    useState(true);

  const [includePresentation, setIncludePresentation] =
    useState(false);

  const coverSettings: CoverSettings = {
    title: project.cover?.title ?? project.name,
    subtitle: project.cover?.subtitle ?? '',
    subject: project.cover?.subject ?? 'Química',
    grade: project.cover?.grade ?? '3.º de secundaria',
    school: project.cover?.school ?? '',
    schoolYear: project.cover?.schoolYear ?? '',
    author: project.cover?.author ?? '',
    presentation: project.cover?.presentation ?? '',
    template: project.cover?.template ?? 'academic',
    accentColor: project.cover?.accentColor ?? '#1766c2',
    coverImage: project.cover?.coverImage ?? '',
    schoolLogo: project.cover?.schoolLogo ?? '',
  };

  const updateCover = (
    field: keyof CoverSettings,
    value: string
  ) => {
    setProject((current) => ({
      ...current,
      cover: {
        title: current.cover?.title ?? current.name,
        subtitle: current.cover?.subtitle ?? '',
        subject: current.cover?.subject ?? 'Química',
        grade: current.cover?.grade ?? '3.º de secundaria',
        school: current.cover?.school ?? '',
        schoolYear: current.cover?.schoolYear ?? '',
        author: current.cover?.author ?? '',
        presentation: current.cover?.presentation ?? '',
        template: project.cover?.template ?? 'academic',
        accentColor: project.cover?.accentColor ?? '#1766c2',
        coverImage: project.cover?.coverImage ?? '',
        schoolLogo: project.cover?.schoolLogo ?? '',
        [field]: value,
      },
    }));
  };

  
  const pdfSequences =
    pdfScope === 'all'
      ? project.sequences
      : [workbook];

  
  const indexPageCount = includeIndex
    ? getIndexPageCount(project.sequences.length)
    : 0;

  const sequenceStartPages = new Map<string, number>();

  // Reservar primero las páginas del índice.
  let nextPageNumber =
    FIRST_PDF_PAGE + indexPageCount;

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
  const [selectedElementId, setSelectedElementId] =
    useState<string | null>(null);
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
  if (!storageReady) return;

  const revision = ++saveRevisionRef.current;

  setSaveStatus('saving');

  const timeout = window.setTimeout(() => {
    void saveProject(project)
      .then(() => {
        if (saveRevisionRef.current !== revision) {
          return;
        }

        setSaveStatus('saved');
      })
      .catch((error) => {
        console.error('Error de guardado:', error);

        if (saveRevisionRef.current === revision) {
          setSaveStatus('error');
        }
      });
  }, 600);

  return () => {
    window.clearTimeout(timeout);
  };
}, [project, storageReady]);




  
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

    
    const duplicateBlock = () => {
      if (!selected) return;

      const index = workbook.blocks.findIndex(
        (block) => block.id === selected
      );

      if (index === -1) return;

      const original = workbook.blocks[index];
      const copy = duplicateBlockData(original);

      const nextBlocks = [...workbook.blocks];

      // Insertar inmediatamente después del original.
      nextBlocks.splice(index + 1, 0, copy);

      update({
        ...workbook,
        blocks: nextBlocks,
      });

      // Seleccionar automáticamente la copia.
      setSelected(copy.id);
    };

    
    const selectBlock = (blockId: string) => {
      setSelected(blockId);
      setSelectedElementId(null);
    };

    const selectContentElement = (
      blockId: string,
      elementId: string
    ) => {
      setSelected(blockId);
      setSelectedElementId(elementId);
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
      setSelectedElementId(null);
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

    
    const duplicateSequence = () => {
      const index = project.sequences.findIndex(
        (sequence) => sequence.id === activeSequenceId
      );

      if (index === -1) return;

      const original = project.sequences[index];

      const copy = duplicateSequenceData(original);

      setProject((current) => {
        const nextSequences = [...current.sequences];

        nextSequences.splice(index + 1, 0, copy);

        return {
          ...current,
          sequences: nextSequences.map(
            (sequence, position) => ({
              ...sequence,
              sequence: position + 1,
            })
          ),
        };
      });

      // Abrir la nueva secuencia.
      setActiveSequenceId(copy.id);

      // Seleccionar su primer bloque, si existe.
      setSelected(copy.blocks[0]?.id ?? null);

      resetHistory();
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
      const imported = importWorkbookJSON(data);

      // Guardar antes de sustituir el proyecto visible.
      await saveProject(imported);
      await refreshProjectList();

      localStorage.setItem(ACTIVE_PROJECT_KEY, imported.id);
      setProject(imported);
      setActiveSequenceId(imported.sequences[0].id);
      setSelected(null);
      setSelectedElementId(null);
      resetHistory();
      alert('Cuadernillo importado correctamente.');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      alert(`No se pudo importar el proyecto JSON.\n\n${message}`);
    }
  };

  const refreshProjectList = async () => {
    const summaries = await getProjectSummaries();
    setProjectList(summaries);
  };

  
  const openProject = async (id: string) => {
    if (id === project.id) {
      setShowProjectManager(false);
      return;
    }

    setProjectManagerBusy(true);

    try {
      // No perder cambios pendientes antes del cambio.
      await saveProject(project);

      const nextProject = await getProject(id);

      if (!nextProject) {
        throw new Error('Proyecto no encontrado');
      }

      setProject(nextProject);
      setActiveSequenceId(nextProject.sequences[0].id);
      setSelected(null);
      resetHistory();

      localStorage.setItem(
        ACTIVE_PROJECT_KEY,
        nextProject.id
      );

      setShowProjectManager(false);
    } catch (error) {
      console.error(error);
      alert('No se pudo abrir el cuadernillo.');
    } finally {
      setProjectManagerBusy(false);
    }
  };

  
  const createNewProject = async () => {
    const name = newProjectName.trim();

    if (!name) {
      alert('Escribe el nombre del cuadernillo.');
      return;
    }

    setProjectManagerBusy(true);

    try {
      await saveProject(project);

      const nextProject = fromLegacyWorkbook({
        ...initialWorkbook,
        title: 'Nueva secuencia',
        subtitle: '',
        sequence: 1,
        blocks: [],
      });

      nextProject.name = name;

      await saveProject(nextProject);

      setProject(nextProject);
      setActiveSequenceId(nextProject.sequences[0].id);
      setSelected(null);
      resetHistory();

      localStorage.setItem(
        ACTIVE_PROJECT_KEY,
        nextProject.id
      );

      await refreshProjectList();

      setNewProjectName('');
      setShowProjectManager(false);
    } catch (error) {
      console.error(error);
      alert('No se pudo crear el cuadernillo.');
    } finally {
      setProjectManagerBusy(false);
    }
  };

  
  const duplicateProject = async (id: string) => {
    setProjectManagerBusy(true);

    try {
      await saveProject(project);

      const original = await getProject(id);

      if (!original) {
        throw new Error('Proyecto no encontrado');
      }

      const copy: WorkbookProject = {
        ...structuredClone(original),
        id: crypto.randomUUID(),
        name: `${original.name} (copia)`,
        sequences: original.sequences.map(
          (sequence) => ({
            ...structuredClone(sequence),
            id: crypto.randomUUID(),
          })
        ),
      };

      await saveProject(copy);
      await refreshProjectList();
    } catch (error) {
      console.error(error);
      alert('No se pudo duplicar el cuadernillo.');
    } finally {
      setProjectManagerBusy(false);
    }
  };

  
  const renameProject = async (id: string) => {
    const item = projectList.find(
      (entry) => entry.id === id
    );

    if (!item) return;

    const name = window.prompt(
      'Nuevo nombre del cuadernillo:',
      item.name
    )?.trim();

    if (!name || name === item.name) return;

    setProjectManagerBusy(true);

    try {
      await saveProject(project);

      const stored = await getProject(id);

      if (!stored) {
        throw new Error('Proyecto no encontrado');
      }

      const renamed = {
        ...stored,
        name,
      };

      await saveProject(renamed);

      if (id === project.id) {
        setProject(renamed);
      }

      await refreshProjectList();
    } catch (error) {
      console.error(error);
      alert('No se pudo cambiar el nombre.');
    } finally {
      setProjectManagerBusy(false);
    }
  };

  
  const removeProject = async (id: string) => {
    if (projectList.length <= 1) {
      alert('Debes conservar al menos un cuadernillo.');
      return;
    }

    const item = projectList.find(
      (entry) => entry.id === id
    );

    if (!item) return;

    if (!window.confirm(
      `¿Eliminar definitivamente "${item.name}"?`
    )) {
      return;
    }

    setProjectManagerBusy(true);

    try {
      // Guardar primero el cuadernillo activo.
      // Solo si no es el que se eliminará.
      if (project.id !== id) {
        await saveProject(project);
      }

      await deleteStoredProject(id);

      if (project.id === id) {
        const remaining = await getProjectSummaries();
        const replacement = await getProject(
          remaining[0].id
        );

        if (!replacement) {
          throw new Error('No existe otro proyecto');
        }

        setProject(replacement);
        setActiveSequenceId(
          replacement.sequences[0].id
        );

        setSelected(null);
        resetHistory();

        localStorage.setItem(
          ACTIVE_PROJECT_KEY,
          replacement.id
        );
      }

      await refreshProjectList();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el cuadernillo.');
    } finally {
      setProjectManagerBusy(false);
    }
  };

  if (!storageReady) {
    return (
      <div className="project-loading">
        <h2>Cuadernillo Studio</h2>
        <p>
          {saveStatus === 'error'
            ? 'No se pudo acceder al almacenamiento. ' +
              'Recarga la página para intentarlo otra vez.'
            : 'Cargando tus cuadernillos...'}
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="appbar">
        <strong>
          ▦ Cuadernillo Studio <small>React · Primera etapa</small>
        </strong>
        <span className={`save-status save-${saveStatus}`}>
          {saveStatus === 'loading' && 'Cargando proyectos...'}
          {saveStatus === 'saving' && 'Guardando...'}
          {saveStatus === 'saved' && '✓ Guardado'}
          {saveStatus === 'error' && '⚠ Error al guardar'}
        </span>

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
          <button
            type="button"
            disabled={!storageReady}
            onClick={() => {
              void refreshProjectList()
                .then(() => setShowProjectManager(true))
                .catch((error) => {
                  console.error(error);
                  alert('No se pudieron cargar los proyectos.');
                });
            }}
          >
            Mis cuadernillos
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
            {/* <select
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
            </select> */}
            
            {/* <label className="pdf-index-toggle">
              <input
                type="checkbox"
                checked={includeIndex}
                onChange={(event) =>
                  setIncludeIndex(event.target.checked)
                }
              />

              Incluir índice
            </label> */}

            <button
              type="button"
              onClick={() => setShowPdfSettings(true)}
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
          onClick={duplicateSequence}
          title="Duplicar la secuencia actual"
        >
          ⧉ Duplicar secuencia
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
            className="duplicate-block-button"
            onClick={duplicateBlock}
            disabled={!selectedBlock}
            title="Crear una copia del bloque seleccionado"
          >
            <span aria-hidden="true">⧉</span>
            Duplicar bloque
          </button>

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
          selectedElementId={selectedElementId}
          onSelectElement={selectContentElement}

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
          selectedElementId={selectedElementId}
          onChange={update}
          onBlockChange={updateBlock}
        />
      </main>
      
      
      <div className="pdf-print-root">
        
        {pdfScope === 'all' && includeCover && (
          <CoverPage settings={coverSettings} />
        )}

        {pdfScope === 'all' && includePresentation && (
          <PresentationPage settings={coverSettings} />
        )}

        
        {includeIndex && pdfScope === 'all' && (
          <IndexPages
            sequences={project.sequences}
            startPages={sequenceStartPages}
            firstPage={FIRST_PDF_PAGE}
          />
        )}

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
      
      {showProjectManager && (
        <ProjectManager
          projects={projectList}
          activeProjectId={project.id}
          newProjectName={newProjectName}
          busy={projectManagerBusy}

          onNameChange={setNewProjectName}
          onCreate={() => void createNewProject()}
          onOpen={(id) => void openProject(id)}
          onDuplicate={(id) =>
            void duplicateProject(id)
          }
          onRename={(id) => void renameProject(id)}
          onDelete={(id) => void removeProject(id)}

          onClose={() => setShowProjectManager(false)}
        />
      )}

      {showPdfSettings && (
        <PdfExportDialog
          scope={pdfScope}
          onScopeChange={setPdfScope}

          includeCover={includeCover}
          onIncludeCoverChange={setIncludeCover}

          includePresentation={includePresentation}
          onIncludePresentationChange={setIncludePresentation}

          includeIndex={includeIndex}
          onIncludeIndexChange={setIncludeIndex}

          firstPage={firstPdfPage}
          onFirstPageChange={setFirstPdfPage}

          cover={coverSettings}
          onCoverChange={updateCover}

          onClose={() => setShowPdfSettings(false)}

          onPrint={() => {
            setShowPdfSettings(false);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          }}
        />
      )}

    </>
  );
}
