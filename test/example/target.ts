import { TableModel } from './model';

export interface User {
  id: number;
  name: string;
  email?: string;
}

export interface Article {
  id: number;
  title: string;
  category: string;
  tags: string[];
  content: string;
  author: User;
}

export class UserModel extends TableModel<User> {
  baseURI = '/users';
}

export class ArticleModel extends TableModel<Article> {
  baseURI = '/articles';
}
