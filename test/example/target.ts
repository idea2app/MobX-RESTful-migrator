import { TableModel } from './model';

export interface User extends Record<'name' | 'email', string> {
  id: number;
}

export interface Article extends Record<'title' | 'category' | 'content', string> {
  id: number;
  tags: string[];
  author: User;
}

export class UserModel extends TableModel<User> {
  baseURI = '/users';
}

export class ArticleModel extends TableModel<Article> {
  baseURI = '/articles';
}
