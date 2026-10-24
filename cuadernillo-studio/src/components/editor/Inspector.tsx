
import type {
  Block,
  Workbook,
} from '../../models/document';

import { availableBlocks } from '../../blocks/blockRegistry';
import { TemplateEditors } from './TemplateEditors';
import { ContentEditor } from './ContentEditor';

type InspectorProps = {
  workbook: Workbook;
  selected: Block | undefined;
  selectedElementId?: string | null;
  onChange: (workbook: Workbook) => void;
  onBlockChange: (
    id: string,
    patch: Partial<Block>
  ) => void;
};

export function Inspector({
  workbook,
  selected,
  selectedElementId = null,
  onChange,
  onBlockChange,
}: InspectorProps) {
  return (
    <aside className="inspector">
      <h2>Propiedades</h2>

      <label>
        Título de la secuencia
        <input
          value={workbook.title}
          onChange={(event) =>
            onChange({
              ...workbook,
              title: event.target.value,
            })
          }
        />
      </label>

      <label>
        Subtítulo
        <input
          value={workbook.subtitle}
          onChange={(event) =>
            onChange({
              ...workbook,
              subtitle: event.target.value,
            })
          }
        />
      </label>

      {selected ? (
        <>
          <hr />

          <h3>Editar bloque</h3>

          <label>
            Tipo de bloque

            <select
              value={selected.kind}
              onChange={(event) =>
                onBlockChange(selected.id, {
                  kind: event.target.value as Block['kind'],
                })
              }
            >
              {availableBlocks.map((definition) => (
                <option
                  key={definition.kind}
                  value={definition.kind}
                >
                  {definition.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Título
            <input
              value={selected.title}
              onChange={(event) =>
                onBlockChange(selected.id, {
                  title: event.target.value,
                })
              }
            />
          </label>

          <label>
            Distribución del bloque

            <select
              value={selected.layout ?? 'auto'}
              onChange={(event) =>
                onBlockChange(selected.id, {
                  layout: event.target.value as
                    | 'auto'
                    | 'half'
                    | 'full',
                })
              }
            >
              <option value="auto">Automática</option>
              <option value="half">
                Media página de ancho
              </option>
              <option value="full">
                Ancho completo
              </option>
            </select>
          </label>

          <label>
            Altura mínima (px)
            <input
              type="number"
              min={75}
              max={650}
              value={selected.minHeight}
              onChange={(event) =>
                onBlockChange(selected.id, {
                  minHeight: Number(event.target.value),
                })
              }
            />
          </label>

          <hr />

          <ContentEditor
            selected={selected}
            selectedElementId={selectedElementId}
            onBlockChange={onBlockChange}
          />

          <TemplateEditors
            selected={selected}
            onBlockChange={onBlockChange}
          />
        </>
      ) : (
        <p>Selecciona un bloque para editarlo.</p>
      )}
    </aside>
  );
}
