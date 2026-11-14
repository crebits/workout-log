import { chartSeries } from '../../src/workout/series';
import { ex, entry, block, w } from '../fixtures';

const bench = ex({ name: '벤치' });
const run = ex({ name: '러닝', type: 'cardio' });

test('무게 운동: 날짜별 최고 e1RM, 디로드·워밍업·삭제 제외, 날짜순', () => {
  const es = [
    entry('2026-11-05', { exercises: [block(bench.id, [w(100, 10, true), w(80, 8), w(82.5, 6)])] }),
    entry('2026-11-01', { exercises: [block(bench.id, [w(80, 6)])] }),
    entry('2026-11-08', { isDeload: true, exercises: [block(bench.id, [w(60, 8)])] }),
    entry('2026-11-09', { deletedAt: 1, exercises: [block(bench.id, [w(60, 8)])] }),
  ];
  const s = chartSeries(bench, es, 'e1rm');
  expect(s.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-05']);
  expect(s[1].value).toBeCloseTo(101.33, 2);
});

test('유산소: 페이스/심박/케이던스', () => {
  const es = [entry('2026-11-01', { exercises: [block(run.id, [{ isWarmup: false, durationSec: 1800, distanceKm: 5, avgHeartRate: 150, avgCadence: 170 }])] })];
  expect(chartSeries(run, es, 'pace')[0].value).toBe(360);
  expect(chartSeries(run, es, 'heartRate')[0].value).toBe(150);
  expect(chartSeries(run, es, 'cadence')[0].value).toBe(170);
  expect(chartSeries(run, es, 'distance')[0].value).toBe(5);
});

test('값이 없는 날은 빠진다', () => {
  const es = [entry('2026-11-01', { exercises: [block(run.id, [{ isWarmup: false, durationSec: 1800 }])] })];
  expect(chartSeries(run, es, 'pace')).toEqual([]);
});
