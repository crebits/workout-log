import { parseNum } from '../../src/lib/number';

test.each([
  ['62.5', 62.5], ['62,5', 62.5], [' 80 ', 80], ['', undefined], ['abc', undefined], ['0', 0], ['1e3', undefined],
] as const)('parseNum(%s)', (i, o) => expect(parseNum(i)).toBe(o));
