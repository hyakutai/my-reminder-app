import React from 'react';

// ■ completedAt (完了日時) を追加
export type ListItem = {
  id: string;
  text: string;
  isCompleted: boolean;
  completedAt?: number; // ★追加
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
  isEditMode: boolean; // ★追加: 編集モードかどうか
  onToggleComplete: (id: number) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onToggleItem: (noteId: number, itemId: string) => void;
};

export default function NoteCard({ note, isEditMode, onToggleComplete, onEdit, onDelete, onToggleItem }: Props) {
  
  const totalItems = note.items ? note.items.length : 0;
  const completedItems = note.items ? note.items.filter(i => i.isCompleted).length : 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    // ★レイアウト変更: mb-4 break-inside-avoid (これで隙間なく詰まります)
    <div 
      onClick={() => !isEditMode && onEdit(note)} // 編集モードでない時だけクリックで開く
      className={`relative p-3 rounded-xl shadow-sm border transition-all mb-4 break-inside-avoid
        ${note.isCompleted ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-100'}
        ${!isEditMode ? 'hover:shadow-md cursor-pointer active:scale-95' : ''}
        ${isEditMode ? 'border-dashed border-2 border-blue-300' : ''} 
      `}
    >
      
      {/* 削除ボタン（編集モードの時だけ表示） */}
      {isEditMode && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10"
        >
          ✕
        </button>
      )}

      {/* ドラッグハンドル（編集モードの時だけ表示） */}
      {isEditMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-gray-300">
          :::
        </div>
      )}

      <div className={`flex items-start gap-2 mb-2 pr-2 ${isEditMode ? 'mt-4' : ''}`}>
        {/* カード完了チェック (編集モード中は隠す) */}
        {!isEditMode && (
          <input 
            type="checkbox" 
            checked={note.isCompleted} 
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleComplete(note.id)}
            className="w-5 h-5 mt-1 cursor-pointer accent-blue-600 shrink-0"
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

      <div className="space-y-1 pl-1">
        {(note.items || []).map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-xs">
            {/* 項目チェック (編集モード中は無効化) */}
            <input 
              type="checkbox"
              checked={item.isCompleted}
              onClick={(e) => e.stopPropagation()} 
              onChange={() => onToggleItem(note.id, item.id)}
              className="mt-0.5 cursor-pointer accent-green-500 shrink-0"
              disabled={note.isCompleted || isEditMode}
            />
            <span className={`break-all leading-tight ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}