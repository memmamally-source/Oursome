import type { ShoppingItem } from '@/features/types';

import { frequentItems, guessCategory, manualOrder, moveInOrder, parseItemInput, recordBought } from '../logic';

describe('shopping logic', () => {
  it.each([
    ['Milk', 'dairy'],
    ['Oat milk', 'drinks'],
    ['Ice cream', 'frozen'],
    ['Sourdough bread', 'bakery'],
    ['Chicken thighs', 'meat'],
    ['Paper towels', 'household'],
    ['Toothpaste', 'personal'],
    ['Bananas', 'produce'],
    ['Birthday card', 'other'],
  ])('%s → %s', (name, cat) => {
    expect(guessCategory(name)).toBe(cat);
  });

  it.each([
    ['2 milk', { name: 'Milk', quantity: '2' }],
    ['milk x2', { name: 'Milk', quantity: '2' }],
    ['500g mince', { name: 'Mince', quantity: '500g' }],
    ['3 cans tomatoes', { name: 'Tomatoes', quantity: '3 cans' }],
    ['eggs (12)', { name: 'Eggs', quantity: '12' }],
    ['  avocados ', { name: 'Avocados' }],
  ])('parses "%s"', (input, expected) => {
    expect(parseItemInput(input)).toEqual(expected);
  });
});

const item = (id: string, createdAt: string, order?: number): ShoppingItem => ({
  id,
  listId: 'l',
  name: id,
  category: 'other',
  purchased: false,
  createdAt,
  order,
});

describe('list order', () => {
  it('keeps the household’s own order, newest arrivals at the end', () => {
    const items = [item('c', '2026-01-03'), item('a', '2026-01-01', 1), item('b', '2026-01-02', 0)];
    expect(manualOrder(items).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves an item up or down, and not past either end', () => {
    const items = [item('a', '1'), item('b', '2'), item('c', '3')];
    expect(moveInOrder(items, 'c', -1)).toEqual({ a: 0, c: 1, b: 2 });
    expect(moveInOrder(items, 'a', -1)).toEqual({});
    expect(moveInOrder(items, 'c', 1)).toEqual({});
  });
});

describe('often bought', () => {
  it('suggests things bought more than once that aren’t on the list', () => {
    let h = {};
    for (const [name, at] of [
      ['Milk', '1'],
      ['milk', '2'],
      ['milk', '3'],
      ['Bread', '4'],
      ['Bread', '5'],
      ['Eggs', '6'],
      ['Coffee', '7'],
      ['coffee', '8'],
    ] as const)
      h = recordBought(h, name, at);
    expect(frequentItems(h, [])).toEqual(['Milk', 'Coffee', 'Bread']);
    expect(frequentItems(h, ['MILK'])).toEqual(['Coffee', 'Bread']);
  });
});
