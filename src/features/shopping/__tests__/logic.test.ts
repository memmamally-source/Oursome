import { guessCategory, parseItemInput } from '../logic';

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
