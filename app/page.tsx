"use client"; 

import { useState, useEffect, useRef } from 'react';
import NoteCard, { Note, ListItem } from '../components/NoteCard';
import { SortableNoteCard } from '../components/SortableNoteCard';
import { SortableItem } from '../components/SortableItem';
import {
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [inputTitle, setInputTitle] = useState("");
  const [inputDate, setInputDate] = useState("");
  const [inputItems, setInputItems] = useState<ListItem[]>([]);
  const [tempItemText, setTempItemText] = useState("");
  
  const [simpleMemo, setSimpleMemo] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  // ドラッグ中のアイテム情報を保持（ハイライト処理などは省略しますが、ロジックに必要）
  const [activeId, setActiveId] = useState<string | number | null>(null);

  const [notificationPermission, setNotificationPermission] = useState("default");
  const lastCheckedMinute = useRef("");
  const memoTextareaRef = useRef<HTMLTextAreaElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- 自動クリーンアップ ---
  const cleanupOldTasks = (currentNotes: Note[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    return currentNotes.map(note => {
      const activeItems = note.items.filter(item => {
        if (!item.isCompleted) return true; 
        if (!item.completedAt) return true; 
        return item.completedAt >= today.getTime();
      });
      return { ...note, items: activeItems };
    });
  };

  useEffect(() => {
    const savedNotes = localStorage.getItem("my-reminders");
    if (savedNotes) {
      try {
        const parsed: any[] = JSON.parse(savedNotes);
        const migratedNotes = parsed.map(n => {
          if (!n.items && n.content) {
            return {
              ...n,
              items: [{ id: Date.now().toString() + Math.random(), text: n.content, isCompleted: false }],
              content: undefined 
            };
          }
          return n;
        });
        const cleaned = cleanupOldTasks(migratedNotes);
        setNotes(cleaned);
      } catch (e) {
        console.error("データ読み込みエラー", e);
      }
    }
    
    const savedMemo = localStorage.getItem("simple-memo");
    if (savedMemo) {
      setSimpleMemo(savedMemo);
      setTimeout(() => adjustTextareaHeight(memoTextareaRef.current), 100);
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("my-reminders", JSON.stringify(notes));

    const timerId = setInterval(() => {
      checkReminders();
      setNotes(prev => cleanupOldTasks(prev));
    }, 10000);

    return () => clearInterval(timerId);
  }, [notes, isLoaded]);

  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSimpleMemo(e.target.value);
    localStorage.setItem("simple-memo", e.target.value);
    adjustTextareaHeight(e.target);
  };

  const requestNotificationPermission = () => {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
      if (permission === "granted") sendTestNotification();
    });
  };

  const sendTestNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("🔔 テスト成功！", { body: "リマインダー通知も届きます。" });
    }
  };

  const checkReminders = () => {
    if (Notification.permission !== "granted") return;
    const now = new Date();
    const currentString = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (lastCheckedMinute.current === currentString) return;
    lastCheckedMinute.current = currentString;

    notes.forEach(note => {
      if (!note.isCompleted && note.reminder === currentString) {
        new Notification(`🔔 時間です: ${note.title}`, {
          body: "設定した時刻になりました。",
          tag: note.id.toString(),
        });
      }
    });
  };

  // --- ドラッグ＆ドロップ ロジック (最重要) ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // active.id がタスクかどうか判定（データ型で判定）
    const activeType = active.data.current?.type;
    
    // リスト（Note）同士の移動なら何もしない（DragEndで処理）
    if (activeType !== 'Task') return;

    const activeId = active.id as string;
    const overId = over.id;

    // 元のノートを探す
    const activeNote = notes.find(n => n.items.some(i => i.id === activeId));
    if (!activeNote) return;

    // 移動先のノートを探す（overIdがタスクIDの場合と、ノートIDの場合がある）
    let overNote = notes.find(n => n.id === overId); // ノート自体の上にいる場合
    if (!overNote) {
      // タスクの上にいる場合、そのタスクを持つノートを探す
      overNote = notes.find(n => n.items.some(i => i.id === overId));
    }

    if (!overNote) return;

    // 違うノートへの移動、または同じノート内での移動
    if (activeNote.id !== overNote.id) {
      setNotes((prev) => {
        const activeNoteIndex = prev.findIndex(n => n.id === activeNote!.id);
        const overNoteIndex = prev.findIndex(n => n.id === overNote!.id);

        const activeItems = prev[activeNoteIndex].items;
        const overItems = prev[overNoteIndex].items;
        
        const activeItemIndex = activeItems.findIndex(i => i.id === activeId);
        const overItemIndex = overItems.findIndex(i => i.id === overId);

        let newIndex;
        if (overItemIndex >= 0) {
          // 他のタスクの上にある場合
          newIndex = overItemIndex + (activeItemIndex < overItemIndex ? 1 : 0); // 簡易計算
        } else {
          // ノートの空きスペースにある場合
          newIndex = overItems.length + 1;
        }

        // ここでは「見た目」を更新するために配列を操作する
        // 実際にはdnd-kitのSortableStrategyが補完してくれるが、
        // コンテナ間移動は自前でステート更新が必要
        
        return prev.map(n => {
          if (n.id === activeNote!.id) {
            return { ...n, items: activeItems.filter(i => i.id !== activeId) };
          }
          if (n.id === overNote!.id) {
            // 既に移動済みなら何もしない（無限ループ防止）
            if (n.items.some(i => i.id === activeId)) return n;

            const newItems = [...n.items];
            const movingItem = activeItems[activeItemIndex];
            // 挿入位置の計算（ざっくり末尾か、overの位置）
            const insertIndex = overItemIndex >= 0 ? overItemIndex : newItems.length;
            
            newItems.splice(insertIndex, 0, movingItem);
            return { ...n, items: newItems };
          }
          return n;
        });
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // リスト自体の並べ替え
    if (active.data.current?.sortable?.containerId === 'notes-container' || !active.data.current?.type) {
       if (active.id !== over.id) {
        setNotes((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
      return;
    }

    // タスクの並べ替え（同じノート内での確定）
    const activeId = active.id as string;
    const overId = over.id;

    const activeNote = notes.find(n => n.items.some(i => i.id === activeId));
    const overNote = notes.find(n => n.id === overId) || notes.find(n => n.items.some(i => i.id === overId));

    if (activeNote && overNote && activeNote.id === overNote.id) {
      const noteIndex = notes.findIndex(n => n.id === activeNote.id);
      const oldIndex = activeNote.items.findIndex(i => i.id === activeId);
      const newIndex = activeNote.items.findIndex(i => i.id === overId);

      if (oldIndex !== newIndex) {
        setNotes(prev => {
          const newNotes = [...prev];
          newNotes[noteIndex] = {
            ...newNotes[noteIndex],
            items: arrayMove(newNotes[noteIndex].items, oldIndex, newIndex)
          };
          return newNotes;
        });
      }
    }
  };

  // --- モーダル内での並べ替え（変更なし） ---
  const handleDragEndItemsInModal = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setInputItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- その他ロジック ---

  const handleAddItem = () => {
    if (!tempItemText.trim()) return;
    const newItem: ListItem = {
      id: Date.now().toString() + Math.random().toString(),
      text: tempItemText,
      isCompleted: false
    };
    setInputItems([...inputItems, newItem]);
    setTempItemText("");
  };

  const handleRemoveItem = (itemId: string) => {
    setInputItems(inputItems.filter(item => item.id !== itemId));
  };

  const handleUpdateItemText = (itemId: string, newText: string) => {
    setInputItems(inputItems.map(item => 
      item.id === itemId ? { ...item, text: newText } : item
    ));
  };

  const saveNote = () => {
    if (!inputTitle) return;

    let formattedDate = undefined;
    if (inputDate) {
      const dateObj = new Date(inputDate);
      formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }

    if (editingId) {
      const updatedNotes = notes.map(note => 
        note.id === editingId 
          ? { 
              ...note, 
              title: inputTitle, 
              items: inputItems, 
              reminder: formattedDate,
              reminderIso: inputDate 
            } 
          : note
      );
      setNotes(updatedNotes);
    } else {
      const newNote: Note = {
        id: Date.now(),
        title: inputTitle,
        items: inputItems,
        reminder: formattedDate,
        reminderIso: inputDate,
        isCompleted: false
      };
      setNotes([...notes, newNote]);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setInputTitle("");
    setInputItems([]);
    setTempItemText("");
    setInputDate("");
  };

  const openEditModal = (note: Note) => {
    if (isEditMode) return; 
    setEditingId(note.id);
    setInputTitle(note.title);
    setInputItems(note.items || []);
    setInputDate(note.reminderIso || "");
    setIsModalOpen(true);
  };

  const toggleItemCompletion = (noteId: number, itemId: string) => {
    const updatedNotes = notes.map(note => {
      if (note.id === noteId) {
        const newItems = note.items.map(item => 
          item.id === itemId 
          ? { 
              ...item, 
              isCompleted: !item.isCompleted,
              completedAt: !item.isCompleted ? Date.now() : undefined 
            } 
          : item
        );
        return { ...note, items: newItems };
      }
      return note;
    });
    setNotes(updatedNotes);
  };

  const deleteNote = (id: number) => {
    if (confirm("このリストを削除しますか？")) {
      const updatedNotes = notes.filter(note => note.id !== id);
      setNotes(updatedNotes);
      if (updatedNotes.length === 0) localStorage.removeItem("my-reminders");
    }
  };

  const toggleComplete = (id: number) => {
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, isCompleted: !note.isCompleted } : note
    );
    setNotes(updatedNotes);
  };

  if (!isLoaded) return <div className="min-h-screen bg-gray-50" />;

  const visibleNotes = notes.filter(note => showCompleted ? note.isCompleted : !note.isCompleted);

  return (
    <div className="min-h-screen bg-gray-50 pb-40 relative">
      <header className="bg-white shadow-sm sticky top-0 z-10 transition-colors duration-300" style={isEditMode ? {backgroundColor: '#eff6ff'} : {}}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            {isEditMode ? "編集モード" : "My Reminders"}
          </h1>
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-xs px-3 py-1.5 rounded font-bold border transition-colors ${isEditMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {isEditMode ? "完了" : "編集"}
            </button>
            {!isEditMode && (
              <button 
                onClick={() => setShowCompleted(!showCompleted)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${showCompleted ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-500 border-gray-300'}`}
              >
                {showCompleted ? "未完了" : "完了済み"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 py-4">
        {visibleNotes.length === 0 ? (
          <p className="text-center text-gray-400 mt-10 text-sm">
            {showCompleted ? "完了したリストはありません" : "タスクがありません"}
          </p>
        ) : (
          /* ★ 全体を Grid レイアウトで固定し、位置ずれを防止 */
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners} 
            onDragStart={handleDragStart}
            onDragOver={handleDragOver} // リスト間移動の処理
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              id="notes-container" // リスト全体のID
              items={visibleNotes.map(n => n.id)} 
              strategy={rectSortingStrategy}
            >
              {/* 常にグリッド表示 (columns廃止) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-start">
                {visibleNotes.map((note) => (
                  <SortableNoteCard 
                    key={note.id} 
                    note={note} 
                    isEditMode={isEditMode}
                    onToggleComplete={toggleComplete}
                    onEdit={openEditModal}
                    onDelete={deleteNote}
                    onToggleItem={toggleItemCompletion}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
          <label className="block text-xs font-bold text-yellow-800 mb-1">📌 自由メモ</label>
          <textarea
            ref={memoTextareaRef}
            className="w-full bg-transparent resize-none focus:outline-none text-gray-700 min-h-[5rem] overflow-hidden text-sm"
            placeholder="メモ..."
            value={simpleMemo}
            onChange={handleMemoChange}
            style={{ height: 'auto' }}
          />
        </div>
      </div>

      {!isEditMode && (
        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700 transition-colors z-20"
        >
          +
        </button>
      )}

      {/* 入力モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto flex flex-col">
            <h2 className="text-lg font-bold mb-3">
              {editingId ? "リストを編集" : "新しいリスト"}
            </h2>
            
            <input 
              type="text" 
              placeholder="タイトル" 
              className="w-full border-b p-2 mb-4 text-lg font-bold focus:outline-none focus:border-blue-500"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
            />

            <div className="flex-1 overflow-y-auto mb-4">
              <label className="block text-xs text-gray-400 mb-2">タスク項目 (ドラッグで並べ替え)</label>
              
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragEnd={handleDragEndItemsInModal}
              >
                <SortableContext 
                  items={inputItems.map(i => i.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2 mb-3">
                    {inputItems.map((item) => (
                      <SortableItem key={item.id} id={item.id}>
                        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          <span className="text-gray-400 cursor-grab active:cursor-grabbing text-lg px-1">≡</span>
                          <input 
                            className="flex-1 bg-transparent text-sm focus:outline-none"
                            value={item.text}
                            onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()} 
                          />
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-300 hover:text-red-500 px-2"
                            onPointerDown={(e) => e.stopPropagation()} 
                          >
                            ✕
                          </button>
                        </div>
                      </SortableItem>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="新しい項目..." 
                  className="flex-1 border p-2 rounded text-sm bg-gray-50 focus:bg-white transition-colors"
                  value={tempItemText}
                  onChange={(e) => setTempItemText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button 
                  onClick={handleAddItem}
                  className="bg-gray-800 text-white px-3 py-2 rounded text-sm hover:bg-black whitespace-nowrap"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="mb-4 pt-4 border-t">
              <label className="block text-xs text-gray-400 mb-1">日時設定</label>
              <div className="flex gap-2">
                <input 
                  type="datetime-local"
                  className="w-full border p-2 rounded text-gray-700 text-sm"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                />
                <button 
                  onClick={() => setInputDate("")}
                  className="text-xs text-gray-500 border rounded px-2 hover:bg-gray-100"
                >
                  クリア
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded text-sm"
              >
                キャンセル
              </button>
              <button 
                onClick={saveNote}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-sm shadow-md"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}