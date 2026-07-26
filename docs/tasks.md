# 작업 순서 (tasks)

- [x] 1. 프로젝트 폴더·PDF 탐색 (`퍼즐을 이용한 창의성 교육.pdf` 발견)
- [x] 2. PDF 분석: PowerShell로 스트림 해제 → Type0/ToUnicode CMap 파싱 → 82쪽 한글 텍스트 추출(`_tools/`)
- [x] 3. 24개 문제 콘텐츠 목록 작성 (content-inventory)
- [x] 4. 정답 있는 문제 독립 검증 (solver + 손 풀이)
- [x] 5. 정답 없는(그림) 문제 직접 해결·재구성 (A-04~06, B-09, C-04)
- [x] 6. 학생용 해설 작성 (5단계 힌트 + 완전 해설 12항목)
- [x] 7. 교사용 해설 작성 (게임 내 교사 모드 + teacher-guide.md)
- [x] 8. 공통 게임 엔진 설계 (ENGINES 레지스트리, 8유형)
- [x] 9. 문제 데이터 작성 (`src/data.js`, 24개 전 필드)
- [x] 10. 24개 스테이지 구현 (17개 엔진)
- [x] 11. 자동 검증 코드 작성 (`src/verification/*` + `tests.js`)
- [x] 12. 테스트 실행 페이지 (`test.html`)
- [x] 13. 접근성 적용 (키보드·색+모양·움직임 줄이기·음소거·전체화면)
- [x] 14. 문서화 (docs 10종 + README + teacher-guide)
- [x] 15. 전체 자동 테스트 실행: **헤드리스(Node+linkedom)로 206개 테스트 전부 통과 확인** (2차 요구사항의 제출/노출 규칙 + solver 정답)

## 실행/검증 방법
- 게임·수동 점검: 로컬 서버(Live Server 등)로 `index.html`, `test.html` 열기.
- 헤드리스 자동 테스트(설치형): `_tools/harness/` 에서 `node harness.mjs` → `result.txt` 에 결과.
  - 최신 실행 결과: **총 206개 · 통과 206 · 실패 0**.
- 남은 수동 확인: 실제 화면의 SVG 그림 표시, 모바일 레이아웃, 키보드 조작(MANUAL-TEST-CHECKLIST.md).
