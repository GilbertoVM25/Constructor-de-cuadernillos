
import type { CoverSettings } from '../../models/document';
import { CoverDesignEditor } from './CoverDesignEditor';
import { CoverPreview } from './CoverPreview';

type PdfScope = 'all' | 'current';

type Props = {
  scope: PdfScope;
  onScopeChange: (value: PdfScope) => void;

  includeCover: boolean;
  onIncludeCoverChange: (value: boolean) => void;

  includePresentation: boolean;
  onIncludePresentationChange: (value: boolean) => void;

  includeIndex: boolean;
  onIncludeIndexChange: (value: boolean) => void;

  firstPage: number;
  onFirstPageChange: (value: number) => void;

  cover: CoverSettings;
  onCoverChange: (
    field: keyof CoverSettings,
    value: string
  ) => void;

  onClose: () => void;
  onPrint: () => void;
};

export function PdfExportDialog({
  scope,
  onScopeChange,
  includeCover,
  onIncludeCoverChange,
  includePresentation,
  onIncludePresentationChange,
  includeIndex,
  onIncludeIndexChange,
  firstPage,
  onFirstPageChange,
  cover,
  onCoverChange,
  onClose,
  onPrint,
}: Props) {
  const full = scope === 'all';

  return (
    <div
      className="pdf-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="pdf-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-dialog-title"
      >
        <div className="pdf-dialog-header">
          <div>
            <h2 id="pdf-dialog-title">Exportar a PDF</h2>
            <p>Configura las páginas del cuadernillo.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="pdf-dialog-content">
        <div className="pdf-dialog-body">
          <fieldset>
            <legend>Contenido que deseas imprimir</legend>

            <label>
              <input
                type="radio"
                checked={scope === 'all'}
                onChange={() => onScopeChange('all')}
              />
              Cuadernillo completo
            </label>

            <label>
              <input
                type="radio"
                checked={scope === 'current'}
                onChange={() => onScopeChange('current')}
              />
              Secuencia actual
            </label>
          </fieldset>

          <fieldset>
            <legend>Páginas adicionales</legend>

            <label>
              <input
                type="checkbox"
                disabled={!full}
                checked={includeCover}
                onChange={(event) =>
                  onIncludeCoverChange(event.target.checked)
                }
              />
              Incluir portada
            </label>

            <label>
              <input
                type="checkbox"
                disabled={!full}
                checked={includePresentation}
                onChange={(event) =>
                  onIncludePresentationChange(event.target.checked)
                }
              />
              Incluir presentación
            </label>

            <label>
              <input
                type="checkbox"
                disabled={!full}
                checked={includeIndex}
                onChange={(event) =>
                  onIncludeIndexChange(event.target.checked)
                }
              />
              Incluir índice automático
            </label>
          </fieldset>

          <div className="pdf-dialog-section">
            <h3>Numeración</h3>

            <label className="pdf-dialog-field">
              Primera página numerada
              <input
                type="number"
                min={1}
                max={9999}
                value={firstPage}
                onChange={(event) =>
                  onFirstPageChange(
                    Math.max(
                      1,
                      Number(event.target.value) || 1
                    )
                  )
                }
              />
            </label>

            <p className="pdf-dialog-note">
              La portada y la presentación no mostrarán
              número de página.
            </p>
          </div>

          <div className="pdf-dialog-section">
            <h3>Datos editoriales</h3>

            <label className="pdf-dialog-field">
              Título del cuadernillo
              <input
                value={cover.title}
                onChange={(event) =>
                  onCoverChange('title', event.target.value)
                }
              />
            </label>

            <label className="pdf-dialog-field">
              Subtítulo
              <input
                value={cover.subtitle}
                onChange={(event) =>
                  onCoverChange('subtitle', event.target.value)
                }
              />
            </label>

            <div className="pdf-dialog-grid">
              <label className="pdf-dialog-field">
                Materia
                <input
                  value={cover.subject}
                  onChange={(event) =>
                    onCoverChange('subject', event.target.value)
                  }
                />
              </label>

              <label className="pdf-dialog-field">
                Grado
                <input
                  value={cover.grade}
                  onChange={(event) =>
                    onCoverChange('grade', event.target.value)
                  }
                />
              </label>
            </div>

            <label className="pdf-dialog-field">
              Escuela
              <input
                value={cover.school}
                onChange={(event) =>
                  onCoverChange('school', event.target.value)
                }
              />
            </label>

            <div className="pdf-dialog-grid">
              <label className="pdf-dialog-field">
                Ciclo escolar
                <input
                  value={cover.schoolYear}
                  onChange={(event) =>
                    onCoverChange(
                      'schoolYear',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="pdf-dialog-field">
                Autor
                <input
                  value={cover.author}
                  onChange={(event) =>
                    onCoverChange('author', event.target.value)
                  }
                />
              </label>
            </div>

            <label className="pdf-dialog-field">
              Texto de presentación
              <textarea
                rows={5}
                value={cover.presentation}
                onChange={(event) =>
                  onCoverChange(
                    'presentation',
                    event.target.value
                  )
                }
              />
            </label>
          </div>
          <CoverDesignEditor
            cover={cover}
            onChange={onCoverChange}
            />
        </div>

        <aside className="pdf-preview-sidebar">
            <CoverPreview settings={cover} />
        </aside>
        </div>

        <div className="pdf-dialog-footer">
          <button
            type="button"
            className="pdf-cancel"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="pdf-confirm"
            onClick={onPrint}
          >
            Abrir impresión / PDF
          </button>
        </div>
      </section>
    </div>
  );
}
