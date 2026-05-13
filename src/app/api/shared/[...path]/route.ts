import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHARED_API = "http://127.0.0.1:3456/api";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/shared", "");
  const search = req.nextUrl.search;
  try {
    const res = await fetch(`${SHARED_API}${path}${search}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "共享服务暂不可用" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/shared", "");
  try {
    const body = await req.text();
    const res = await fetch(`${SHARED_API}${path}`, {
      cache: "no-store",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "共享服务暂不可用" }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/shared", "");
  try {
    const body = await req.text();
    const res = await fetch(`${SHARED_API}${path}`, {
      cache: "no-store",
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "共享服务暂不可用" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/shared", "");
  try {
    const res = await fetch(`${SHARED_API}${path}`, { cache: "no-store", method: "DELETE" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "共享服务暂不可用" }, { status: 502 });
  }
}
