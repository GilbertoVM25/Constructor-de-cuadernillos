
import type {
  Block,
  ContentElement,
  WorkbookTable,
  GalleryElement,
  GalleryImage,
} from '../../models/document';

import { createTable } from '../../blocks/tableTemplates';

import { useState } from 'react';


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

import { SortableContentItem } from './SortableContentItem';


type Props = {
  selected: Block;
  onBlockChange: (
    id: string,
    patch: Partial<Block>
  ) => void;
};

export function ContentEditor({
  selected,
  onBlockChange,
}: Props) {
  const elements = selected.elements ?? [];

  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = elements.findIndex(
      (element) => element.id === active.id
    );

    const newIndex = elements.findIndex(
      (element) => element.id === over.id
    );

    if (oldIndex < 0 || newIndex < 0) return;

    save(arrayMove(elements, oldIndex, newIndex));
  };


  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleElement = (id: string) => {
    setExpandedId((current) => current === id ? null : id);
  };

  const save = (next: ContentElement[]) => {
    onBlockChange(selected.id, {
      elements: next,
    });
  };

  const addText = () => {
    const id = crypto.randomUUID();
    save([
      ...elements,
      {
        id: id,
        type: 'text',
        content: 'Escribe aquí el texto...',
      },
    ]);
    setExpandedId(id);
  };

  const addQuestion = () => {
    const id = crypto.randomUUID();
    save([
      ...elements,
      {
        id: id,
        type: 'question',
        text: 'Nueva pregunta',
        answerLines: 2,
      },
    ]);
    setExpandedId(id);
  };

  const addTable = () => {
    const id = crypto.randomUUID();
    save([
      ...elements,
      {
        id: id,
        type: 'table',
        table: createTable('basic'),
      },
    ]);
    setExpandedId(id);
  };

  
  const addImage = () => {
    const id = crypto.randomUUID();
    save([
      ...elements,
      {
        id: id,
        type: 'image',
        src: '',
        caption: '',
        width: 100,
        align: 'center',
      },
    ]);
    setExpandedId(id);
  };

  
  const addGallery = () => {
    const id = crypto.randomUUID();
    const images: GalleryImage[] = Array.from(
      { length: 2 },
      (_, index) => ({
        id: crypto.randomUUID(),
        src: '',
        caption: `Imagen ${index + 1}`,
      })
    );

    const gallery: GalleryElement = {
      id: id,
      type: 'gallery',
      images,
      gap: 8,
    };

    save([...elements, gallery]);
    setExpandedId(id);
  };

  const updateElement = (
    id: string,
    patch: Partial<ContentElement>
  ) => {
    save(
      elements.map((element) =>
        element.id === id
          ? ({ ...element, ...patch } as ContentElement)
          : element
      )
    );
  };

  
  const uploadImage = (
    elementId: string,
    file: File
  ) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecciona un archivo de imagen válido.');
      return;
    }

    // Por ahora limitamos el tamaño para evitar
    // proyectos JSON excesivamente grandes.
    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        'La imagen supera los 2 MB. ' +
        'Reduce su tamaño antes de cargarla.'
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      updateElement(elementId, {
        src: reader.result,
      });
    };

    reader.onerror = () => {
      alert('No fue posible leer la imagen.');
    };

    reader.readAsDataURL(file);
  };


  const moveElement = (
    index: number,
    direction: number
  ) => {
    const target = index + direction;

    if (target < 0 || target >= elements.length) {
      return;
    }

    const next = [...elements];

    [next[index], next[target]] = [
      next[target],
      next[index],
    ];

    save(next);
  };

  const removeElement = (id: string) => {
    if (
      !window.confirm(
        '¿Eliminar este elemento de la actividad?'
      )
    ) {
      return;
    }

    save(
      elements.filter((element) => element.id !== id)
    );
  };

  const updateTable = (
    id: string,
    table: WorkbookTable
  ) => {
    updateElement(id, { table } as Partial<ContentElement>);
  };

  
  const updateGallery = (
    gallery: GalleryElement,
    patch: Partial<GalleryElement>
  ) => {
    save(
      elements.map((element) =>
        element.id === gallery.id
          ? { ...gallery, ...patch }
          : element
      )
    );
  };

  const updateGalleryImage = (
    gallery: GalleryElement,
    imageId: string,
    patch: Partial<GalleryImage>
  ) => {
    updateGallery(gallery, {
      images: gallery.images.map((image) =>
        image.id === imageId
          ? { ...image, ...patch }
          : image
      ),
    });
  };

  const addGalleryImage = (gallery: GalleryElement) => {
    if (gallery.images.length >= 3) return;

    updateGallery(gallery, {
      images: [
        ...gallery.images,
        {
          id: crypto.randomUUID(),
          src: '',
          caption: `Imagen ${gallery.images.length + 1}`,
        },
      ],
    });
  };

  const removeGalleryImage = (
    gallery: GalleryElement,
    imageId: string
  ) => {
    if (gallery.images.length <= 2) return;

    updateGallery(gallery, {
      images: gallery.images.filter(
        (image) => image.id !== imageId
      ),
    });
  };

  
  const uploadGalleryImage = async (
    gallery: GalleryElement,
    imageId: string,
    file: File
  ) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Utiliza JPG, PNG o WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 2 MB.');
      return;
    }

    try {
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Imagen inválida'));
          }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      updateGalleryImage(gallery, imageId, { src });
    } catch {
      alert('No fue posible cargar la imagen.');
    }
  };


  return (
    <section className="content-editor">
      <hr />

      <h3>Contenido de la actividad</h3>

      <p className="editor-help">
        Agrega y ordena textos, preguntas y tablas.
      </p>

      <div className="content-add-actions">
        <button type="button" onClick={addText}>
          + Texto
        </button>

        <button type="button" onClick={addQuestion}>
          + Pregunta
        </button>

        <button type="button" onClick={addTable}>
          + Tabla
        </button>
        <button type="button" onClick={addImage}>
          + Imagen
        </button>
        <button type="button" onClick={addGallery}>
          + Galería
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={elements.map((element) => element.id)}
          strategy={verticalListSortingStrategy}
        >
          {elements.map((element, index) => (
            <SortableContentItem
              key={element.id}
              id={element.id}
            >
              {({ attributes, listeners }) => (
                <>
              
            <div className="content-editor-heading">
              <div className="content-editor-main">
                <button
                  type="button"
                  className="drag-handle"
                  title="Arrastrar para reordenar"
                  aria-label={`Arrastrar elemento ${index + 1}`}
                  {...attributes}
                  {...listeners}
                >
                  ⠿
                </button>

                <button
                  type="button"
                  className="content-element-toggle"
                  aria-expanded={expandedId === element.id}
                  aria-controls={`element-panel-${element.id}`}
                  onClick={() => toggleElement(element.id)}
                >
                  <span className="content-element-title-row">
                    <span className="content-element-title">
                      {index + 1}.{' '}
                      {element.type === 'text'
                        ? 'Texto'
                        : element.type === 'question'
                          ? 'Pregunta'
                          : element.type === 'table'
                            ? 'Tabla'
                            : element.type === 'image'
                              ? 'Imagen'
                              : 'Galería'}
                    </span>
                  </span>

                  <span className="content-element-summary">
                    {element.type === 'text'
                      ? element.content.slice(0, 60) || 'Sin contenido'
                      : element.type === 'question'
                        ? element.text.slice(0, 60) || 'Sin pregunta'
                        : element.type === 'table'
                          ? `${element.table.headers.length} columnas · ${element.table.rows.length} filas`
                          : element.type === 'image'
                            ? element.caption || 'Sin descripción'
                            : `${element.images.length} imágenes`}
                  </span>
                </button>
              </div>

              <div className="content-editor-actions">
                <button
                  type="button"
                  className="content-icon-button"
                  onClick={() => toggleElement(element.id)}
                  title={expandedId === element.id ? 'Colapsar' : 'Expandir'}
                >
                  {expandedId === element.id ? '⌃' : '⌄'}
                </button>

                <button
                  type="button"
                  className="content-icon-button danger"
                  onClick={() => removeElement(element.id)}
                  title="Eliminar elemento"
                >
                  ×
                </button>
              </div>
            </div>

            <div
              id={`element-panel-${element.id}`}
              className="content-element-panel"
              hidden={expandedId !== element.id}
            >

              {element.type === 'text' && (
                <label>
                  Contenido
                  <textarea
                    rows={4}
                    value={element.content}
                    onChange={(event) =>
                      updateElement(element.id, {
                        content: event.target.value,
                      })
                    }
                  />
                </label>
              )}

              {element.type === 'question' && (
                <>
                  <label>
                    Enunciado
                    <textarea
                      rows={3}
                      value={element.text}
                      onChange={(event) =>
                        updateElement(element.id, {
                          text: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Líneas de respuesta
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={element.answerLines}
                      onChange={(event) =>
                        updateElement(element.id, {
                          answerLines: Math.max(
                            0,
                            Math.min(
                              20,
                              Number(event.target.value) || 0
                            )
                          ),
                        })
                      }
                    />
                  </label>
                </>
              )}

              {element.type === 'table' && (
                <div className="content-table-editor">
                  <label>
                    Encabezados
                    <input
                      type="checkbox"
                      checked={element.table.showHeaders}
                      onChange={(event) =>
                        updateTable(element.id, {
                          ...element.table,
                          showHeaders: event.target.checked,
                        })
                      }
                    />
                  </label>

                  <div className="content-table-actions">
                    <button
                      type="button"
                      disabled={element.table.headers.length >= 8}
                      onClick={() =>
                        updateTable(element.id, {
                          ...element.table,
                          headers: [
                            ...element.table.headers,
                            `Columna ${
                              element.table.headers.length + 1
                            }`,
                          ],
                          rows: element.table.rows.map((row) => [
                            ...row,
                            '',
                          ]),
                        })
                      }
                    >
                      + Columna
                    </button>

                    <button
                      type="button"
                      disabled={element.table.headers.length <= 1}
                      onClick={() =>
                        updateTable(element.id, {
                          ...element.table,
                          headers: element.table.headers.slice(0, -1),
                          rows: element.table.rows.map((row) =>
                            row.slice(0, -1)
                          ),
                        })
                      }
                    >
                      − Columna
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTable(element.id, {
                          ...element.table,
                          rows: [
                            ...element.table.rows,
                            Array(
                              element.table.headers.length
                            ).fill(''),
                          ],
                        })
                      }
                    >
                      + Fila
                    </button>

                    <button
                      type="button"
                      disabled={element.table.rows.length === 0}
                      onClick={() =>
                        updateTable(element.id, {
                          ...element.table,
                          rows: element.table.rows.slice(0, -1),
                        })
                      }
                    >
                      − Fila
                    </button>
                  </div>

                  {element.table.headers.map((header, column) => (
                    <label key={`header-${column}`}>
                      Encabezado {column + 1}
                      <input
                        value={header}
                        onChange={(event) =>
                          updateTable(element.id, {
                            ...element.table,
                            headers: element.table.headers.map(
                              (value, index) =>
                                index === column
                                  ? event.target.value
                                  : value
                            ),
                          })
                        }
                      />
                    </label>
                  ))}

                  {element.table.rows.map((row, rowIndex) => (
                    <div
                      className="content-table-row"
                      key={rowIndex}
                    >
                      <strong>Fila {rowIndex + 1}</strong>

                      {row.map((cell, columnIndex) => (
                        <label key={columnIndex}>
                          {element.table.headers[columnIndex] ||
                            `Columna ${columnIndex + 1}`}

                          <textarea
                            rows={2}
                            value={cell}
                            onChange={(event) =>
                              updateTable(element.id, {
                                ...element.table,
                                rows: element.table.rows.map(
                                  (currentRow, index) =>
                                    index === rowIndex
                                      ? currentRow.map(
                                          (value, cellIndex) =>
                                            cellIndex === columnIndex
                                              ? event.target.value
                                              : value
                                        )
                                      : currentRow
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
              {element.type === 'image' && (
                <div className="content-image-editor">
                  <label>
                    Archivo de imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          uploadImage(element.id, file);
                        }

                        // Permitir seleccionar nuevamente
                        // el mismo archivo.
                        event.target.value = '';
                      }}
                    />
                  </label>

                  {element.src && (
                    <div className="content-image-preview">
                      <img
                        src={element.src}
                        alt={element.caption || 'Vista previa'}
                      />
                    </div>
                  )}

                  <label>
                    Pie de imagen
                    <input
                      type="text"
                      value={element.caption}
                      placeholder="Ejemplo: Figura 1. Mezcla homogénea"
                      onChange={(event) =>
                        updateElement(element.id, {
                          caption: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Anchura: {element.width} %
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={5}
                      value={element.width}
                      onChange={(event) =>
                        updateElement(element.id, {
                          width: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    Alineación
                    <select
                      value={element.align}
                      onChange={(event) =>
                        updateElement(element.id, {
                          align: event.target.value as
                            | 'left'
                            | 'center'
                            | 'right',
                        })
                      }
                    >
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </label>

                  {element.src && (
                    <button
                      type="button"
                      className="content-remove-image"
                      onClick={() =>
                        updateElement(element.id, {
                          src: '',
                        })
                      }
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>
              )}

              
              {element.type === 'gallery' && (
                <div className="content-gallery-editor">
                  <p className="editor-help">
                    Coloca dos o tres imágenes en una misma fila.
                  </p>

                  {element.images.map((image, index) => (
                    <div
                      className="content-gallery-image"
                      key={image.id}
                    >
                      <strong>Imagen {index + 1}</strong>

                      <label>
                        Seleccionar archivo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                              void uploadGalleryImage(
                                element,
                                image.id,
                                file
                              );
                            }

                            event.target.value = '';
                          }}
                        />
                      </label>

                      {image.src && (
                        <div className="content-image-preview">
                          <img
                            src={image.src}
                            alt={image.caption || 'Imagen'}
                          />
                        </div>
                      )}

                      <label>
                        Pie de imagen
                        <input
                          value={image.caption}
                          onChange={(event) =>
                            updateGalleryImage(
                              element,
                              image.id,
                              { caption: event.target.value }
                            )
                          }
                        />
                      </label>

                      {element.images.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeGalleryImage(element, image.id)
                          }
                        >
                          Eliminar esta imagen
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={element.images.length >= 3}
                    onClick={() => addGalleryImage(element)}
                  >
                    + Añadir tercera imagen
                  </button>

                  <label>
                    Separación: {element.gap} px
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={2}
                      value={element.gap}
                      onChange={(event) =>
                        updateGallery(element, {
                          gap: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              )}
              </div>
              </>
              )}
            </SortableContentItem>
          ))}
        </SortableContext>
      </DndContext>
      {selected.table && (
        <button
          type="button"
          className="content-migrate-button"
          onClick={() => {
            onBlockChange(selected.id, {
                elements: [
                ...elements,
                {
                    id: crypto.randomUUID(),
                    type: 'table',
                    table: selected.table!,
                },
                ],
                table: undefined,
            });
            }}
        >
          Convertir tabla antigua en elemento ordenable
        </button>
      )}
    </section>
  );
}
