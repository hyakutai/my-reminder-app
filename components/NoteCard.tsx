import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskItem } from './SortableTaskItem';

export type ListItem = {
  id: string;
  text: string;
  isCompleted: boolean;
  completedAt?: number;
};

export type Note = {
  id: number;
  title: string;
  items: ListItem[];
  reminder?: string;
  reminderIso?: string;
  isCompleted: boolean;
};

type Props = {
  note: Note;
  isEditMode: boolean;
  addressLabel: string;
  onToggleComplete: (id: number) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onToggleItem: (noteId: number, itemId: string) => void;
};

export default function NoteCard({ 
  note, 
  isEditMode, 
  addressLabel, 
  onToggleComplete, 
  onEdit, 
  onDelete, 
  onToggleItem 
}: Props) {
  
  const totalItems = note.items ? note.items.length : 0;
  const completedItems = note.items ? note.items.filter(i => i.isCompleted).length : 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div 
      onClick={() => !isEditMode && onEdit(note)}
      className={`relative p-3 rounded-xl shadow-sm border transition-all flex flex-col w-full
        ${note.isCompleted ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-100'}
        ${!isEditMode ? 'hover:shadow-md cursor-pointer active:scale-95' : ''}
        ${isEditMode ? 'border-dashed border-2 border-blue-300' : ''} 
      `}
    >
      {/* ★ 修正: 位置を「左上 (left-0)」に変更 */}
      <div className="absolute top-0 left-0 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg z-10 pointer-events-none">
        {addressLabel}
      </div>

      {/* 削除ボタン（右上のまま） */}
      {isEditMode && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-20 hover:bg-red-600"
        >
          ✕
        </button>
      )}

      {/* 移動ハンドル（中央上のまま） */}
      {isEditMode && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border border-blue-300 text-blue-400 px-2 rounded-full text-xs cursor-grab active:cursor-grabbing shadow-sm whitespace-nowrap z-20">
          ⠿ リスト移動
        </div>
      )}

      {/* タイトル周りのマージン調整 */}
      <div className={`flex items-start gap-2 mb-2 pr-2 ${isEditMode ? 'mt-4' : 'mt-4'}`}>
        {!isEditMode && (
          <input 
            type="checkbox" 
            checked={note.isCompleted} 
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleComplete(note.id)}
            className="w-5 h-5 mt-0.5 cursor-pointer accent-blue-600 shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          {note.reminder && (
            <div className={`flex items-center gap-1 text-[10px] font-semibold mb-1 px-1.5 py-0.5 rounded w-fit ${note.isCompleted ? 'text-gray-400 bg-gray-200' : 'text-orange-500 bg-orange-50'}`}>
              <span>🔔</span>
              <span>{note.reminder}</span>
            </div>
          )}
          
          <h3 className={`font-bold truncate text-base ${note.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {note.title}
          </h3>
        </div>
      </div>

      {totalItems > 0 && !note.isCompleted && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="space-y-1 pl-1 flex-1 min-h-[20px]">
        <SortableContext 
          items={note.items.map(i => i.id)} 
          strategy={verticalListSortingStrategy}
        >
          {note.items.map((item) => (
            <SortableTaskItem
              key={item.id}
              item={item}
              noteId={note.id}
              isEditMode={isEditMode}
              onToggleItem={onToggleItem}
            />
          ))}
        </SortableContext>
        
        {note.items.length === 0 && isEditMode && (
          <div className="text-xs text-gray-300 text-center py-4 border-2 border-dashed border-gray-100 rounded">
            タスクなし
          </div>
        )}
      </div>
    </div>
  );
}