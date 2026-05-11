import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

interface Todo {
  id: string;
  text: string;
  date: string;       // YYYY-MM-DD
  done: boolean;
  createdAt: string;   // ISO
  rolledOver: boolean;
}

interface TodoStore {
  todos: Todo[];
}

const DATA_PATH = join(process.cwd(), "data", "todos.json");

function readTodos(): TodoStore {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return { todos: [] };
  }
}

function writeTodos(store: TodoStore) {
  writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

const DAILY_DEFAULTS = ["抖音更新", "小红书更新"];

/** Auto-roll overdue undone todos to today */
function autoRollover(store: TodoStore): TodoStore {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  let changed = false;
  for (const t of store.todos) {
    if (!t.done && t.date < today) {
      t.date = today;
      t.rolledOver = true;
      changed = true;
    }
  }
  return store;
}

/** Ensure today has the daily default todo items */
function ensureDailyDefaults(store: TodoStore, today: string): TodoStore {
  const todayTodos = store.todos.filter((t) => t.date === today);
  let changed = false;
  for (const defaultText of DAILY_DEFAULTS) {
    const exists = todayTodos.some((t) => t.text === defaultText);
    if (!exists) {
      store.todos.push({
        id: randomUUID(),
        text: defaultText,
        date: today,
        done: false,
        createdAt: new Date().toISOString(),
        rolledOver: false,
      });
      changed = true;
    }
  }
  return store;
}

export async function GET() {
  try {
    let store = autoRollover(readTodos());
    const today = new Date().toLocaleDateString("en-CA");

    // Ensure daily default todos exist
    store = ensureDailyDefaults(store, today);
    if (store.todos.some((t) => t.date === today && DAILY_DEFAULTS.includes(t.text) && !t.done)) {
      writeTodos(store);
    }

    const todayTodos = store.todos.filter((t) => t.date === today);
    const overdue = store.todos.filter((t) => !t.done && t.date < today);
    const all = store.todos;

    return NextResponse.json({
      todos: todayTodos,
      overdue: overdue.length,
      total: all.length,
    });
  } catch (e) {
    return NextResponse.json({ error: "读取待办失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "待办内容不能为空" }, { status: 400 });
    }

    const store = readTodos();
    const today = new Date().toLocaleDateString("en-CA");

    const todo: Todo = {
      id: randomUUID(),
      text: text.trim(),
      date: today,
      done: false,
      createdAt: new Date().toISOString(),
      rolledOver: false,
    };

    store.todos.push(todo);
    writeTodos(store);

    return NextResponse.json(todo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "创建待办失败" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, text, done } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
    }

    const store = readTodos();
    const idx = store.todos.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 });
    }

    if (typeof done === "boolean") store.todos[idx].done = done;
    if (typeof text === "string" && text.trim()) store.todos[idx].text = text.trim();

    writeTodos(store);
    return NextResponse.json(store.todos[idx]);
  } catch (e) {
    return NextResponse.json({ error: "更新待办失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
    }

    const store = readTodos();
    const idx = store.todos.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 });
    }

    store.todos.splice(idx, 1);
    writeTodos(store);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "删除待办失败" }, { status: 500 });
  }
}
