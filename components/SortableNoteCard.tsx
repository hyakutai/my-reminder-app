// components/SortableNoteCard.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import NoteCard, { Note } from './NoteCard';

type Props = {
  note: Note;
  onToggleComplete: (id: number) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onToggleItem: (noteId: number, itemId: string) => void;
};

export function SortableNoteCard(props: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
    touchAction: 'none', // スマホでの誤動作防止
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <NoteCard {...props} />
    </div>
  );
}