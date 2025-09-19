import { streamOf } from './model';

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

export const sampleArticles: SourceArticle[] = [
  {
    id: 1,
    title: 'Introduction to TypeScript',
    subtitle: 'A Comprehensive Guide',
    keywords: 'typescript,javascript,programming',
    content: 'TypeScript is a typed superset of JavaScript...',
    author: 'John Doe',
    email: 'john@example.com',
  },
  {
    id: 2,
    title: 'MobX State Management',
    subtitle: 'Made Simple',
    keywords: 'mobx,react,state-management',
    content: 'MobX is a battle tested library that makes state management simple...',
    author: 'Jane Smith',
    email: 'jane@example.com',
  },
];

export const createSourceStream = () => streamOf(sampleArticles);
