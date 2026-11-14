# 운동일지 PWA 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이폰 홈 화면에 설치해 쓰는, 루틴 순환·더블 프로그레션·디로드를 이해하는 달력형 운동일지 PWA를 만든다.

**Architecture:** 데이터는 IndexedDB(Dexie)에만 저장하고, 화면은 `src/data/repo.ts`만 거친다. 차례·바퀴·디로드·올릴 차례 판단은 운동 용어를 모르는 순수 함수(`src/core/*`)로 두고, 운동 쪽(`src/workout/*`)이 이를 감싼다. 차례·바퀴·디로드 상태는 저장하지 않고 일지 기록에서 매번 계산한다.

**Tech Stack:** Vite + React 18 + TypeScript, Dexie 4 + dexie-react-hooks, date-fns, @dnd-kit/sortable, recharts, vite-plugin-pwa, Vitest + @testing-library/react + jsdom + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-15-workout-log-design.md` (구현 전 반드시 함께 읽을 것)

## Global Constraints

- 데이터는 기기(IndexedDB)에만 저장한다. 네트워크로 데이터를 보내는 코드는 없다.
- 모든 레코드: `id`(crypto.randomUUID), `createdAt`, `updatedAt`(ms 숫자), `deletedAt?`. 삭제는 `deletedAt`만 채운다.
- `SCHEMA_VERSION = 1`. DB와 백업 파일에 들어간다.
- 날짜는 **기기 현지 시간** `YYYY-MM-DD` 문자열. `toISOString()`으로 날짜를 만들지 않는다. 날짜 연산은 `src/lib/date.ts`만 쓴다.
- 화면 컴포넌트는 Dexie를 직접 import하지 않는다 (`src/data/repo.ts`만 사용). 브라우저 전용 API(`navigator.share`, `navigator.storage`, `matchMedia`)는 `src/platform/*`에서만 호출한다.
- `src/core/*`는 운동 용어(세트, kg, reps, exercise)를 쓰지 않는다.
- 앱은 숫자를 미리 채우고 추천만 한다. 사용자가 고친 값은 그대로 저장한다.
- 기본값: 백업 알림 14일, 디로드 주기 4바퀴, 디로드 세트 비율 0.5, 디로드 무게 감소 0, 무게 운동 증가 단위 2.5kg, 저중량 참고 비율 표시 켜짐.
- 추정 1RM: Epley `w × (1 + r/30)`, reps 1~12만.
- 화면 문구는 한국어.
- Vite `base: '/workout-log/'` (GitHub Pages 개인 계정 crebits).
- 커밋 작성자는 저장소 로컬 설정(crebits noreply)을 그대로 쓴다. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **오전 0~9시(KST) 기록**: `new Date().toISOString().slice(0,10)`을 쓰면 전날 날짜가 된다 → 오늘 날짜가 현지 기준이어야 한다. (Task 1 테스트)
2. **지웠던 날짜에 다시 기록**: 일지를 비워 soft delete한 날짜에 다시 쓰면 `date` 고유 인덱스 충돌 → 지워진 레코드를 되살려 써야 한다. (Task 6 테스트)
3. **소수점·빈칸 입력**: 아이폰 키보드 지역 설정에 따라 `62,5`가 들어오거나 칸을 비운다 → `62,5`는 62.5, 빈칸은 `undefined`(0 아님). (Task 9 테스트)
4. **휴식 항목 두 개를 가진 백업 가져오기**: 둘 다 이름이 "휴식"이라 이름으로 합치면 하나로 뭉개진다 → 순서 위치로 맞춰 두 개가 유지되어야 한다. (Task 7 테스트)
5. **지운 운동·루틴을 가리키는 옛 기록**: 최고 기록·검색·달력에서 이름이 사라지거나 순환 계산이 깨지면 안 된다 → 지운 운동도 id로 이름을 찾고, 지운 루틴 기록은 순환에서만 빠진다. (Task 2, Task 6 테스트)

---

## File Structure

```
src/
  types.ts                 레코드 타입, SCHEMA_VERSION, 기본 설정
  lib/date.ts              현지 날짜 유틸
  lib/number.ts            입력 문자열 → 숫자 파싱
  core/rotation.ts         순환: 다음 차례, 간주 휴식, 진행 칸(pos)
  core/progression.ts      목표 범위 기반 올릴 차례, 정체 판정
  core/deload.ts           디로드 진행/차례 계산
  workout/records.ts       e1RM, 페이스, 최고 기록, 신기록 판정, 저중량 비율
  workout/prefill.ts       지난번 기록 채우기(+올릴 차례, 디로드 적용)
  workout/status.ts        일지 목록 → 순환·디로드·정체 신호 상태 (core 연결)
  data/db.ts               Dexie 스키마
  data/repo.ts             저장 모듈 (화면이 쓰는 유일한 데이터 API)
  data/backup.ts           내보내기 파일 만들기, 가져오기 계획·적용
  platform/files.ts        공유 시트/다운로드, 파일 읽기
  platform/install.ts      standalone 판별, storage.persist
  ui/App.tsx, ui/TabBar.tsx
  ui/calendar/CalendarScreen.tsx, ui/calendar/Banners.tsx
  ui/entry/EntryModal.tsx, ui/entry/ExerciseBlock.tsx, ui/entry/SetRow.tsx, ui/entry/useEntryDraft.ts
  ui/exercise/ExercisePicker.tsx, ui/exercise/ExerciseForm.tsx
  ui/routines/RoutinesScreen.tsx, ui/routines/RoutineEditor.tsx
  ui/records/RecordsScreen.tsx, ui/records/ExerciseDetail.tsx
  ui/search/SearchScreen.tsx
  ui/settings/SettingsScreen.tsx, ui/settings/ImportDialog.tsx, ui/InstallGuide.tsx
tests/                     src와 같은 구조로 *.test.ts(x)
.github/workflows/deploy.yml
```

---

### Task 1: 프로젝트 뼈대, 타입, 날짜·숫자 유틸

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/ui/App.tsx`(빈 셸), `src/types.ts`, `src/lib/date.ts`, `src/lib/number.ts`, `tests/setup.ts`, `.gitignore`
- Test: `tests/lib/date.test.ts`, `tests/lib/number.test.ts`, `tests/ui/App.test.tsx`

**Interfaces:**
- Produces (`src/types.ts`):
```ts
export const SCHEMA_VERSION = 1;
export type ISODate = string; // 'YYYY-MM-DD' 현지
export interface BaseRecord { id: string; createdAt: number; updatedAt: number; deletedAt?: number }
export type ExerciseType = 'weight' | 'bodyweight' | 'cardio';
export const MUSCLES = ['가슴','등','어깨','이두','삼두','하체','복근','전완'] as const;
export interface Exercise extends BaseRecord { name: string; type: ExerciseType; incrementKg: number; primaryMuscles: string[]; secondaryMuscles: string[]; note: string }
export interface RoutineItem { exerciseId: string; order: number; targetRepsMin: number; targetRepsMax: number }
export interface Routine extends BaseRecord { name: string; kind: 'workout' | 'rest'; intensity: 'heavy' | 'light' | null; order: number; items: RoutineItem[] }
export interface WorkoutSet { isWarmup: boolean; weightKg?: number; reps?: number; addedWeightKg?: number; durationSec?: number; distanceKm?: number; avgHeartRate?: number; maxHeartRate?: number; avgCadence?: number }
export interface EntryExercise { exerciseId: string; order: number; sets: WorkoutSet[] }
export interface Entry extends BaseRecord { date: ISODate; routineId: string | null; isDeload: boolean; memo: string; exercises: EntryExercise[] }
export interface Settings { id: 'settings'; updatedAt: number; defaultTargetRange: { min: number; max: number } | null; backupReminderDays: number; deloadEveryLaps: number; deloadSetRatio: number; deloadWeightReduction: number; showLightRatio: boolean; lastBackupAt: number | null }
export const DEFAULT_SETTINGS: Omit<Settings, 'updatedAt'>; // 값은 Global Constraints
```
- Produces (`src/lib/date.ts`): `todayISO(now?: Date): ISODate`, `addDays(d: ISODate, n: number): ISODate`, `daysBetween(a: ISODate, b: ISODate): number` (b − a), `compareISO(a, b): number`
- Produces (`src/lib/number.ts`): `parseNum(input: string): number | undefined`

- [ ] **Step 1: 프로젝트 생성**
`npm create vite@latest . -- --template react-ts` 후 의존성 설치: `dexie dexie-react-hooks date-fns @dnd-kit/core @dnd-kit/sortable recharts`, dev: `vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom fake-indexeddb vite-plugin-pwa`. `vite.config.ts`에 `base: '/workout-log/'`, vitest `environment: 'jsdom'`, `setupFiles: ['tests/setup.ts']`(jest-dom + `fake-indexeddb/auto`). `package.json` scripts: `"test": "vitest run"`, `"build": "tsc -b && vite build"`.

- [ ] **Step 2: 실패하는 테스트 작성**
```ts
// tests/lib/date.test.ts
test('KST 오전 8시는 그날 날짜', () => {
  // TZ=Asia/Seoul 로 실행 (vitest config env.TZ 또는 process.env.TZ 설정)
  expect(todayISO(new Date('2026-11-14T23:30:00Z'))).toBe('2026-11-15');
});
test('addDays 월 경계', () => expect(addDays('2026-11-30', 1)).toBe('2026-12-01'));
test('daysBetween', () => expect(daysBetween('2026-11-10', '2026-11-15')).toBe(5));
// tests/lib/number.test.ts
test.each([['62.5', 62.5], ['62,5', 62.5], [' 80 ', 80], ['', undefined], ['abc', undefined], ['0', 0]])('parseNum(%s)', (i, o) => expect(parseNum(i)).toBe(o));
// tests/ui/App.test.tsx
test('앱이 렌더된다', () => { render(<App />); expect(screen.getByRole('navigation')).toBeInTheDocument(); });
```
vitest 설정에 `test.env: { TZ: 'Asia/Seoul' }`.

- [ ] **Step 3: 실행해서 실패 확인** — `npm test` → 함수 없음으로 FAIL
- [ ] **Step 4: 구현** — `types.ts`, `date.ts`(date-fns `format(d,'yyyy-MM-dd')`, `parseISO`), `number.ts`, `App.tsx`는 `<nav>`만 있는 셸
- [ ] **Step 5: 통과 확인** — `npm test` PASS, `npm run build` 성공
- [ ] **Step 6: 커밋** — `git add -A && git commit -m "chore: 프로젝트 뼈대, 타입, 날짜·숫자 유틸"`

---

### Task 2: core/rotation — 다음 차례, 간주 휴식, 진행 칸

**Files:**
- Create: `src/core/rotation.ts`
- Test: `tests/core/rotation.test.ts`

**Interfaces:**
- Consumes: `addDays`, `compareISO` (Task 1)
- Produces:
```ts
export interface RotationItem { id: string; isRest: boolean }       // 목록 순서대로
export interface RotationLog { date: ISODate; itemId: string }
export interface RotationStep { date: ISODate; itemId: string; pos: number; inferred: boolean }
export interface Walk { steps: RotationStep[]; nextItemId: string | null; nextPos: number }
export function walkRotation(items: RotationItem[], logs: RotationLog[], until: ISODate): Walk
```

규칙 (스펙 6.4):
- `until`보다 **앞선 날짜**의 로그만 쓴다. 목록에 없는 `itemId` 로그는 버린다. 날짜순 정렬.
- 첫 로그 `pos = 0`. 이후 로그는 `pos += ((idx − prevIdx + n) % n)`. 같은 항목 연속이면 0칸.
- 두 로그 사이(그리고 마지막 로그와 `until` 사이)의 기록 없는 날마다: 현재 커서(이전 로그 다음 항목)가 휴식이면 그 날을 `inferred: true` 스텝으로 넣고 커서와 pos를 1칸 전진, 운동 항목이면 그 구간의 간주를 멈춘다(차례는 머무름).
- 로그 사이 간주 후 실제 로그의 pos는 "간주로 이동한 커서 위치 기준"이 아니라 직전 스텝(간주 포함)의 항목 위치에서 계산한다.
- `nextItemId`: 마지막 스텝 다음 항목(+간주 반영). 로그가 없으면 `items[0]`, 목록이 비면 `null`. `nextPos` = 마지막 스텝 pos + 1 (스텝 없으면 0).

- [ ] **Step 1: 실패하는 테스트 작성** (목록: A1 B1 C1 R1 A2 B2 C2 R2, 8개)
```ts
test('기록 없으면 첫 항목', () => expect(walkRotation(items, [], '2026-11-15').nextItemId).toBe('A1'));
test('C1 다음날 기록 없이 지나면 휴식 간주 후 A2', () => {
  const w = walkRotation(items, [{date:'2026-11-12', itemId:'C1'}], '2026-11-14');
  expect(w.steps.filter(s=>s.inferred).map(s=>s.date)).toEqual(['2026-11-13']);
  expect(w.nextItemId).toBe('A2');
});
test('운동 차례 날을 넘기면 그대로 머문다', () => {
  expect(walkRotation(items, [{date:'2026-11-10', itemId:'A1'}], '2026-11-15').nextItemId).toBe('B1');
});
test('until 당일·이후 로그는 무시 (지난 날짜 열기)', () => {
  const logs = [{date:'2026-11-10', itemId:'A1'}, {date:'2026-11-11', itemId:'B1'}];
  expect(walkRotation(items, logs, '2026-11-11').nextItemId).toBe('B1');
});
test('건너뛰기: A1 다음에 C1 기록 → 다음은 R1, pos 2칸', () => {
  const w = walkRotation(items, [{date:'2026-11-10', itemId:'A1'}, {date:'2026-11-11', itemId:'C1'}], '2026-11-12');
  expect(w.nextItemId).toBe('R1'); expect(w.steps.at(-1)!.pos).toBe(2);
});
test('한 바퀴 돌면 pos가 목록 길이만큼 증가', () => { /* A1..C2 7개 실제 기록 + R2 간주 + 다음 A1 기록 → 그 A1 스텝 pos === 8 */ });
test('지운 루틴 id 로그는 무시', () => { /* itemId:'gone' 포함해도 결과 동일 */ });
test('마지막 항목 다음은 첫 항목', () => { /* R2 기록 → nextItemId 'A1' */ });
```
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/core/rotation.test.ts` FAIL
- [ ] **Step 3: `walkRotation` 구현**
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: 커밋** — `feat(core): 루틴 순환 계산`

---

### Task 3: core/progression — 올릴 차례, 정체

**Files:**
- Create: `src/core/progression.ts`
- Test: `tests/core/progression.test.ts`

**Interfaces:**
- Produces:
```ts
export interface Attempt { load: number | null; value: number }   // 운동에선 load=kg, value=횟수
export interface Range { min: number; max: number }
export function decideProgression(last: Attempt[], range: Range, step: number): { ready: boolean; next: Attempt[] }
export function isStalled(history: Attempt[][], range: Range): boolean  // history: 오래된 → 최근
```
규칙 (스펙 6.3, 6.5):
- `ready` = `last`가 비어 있지 않고 모든 `value ≥ range.max`.
- `ready`면 `next`는 각 항목 `load + step`(load가 null이면 null 유지), `value = range.min`. 아니면 `last` 복사.
- `isStalled`: 최근 3회가 있고, 3회의 **최대 load가 모두 같고**, 3회 모두 `ready`가 아니면 true.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('모든 세트가 위쪽 이상이면 올릴 차례', () => {
  const r = decideProgression([{load:80,value:8},{load:80,value:8}], {min:6,max:8}, 2.5);
  expect(r).toEqual({ ready: true, next: [{load:82.5,value:6},{load:82.5,value:6}] });
});
test('하나라도 못 채우면 그대로', () => expect(decideProgression([{load:80,value:8},{load:80,value:7}], {min:6,max:8}, 2.5).ready).toBe(false));
test('세트별 무게가 다르면 세트별로 올림', () => { /* 80/75 → 82.5/77.5 */ });
test('빈 배열은 ready 아님', () => expect(decideProgression([], {min:6,max:8}, 2.5).ready).toBe(false));
test('같은 무게 3회 연속 미달이면 정체', () => { /* [[80×7],[80×7],[80×6]] → true */ });
test('2회뿐이면 정체 아님', ...); test('무게가 바뀌었으면 정체 아님', ...); test('중간에 한 번 채웠으면 정체 아님', ...);
```
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4: 통과 확인**
- [ ] **Step 5: 커밋** — `feat(core): 올릴 차례·정체 판정`

---

### Task 4: core/deload — 디로드 진행·차례

**Files:**
- Create: `src/core/deload.ts`
- Test: `tests/core/deload.test.ts`

**Interfaces:**
- Consumes: `Walk`, `RotationStep` (Task 2)
- Produces:
```ts
export interface DeloadState { active: boolean; due: boolean; lapsSinceDeload: number }
export function deloadState(walk: Walk, deloadDates: ReadonlySet<ISODate>, listLength: number, everyLaps: number): DeloadState
```
규칙 (스펙 6.5):
- 실제 스텝(`inferred:false`) 중 `deloadDates`에 든 것이 디로드 스텝. 마지막 디로드 연속 구간의 첫 스텝 pos = `startPos`, 마지막 디로드 스텝 pos = `lastPos`.
- `active` = 마지막 실제 스텝이 디로드 && `walk.nextPos − startPos < listLength`.
- `lapsSinceDeload` = 디로드가 있었으면 `floor((walk.nextPos − (lastPos + 1)) / listLength)`, 없었으면 `floor(walk.nextPos / listLength)`.
- `due` = `!active && lapsSinceDeload ≥ everyLaps`.

- [ ] **Step 1: 실패하는 테스트** (목록 길이 8)
```ts
test('디로드 시작 후 한 바퀴 안이면 active', ...);       // 디로드 스텝 3개 후 nextPos-startPos=3
test('한 바퀴 채우면 active 아님', ...);                 // nextPos-startPos=8
test('중간에 끈 디로드도 디로드로 셈', ...);              // 디로드 2개 후 일반 기록 → active false, laps는 lastPos 기준
test('디로드 없이 4바퀴(32칸) → due', ...);
test('디로드 끝난 뒤부터 다시 셈: 끝나고 31칸이면 due 아님', ...);
test('기록 없음 → active false, due false, laps 0', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(core): 디로드 상태 계산`

---

### Task 5: workout — 기록 계산과 지난번 채우기

**Files:**
- Create: `src/workout/records.ts`, `src/workout/prefill.ts`, `src/workout/status.ts`
- Test: `tests/workout/records.test.ts`, `tests/workout/prefill.test.ts`, `tests/workout/status.test.ts`

**Interfaces:**
- Consumes: Task 1 타입, `walkRotation` (Task 2), `decideProgression`/`isStalled` (Task 3), `deloadState` (Task 4)
- Produces:
```ts
// records.ts — 모든 함수는 deletedAt 있는 entry, isDeload entry, isWarmup 세트를 뺀다
export function e1rm(weightKg: number, reps: number): number | null;
export function paceSecPerKm(durationSec?: number, distanceKm?: number): number | null;
export type PRKey = 'maxWeight'|'maxReps'|'bestE1rm'|'maxAddedWeight'|'longestDuration'|'longestDistance'|'bestPace';
export interface PRValue { value: number; date: ISODate; reps?: number }   // maxWeight일 때 reps
export function computePRs(ex: Exercise, entries: Entry[]): Partial<Record<PRKey, PRValue>>;
export function newPRs(ex: Exercise, entry: Entry, entries: Entry[]): PRKey[];  // entry를 뺀 나머지와 비교, 이전 값 없으면 해당 키 제외
export function bestE1rmBefore(exerciseId: string, entries: Entry[], date: ISODate): number | null;
// prefill.ts
export interface ExerciseHint { lastSets: WorkoutSet[] | null; lastDate: ISODate | null; ready: boolean; bodyweightReady: boolean }
export function buildPrefill(a: { routine: Routine; exercises: Map<string, Exercise>; entries: Entry[]; date: ISODate; deload: boolean; settings: Settings }): { exercises: EntryExercise[]; hints: Record<string, ExerciseHint> };
export function defaultRangeFromSets(sets: WorkoutSet[], settings: Settings): { min: number; max: number };
// status.ts
export interface AppStatus { nextRoutineId: string | null; inferredRestDates: ISODate[]; deload: DeloadState; stalledCount: number; stallSignal: boolean }
export function computeStatus(routines: Routine[], entries: Entry[], until: ISODate, settings: Settings): AppStatus;
```
규칙:
- `e1rm`: reps 1~12만, 아니면 null. `paceSecPerKm`: 둘 다 있고 거리 > 0일 때만.
- PR 키: weight → maxWeight, maxReps, bestE1rm / bodyweight → maxReps, maxAddedWeight / cardio → longestDuration, longestDistance, bestPace(작을수록 좋음).
- `buildPrefill` (스펙 6.2, 6.3, 6.5): 원본 = `date` 이전·같은 routineId·비디로드·그 운동 포함한 가장 최근 entry → 없으면 같은 조건에서 routineId 무관 → 없으면 빈 세트 1개(`{isWarmup:false}`). 워밍업 포함 복사. weight 운동은 본 세트에 `decideProgression(step=incrementKg, range=item 범위)` 결과 적용. bodyweight는 숫자 그대로, `bodyweightReady`만 표시. cardio는 그대로. `deload`면 진행 적용하지 않고 본 세트 수 `ceil(n × deloadSetRatio)`, 무게 `round(w × (1 − deloadWeightReduction) / inc) × inc`.
- `defaultRangeFromSets`: `settings.defaultTargetRange` 있으면 그것, 없으면 본 세트 최소 reps를 min, min+2를 max. 본 세트가 없으면 8~10.
- `computeStatus`: 순환 items = 비삭제 routines의 order순 `{id, isRest: kind==='rest'}`, logs = 비삭제 entries 중 routineId 있는 것. 정체 = `nextPos − pos ≤ listLength`인 실제 스텝들의 (routineId, exerciseId) 쌍마다 같은 루틴 비디로드 기록으로 `isStalled`; `stallSignal = stalledCount ≥ 3`.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('e1rm 80×8 = 101.33', () => expect(e1rm(80, 8)).toBeCloseTo(101.33, 2));
test('e1rm 13회 이상 null', () => expect(e1rm(60, 13)).toBeNull());
test('pace 32분 5.2km = 369초', () => expect(paceSecPerKm(1920, 5.2)).toBeCloseTo(369.2, 1));
test('PR은 워밍업·디로드·삭제 기록 제외', ...);
test('첫 기록은 신기록 아님', ...);
test('이전 최고 무게를 넘으면 maxWeight 신기록', ...);
test('지운 운동도 기록이 있으면 PR 계산', ...);              // Review Focus 5
test('prefill: 같은 루틴 지난 기록에서 워밍업 포함 복사', ...);
test('prefill: 고중량/저중량 루틴은 각자 기록에서', ...);
test('prefill: 디로드 기록은 원본에서 제외', ...);
test('prefill: date 이후 기록은 원본이 아님', ...);
test('prefill: 위쪽 채웠으면 +2.5kg, 횟수 min으로', ...);
test('prefill: 디로드면 본 세트 3→2, 무게 감소 0.1·증가단위 2.5 → 82.5가 75', ...);
test('prefill: 기록 없으면 빈 세트 하나', ...);
test('defaultRange: 8,8,7 → 7~9', ...);
test('status: 다음 루틴, 간주 휴식, 정체 3개면 신호', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과 (`npx vitest run tests/workout`)
- [ ] **Step 5: 커밋** — `feat(workout): 기록 계산, 지난번 채우기, 상태 계산`

---

### Task 6: 저장 모듈 (Dexie + repo)

**Files:**
- Create: `src/data/db.ts`, `src/data/repo.ts`
- Test: `tests/data/repo.test.ts`

**Interfaces:**
- Consumes: Task 1 타입
- Produces (`repo.ts`, 모두 async; `list*`는 deletedAt 없는 것만):
```ts
export type EntryDraft = Pick<Entry, 'date'|'routineId'|'isDeload'|'memo'|'exercises'>;
export const repo: {
  listExercises(opts?: { includeDeleted?: boolean }): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;           // 삭제된 것도 반환
  findExerciseByName(name: string): Promise<Exercise | undefined>;  // trim, 대소문자 무시, 비삭제
  saveExercise(e: Omit<Exercise, keyof BaseRecord> & { id?: string }): Promise<Exercise>;
  deleteExercise(id: string): Promise<void>;
  listRoutines(): Promise<Routine[]>;                                // order 오름차순
  saveRoutine(r: Omit<Routine, keyof BaseRecord> & { id?: string }): Promise<Routine>;
  deleteRoutine(id: string): Promise<void>;
  reorderRoutines(ids: string[]): Promise<void>;                     // order = 인덱스
  getEntry(date: ISODate): Promise<Entry | undefined>;
  listEntries(): Promise<Entry[]>;
  saveEntry(d: EntryDraft): Promise<Entry>;                          // 비어 있으면 soft delete
  getSettings(): Promise<Settings>;                                  // 없으면 DEFAULT_SETTINGS
  saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings>;
};
export const live: { exercises(): Exercise[] | undefined; routines(): Routine[] | undefined; entries(): Entry[] | undefined; settings(): Settings | undefined }; // useLiveQuery 래핑 훅
```
- Dexie DB 이름 `workout-log`, version 1: `exercises: 'id, name'`, `routines: 'id, order'`, `entries: 'id, &date, routineId'`, `settings: 'id'`. 레코드에 schemaVersion은 `meta` 테이블(`'key'`)에 `{key:'schemaVersion', value:1}`.
- `saveEntry`: "비어 있음" = routineId null && memo 공백 && exercises 0개. 비면 기존 레코드 `deletedAt` 설정. 아니면 같은 date 레코드(삭제된 것 포함)가 있으면 그 id로 갱신하고 `deletedAt` 제거, 없으면 새로 만든다.

- [ ] **Step 1: 실패하는 테스트** (fake-indexeddb, 각 테스트 전 `db.delete(); db.open()`)
```ts
test('운동 저장 후 이름으로 찾기(공백·대소문자 무시)', ...);
test('삭제한 운동은 목록에서 빠지지만 getExercise로는 찾음', ...);   // Review Focus 5
test('saveEntry 두 번 → 같은 id, updatedAt 증가', ...);
test('비운 일지는 soft delete, 같은 날짜에 다시 쓰면 같은 레코드 되살림', ...);  // Review Focus 2
test('reorderRoutines가 order를 바꾼다', ...);
test('settings 기본값', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(data): Dexie 저장 모듈`

---

### Task 7: 백업 (내보내기·가져오기)

**Files:**
- Create: `src/data/backup.ts`, `src/platform/files.ts`
- Test: `tests/data/backup.test.ts`

**Interfaces:**
- Consumes: `repo`, `db` (Task 6)
- Produces:
```ts
export interface BackupFile { schemaVersion: number; exportedAt: number; exercises: Exercise[]; routines: Routine[]; entries: Entry[]; settings: Settings }
export async function buildBackup(): Promise<BackupFile>;                 // 삭제 표시된 것도 포함
export function parseBackup(text: string): BackupFile;                    // 형식 오류·schemaVersion > 1 이면 Error('백업 파일을 읽을 수 없습니다')
export interface ImportPlan { newDates: ISODate[]; conflictDates: ISODate[]; exerciseIdMap: Record<string, string>; routineIdMap: Record<string, string>; incoming: BackupFile }
export async function planImport(file: BackupFile): Promise<ImportPlan>;
export async function applyImport(plan: ImportPlan, onConflict: 'keep' | 'replace'): Promise<void>;  // 한 트랜잭션
// platform/files.ts
export async function shareOrDownload(filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'>;
export function readFile(file: File): Promise<string>;
```
규칙 (스펙 6.9):
- 운동 매칭: 같은 id → 그대로, 아니면 이름(trim·소문자) 같은 기존 운동 → 그 id로 매핑, 없으면 새로 추가.
- 루틴 매칭: workout은 이름, rest는 **휴식 항목들 사이의 순번**(order순으로 n번째 휴식)으로 매칭.
- 같은 id끼리는 `updatedAt` 큰 쪽을 남긴다.
- 일지: 들어오는 entry의 exerciseId·routineId를 매핑으로 바꾼 뒤, 기존에 그 날짜(비삭제)가 없으면 새로 추가, 있고 내용이 다르면(id 다르거나 updatedAt 다름) 충돌. `keep`이면 건너뛰고 `replace`면 기존 레코드 id를 유지한 채 내용을 덮는다.
- 백업 파일명 `workout-log-YYYY-MM-DD.json`. 내보내기가 `shared`나 `downloaded`면 `lastBackupAt` 갱신(화면에서 호출).

- [ ] **Step 1: 실패하는 테스트**
```ts
test('buildBackup → parseBackup 왕복', ...);
test('schemaVersion 2 파일은 거부', ...);
test('다른 id 같은 이름 운동은 합치고 기록의 exerciseId를 바꾼다', ...);
test('휴식 두 개는 순번으로 매칭되어 두 개 유지', ...);               // Review Focus 4
test('겹치는 날짜 keep: 기존 유지 / replace: 백업 내용, 기존 id 유지', ...);
test('새 날짜만 있으면 conflictDates 비어 있음', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(data): JSON 백업 내보내기·가져오기`

---

### Task 8: 화면 셸, 달력, 안내 줄

**Files:**
- Create: `src/ui/TabBar.tsx`, `src/ui/calendar/CalendarScreen.tsx`, `src/ui/calendar/Banners.tsx`, `src/ui/styles.css`
- Modify: `src/ui/App.tsx`
- Test: `tests/ui/calendar.test.tsx`

**Interfaces:**
- Consumes: `live.*` (Task 6), `computeStatus` (Task 5), `todayISO` (Task 1)
- Produces: `App`의 탭 상태 `'calendar'|'records'|'routines'|'search'|'settings'`; `CalendarScreen({ onOpenDate(date: ISODate): void })`; App이 `openDate: ISODate | null` 상태로 `EntryModal`(Task 9)을 연다. 다른 화면(검색 등)도 `onOpenDate`를 받는다.

규칙 (스펙 5.1):
- 월 이동(이전/다음), 오늘 강조. 날짜 칸에 entry의 루틴 이름(없으면 첫 운동 이름), 디로드는 표시 구분, 간주 휴식 날은 흐린 "휴식".
- 안내 줄: 다음 차례(오늘 entry가 있으면 `until = addDays(today,1)`로 계산해 "내일: …"), 디로드 due/stallSignal 문구, 백업 알림(`lastBackupAt` null이고 entry가 하나 이상이거나 경과일 ≥ `backupReminderDays`).
- 모바일 우선 레이아웃, 아래 고정 탭바, iOS safe-area 여백.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('기록 있는 날짜에 루틴 이름이 보인다', ...);
test('다음 차례 안내가 보인다: "다음: 하체·어깨 고중량"', ...);
test('간주 휴식 날짜에 "휴식"이 흐리게 보인다', ...);
test('백업 14일 경과 시 백업 알림', ...);
test('날짜를 누르면 onOpenDate 호출', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 달력과 안내 줄`

---

### Task 9: 일지 모달 (입력, 자동 저장, 채우기)

**Files:**
- Create: `src/ui/entry/EntryModal.tsx`, `src/ui/entry/ExerciseBlock.tsx`, `src/ui/entry/SetRow.tsx`, `src/ui/entry/useEntryDraft.ts`
- Test: `tests/ui/entry.test.tsx`

**Interfaces:**
- Consumes: `repo`, `live` (Task 6), `buildPrefill`, `newPRs`, `paceSecPerKm`, `computeStatus`, `defaultRangeFromSets` (Task 5), `parseNum` (Task 1), `ExercisePicker` (Task 10 — 이 태스크에서는 이름 입력 후 Enter로 추가하는 임시 입력을 두고 Task 10에서 교체)
- Produces: `EntryModal({ date: ISODate; onClose(): void })`; `useEntryDraft(date)` → `{ draft: EntryDraft; dirty: boolean; update(fn: (d: EntryDraft) => EntryDraft): void; confirmAsIs(): void; hints; trophies: Record<string, PRKey[]> }`

규칙 (스펙 5.2, 6.2~6.7):
- 열 때: 저장된 entry가 있으면 그것, 없으면 `computeStatus(..., until=date)`의 다음 루틴을 선택하고 `buildPrefill`로 채운 **미저장 상태**(dirty=false). 디로드 체크 기본값 = `status.deload.active`; `due || stallSignal`이면 체크 옆 "디로드 차례".
- 루틴을 바꾸면 그 루틴으로 다시 채운다(이미 사용자가 고친 값이 있으면 확인 후). 휴식 루틴을 고르면 운동 칸 없이 저장.
- 사용자가 값을 하나라도 바꾸면 dirty=true가 되고, 이후 변경마다 300ms 디바운스로 `repo.saveEntry`. 모달 닫힐 때·`visibilitychange(hidden)`일 때 대기 중인 저장을 즉시 실행.
- [그대로 완료]: dirty=false일 때만 보이고 누르면 현재 draft 저장.
- 세트 행: weight는 kg·회, bodyweight는 회 + 추가 kg(접힘), cardio는 시간(분)·거리·평균/최고 심박·케이던스 + 계산된 페이스 `m'ss"/km`. 숫자 입력은 `inputMode="decimal"`, 값은 `parseNum`.
- 버튼: weight `+{incrementKg}kg`, `+1회`; bodyweight `+1회`. 세트 추가(마지막 세트 복사), 세트 삭제, 워밍업 토글(W 표시).
- 운동 블록: 고정 메모 📌, 지난번 기록 요약(`80kg × 8,8,8 (11/11)`), `ready`면 "⬆ 무게 올릴 차례", `bodyweightReady`면 "추가 무게 고려", 저중량 루틴이고 설정 켜짐이면 `bestE1rmBefore` 대비 비율 "추정 1RM의 68%". 위/아래 이동 버튼(그날만 순서 변경), 운동 삭제.
- ⭐ 루틴 등록: 새 루틴 이름 입력(기본: 선택된 루틴 이름이 없으면 비움) 또는 선택된 루틴 덮어쓰기(확인 창). items = 현재 운동 순서, 범위는 기존 루틴 item에 있으면 유지, 없으면 `defaultRangeFromSets`. 강도 선택(고/저/없음).
- 저장 후 `newPRs` 결과가 있으면 그 운동 제목에 🏆.
- 메모 textarea.

- [ ] **Step 1: 실패하는 테스트** (fake-indexeddb + 시드 데이터)
```ts
test('새 날짜를 열면 다음 루틴이 선택되고 지난 값이 채워지지만 저장되지 않는다', ...);
test('값을 고치면 자동 저장된다 (getEntry로 확인)', ...);
test('그대로 완료를 누르면 채운 값이 저장된다', ...);
test('"62,5" 입력은 62.5로, 빈칸은 undefined로 저장', ...);         // Review Focus 3
test('+2.5kg 버튼은 그 운동의 증가 단위만큼', ...);
test('워밍업 표시 세트는 W로 보인다', ...);
test('유산소 32분 5.2km → 6\'09"/km 표시', ...);
test('루틴 등록: 현재 순서로 새 루틴 생성, 범위 7~9', ...);
test('이전 최고 무게를 넘겨 저장하면 🏆', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 일지 모달, 자동 저장, 지난번 채우기`

---

### Task 10: 운동 자동완성과 운동 정보

**Files:**
- Create: `src/ui/exercise/ExercisePicker.tsx`, `src/ui/exercise/ExerciseForm.tsx`
- Modify: `src/ui/entry/EntryModal.tsx` (임시 입력 교체)
- Test: `tests/ui/exercise.test.tsx`

**Interfaces:**
- Consumes: `repo`, `live` (Task 6)
- Produces: `ExercisePicker({ onPick(ex: Exercise): void })`, `ExerciseForm({ initial?: Exercise; initialName?: string; onSaved(ex: Exercise): void; onCancel(): void })`

규칙 (스펙 6.1, 6.8):
- 입력한 글자를 포함하는 비삭제 운동 이름을 최근 사용일(entries에서 마지막 날짜) 내림차순으로 최대 8개.
- 목록에 정확히 같은 이름이 없으면 "새 운동: {이름}" 항목 → `ExerciseForm`(종류, 증가 단위 기본 2.5, 주·보조 부위 `MUSCLES` 다중 선택, 고정 메모).
- 일지의 운동 블록 제목을 누르면 `ExerciseForm`으로 수정(고정 메모 포함). 폼 아래 [운동 삭제](확인 후 `deleteExercise`, 지난 기록은 그대로 남음).

- [ ] **Step 1: 실패하는 테스트**
```ts
test('"벤치" 입력 시 벤치프레스가 뜨고 고르면 onPick', ...);
test('최근 사용 순으로 정렬', ...);
test('없는 이름 → 새 운동 폼 → 저장하면 onPick', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 운동 자동완성과 운동 정보 편집`

---

### Task 11: 루틴 관리 화면

**Files:**
- Create: `src/ui/routines/RoutinesScreen.tsx`, `src/ui/routines/RoutineEditor.tsx`
- Test: `tests/ui/routines.test.tsx`

**Interfaces:**
- Consumes: `repo`, `live` (Task 6), `ExercisePicker` (Task 10)
- Produces: `RoutinesScreen()`

규칙 (스펙 5.3):
- 루틴 목록 `@dnd-kit/sortable`로 끌어서 순서 변경(터치 지원 센서, 손잡이 ≡) → `reorderRoutines`. 접근성 대안으로 위/아래 버튼도 둔다.
- [+ 휴식] 버튼은 목록 끝에 휴식 항목 추가(이름 "휴식"). 루틴 삭제는 확인 후 soft delete.
- 편집기: 이름, 강도(고/저/없음), 운동 목록 끌어서 순서 변경, 운동마다 목표 범위 min~max 숫자 입력(min ≤ max 검증, 틀리면 저장 안 함 + 문구), 운동 추가(`ExercisePicker`)·삭제.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('위/아래 버튼으로 루틴 순서가 바뀐다', ...);   // 드래그는 테스트 대신 버튼 경로로 같은 reorder 검증
test('휴식 추가', ...);
test('목표 범위 수정이 저장된다', ...);
test('min > max면 저장되지 않고 안내가 보인다', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 루틴 관리`

---

### Task 12: 최고 기록 화면과 그래프

**Files:**
- Create: `src/ui/records/RecordsScreen.tsx`, `src/ui/records/ExerciseDetail.tsx`
- Test: `tests/ui/records.test.tsx`

**Interfaces:**
- Consumes: `computePRs`, `e1rm`, `paceSecPerKm` (Task 5), `live` (Task 6)
- Produces: `RecordsScreen({ onOpenDate })`

규칙 (스펙 5.4):
- 운동 카드(기록이 있는 운동만, 삭제된 운동 포함): 종류별 PR 값과 날짜, 마지막 수행일. 마지막 수행일 내림차순.
- 상세: 날짜별 기록 목록(루틴 이름, 강도 배지, 디로드 표시, 세트 요약; 누르면 `onOpenDate`), recharts 선 그래프 — weight: 날짜별 최고 e1RM(디로드·워밍업 제외), bodyweight: 최고 횟수, cardio: 거리/페이스/평균 심박/케이던스 선택.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('무게 운동 카드에 최고 무게(횟수)와 최고 e1RM', ...);
test('유산소 카드에 최고 페이스', ...);
test('상세 목록에서 디로드 기록에 표시가 붙고 그래프 데이터에서는 빠진다', ...); // 그래프 데이터 함수를 분리해 단위 테스트
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 최고 기록과 그래프`

---

### Task 13: 검색 화면

**Files:**
- Create: `src/ui/search/SearchScreen.tsx`, `src/workout/search.ts`
- Test: `tests/workout/search.test.ts`

**Interfaces:**
- Produces: `searchEntries(q: string, entries: Entry[], exercises: Map<string, Exercise>): { date: ISODate; snippet: string }[]` (날짜 내림차순), `SearchScreen({ onOpenDate })`

규칙 (스펙 5.5): 공백 제거 후 소문자 부분 일치. 운동 이름(삭제된 운동 포함) 또는 메모. snippet은 매칭된 운동 이름이나 메모 앞뒤 20자. 빈 검색어는 결과 없음.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('운동 이름으로 찾기', ...); test('메모로 찾기', ...); test('삭제된 일지는 제외', ...); test('빈 검색어는 []', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 검색`

---

### Task 14: 설정, 백업 화면, 설치 안내

**Files:**
- Create: `src/ui/settings/SettingsScreen.tsx`, `src/ui/settings/ImportDialog.tsx`, `src/ui/InstallGuide.tsx`, `src/platform/install.ts`
- Modify: `src/ui/App.tsx` (InstallGuide, persist 요청)
- Test: `tests/ui/settings.test.tsx`

**Interfaces:**
- Consumes: `repo` (Task 6), `buildBackup`/`parseBackup`/`planImport`/`applyImport`, `shareOrDownload`/`readFile` (Task 7)
- Produces: `isStandalone(): boolean`, `requestPersist(): Promise<boolean>`

규칙 (스펙 5.6, 5.7):
- 설정 항목: 백업 알림 주기, 목표 횟수 기본값(비우기 가능), 디로드 주기·세트 비율·무게 감소, 저중량 비율 표시. 변경 즉시 `saveSettings`.
- [백업 내보내기] → `shareOrDownload` 결과가 cancelled가 아니면 `lastBackupAt = Date.now()`. 마지막 백업 시각 표시.
- [가져오기] → 파일 선택 → `parseBackup` 실패 시 문구 → `planImport` → `ImportDialog`에 "새로 추가 N일, 겹치는 날짜 M일" + 겹침이 있으면 기존 유지/백업으로 바꾸기 선택 → `applyImport`.
- `InstallGuide`: `!isStandalone()`이고 iOS면 "공유 → 홈 화면에 추가" 안내(닫기 가능, 닫음 여부는 localStorage에 try/catch로). 앱 시작 시 `requestPersist()`.

- [ ] **Step 1: 실패하는 테스트**
```ts
test('디로드 주기 변경이 저장된다', ...);
test('내보내기 성공 시 lastBackupAt 갱신, 취소면 그대로', ...);  // shareOrDownload 모킹
test('가져오기: 겹치는 날짜가 있으면 선택지가 보인다', ...);
test('standalone이면 설치 안내가 안 보인다', ...);
```
- [ ] **Step 2~4**: 실패 확인 → 구현 → 통과
- [ ] **Step 5: 커밋** — `feat(ui): 설정, 백업, 설치 안내`

---

### Task 15: PWA 설정과 GitHub Pages 배포

**Files:**
- Modify: `vite.config.ts` (VitePWA), `index.html` (apple-touch-icon, `apple-mobile-web-app-capable`, viewport-fit=cover)
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon-180.png` (단색 배경 + 덤벨 모양 단순 아이콘, 스크립트로 생성 가능), `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: 전체 앱

규칙:
- VitePWA: `registerType: 'autoUpdate'`, manifest `name: '운동일지'`, `short_name: '운동일지'`, `display: 'standalone'`, `start_url`/`scope: '/workout-log/'`, 아이콘 3종. workbox 기본 precache.
- 워크플로: main 푸시 시 `npm ci && npm test && npm run build` → `actions/upload-pages-artifact`(dist) → `actions/deploy-pages`. Node 22.
- README: 개발 명령, 배포 방법, 아이폰 설치 방법, 백업 권장.

- [ ] **Step 1: 빌드 검증** — `npm run build` 성공, `dist/manifest.webmanifest`에 `"display":"standalone"`과 `"/workout-log/"`가 들어 있고 `dist/sw.js`가 있다.
- [ ] **Step 2: 로컬 확인** — `npx vite preview` 후 `http://localhost:4173/workout-log/`에서 앱이 열리고 새로고침 후 오프라인(개발자도구 offline)에서도 열린다.
- [ ] **Step 3: 커밋** — `feat: PWA 설정과 GitHub Pages 배포 워크플로`
- [ ] **Step 4: (사용자 작업)** 개인 계정 crebits로 GitHub에 `workout-log` 저장소를 만들고 remote 추가·push, 저장소 Settings → Pages → Source를 "GitHub Actions"로. 이 세션의 `gh`는 로그인되어 있지 않으므로 사용자가 `! gh auth login`으로 개인 계정 로그인하거나 직접 진행한다.
- [ ] **Step 5: 아이폰 확인 (사용자)** — `https://crebits.github.io/workout-log/`를 Safari로 열어 홈 화면에 추가, 비행기 모드에서 실행되는지 확인.
