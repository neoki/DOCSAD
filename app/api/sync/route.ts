import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fullSync,
  incrementalSync,
  getSyncStats,
  getRecentSyncLogs,
  getSyncState,
} from "@/lib/sync-engine";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "stats";

  if (action === "stats") {
    const stats = await getSyncStats();
    return NextResponse.json(stats);
  }

  if (action === "logs") {
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 200);
    const logs = await getRecentSyncLogs(limit);
    return NextResponse.json({ logs });
  }

  if (action === "status") {
    const [status, completedAt, startedAt, duration, error] = await Promise.all([
      getSyncState("sync_status"),
      getSyncState("sync_completed_at"),
      getSyncState("sync_started_at"),
      getSyncState("sync_duration_seconds"),
      getSyncState("sync_error"),
    ]);
    return NextResponse.json({ status, completedAt, startedAt, duration, error });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentStatus = await getSyncState("sync_status");
  if (currentStatus === "running") {
    return NextResponse.json(
      { error: "Ya hay una sincronización en curso" },
      { status: 409 },
    );
  }

  try {
    let body: { mode?: string } = {};
    try { body = await req.json(); } catch { body = {}; }
    const mode = body.mode || "full";

    const result = mode === "incremental"
      ? await incrementalSync()
      : await fullSync();
    return NextResponse.json({ success: true, result, mode });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
