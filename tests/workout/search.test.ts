import { searchEntries } from '../../src/workout/search';
import { ex, entry, block, w } from '../fixtures';

const bench = ex({ name: '벤치프레스' });
const gone = ex({ name: '스쿼트', deletedAt: 1 });
const exMap = new Map([bench, gone].map((e) => [e.id, e]));
const es = [
  entry('2026-11-01', { memo: '어깨가 조금 아팠음', exercises: [block(bench.id, [w(80, 8)])] }),
  entry('2026-11-05', { exercises: [block(gone.id, [w(100, 5)])] }),
  entry('2026-11-07', { memo: '벤치 잘 됨', deletedAt: 3 }),
];

test('운동 이름으로 찾기 (날짜 내림차순)', () => {
  expect(searchEntries('벤치', es, exMap)).toEqual([{ date: '2026-11-01', snippet: '벤치프레스' }]);
});
test('메모로 찾기, 앞뒤 20자 snippet', () => {
  expect(searchEntries('어깨', es, exMap)[0]).toEqual({ date: '2026-11-01', snippet: '어깨가 조금 아팠음' });
});
test('삭제된 운동 이름으로도 찾기', () => {
  expect(searchEntries('스쿼트', es, exMap).map((r) => r.date)).toEqual(['2026-11-05']);
});
test('삭제된 일지는 제외', () => {
  expect(searchEntries('잘 됨', es, exMap)).toEqual([]);
});
test('빈 검색어는 []', () => expect(searchEntries('  ', es, exMap)).toEqual([]));
test('대소문자·공백 무시', () => {
  const e2 = [entry('2026-11-02', { memo: 'Felt GREAT today' })];
  expect(searchEntries(' great ', e2, exMap)).toHaveLength(1);
});
test('긴 메모는 매칭 주변만 보여준다', () => {
  const long = 'ㄱ'.repeat(40) + '통증' + 'ㄴ'.repeat(40);
  const r = searchEntries('통증', [entry('2026-11-03', { memo: long })], exMap)[0];
  expect(r.snippet).toBe('…' + 'ㄱ'.repeat(20) + '통증' + 'ㄴ'.repeat(20) + '…');
});
