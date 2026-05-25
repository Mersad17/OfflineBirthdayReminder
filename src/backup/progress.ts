export type BackupProgress = {
  percent: number;
  message: string;
  detail?: string;
};

export type BackupProgressCallback = (progress: BackupProgress) => void;

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}