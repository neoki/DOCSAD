import { isSharePointConfigured } from "./microsoft-graph";
import { getSyncState, incrementalSync, fullSync } from "./sync-engine";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export async function maybeAutoSync(): Promise<void> {
  try {
    if (!isSharePointConfigured()) return;

    const lastSync = await getSyncState("sync_completed_at");

    const needsSync =
      !lastSync ||
      Date.now() - new Date(lastSync).getTime() > SYNC_INTERVAL_MS;

    if (!needsSync) return;

    // claimSyncLock inside fullSync/incrementalSync handles concurrent instances atomically.
    // If another instance (prod/dev) already claimed the lock, this throws and is silently caught.
    if (lastSync) {
      await incrementalSync();
    } else {
      await fullSync();
    }
  } catch {
    // Auto-sync errors must never affect the app (including "Sync already running")
  }
}
