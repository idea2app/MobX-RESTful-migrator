import { FileHandle, open } from 'fs/promises';
import { readTextTable } from 'web-utility';

// Sample source data representing articles table
export interface SourceArticle {
  id: number;
  title: string;
  subtitle: string;
  keywords: string; // comma-separated string to be split into tags array
  content: string;
  author: string;
  email?: string;
}

export async function* readCSV<T extends object>(path: string) {
  let fileHandle: FileHandle | undefined;

  try {
    fileHandle = await open(path);

    yield* readTextTable<T>(fileHandle.createReadStream()) as AsyncGenerator<T>;
  } finally {
    await fileHandle?.close();
  }
}

export const createSourceStream = () => readCSV<SourceArticle>('test/example/articles.csv');
