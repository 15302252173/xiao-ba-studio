import { NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const REQUESTS_DIR = join(process.cwd(), "data", "report-requests");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = (body.message || "").trim();

    if (!message) {
      return NextResponse.json({ success: false, error: "请输入报告需求" }, { status: 400 });
    }

    // Ensure directory exists
    if (!existsSync(REQUESTS_DIR)) {
      mkdirSync(REQUESTS_DIR, { recursive: true });
    }

    const id = randomUUID();
    const request = {
      id,
      message,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    writeFileSync(join(REQUESTS_DIR, `${id}.json`), JSON.stringify(request, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      id,
      message: "已收到你的报告需求，小牛正在处理中...",
    });
  } catch (error) {
    console.error("[report-generate] Error:", error);
    return NextResponse.json({ success: false, error: "发送失败，请稍后重试" }, { status: 500 });
  }
}
