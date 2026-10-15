
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Block } from '../../models/document';
import { blockThemes } from '../../styles/blockThemes';
import { blockRegistry } from '../../blocks/blockRegistry';

type Props = {
  block: Block;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function SortableLibraryBlock({
  block,
  selected,
  onSelect,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const theme = blockThemes[block.kind];
  const definition = blockRegistry[block.kind];

  return (
    <div
      ref={setNodeRef}
      className={`library-block ${
        selected ? 'current' : ''
      } ${isDragging ? 'is-dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftColor: theme.border,
      }}
    >
      <button
        type="button"
        className="library-drag-handle"
        title="Arrastrar para cambiar posición"
        aria-label={`Mover ${block.title}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <button
        type="button"
        className="library-block-content"
        onClick={() => onSelect(block.id)}
        title={block.title}
      >
        <span className="library-block-title">
          {block.title}
        </span>

        <span className="library-block-type">
          {definition.label}
        </span>
      </button>

      {selected && (
        <span
          className="library-selected-indicator"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </div>
  );
}
