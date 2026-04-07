import { isSharePointConfigured } from "./microsoft-graph";
import { getSyncState, incrementalSync, fullSync } from "./sync-engine";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export async function maybeAutoSync(): Promise<void> {
  try {
    // Solo sincronizar si las credenciales de aplicación están configuradas
    if (!isSharePointConfigured()) return;

    const [lastSync, syncStatus] = await Promise.all([
      getSyncState("sync_completed_at"),
      getSyncState("sync_status"),
    ]);

    if (syncStatus === "running") return;

    const needsSync =
      !lastSync ||
      Date.now() - new Date(lastSync).getTime() > SYNC_INTERVAL_MS;

    if (!needsSync) return;

    if (lastSync) {
      await incrementalSync();
    } else {
      await fullSync();
    }
  } catch {
    // Errores de auto-sync no deben afectar a la app
  }
}
