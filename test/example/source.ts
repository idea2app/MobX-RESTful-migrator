import { FileHandle, open } from 'fs/promises';
import { readTextTable } from 'web-utility';

export interface SourceArticle
  extends Record<'title' | 'subtitle' | 'keywords' | 'content' | 'author' | 'email', string> {
  id: number;
}

export async function* readCSV<T extends object>(path: string) {
  let fileHandle: FileHandle | undefined;

  try {
    fileHandle = await open(path);

    const stream = fileHandle.createReadStream({ encoding: 'utf-8' });

    yield* readTextTable<T>(stream, true) as AsyncGenerator<T>;
  } finally {
    await fileHandle?.close();
  }
}

export const loadSourceArticles = () => readCSV<SourceArticle>('test/example/article.csv');
