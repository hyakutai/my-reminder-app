"use client"; 

import { useState, useEffect, useRef } from 'react';
import NoteCard, { Note, ListItem } from '../components/NoteCard';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [inputTitle, setInputTitle] = useState("");
  const [inputDate, setInputDate] = useState("");
  const [inputItems, setInputItems] = useState<ListItem[]>([]);
  const [tempItemText, setTempItemText] = useState("");
  
  const [simpleMemo, setSimpleMemo] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState("default");
  const lastCheckedMinute = useRef("");
  
  // ★追加: メモ欄の高さを調整するための参照
  const memoTextareaRef = useRef<HTMLTextAreaElement>(null);

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
        setNotes(migratedNotes);
      } catch (e) {
        console.error("データ読み込みエラー", e);
      }
    }
    
    const savedMemo = localStorage.getItem("simple-memo");
    if (savedMemo) {
      setSimpleMemo(savedMemo);
      // 読み込み直後に高さを調整
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

    const timerId = setInterval(checkReminders, 10000); // 10秒ごとにチェック
    return () => clearInterval(timerId);
  }, [notes, isLoaded]);

  // ★変更: メモ欄の自動リサイズ機能
  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto"; // 一旦リセット
    element.style.height = `${element.scrollHeight}px`; // 内容に合わせて高さを設定
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSimpleMemo(e.target.value);
    localStorage.setItem("simple-memo", e.target.value);
    adjustTextareaHeight(e.target);
  };

  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      alert("このブラウザは通知に対応していません。");
      return;
    }
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
      if (permission === "granted") {
        sendTestNotification();
      }
    });
  };

  // ★追加: テスト通知を送る関数
  const sendTestNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("🔔 テスト成功！", { 
        body: "この表示が出れば、リマインダー通知も届きます。",
        requireInteraction: false // スマホなどですぐ消えないようにする設定（環境による）
      });
    } else {
      alert("通知が許可されていません。ブラウザの設定を確認してください。");
    }
  };

  const checkReminders = () => {
    if (Notification.permission !== "granted") return;

    const now = new Date();
    // 比較用: M/D H:mm (例: 2/9 18:00)
    // 分単位まで一致するかチェック
    const currentString = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    // デバッグ用: F12のコンソールで確認できます
    console.log(`現在時刻: ${currentString}, チェック中...`);

    if (lastCheckedMinute.current === currentString) return;
    lastCheckedMinute.current = currentString;

    notes.forEach(note => {
      // 時間が一致 かつ 未完了
      if (!note.isCompleted && note.reminder === currentString) {
        console.log(`🔔 通知発火: ${note.title}`);
        new Notification(`🔔 時間です: ${note.title}`, {
          body: "設定した時刻になりました。",
          tag: note.id.toString(), // 重複通知防止用タグ
        });
      }
    });
  };

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
          item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
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
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">My Reminders</h1>
          
          <div className="flex gap-2 items-center">
            {/* ■ テスト通知ボタン（許可済みでも表示して確認できるように変更） */}
            <button 
              onClick={notificationPermission === "granted" ? sendTestNotification : requestNotificationPermission}
              className={`text-xs px-3 py-1.5 rounded font-bold ${notificationPermission === "granted" ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
            >
              {notificationPermission === "granted" ? "🔔 テスト" : "🔔 通知ON"}
            </button>

            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${showCompleted ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-500 border-gray-300'}`}
            >
              {showCompleted ? "未完了" : "完了済み"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 py-4">
        {visibleNotes.length === 0 ? (
          <p className="text-center text-gray-400 mt-10 text-sm">
            {showCompleted ? "完了したリストはありません" : "タスクがありません"}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            {visibleNotes.map((note) => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onToggleComplete={toggleComplete}
                onEdit={openEditModal}
                onDelete={deleteNote}
                onToggleItem={toggleItemCompletion}
              />
            ))}
          </div>
        )}
      </main>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
          <label className="block text-xs font-bold text-yellow-800 mb-1">📌 自由メモ</label>
          <textarea
            ref={memoTextareaRef}
            className="w-full bg-transparent resize-none focus:outline-none text-gray-700 min-h-[5rem] overflow-hidden text-sm"
            placeholder="メモ... (入力すると広がります)"
            value={simpleMemo}
            onChange={handleMemoChange}
            style={{ height: 'auto' }} // 初期スタイル
          />
        </div>
      </div>

      <button 
        onClick={() => { closeModal(); setIsModalOpen(true); }}
        className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700 transition-colors z-20"
      >
        +
      </button>

      {/* モーダル部分（変更なし） */}
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
              <label className="block text-xs text-gray-400 mb-2">タスク項目</label>
              <ul className="space-y-2 mb-3">
                {inputItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <input 
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      value={item.text}
                      onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                    />
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-gray-300 hover:text-red-500 px-2"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
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
              <input 
                type="datetime-local"
                className="w-full border p-2 rounded text-gray-700 text-sm"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
              />
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