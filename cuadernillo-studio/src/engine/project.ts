
import type {
  Workbook,
  WorkbookProject,
  WorkbookSequence,
} from '../models/document';

export const PROJECT_STORAGE_KEY =
  'cuadernillo-studio-project';

export function newSequence(number: number): WorkbookSequence {
  return {
    id: crypto.randomUUID(),
    sequence: number,
    title: `Nueva secuencia ${number}`,
    subtitle: '',
    blocks: [],
  };
}

export function fromLegacyWorkbook(
  workbook: Workbook
): WorkbookProject {
  return {
    id: crypto.randomUUID(),
    name: 'Mi cuadernillo',
    sequences: [
      {
        ...workbook,
        id: crypto.randomUUID(),
      },
    ],
  };
}

export function loadProject(
  fallback: Workbook
): WorkbookProject {
  try {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);

    if (saved) {
      const project = JSON.parse(saved) as WorkbookProject;

      if (
        Array.isArray(project.sequences) &&
        project.sequences.length > 0
      ) {
        return project;
      }
    }

    // Proyecto guardado con la versión anterior.
    const legacy = localStorage.getItem('cuadernillo-react');

    if (legacy) {
      const workbook = JSON.parse(legacy) as Workbook;

      if (Array.isArray(workbook.blocks)) {
        return fromLegacyWorkbook(workbook);
      }
    }
  } catch (error) {
    console.error('Error al cargar el proyecto:', error);
  }

  return fromLegacyWorkbook(fallback);
}
