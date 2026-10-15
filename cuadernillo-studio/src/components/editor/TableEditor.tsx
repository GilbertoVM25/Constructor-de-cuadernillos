
import type {
  Block,
  TableTemplate,
  WorkbookTable,
} from '../../models/document';

import {
  createTable,
  tableTemplateNames,
} from '../../blocks/tableTemplates';

type Props = {
  selected: Block;
  onBlockChange: (
    id: string,
    patch: Partial<Block>
  ) => void;
};

export function TableEditor({
  selected,
  onBlockChange,
}: Props) {
  const table = selected.table;

  const updateTable = (next: WorkbookTable | undefined) => {
    onBlockChange(selected.id, { table: next });
  };

  const updateHeader = (
    index: number,
    value: string
  ) => {
    if (!table) return;

    updateTable({
      ...table,
      headers: table.headers.map((header, i) =>
        i === index ? value : header
      ),
    });
  };

  const updateCell = (
    rowIndex: number,
    columnIndex: number,
    value: string
  ) => {
    if (!table) return;

    updateTable({
      ...table,
      rows: table.rows.map((row, i) =>
        i === rowIndex
          ? row.map((cell, j) =>
              j === columnIndex ? value : cell
            )
          : row
      ),
    });
  };

  const addRow = () => {
    if (!table) return;

    updateTable({
      ...table,
      rows: [
        ...table.rows,
        Array(table.headers.length).fill(''),
      ],
    });
  };

  const removeRow = (index: number) => {
    if (!table) return;

    updateTable({
      ...table,
      rows: table.rows.filter((_, i) => i !== index),
    });
  };

  const addColumn = () => {
    if (!table || table.headers.length >= 8) return;

    updateTable({
      ...table,
      headers: [
        ...table.headers,
        `Columna ${table.headers.length + 1}`,
      ],
      rows: table.rows.map((row) => [...row, '']),
    });
  };

  const removeColumn = (index: number) => {
    if (!table || table.headers.length <= 1) return;

    updateTable({
      ...table,
      headers: table.headers.filter((_, i) => i !== index),
      rows: table.rows.map((row) =>
        row.filter((_, i) => i !== index)
      ),
    });
  };

  return (
    <section className="table-editor">
      <hr />
      <h3>Tabla de la actividad</h3>

      {!table ? (
        <>
          <p className="editor-help">
            Inserta una tabla editable dentro del bloque.
          </p>

          {(
            Object.keys(tableTemplateNames) as TableTemplate[]
          ).map((template) => (
            <button
              type="button"
              className="table-template-button"
              key={template}
              onClick={() =>
                updateTable(createTable(template))
              }
            >
              + {tableTemplateNames[template]}
            </button>
          ))}
        </>
      ) : (
        <>
          <label className="table-header-toggle">
            <input
              type="checkbox"
              checked={table.showHeaders}
              onChange={(event) =>
                updateTable({
                  ...table,
                  showHeaders: event.target.checked,
                })
              }
            />
            Mostrar encabezados
          </label>

          <h4>Columnas</h4>

          {table.headers.map((header, index) => (
            <div className="table-edit-field" key={index}>
              <input
                aria-label={`Encabezado ${index + 1}`}
                value={header}
                onChange={(event) =>
                  updateHeader(index, event.target.value)
                }
              />

              <button
                type="button"
                disabled={table.headers.length <= 1}
                onClick={() => removeColumn(index)}
                title="Eliminar columna"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            className="table-template-button"
            disabled={table.headers.length >= 8}
            onClick={addColumn}
          >
            + Agregar columna
          </button>

          <h4>Filas y celdas</h4>

          {table.rows.map((row, rowIndex) => (
            <div
              className="table-editor-row"
              key={rowIndex}
            >
              <div className="table-edit-row-heading">
                <strong>Fila {rowIndex + 1}</strong>

                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                >
                  Eliminar fila
                </button>
              </div>

              {row.map((cell, columnIndex) => (
                <label key={columnIndex}>
                  {table.headers[columnIndex] ||
                    `Columna ${columnIndex + 1}`}

                  <textarea
                    rows={2}
                    value={cell}
                    onChange={(event) =>
                      updateCell(
                        rowIndex,
                        columnIndex,
                        event.target.value
                      )
                    }
                  />
                </label>
              ))}
            </div>
          ))}

          <button
            type="button"
            className="table-template-button"
            onClick={addRow}
          >
            + Agregar fila
          </button>

          <button
            type="button"
            className="table-remove-button"
            onClick={() => {
              if (
                window.confirm(
                  '¿Eliminar la tabla completa?'
                )
              ) {
                updateTable(undefined);
              }
            }}
          >
            Eliminar tabla
          </button>
        </>
      )}
    </section>
  );
}
