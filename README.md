# 운동일지

아이폰 홈 화면에 설치해 쓰는 달력형 운동일지 PWA. 기록은 기기(IndexedDB)에만 저장됩니다.

- 루틴 순환(휴식 포함)과 다음 차례 알림
- 지난번 같은 루틴 기록으로 미리 채우기, 목표 횟수 기반 "무게 올릴 차례"
- 디로드(바퀴 주기 · 정체 신호 · 직접 켜기), 최고 기록·추정 1RM·그래프, 검색, JSON 백업

설계: `docs/superpowers/specs/2026-11-15-workout-log-design.md`

## 개발

```bash
npm install
npm run dev      # http://localhost:5173/workout-log/
npm test
npm run build && npm run preview   # http://localhost:4173/workout-log/
```

## 배포 (GitHub Pages)

1. GitHub에 `workout-log` 저장소를 만들고 push
2. 저장소 Settings → Pages → Source: **GitHub Actions**
3. `main`에 push하면 테스트·빌드 후 `https://<계정>.github.io/workout-log/`로 배포

## 아이폰 설치

Safari로 배포 주소를 열고 공유 버튼 → **홈 화면에 추가**. 홈 화면에서 실행해야 기록이 안정적으로 보관됩니다.

## 백업

기록은 이 기기에만 있습니다. 설정 → **백업 내보내기**로 파일 앱이나 iCloud Drive에 정기적으로 저장하세요.
폰을 바꾸면 새 폰에서 **백업 가져오기**로 옮깁니다.
