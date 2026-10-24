
import type {
  ProjectSummary,
} from '../../engine/projectStorage';

type Props = {
  projects: ProjectSummary[];
  activeProjectId: string;
  newProjectName: string;
  busy: boolean;

  onNameChange: (name: string) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function ProjectManager({
  projects,
  activeProjectId,
  newProjectName,
  busy,
  onNameChange,
  onCreate,
  onOpen,
  onDuplicate,
  onRename,
  onDelete,
  onClose,
}: Props) {
  return (
    <div className="project-manager-backdrop">
      <section
        className="project-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-manager-title"
      >
        <header className="project-manager-header">
          <div>
            <h2 id="project-manager-title">
              Mis cuadernillos
            </h2>

            <p>
              Administra tus proyectos guardados.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="project-manager-content">
          <div className="project-manager-list">
            {projects.map((item) => (
              <article
                className="project-manager-item"
                key={item.id}
              >
                <div className="project-manager-item-info">
                  <strong>{item.name}</strong>

                  <span>
                    {item.sequences} secuencia(s)
                    {item.id === activeProjectId &&
                      ' · Abierto'}
                  </span>
                </div>

                <div className="project-manager-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onOpen(item.id)}
                  >
                    Abrir
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onRename(item.id)
                    }
                  >
                    Renombrar
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onDuplicate(item.id)
                    }
                  >
                    Duplicar
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy || projects.length <= 1
                    }
                    className="project-remove-button"
                    onClick={() =>
                      onDelete(item.id)
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="project-create">
            <h3>Nuevo cuadernillo</h3>

            <div className="project-create-row">
              <input
                type="text"
                value={newProjectName}
                disabled={busy}
                placeholder="Nombre del cuadernillo"
                onChange={(event) =>
                  onNameChange(event.target.value)
                }
              />

              <button
                type="button"
                disabled={
                  busy || !newProjectName.trim()
                }
                onClick={onCreate}
              >
                + Crear
              </button>
            </div>
          </div>
        </div>

        <footer className="project-manager-footer">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  );
}
