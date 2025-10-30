import 'core-js/es/array/from-async';

import { remove } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';

import { MigrationSchema, RestMigrator, YAMLListModel } from '../src';

interface CrawledData {
  fieldA: string;
  fieldB: number;
  fieldC: boolean;
}

describe('Crawler (file-backed YAMLListModel read/write)', () => {
  const tmpFile = join(tmpdir(), `mobx-restful-migrator-crawler-${process.pid}.yml`);

  beforeEach(() => remove(tmpFile));
  afterEach(() => remove(tmpFile));

  async function* mockCrawler(): AsyncGenerator<CrawledData> {
    for (let i = 1; i <= 3; i++) {
      yield { fieldA: `a-${i}`, fieldB: i, fieldC: i % 2 === 0 };
    }
  }
  class FileYAMLListModel extends YAMLListModel<CrawledData> {
    constructor() {
      super(tmpFile);
    }
  }

  it('should crawl data and persist YAML file which can be read back', async () => {
    const mapping: MigrationSchema<CrawledData, CrawledData> = {
      fieldA: 'fieldA',
      fieldB: 'fieldB',
      fieldC: 'fieldC',
    };
    const migrator = new RestMigrator(mockCrawler, FileYAMLListModel, mapping);

    const results = await Array.fromAsync(migrator.boot());

    expect(results).toHaveLength(3);

    const reader = new FileYAMLListModel();

    const pageData = await reader.getList({}, 1, 10);

    expect(pageData).toHaveLength(3);
    expect(pageData[0]).toHaveProperty('fieldA', 'a-1');
    expect(pageData[1]).toHaveProperty('fieldB', 2);
    expect(pageData[2]).toHaveProperty('fieldC', false);
  });
});
