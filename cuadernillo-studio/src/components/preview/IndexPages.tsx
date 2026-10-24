
import type {
  WorkbookSequence,
} from '../../models/document';

type Props = {
  sequences: WorkbookSequence[];
  startPages: Map<string, number>;
  firstPage: number;
};

export const INDEX_ENTRIES_PER_PAGE = 14;

export function getIndexPageCount(
  sequenceCount: number
): number {
  return Math.max(
    1,
    Math.ceil(sequenceCount / INDEX_ENTRIES_PER_PAGE)
  );
}

export function IndexPages({
  sequences,
  startPages,
  firstPage,
}: Props) {
  const pageCount = getIndexPageCount(
    sequences.length
  );

  return (
    <div className="index-pages">
      {Array.from(
        { length: pageCount },
        (_, pageIndex) => {
          const start =
            pageIndex * INDEX_ENTRIES_PER_PAGE;

          const entries = sequences.slice(
            start,
            start + INDEX_ENTRIES_PER_PAGE
          );

          return (
            <div
              className="paper index-paper"
              key={pageIndex}
            >
              <div className="index-header">
                <span>CUADERNILLO DE QUÍMICA</span>

                <h1>
                  {pageIndex === 0
                    ? 'Índice'
                    : 'Índice · Continuación'}
                </h1>

                <p>
                  Contenidos y secuencias didácticas
                </p>
              </div>

              <div className="index-entries">
                {entries.map((sequence) => (
                  <div
                    className="index-entry"
                    key={sequence.id}
                  >
                    <div className="index-entry-info">
                      <strong>
                        Secuencia {sequence.sequence}.
                        {' '}
                        {sequence.title}
                      </strong>

                      {(
                        sequence.contentNumber ||
                        sequence.contentTitle?.trim()
                      ) && (
                        <small>
                          {sequence.contentNumber
                            ? `Contenido ${sequence.contentNumber}`
                            : 'Contenido'}

                          {sequence.contentTitle?.trim()
                            ? ` · ${sequence.contentTitle}`
                            : ''}
                        </small>
                      )}
                    </div>

                    <span className="index-dots" />

                    <span className="index-page-number">
                      {startPages.get(sequence.id) ??
                        firstPage}
                    </span>
                  </div>
                ))}
              </div>

              <footer className="index-footer">
                <span>Índice del cuadernillo</span>

                <span>
                  {firstPage + pageIndex}
                </span>
              </footer>
            </div>
          );
        }
      )}
    </div>
  );
}
