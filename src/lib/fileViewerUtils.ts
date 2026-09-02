import {
  FileText,
  FileCode,
  FileSpreadsheet,
  Presentation,
  FileCheck,
  Code2,
  Terminal,
  FileJson,
  FilePlus,
  File,
} from 'lucide-react';

export type FileCategory = 'office' | 'pdf' | 'txt' | 'code' | 'md' | 'other';

export const OFFICE_EXTENSIONS = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'rtf',
  'odt',
  'ods',
  'odp',
  'pages',
  'numbers',
  'key',
];

export const PDF_EXTENSIONS = ['pdf'];

export const MD_EXTENSIONS = ['md', 'markdown', 'mdown'];

export const CODE_EXTENSIONS = [
  'java',
  'py',
  'json',
  'js',
  'ts',
  'tsx',
  'jsx',
  'cpp',
  'c',
  'h',
  'hpp',
  'cs',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'xml',
  'sh',
  'bash',
  'zsh',
  'sql',
  'yaml',
  'yml',
  'go',
  'rs',
  'php',
  'rb',
  'swift',
  'kt',
  'kts',
  'dart',
  'vue',
  'svelte',
  'graphql',
  'toml',
  'env',
  'dockerfile',
  'makefile',
];

export const TXT_EXTENSIONS = ['txt', 'log', 'text', 'nfo', 'ini', 'conf'];

export function getFileExtension(filename: string): string {
  if (!filename) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getFileCategory(filename: string): FileCategory {
  const ext = getFileExtension(filename);
  if (OFFICE_EXTENSIONS.includes(ext)) return 'office';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (MD_EXTENSIONS.includes(ext)) return 'md';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (TXT_EXTENSIONS.includes(ext)) return 'txt';
  return 'other';
}

export function isOfficeFile(filename: string): boolean {
  return getFileCategory(filename) === 'office';
}

export function isViewableDocument(filename: string): boolean {
  const cat = getFileCategory(filename);
  return cat === 'pdf' || cat === 'txt' || cat === 'code' || cat === 'md';
}

export function isEditableDocument(filename: string): boolean {
  const cat = getFileCategory(filename);
  return cat === 'txt' || cat === 'code' || cat === 'md';
}

export function getCodeLanguage(filename: string): string {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'java':
      return 'java';
    case 'py':
      return 'python';
    case 'json':
      return 'json';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
    case 'jsx':
      return 'react / jsx';
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return 'c++';
    case 'cs':
      return 'c#';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'xml':
      return 'xml';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'bash / shell';
    case 'sql':
      return 'sql';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'php':
      return 'php';
    case 'rb':
      return 'ruby';
    case 'swift':
      return 'swift';
    case 'kt':
    case 'kts':
      return 'kotlin';
    case 'dart':
      return 'dart';
    default:
      return ext.toUpperCase() || 'CODE';
  }
}

// Maps a filename to a highlight.js language id. Falls back to the bare
// extension so autodetect (or a plain render) can pick it up if unknown.
export function getHighlightLanguage(filename: string): string {
  const ext = getFileExtension(filename);
  const map: Record<string, string> = {
    java: 'java',
    py: 'python',
    json: 'json',
    js: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    jsx: 'javascript',
    cpp: 'cpp',
    c: 'c',
    h: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'xml',
    htm: 'xml',
    xml: 'xml',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    kts: 'kotlin',
    dart: 'dart',
    vue: 'xml',
    svelte: 'xml',
    graphql: 'graphql',
    toml: 'ini',
    env: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    md: 'markdown',
    markdown: 'markdown',
    mdown: 'markdown',
  };
  return map[ext] || ext;
}

export function getDocumentBadgeInfo(filename: string) {
  const ext = getFileExtension(filename);
  const cat = getFileCategory(filename);

  if (cat === 'office') {
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
      return {
        label: 'اکسل (Excel)',
        icon: FileSpreadsheet,
        color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800',
      };
    }
    if (['ppt', 'pptx', 'odp'].includes(ext)) {
      return {
        label: 'پاورپوینت (PPT)',
        icon: Presentation,
        color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800',
      };
    }
    return {
      label: 'سند ورد (Word)',
      icon: FileText,
      color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800',
    };
  }

  if (cat === 'pdf') {
    return {
      label: 'سند PDF',
      icon: FileText,
      color: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/70 border-red-300 dark:border-red-800',
    };
  }

  if (cat === 'md') {
    return {
      label: 'مارک‌داون (Markdown)',
      icon: FileCheck,
      color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 border-purple-300 dark:border-purple-800',
    };
  }

  if (cat === 'code') {
    if (ext === 'json') {
      return {
        label: 'داده JSON',
        icon: FileJson,
        color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800',
      };
    }
    if (['sh', 'bash', 'zsh'].includes(ext)) {
      return {
        label: 'اسکریپت شل',
        icon: Terminal,
        color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800',
      };
    }
    return {
      label: `فایل کد (${getCodeLanguage(filename).toUpperCase()})`,
      icon: Code2,
      color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800',
    };
  }

  if (cat === 'txt') {
    return {
      label: 'فایل متنی (TXT)',
      icon: FileText,
      color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
    };
  }

  return {
    label: `فایل (${ext.toUpperCase()})`,
    icon: File,
    color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
  };
}
