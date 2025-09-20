import { HTTPClient } from 'koajax';
import { DataObject, Filter, IDType, ListModel, NewData } from 'mobx-restful';

export abstract class TableModel<T extends DataObject> extends ListModel<T> {
  client = new HTTPClient();

  abstract mockData: T[];

  async loadPage(pageIndex = 1, pageSize = 10, filter: Filter<T>) {
    const filteredList = this.mockData.filter(item =>
      Object.entries(filter).every(([key, value]) => item[key as keyof T] === value),
    );
    const pageData = filteredList.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

    return { pageData, totalCount: filteredList.length };
  }

  async getOne(id: IDType) {
    return this.mockData.find(({ [this.indexKey]: itemId }) => itemId === id)!;
  }

  async updateOne(data: Partial<NewData<T>>, id?: IDType) {
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
