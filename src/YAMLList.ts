import { appendFile,ensureFileSync, readFileSync } from 'fs-extra';
import { HTTPClient } from 'koajax';
import { DataObject, Filter, IDType, ListModel, NewData } from 'mobx-restful';
import { parse, stringify } from 'yaml';

export class YAMLListModel<D extends DataObject, F extends Filter<D> = Filter<D>> extends ListModel<
  D,
  F
> {
  client = new HTTPClient();

  private localAllItems: D[] = [];

  constructor(public baseURI = '') {
    super();
    ensureFileSync(baseURI);
    this.localAllItems = parse(readFileSync(baseURI) + '') || [];
  }

  async getOne(id: IDType) {
    const item = this.localAllItems.find(({ [this.indexKey]: itemId }) => itemId === id);

    if (!item) throw new URIError(`Item with ID ${id} is not found.`);

    return item;
  }

  async loadPage(pageIndex: number, pageSize: number, filter: Filter<D>) {
    const filteredItems = this.localAllItems!.filter(item =>
      Object.entries(filter).every(([key, value]) => {
        const fullValue = item[key];

        return typeof fullValue === 'string' ? fullValue.includes(value + '') : fullValue === value;
      }),
    );
    const pageData = filteredItems.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

    return { pageData, totalCount: filteredItems.length };
  }

  async updateOne(data: Partial<NewData<D>>, id?: IDType) {
    if (id) {
      const item = await this.getOne(id);

      return Object.assign(item, data);
    } else {
      this.localAllItems.push(data as D);

      await appendFile(this.baseURI, stringify([data]));

      return data as D;
    }
  }
}
