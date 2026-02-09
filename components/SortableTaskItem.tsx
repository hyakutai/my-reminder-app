// components/SortableTaskItem.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListItem } from './NoteCard';

type Props = {
  item: ListItem;
  noteId: number;
  isEditMode: boolean;
  onToggleItem: (noteId: number, itemId: string) => void;
};

export function SortableTaskItem({ item, noteId, isEditMode, onToggleItem }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: item.id,
    data: {
      type: 'Task', // これが「タスク」であることを識別するタグ
      item,
      noteId
    },
    disabled: !isEditMode // 編集モード以外はドラッグ不可
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // ドラッグ中は薄くする
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-start gap-2 text-xs p-1 rounded hover:bg-gray-50 group ${isDragging ? 'bg-blue-50' : ''}`}
    >
      {/* 編集モード時はドラッグハンドルを表示 */}
      {isEditMode && (
        <span className="text-gray-300 cursor-grab active:cursor-grabbing text-[10px] mt-0.5">
          ⠿
        </span>
      )}

      {/* チェックボックス (編集モード中は無効化せず、移動だけさせるなら操作可能でも良いが、誤操作防止で無効化もアリ) */}
      <input
        type="checkbox"
        checked={item.isCompleted}
        // ドラッグ操作と被らないようにイベントを止める
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleItem(noteId, item.id)}
        className="mt-0.5 cursor-pointer accent-green-500 shrink-0"
        disabled={isEditMode} // 編集中はチェックできないようにする
      />
      
      <span className={`break-all leading-tight ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
        {item.text}
      </span>
    </div>
  );
}