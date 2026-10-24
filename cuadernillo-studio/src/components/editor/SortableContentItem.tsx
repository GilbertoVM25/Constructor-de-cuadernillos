
import type { ReactNode } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type DragHandleProps = {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
};

type Props = {
  id: string;
  selected?: boolean;
  children: (drag: DragHandleProps) => ReactNode;
};

export function SortableContentItem({
  id,
  selected = false,
  children,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`content-editor-item sortable-item ${
        isDragging ? 'is-dragging' : ''
      } ${
        selected ? 'is-selected-from-preview' : ''
      }`}
      data-content-element-id={id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      {children({ attributes, listeners })}
    </div>
  );
}
