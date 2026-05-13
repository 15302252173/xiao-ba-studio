"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, ListTodo, Lightbulb, BookOpen, Plus, Trash2, CheckCheck, Circle, Loader2, Pencil, X, GripVertical, ExternalLink, Clock } from "lucide-react";

interface Todo { id: number; user_id: number; text: string; date: string; done: number; priority: string; estimated_minutes: number | null; sort_order: number | null; }
interface Idea { id: number; user_id: number; title: string; description: string; category: string; status: string; priority: string; source_agent: string; sort_order: number | null; }
interface Learning { id: number; user_id: number; title: string; url: string; description: string; category: string; status: string; priority: string; estimated_hours: number | null; estimated_minutes: number | null; source_agent: string; sort_order: number | null; }

type Tab = "todos" | "ideas" | "learning";
const STATUS_CYCLE: Record<string, Record<string, string>> = {
  ideas: { draft: "reviewing", reviewing: "approved", approved: "in_progress", in_progress: "done", done: "archived", archived: "draft" },
  learning: { todo: "in_progress", in_progress: "done", done: "archived", archived: "todo" },
};
const STATUS_COLORS: Record<string, string> = { draft: "#6b7280", reviewing: "#f59e0b", approved: "#3b82f6", in_progress: "#a78bfa", done: "#22c55e", archived: "#6b7280", todo: "#f59e0b" };
const STATUS_LABELS: Record<string, string> = { draft: "草稿", reviewing: "评审中", approved: "已通过", in_progress: "进行中", done: "已完成", archived: "归档", todo: "待学习" };

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "todos", label: "每日待办", icon: <ListTodo className="w-4 h-4" /> },
  { key: "ideas", label: "想法/Idea", icon: <Lightbulb className="w-4 h-4" /> },
  { key: "learning", label: "学习资料", icon: <BookOpen className="w-4 h-4" /> },
];

export default function SharedPage() {
  const [activeTab, setActiveTab] = useState<Tab>("todos");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [learning, setLearning] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [error, setError] = useState("");
  const userId = 1;

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [detailItem, setDetailItem] = useState<any>(null);

  // Full edit modal for ideas/learning
  const [editModal, setEditModal] = useState<{ type: string; item: any } | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const api = useCallback(async (path: string, options?: RequestInit) => {
    try {
      const res = await fetch(`/api/shared${path}`, { cache: "no-store", headers: { "Content-Type": "application/json" }, ...options });
      if (res.ok) return await res.json();
      setError("服务暂不可用");
    } catch { setError("连接失败"); }
    return null;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [t, i, l] = await Promise.all([api(`/todos`), api(`/ideas`), api(`/learning`)]);
    if (t) setTodos(t.sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999)));
    if (i) setIdeas(i);
    if (l) setLearning(l);
    setLoading(false); setError("");
  }, [api, userId]);
  useEffect(() => { fetchData(); }, [fetchData]);
  // 实时同步：每5秒自动刷新
  useEffect(() => { const timer = setInterval(fetchData, 5000); return () => clearInterval(timer); }, [fetchData]);

  // Drag
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (targetIdx: number, list: any[], setList: Function, endpoint: string) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...list]; const [moved] = reordered.splice(dragIdx, 1); reordered.splice(targetIdx, 0, moved);
    setList(reordered); setDragIdx(null); setDragOverIdx(null);
    for (let i = 0; i < reordered.length; i++) await api(`/${endpoint}/${reordered[i].id}`, { method: "PUT", body: JSON.stringify({ sort_order: i }) });
  };

  // Todo inline edit
  const saveTodoEdit = async () => {
    if (!editingTodo || !editTodoText.trim()) return;
    await api(`/todos/${editingTodo.id}`, { method: "PUT", body: JSON.stringify({ text: editTodoText.trim() }) });
    setEditingTodo(null); setEditTodoText(""); fetchData();
  };

  // Full edit modal for ideas/learning
  const openEditModal = (type: string, item: any) => {
    setEditModal({ type, item });
    setEditForm({
      title: item.title || item.text || "",
      description: item.description || "",
      category: item.category || "",
      url: item.url || "",
      priority: item.priority || "medium",
      estimated_minutes: item.estimated_minutes != null ? String(item.estimated_minutes) : (item.estimated_hours != null ? String(item.estimated_hours * 60) : ""),
      status: item.status || "draft",
    });
  };

  const saveEditModal = async () => {
    if (!editModal) return;
    if (!editForm.title.trim()) { setError("标题不能为空"); return; }
    const { type, item } = editModal;
    const body: Record<string, any> = { title: editForm.title.trim() };
    if (editForm.description !== (item.description || "")) body.description = editForm.description;
    if (editForm.category !== (item.category || "")) body.category = editForm.category;
    if (editForm.priority !== (item.priority || "medium")) body.priority = editForm.priority;
    if (editForm.status !== (item.status || "")) body.status = editForm.status;
    if (type === "learning") {
      if (editForm.url !== (item.url || "")) body.url = editForm.url;
      const rawVal = editForm.estimated_minutes?.trim();
      const m = rawVal ? parseInt(rawVal) : (rawVal === "0" ? 0 : null);
      if (m !== (item.estimated_minutes ?? null)) body.estimated_minutes = m;
    }
    const res = await api(`/${type === "idea" ? "ideas" : "learning"}/${item.id}`, { method: "PUT", body: JSON.stringify(body) });
    if (!res) { setError("保存失败，请重试"); return; }
    setEditModal(null); setEditForm({}); fetchData();
  };

  // Status toggle
  const toggleStatus = async (item: any, endpoint: string) => {
    const cycle = STATUS_CYCLE[endpoint];
    if (!cycle) return;
    await api(`/${endpoint}/${item.id}`, { method: "PUT", body: JSON.stringify({ status: cycle[item.status] }) });
    fetchData();
  };

  // CRUD
  const addTodo = async () => { if (!newText.trim()) return; await api("/todos", { method: "POST", body: JSON.stringify({ user_id: userId, text: newText.trim(), date: new Date().toISOString().slice(0, 10), sort_order: todos.length }) }); setNewText(""); fetchData(); };
  const toggleTodo = async (t: Todo) => { await api(`/todos/${t.id}`, { method: "PUT", body: JSON.stringify({ done: t.done ? 0 : 1 }) }); fetchData(); };
  const deleteTodo = async (id: number) => { await api(`/todos/${id}`, { method: "DELETE" }); fetchData(); };

  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", category: "", priority: "medium" });
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const addIdea = async () => { if (!ideaForm.title.trim()) return; await api("/ideas", { method: "POST", body: JSON.stringify({ user_id: userId, ...ideaForm, source_agent: "小牛", sort_order: ideas.length }) }); setIdeaForm({ title: "", description: "", category: "", priority: "medium" }); setShowIdeaForm(false); fetchData(); };
  const deleteIdea = async (id: number) => { await api(`/ideas/${id}`, { method: "DELETE" }); fetchData(); };

  const [learnForm, setLearnForm] = useState({ title: "", url: "", description: "", category: "", priority: "medium", estimated_minutes: "" });
  const [showLearnForm, setShowLearnForm] = useState(false);
  const addLearning = async () => { if (!learnForm.title.trim()) return; await api("/learning", { method: "POST", body: JSON.stringify({ user_id: userId, ...learnForm, estimated_minutes: learnForm.estimated_minutes ? parseInt(learnForm.estimated_minutes) : null, source_agent: "小牛", sort_order: learning.length }) }); setLearnForm({ title: "", url: "", description: "", category: "", priority: "medium", estimated_minutes: "" }); setShowLearnForm(false); fetchData(); };
  const deleteLearning = async (id: number) => { await api(`/learning/${id}`, { method: "DELETE" }); fetchData(); };

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3"><Share2 className="w-6 h-6" style={{ color: "#a78bfa" }} /><div><h1 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>共享工作台</h1><p className="text-xs" style={{ color: "var(--text-secondary)" }}>小牛🐮 × 小八🐙 共同督促</p></div></div>
        {error && <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 flex-shrink-0" style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (<button key={t.key} onClick={() => setActiveTab(t.key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: activeTab === t.key ? "var(--accent)" : "transparent", color: activeTab === t.key ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer" }}>{t.icon}{t.label}</button>))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (<div className="flex items-center justify-center h-40" style={{ color: "var(--text-muted)" }}><Loader2 className="w-5 h-5 animate-spin mr-2" />加载中...</div>) : (
          <div className="max-w-2xl mx-auto">
            {/* ═══ TODOS ═══ */}
            {activeTab === "todos" && (<>
              <div className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>✅ {doneCount}/{todos.length} 完成 · 拖动排序</div>
              <div className="flex gap-2 mb-4"><input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="添加待办..." className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }} /><button onClick={addTodo} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", cursor: "pointer" }}><Plus className="w-4 h-4" /></button></div>
              <div className="space-y-1">{todos.map((t, i) => (<div key={t.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i, todos, setTodos, "todos")} className="flex items-center gap-3 px-3 py-2 rounded-lg group" style={{ backgroundColor: dragOverIdx === i ? "rgba(139,92,246,0.08)" : "var(--card-elevated)", opacity: dragIdx === i ? 0.5 : 1, cursor: "grab" }}>
                <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <button onClick={() => toggleTodo(t)} style={{ background: "none", border: "none", cursor: "pointer", color: t.done ? "#4ade80" : "var(--text-muted)", flexShrink: 0 }}>{t.done ? <CheckCheck className="w-4 h-4" /> : <Circle className="w-4 h-4" />}</button>
                {editingTodo?.id === t.id ? (<div className="flex-1 flex gap-1"><input value={editTodoText} onChange={e => setEditTodoText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveTodoEdit(); if (e.key === "Escape") { setEditingTodo(null); setEditTodoText(""); } }} className="flex-1 px-2 py-1 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--accent)", color: "var(--text-primary)" }} autoFocus /><button onClick={saveTodoEdit} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", border: "none", cursor: "pointer" }}>保存</button><button onClick={() => { setEditingTodo(null); setEditTodoText(""); }} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}><X className="w-3 h-3" /></button></div>) : (<span className={`flex-1 text-sm truncate ${t.done ? "line-through" : ""}`} style={{ color: t.done ? "var(--text-muted)" : "var(--text-primary)" }}>{t.text}</span>)}
                <span className="text-xs flex-shrink-0" title={t.user_id === 2 ? "小八" : "爹"}>{t.user_id === 2 ? '🐙' : '🐮'}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0"><button onClick={() => { setEditingTodo(t); setEditTodoText(t.text); }} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => deleteTodo(t.id)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>))}</div>
            </>)}

            {/* ═══ IDEAS ═══ */}
            {activeTab === "ideas" && (<>
              <button onClick={() => setShowIdeaForm(!showIdeaForm)} className="text-sm mb-4 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", cursor: "pointer" }}><Plus className="w-3.5 h-3.5 inline mr-1" />添加想法</button>
              {showIdeaForm && (<div className="mb-4 p-4 rounded-lg space-y-2" style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                <input value={ideaForm.title} onChange={e => setIdeaForm({ ...ideaForm, title: e.target.value })} placeholder="标题 *" className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <textarea value={ideaForm.description} onChange={e => setIdeaForm({ ...ideaForm, description: e.target.value })} placeholder="描述..." rows={2} className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <div className="flex gap-2"><input value={ideaForm.category} onChange={e => setIdeaForm({ ...ideaForm, category: e.target.value })} placeholder="分类" className="flex-1 px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} /><select value={ideaForm.priority} onChange={e => setIdeaForm({ ...ideaForm, priority: e.target.value })} className="px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select><button onClick={addIdea} className="px-4 py-2 rounded text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", cursor: "pointer" }}>添加</button></div></div>)}
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>💡 点击标题查看详情 · 点击 ✏️ 编辑全部字段 · 点击状态切换</div>
              <div className="space-y-1">{ideas.map((item, i) => (<div key={item.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i, ideas, setIdeas, "ideas")} className="flex items-center gap-3 px-3 py-2 rounded-lg group" style={{ backgroundColor: dragOverIdx === i ? "rgba(139,92,246,0.08)" : "var(--card-elevated)", opacity: dragIdx === i ? 0.5 : 1, cursor: "grab" }}>
                <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <button onClick={() => toggleStatus(item, "ideas")} className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${STATUS_COLORS[item.status] || "#6b7280"}22`, color: STATUS_COLORS[item.status] || "#6b7280", border: "none", cursor: "pointer" }}>{STATUS_LABELS[item.status] || item.status}</button>
                <span className="flex-1 text-sm truncate hover:underline cursor-pointer" style={{ color: "var(--accent)" }} onClick={() => setDetailItem({ ...item, type: "idea" })}>{item.title}</span>
                {item.category && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{item.category}</span>}
                <span className="text-xs flex-shrink-0" title={item.user_id === 2 ? "小八" : "爹"}>{item.user_id === 2 ? '🐙' : '🐮'}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0"><button onClick={() => openEditModal("idea", item)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => deleteIdea(item.id)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>))}</div>
            </>)}

            {/* ═══ LEARNING ═══ */}
            {activeTab === "learning" && (<>
              <button onClick={() => setShowLearnForm(!showLearnForm)} className="text-sm mb-4 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", cursor: "pointer" }}><Plus className="w-3.5 h-3.5 inline mr-1" />添加学习项目</button>
              {showLearnForm && (<div className="mb-4 p-4 rounded-lg space-y-2" style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                <input value={learnForm.title} onChange={e => setLearnForm({ ...learnForm, title: e.target.value })} placeholder="标题 *" className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <input value={learnForm.url} onChange={e => setLearnForm({ ...learnForm, url: e.target.value })} placeholder="链接 (URL)" className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <textarea value={learnForm.description} onChange={e => setLearnForm({ ...learnForm, description: e.target.value })} placeholder="描述..." rows={2} className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <div className="flex gap-2"><input value={learnForm.category} onChange={e => setLearnForm({ ...learnForm, category: e.target.value })} placeholder="分类" className="flex-1 px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} /><input value={learnForm.estimated_hours} onChange={e => setLearnForm({ ...learnForm, estimated_hours: e.target.value })} placeholder="小时" className="w-16 px-3 py-2 rounded text-sm" type="number" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} /><select value={learnForm.priority} onChange={e => setLearnForm({ ...learnForm, priority: e.target.value })} className="px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select><button onClick={addLearning} className="px-4 py-2 rounded text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", cursor: "pointer" }}>添加</button></div></div>)}
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>📚 点击标题查看详情 · 点击 ✏️ 编辑全部字段 · 点击状态切换</div>
              <div className="space-y-1">{learning.map((item, i) => (<div key={item.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i, learning, setLearning, "learning")} className="flex items-center gap-3 px-3 py-2 rounded-lg group" style={{ backgroundColor: dragOverIdx === i ? "rgba(139,92,246,0.08)" : "var(--card-elevated)", opacity: dragIdx === i ? 0.5 : 1, cursor: "grab" }}>
                <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <button onClick={() => toggleStatus(item, "learning")} className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${STATUS_COLORS[item.status] || "#6b7280"}22`, color: STATUS_COLORS[item.status] || "#6b7280", border: "none", cursor: "pointer" }}>{STATUS_LABELS[item.status] || item.status}</button>
                <span className="flex-1 text-sm truncate hover:underline cursor-pointer" style={{ color: "var(--accent)" }} onClick={() => setDetailItem({ ...item, type: "learning" })}>{item.title}</span>
                {item.category && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{item.category}</span>}
                {item.estimated_minutes != null && <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}><Clock className="w-3 h-3 inline mr-0.5" />{item.estimated_minutes}分</span>}
                <span className="text-xs flex-shrink-0" title={item.user_id === 2 ? "小八" : "爹"}>{item.user_id === 2 ? '🐙' : '🐮'}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0"><button onClick={() => openEditModal("learning", item)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => deleteLearning(item.id)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>))}</div>
            </>)}
          </div>
        )}
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setDetailItem(null)}>
          <div className="w-96 max-h-[80vh] overflow-y-auto p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><span className="text-lg">{detailItem.type === "idea" ? "💡" : "📚"}</span><span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{detailItem.type === "idea" ? "想法详情" : "学习详情"}</span></div>
              <button onClick={() => setDetailItem(null)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>标题</div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{detailItem.title}</div></div>
              {detailItem.description && <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>描述</div><div className="text-sm" style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{detailItem.description}</div></div>}
              <div className="flex gap-4 flex-wrap">
                {detailItem.status && <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>状态</div><span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[detailItem.status] || "#6b7280"}22`, color: STATUS_COLORS[detailItem.status] || "#6b7280" }}>{STATUS_LABELS[detailItem.status] || detailItem.status}</span></div>}
                {detailItem.priority && <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>优先级</div><span className="text-xs" style={{ color: detailItem.priority === "high" ? "#ef4444" : detailItem.priority === "medium" ? "#f59e0b" : "#22c55e" }}>{detailItem.priority === "high" ? "🔴 高" : detailItem.priority === "medium" ? "🟡 中" : "🟢 低"}</span></div>}
                {detailItem.category && <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>分类</div><div className="text-xs" style={{ color: "var(--text-secondary)" }}>{detailItem.category}</div></div>}
              </div>
              {detailItem.estimated_minutes ? <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>预估时间</div><div className="text-sm" style={{ color: "var(--text-secondary)" }}>⏱ {detailItem.estimated_minutes} 分钟</div></div>
               : detailItem.estimated_hours ? <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>预估时间</div><div className="text-sm" style={{ color: "var(--text-secondary)" }}>⏱ {detailItem.estimated_hours} 小时</div></div>
               : null}
              {detailItem.url && <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>链接</div><a href={detailItem.url} target="_blank" className="text-xs hover:underline break-all" style={{ color: "var(--accent)" }}>{detailItem.url} <ExternalLink className="w-3 h-3 inline" /></a></div>}
              <div><div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>来源</div><div className="text-xs" style={{ color: "var(--text-secondary)" }}>{detailItem.source_agent}</div></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setDetailItem(null); openEditModal(detailItem.type === "idea" ? "idea" : "learning", detailItem); }}
                className="flex-1 px-3 py-2 rounded text-xs font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", border: "none", cursor: "pointer" }}>编辑</button>
              <button onClick={() => { const t = detailItem.type; const id = detailItem.id; setDetailItem(null); if (t === "idea") deleteIdea(id); else deleteLearning(id); }}
                className="px-3 py-2 rounded text-xs font-medium" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", cursor: "pointer" }}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FULL EDIT MODAL (ideas/learning) ═══ */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setEditModal(null)}>
          <div className="w-96 max-h-[80vh] overflow-y-auto p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {editModal.type === "idea" ? "💡 编辑想法" : "📚 编辑学习项目"}
              </span>
              <button onClick={() => setEditModal(null)} className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>标题</label>
                <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>描述</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              {editModal.type === "learning" && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>链接 URL</label>
                  <input value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                    className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>分类</label>
                  <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>优先级</label>
                  <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                    className="px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <option value="low">🟢 低</option><option value="medium">🟡 中</option><option value="high">🔴 高</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>状态</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    {editModal.type === "idea" ? (
                      <><option value="draft">草稿</option><option value="reviewing">评审中</option><option value="approved">已通过</option><option value="in_progress">进行中</option><option value="done">已完成</option><option value="archived">归档</option></>
                    ) : (
                      <><option value="todo">待学习</option><option value="in_progress">学习中</option><option value="done">已完成</option><option value="archived">归档</option></>
                    )}
                  </select>
                </div>
                {editModal.type === "learning" && (
                  <div className="w-20">
                    <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>预估(分)</label>
                    <input value={editForm.estimated_minutes} onChange={e => setEditForm({ ...editForm, estimated_minutes: e.target.value })}
                      type="number" step="5" className="w-full px-3 py-2 rounded text-sm" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditModal(null)} className="flex-1 px-3 py-2 rounded text-xs font-medium" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>取消</button>
              <button onClick={saveEditModal} className="flex-1 px-3 py-2 rounded text-xs font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)", border: "none", cursor: "pointer" }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
