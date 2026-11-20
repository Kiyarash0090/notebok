import fs from 'fs';
import path from 'path';

/**
 * Resolves the persistent data directory path.
 * Priority:
 *  1. Explicit DATA_DIR environment variable (e.g. DATA_DIR=/app/data)
 *  2. RAILWAY_VOLUME_MOUNT_PATH automatically injected by Railway Volumes (e.g. /app/data)
 *  3. /app/data when running inside Railway and the volume mount directory exists
 *  4. Default local ./data directory under process.cwd()
 */
export function resolveDataDir(): string {
  const explicit = process.env.DATA_DIR?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const railwayVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (railwayVolume) {
    return path.resolve(railwayVolume);
  }

  const isRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_STATIC_URL
  );
  if (isRailway && fs.existsSync('/app/data')) {
    return '/app/data';
  }

  return path.join(process.cwd(), 'data');
}

export const DATA_DIR = resolveDataDir();

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
