import { HTTPClient } from 'koajax';
import { ListModel, Filter, NewData, DataObject } from 'mobx-restful';

export async function* streamOf<T>(items: T[]) {
  for (const item of items) yield item;
}

export abstract class TableModel<T extends DataObject> extends ListModel<T> {
  client = new HTTPClient();

  indexKey = 'id' as const;

  private mockData: T[] = [];

  async loadPage(pageIndex = 1, pageSize = 10, filter: Filter<T>) {
    const filteredList = this.mockData.filter(item =>
      Object.entries(filter).every(([key, value]) => item[key as keyof T] === value)
    );
    const pageData = filteredList.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

    return { pageData, totalCount: filteredList.length };
  }

  async updateOne(data: Partial<NewData<T>>, id?: number) {
    if (id) {
      const index = this.mockData.findIndex(item => item.id === id);

      data = Object.assign(this.mockData[index], data);
    } else {
      data = { id: this.mockData.length + 1, ...data };

      this.mockData.push(data as T);
    }
    return data as T;
  }
}
