import { IDType, NewData } from 'mobx-restful';

import { TableModel } from './model';

export interface User extends Record<'name' | 'email', string> {
  id: number;
}

export interface Article extends Record<'title' | 'category' | 'content', string> {
  id: number;
  tags: string[];
  author: User;
}

const mockUsers: User[] = [];

export class UserModel extends TableModel<User> {
  baseURI = '/users';

  mockData = mockUsers;
}

const mockArticles: Article[] = [];

export class ArticleModel extends TableModel<Article> {
  baseURI = '/articles';

  mockData = mockArticles;

  async updateOne(data: Partial<NewData<Article>>, id?: IDType) {
    const article = await super.updateOne(data, id);
    const author = await new UserModel().getOne(data.author as IDType);

    return { ...article, author };
  }
}
