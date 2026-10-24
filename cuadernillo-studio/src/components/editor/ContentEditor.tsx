
import type {
  Block,
  ContentElement,
  WorkbookTable,
  GalleryElement,
  GalleryImage,
} from '../../models/document';

import { createTable } from '../../blocks/tableTemplates';

import { useEffect, useRef, useState } from 'react';

import { RichTextEditor } from './RichTextEditor';

import { TextImageEditor } from './TextImageEditor';
import { CardGridEditor } from './CardGridEditor';
import type { TextImageElement } from '../../models/document';

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
  selectedElementId?: string | null;
  onBlockChange: (
    id: string,
    patch: Partial<Block>
  ) => void;
};

export function ContentEditor({
  selected,
  selectedElementId = null,
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

  
  const editorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!selectedElementId) return;

    const exists = (selected.elements ?? []).some(
      (element) => element.id === selectedElementId
    );

    if (!exists) return;

    // Abrir el acordeón correspondiente.
    setExpandedId(selectedElementId);

    // Esperar a que React muestre su contenido.
    const frame = requestAnimationFrame(() => {
      const items =
        editorRef.current?.querySelectorAll<HTMLElement>(
          '[data-content-element-id]'
        );

      const target = Array.from(items ?? []).find(
        (item) =>
          item.dataset.contentElementId ===
          selectedElementId
      );

      target?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [selected.id, selectedElementId]);


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

  const addTextImage = () => {
  const id = crypto.randomUUID();
  const element: TextImageElement = {
    id, type: 'textImage', text: 'Escribe aquí el texto...',
    side: 'right', textPercent: 60, gap: 8, imageHeight: 95,
    images: [{ id: crypto.randomUUID(), src: '', caption: '' }],
  };
  save([...elements, element]);
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

  
  const addCardGrid = () => {
    const id = crypto.randomUUID();
    save([...elements, {
      id, type: 'cardGrid', columns: 3, gap: 8, imageHeight: 95,
      cards: Array.from({ length: 3 }, (_, index) => ({
        id: crypto.randomUUID(), title: `Concepto ${index + 1}`,
        text: 'Descripción del concepto.', image: '', imagePosition: 'bottom' as const,
      })),
    }]);
    setExpandedId(id);
  };

  const addResponseArea = () => {
    const id = crypto.randomUUID();

    save([
      ...elements,
      {
        id,
        type: 'responseArea',
        style: 'lines',
        height: 180,
        label: '',
      },
    ]);

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

  const changeCellImage = (
    table: WorkbookTable,
    row: number,
    column: number,
    patch: { src?: string; width?: number; align?: 'left' | 'center' | 'right' }
  ): WorkbookTable => {
    const key = `${row}:${column}`;
    const current = table.cellImages?.[key] ?? { src: '', width: 85, align: 'center' as const };
    const nextImage = { ...current, ...patch };
    const cellImages = { ...table.cellImages };
    if (!nextImage.src) delete cellImages[key];
    else cellImages[key] = nextImage;
    return { ...table, cellImages };
  };

  const uploadCellImage = (elementId: string, table: WorkbookTable, row: number, column: number, file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Utiliza JPG, PNG o WebP.'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 2 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateTable(elementId, changeCellImage(table, row, column, { src: reader.result }));
      }
    };
    reader.onerror = () => alert('No fue posible leer la imagen.');
    reader.readAsDataURL(file);
  };

  // Al eliminar una fila o columna, mantener asociadas las imágenes restantes.
  const trimCellImages = (table: WorkbookTable, rows: number, cols: number): WorkbookTable['cellImages'] => {
    return Object.fromEntries(
      Object.entries(table.cellImages ?? {}).filter(([key]) => {
        const match = /^(\d+):(\d+)$/.exec(key);
        return !!match && Number(match[1]) < rows && Number(match[2]) < cols;
      })
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
    <section
      className="content-editor"
      ref={editorRef}
    >
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
        <button type="button" onClick={addTextImage}>+ Texto + Imagen</button>
        <button type="button" onClick={addCardGrid}>+ Tarjetas informativas</button>
        <button type="button" onClick={addGallery}>
          + Galería
        </button>
        <button
          type="button"
          onClick={addResponseArea}
        >
          + Espacio de respuesta
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
              selected={selectedElementId === element.id}
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
                              : element.type === 'cardGrid'
                                ? 'Tarjetas informativas'
                              : element.type === 'responseArea'
                                ? 'Espacio de respuesta'
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
                          : element.type === 'cardGrid'
                            ? `${element.cards.length} tarjetas · ${element.columns} columnas`
                          : element.type === 'responseArea'
                            ? `${element.style} · ${element.height} px`
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
                <div className="content-rich-field">
                  <span>Contenido</span>

                  <RichTextEditor
                    key={element.id}
                    value={element.richHtml}
                    legacyText={element.content}
                    onChange={(html) =>
                      updateElement(element.id, {
                        richHtml: html,
                      })
                    }
                  />
                </div>
              )}

              

              {element.type === 'question' && (
                <>
                  
                  <div className="content-rich-field">
                    <span>Enunciado</span>

                    <RichTextEditor
                      key={element.id}
                      value={element.richHtml}
                      legacyText={element.text}
                      onChange={(html) =>
                        updateElement(element.id, {
                          richHtml: html,
                        })
                      }
                    />
                  </div>


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
                  <label>
                    Ubicación de la respuesta
                    <select value={element.answerPosition ?? 'below'}
                      onChange={(event) => updateElement(element.id, {
                        answerPosition: event.target.value as 'below' | 'inline',
                      })}>
                      <option value="below">Debajo</option>
                      <option value="inline">Al lado (respuesta corta)</option>
                    </select>
                  </label>
                  <label>
                    Anchura dentro de la actividad
                    <select value={element.width ?? 'full'}
                      onChange={(event) => updateElement(element.id, {
                        width: event.target.value as 'full' | 'half',
                      })}>
                      <option value="full">Fila completa</option>
                      <option value="half">Media fila (emparejar con la siguiente)</option>
                    </select>
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
                           cellImages: trimCellImages(element.table, element.table.rows.length, element.table.headers.length - 1),
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
                           cellImages: trimCellImages(element.table, element.table.rows.length - 1, element.table.headers.length),
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
                        <div className="table-cell-input" key={columnIndex}>
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
                          <div className="table-cell-image-controls">
                            <label>
                              Imagen de la celda (opcional)
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) => {
                                  const file = event.currentTarget.files?.[0];
                                  if (file) uploadCellImage(element.id, element.table, rowIndex, columnIndex, file);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                            <label>
                              Ruta de la imagen
                              <input
                                type="text"
                                value={element.table.cellImages?.[`${rowIndex}:${columnIndex}`]?.src ?? ''}
                                placeholder="/assets/material.png"
                                onChange={(event) => updateTable(
                                  element.id,
                                  changeCellImage(element.table, rowIndex, columnIndex, { src: event.target.value })
                                )}
                              />
                            </label>
                            {element.table.cellImages?.[`${rowIndex}:${columnIndex}`]?.src && (
                              <>
                                <img
                                  className="table-cell-image-editor-preview"
                                  src={element.table.cellImages[`${rowIndex}:${columnIndex}`].src}
                                  alt="Vista previa de la celda"
                                />
                                <label>
                                  Ancho: {element.table.cellImages[`${rowIndex}:${columnIndex}`].width ?? 85}%
                                  <input
                                    type="range" min={20} max={100} step={5}
                                    value={element.table.cellImages[`${rowIndex}:${columnIndex}`].width ?? 85}
                                    onChange={(event) => updateTable(element.id,
                                      changeCellImage(element.table, rowIndex, columnIndex, { width: Number(event.target.value) }))}
                                  />
                                </label>
                                <label>
                                  Alineación
                                  <select
                                    value={element.table.cellImages[`${rowIndex}:${columnIndex}`].align ?? 'center'}
                                    onChange={(event) => updateTable(element.id,
                                      changeCellImage(element.table, rowIndex, columnIndex, {
                                        align: event.target.value as 'left' | 'center' | 'right'
                                      }))}
                                  >
                                    <option value="left">Izquierda</option>
                                    <option value="center">Centro</option>
                                    <option value="right">Derecha</option>
                                  </select>
                                </label>
                                <button type="button" onClick={() => updateTable(
                                  element.id, changeCellImage(element.table, rowIndex, columnIndex, { src: '' })
                                )}>Quitar imagen de esta celda</button>
                              </>
                            )}
                          </div>
                         </div>
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

              {element.type === 'textImage' && (
                <TextImageEditor
                  value={element}
                  onChange={patch => updateElement(element.id, patch)}
                />
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
              
              {element.type === 'cardGrid' && (
                <CardGridEditor
                  value={element}
                  onChange={(patch) => updateElement(element.id, patch)}
                />
              )}

              {element.type === 'responseArea' && (
                <div className="response-area-editor">
                  <label>
                    Tipo de espacio

                    <select
                      value={element.style}
                      onChange={(event) =>
                        updateElement(element.id, {
                          style: event.target.value as
                            | 'lines'
                            | 'blank'
                            | 'grid'
                            | 'drawing',
                        })
                      }
                    >
                      <option value="lines">
                        Líneas para escribir
                      </option>
                      <option value="blank">
                        Recuadro en blanco
                      </option>
                      <option value="grid">
                        Cuadrícula
                      </option>
                      <option value="drawing">
                        Espacio para dibujar
                      </option>
                    </select>
                  </label>

                  <label>
                    Instrucción o etiqueta (opcional)

                    <input
                      type="text"
                      value={element.label}
                      placeholder="Ej. Dibuja el modelo de una molécula"
                      onChange={(event) =>
                        updateElement(element.id, {
                          label: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Altura: {element.height} px

                    <input
                      type="range"
                      min={80}
                      max={500}
                      step={10}
                      value={element.height}
                      onChange={(event) =>
                        updateElement(element.id, {
                          height: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    Altura exacta (px)

                    <input
                      type="number"
                      min={80}
                      max={500}
                      value={element.height}
                      onChange={(event) =>
                        updateElement(element.id, {
                          height: Math.max(
                            80,
                            Math.min(
                              500,
                              Number(event.target.value) || 80
                            )
                          ),
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
