import { readFile } from 'fs/promises';

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
  try {
    const csvContent = await readFile(path, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      const line = lines[i];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' && (j === 0 || line[j-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (j === line.length - 1 || line[j+1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add the last value
      
      const row = {} as T;
      headers.forEach((header, index) => {
        (row as any)[header] = values[index] || '';
      });
      
      yield row;
    }
  } catch (error) {
    console.error('Error reading CSV file:', error);
  }
}

export const createSourceStream = () => readCSV<SourceArticle>('test/example/article.csv');
