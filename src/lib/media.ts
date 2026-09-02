import { NoteAttachment } from '../types';
import { api, UploadProgressInfo } from '../services/api';

export const MEDIA_ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip';

export interface BatchUploadProgress {
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  currentFilePercent: number;
  currentFileLoaded: number;
  currentFileSize: number;
  overallPercent: number;
  stage: 'reading' | 'uploading' | 'processing' | 'done' | 'error';
}

// Opens a file picker and resolves with the chosen files (one or many).
export function pickMediaFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files || []));
    input.click();
  });
}

// Uploads a list of files, recovering media duration for audio/video with progress tracking.
export async function uploadMediaFiles(
  files: File[],
  onProgress?: (progress: BatchUploadProgress) => void,
  signal?: AbortSignal
): Promise<NoteAttachment[]> {
  const out: NoteAttachment[] = [];
  const totalFiles = files.length;
  if (!totalFiles) return out;

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 1), 0);
  let accumulatedLoadedBytes = 0;

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('آپلود توسط کاربر لغو شد', 'AbortError');
    }

    const file = files[i];
    const fileSize = file.size || 1;

    let duration: number | undefined;
    if (file.type.startsWith('audio') || file.type.startsWith('video')) {
      duration = await new Promise<number | undefined>((resolve) => {
        const el = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
        el.preload = 'metadata';
        el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : undefined);
        el.onerror = () => resolve(undefined);
        el.src = URL.createObjectURL(file);
      });
    }

    const uploaded = await api.uploadFile(
      file,
      duration,
      (singleInfo: UploadProgressInfo) => {
        const currentLoaded = singleInfo.loadedBytes;
        const currentOverallLoaded = accumulatedLoadedBytes + currentLoaded;
        const overallPct = Math.min(100, Math.round((currentOverallLoaded / totalBytes) * 100));

        onProgress?.({
          currentFileIndex: i + 1,
          totalFiles,
          currentFileName: file.name,
          currentFilePercent: singleInfo.percent,
          currentFileLoaded: singleInfo.loadedBytes,
          currentFileSize: fileSize,
          overallPercent: overallPct,
          stage: singleInfo.stage,
        });
      },
      signal
    );

    accumulatedLoadedBytes += fileSize;
    out.push(uploaded);
  }

  // Final 100% notification
  onProgress?.({
    currentFileIndex: totalFiles,
    totalFiles,
    currentFileName: files[files.length - 1].name,
    currentFilePercent: 100,
    currentFileLoaded: files[files.length - 1].size,
    currentFileSize: files[files.length - 1].size,
    overallPercent: 100,
    stage: 'done',
  });

  return out;
}

