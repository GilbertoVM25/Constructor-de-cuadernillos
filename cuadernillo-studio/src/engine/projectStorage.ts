
import type {
  WorkbookProject,
} from '../models/document';

const DB_NAME = 'cuadernillo-studio';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export const ACTIVE_PROJECT_KEY =
  'cuadernillo-studio-active-project';

export type ProjectSummary = {
  id: string;
  name: string;
  sequences: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error('No se pudo abrir IndexedDB')
      );
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore
  ) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    let result: T;

    const transaction = db.transaction(
      STORE_NAME,
      mode
    );

    const store = transaction.objectStore(
      STORE_NAME
    );

    const request = operation(store);

    request.onsuccess = () => {
      result = request.result;
    };

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ??
          new Error('Error de almacenamiento')
      );
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ??
          new Error('Operación cancelada')
      );
    };
  });
}


let writeQueue: Promise<unknown> = Promise.resolve();

export function saveProject(
  project: WorkbookProject
): Promise<IDBValidKey> {
  // Captura el estado exacto que queremos guardar.
  const snapshot = structuredClone(project);

  const operation = writeQueue
    .catch(() => undefined)
    .then(() =>
      withStore(
        'readwrite',
        (store) => store.put(snapshot)
      )
    );

  // Una escritura nueva espera a la anterior,
  // incluso si la anterior falló.
  writeQueue = operation.catch(() => undefined);

  return operation;
}


export async function getProject(
  id: string
): Promise<WorkbookProject | undefined> {
  return withStore(
    'readonly',
    (store) => store.get(id)
  );
}

export async function getAllProjects():
  Promise<WorkbookProject[]> {
  return withStore(
    'readonly',
    (store) => store.getAll()
  );
}


export function deleteStoredProject(
  id: string
): Promise<undefined> {
  const operation = writeQueue
    .catch(() => undefined)
    .then(() =>
      withStore(
        'readwrite',
        (store) => store.delete(id)
      )
    );

  writeQueue = operation.catch(() => undefined);

  return operation;
}


export async function getProjectSummaries():
  Promise<ProjectSummary[]> {
  const projects = await getAllProjects();

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    sequences: project.sequences.length,
  }));
}


export async function initializeProjectStorage(
  legacyProject: WorkbookProject
): Promise<{
  projects: ProjectSummary[];
  activeProject: WorkbookProject;
}> {
  const existing = await getAllProjects();

  // Primera ejecución: migración desde localStorage.
  if (existing.length === 0) {
    await saveProject(legacyProject);

    return {
      projects: [
        {
          id: legacyProject.id,
          name: legacyProject.name,
          sequences: legacyProject.sequences.length,
        },
      ],
      activeProject: legacyProject,
    };
  }

  const lastId = localStorage.getItem(
    ACTIVE_PROJECT_KEY
  );

  const activeProject =
    existing.find(
      (project) => project.id === lastId
    ) ?? existing[0];

  return {
    projects: existing.map((project) => ({
      id: project.id,
      name: project.name,
      sequences: project.sequences.length,
    })),
    activeProject,
  };
}
