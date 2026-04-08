import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fullSync,
  incrementalSync,
  getSyncStats,
  getRecentSyncLogs,
  getSyncState,
  setSyncState,
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
    const startedAt = await getSyncState("sync_started_at");
    const ageMinutes = startedAt
      ? (Date.now() - new Date(startedAt).getTime()) / 60000
      : 999;
    if (ageMinutes < 10) {
      return NextResponse.json(
        { error: "Ya hay una sincronización en curso" },
        { status: 409 },
      );
    }
    await setSyncState("sync_status", "idle");
  }

  let body: { mode?: string } = {};
  try { body = await req.json(); } catch { body = {}; }
  const mode = body.mode || "full";

  // Mark as running immediately so the UI knows
  await setSyncState("sync_status", "running");
  await setSyncState("sync_started_at", new Date().toISOString());

  // Run sync in background — response returns right away
  after(async () => {
    try {
      if (mode === "incremental") {
        await incrementalSync();
      } else {
        await fullSync();
      }
    } catch {
      await setSyncState("sync_status", "idle");
    }
  });

  return NextResponse.json({ started: true, mode });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await setSyncState("sync_status", "idle");
  return NextResponse.json({ success: true, message: "Estado de sincronización reseteado" });
}
