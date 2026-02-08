import React from 'react';

// ■ データ構造を変更: reminderIso (カレンダー用) を追加
export type ListItem = {
  id: string;
  text: string;
  isCompleted: boolean;
};

export type Note = {
  id: number;
  title: string;
  items: ListItem[];
  reminder?: string;     // 表示用 (例: 2/9 10:00)
  reminderIso?: string;  // ★追加: カレンダー入力用 (例: 2026-02-09T10:00)
  isCompleted: boolean;
};

type Props = {
  note: Note;
  onToggleComplete: (id: number) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onToggleItem: (noteId: number, itemId: string) => void;
};

export default function NoteCard({ note, onToggleComplete, onEdit, onDelete, onToggleItem }: Props) {
  
  const totalItems = note.items ? note.items.length : 0;
  const completedItems = note.items ? note.items.filter(i => i.isCompleted).length : 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div 
      onClick={() => onEdit(note)}
      className={`relative p-3 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md active:scale-95 ${note.isCompleted ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-100'}`}
    >
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 z-10 p-1"
      >
        ✕
      </button>

      <div className="flex items-start gap-2 mb-2 pr-6">
        <input 
          type="checkbox" 
          checked={note.isCompleted} 
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleComplete(note.id)}
          className="w-5 h-5 mt-1 cursor-pointer accent-blue-600 shrink-0"
        />

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
            <input 
              type="checkbox"
              checked={item.isCompleted}
              onClick={(e) => e.stopPropagation()} 
              onChange={() => onToggleItem(note.id, item.id)}
              className="mt-0.5 cursor-pointer accent-green-500 shrink-0"
              disabled={note.isCompleted}
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