import { parsePagination, paginated } from './pagination';

describe('parsePagination', () => {
  it('applies defaults', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: 3, limit: 10 })).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it('clamps limit to the maximum and rejects invalid values', () => {
    expect(parsePagination({ limit: 500 })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    });
    expect(parsePagination({ page: -2, limit: 'abc' as never })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });
});

describe('paginated', () => {
  it('builds the paginated envelope', () => {
    expect(paginated([1, 2], 21, 3, 10)).toEqual({
      data: [1, 2],
      total: 21,
      page: 3,
      limit: 10,
      totalPages: 3,
    });
  });
});
