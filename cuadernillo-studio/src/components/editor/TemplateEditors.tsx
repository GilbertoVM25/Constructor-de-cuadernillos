
import type {
  Block,
  ChecklistItem,
  MultipleChoiceExercise,
} from '../../models/document';

type Props = {
  selected: Block;
  onBlockChange: (
    id: string,
    patch: Partial<Block>
  ) => void;
};

export function TemplateEditors({
  selected,
  onBlockChange,
}: Props) {
  const checklist = selected.checklist;
  const exercise = selected.multipleChoice;

  const updateChecklist = (items: ChecklistItem[]) => {
    onBlockChange(selected.id, { checklist: items });
  };

  const addCriterion = () => {
    updateChecklist([
      ...(checklist ?? []),
      {
        id: crypto.randomUUID(),
        text: 'Nuevo criterio de evaluación',
      },
    ]);
  };

  const updateExercise = (
    patch: Partial<MultipleChoiceExercise>
  ) => {
    if (!exercise) return;

    onBlockChange(selected.id, {
      multipleChoice: {
        ...exercise,
        ...patch,
      },
    });
  };

  const updateOption = (
    index: number,
    value: string
  ) => {
    if (!exercise) return;

    const options = [...exercise.options];
    options[index] = value;

    updateExercise({ options });
  };

  return (
    <section className="template-editor">
      {checklist && (
        <>
          <hr />
          <h3>Criterios de autoevaluación</h3>

          {checklist.map((item, index) => (
            <div
              className="template-editor-item"
              key={item.id}
            >
              <label>
                Criterio {index + 1}
                <textarea
                  rows={2}
                  value={item.text}
                  onChange={(event) =>
                    updateChecklist(
                      checklist.map((current) =>
                        current.id === item.id
                          ? {
                              ...current,
                              text: event.target.value,
                            }
                          : current
                      )
                    )
                  }
                />
              </label>

              <div className="template-editor-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const items = [...checklist];
                    [items[index - 1], items[index]] = [
                      items[index],
                      items[index - 1],
                    ];
                    updateChecklist(items);
                  }}
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={index === checklist.length - 1}
                  onClick={() => {
                    const items = [...checklist];
                    [items[index], items[index + 1]] = [
                      items[index + 1],
                      items[index],
                    ];
                    updateChecklist(items);
                  }}
                >
                  ↓
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateChecklist(
                      checklist.filter(
                        (current) => current.id !== item.id
                      )
                    )
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="template-add-button"
            onClick={addCriterion}
          >
            + Agregar criterio
          </button>
        </>
      )}

      {exercise && (
        <>
          <hr />
          <h3>Ejercicio tipo PISA</h3>

          <label>
            Situación o contexto
            <textarea
              rows={5}
              value={exercise.situation}
              onChange={(event) =>
                updateExercise({
                  situation: event.target.value,
                })
              }
            />
          </label>

          <label>
            Pregunta
            <textarea
              rows={3}
              value={exercise.question}
              onChange={(event) =>
                updateExercise({
                  question: event.target.value,
                })
              }
            />
          </label>

          <h4>Opciones de respuesta</h4>

          {exercise.options.map((option, index) => (
            <label key={index}>
              Opción {String.fromCharCode(65 + index)}
              <input
                value={option}
                onChange={(event) =>
                  updateOption(index, event.target.value)
                }
              />
            </label>
          ))}

          <div className="template-editor-actions">
            <button
              type="button"
              disabled={exercise.options.length <= 2}
              onClick={() =>
                updateExercise({
                  options: exercise.options.slice(0, -1),
                })
              }
            >
              − Quitar opción
            </button>

            <button
              type="button"
              disabled={exercise.options.length >= 6}
              onClick={() =>
                updateExercise({
                  options: [
                    ...exercise.options,
                    'Nueva opción',
                  ],
                })
              }
            >
              + Agregar opción
            </button>
          </div>

          <label>
            Líneas para justificar
            <input
              type="number"
              min={0}
              max={12}
              value={exercise.justificationLines}
              onChange={(event) =>
                updateExercise({
                  justificationLines: Math.max(
                    0,
                    Math.min(
                      12,
                      Number(event.target.value) || 0
                    )
                  ),
                })
              }
            />
          </label>
        </>
      )}
    </section>
  );
}
