import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHARED_API = "http://127.0.0.1:3456";

async function proxyShared(path: string, req: NextRequest) {
  try {
    const url = `${SHARED_API}${path}${req.nextUrl.search}`;
    const options: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      try { options.body = await req.text(); } catch {}
    }
    const res = await fetch(url, options);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "共享服务暂不可用" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return proxyShared("/api/todos", req);
}

export async function POST(req: NextRequest) {
  return proxyShared("/api/todos", req);
}

export async function PUT(req: NextRequest) {
  return proxyShared(`/api/todos${req.nextUrl.search}`, req);
}

export async function DELETE(req: NextRequest) {
  return proxyShared(`/api/todos${req.nextUrl.search}`, req);
}
