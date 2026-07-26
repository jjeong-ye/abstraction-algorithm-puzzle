# 설계 (design)

## 아키텍처
```
index.html ─ app.js(컨트롤러)
                ├─ data.js       (24문제 데이터 + 엔진 설정)
                ├─ engines.js    (ENGINES 레지스트리: 17개 구현 / 8개 학습 유형)
                ├─ ui.js         (el/clear, 소리, 토스트, 모달, SVG 도형, 해설 렌더)
                ├─ storage.js    (localStorage 기록)
                └─ verification/ (solver + tests) ← test.html에서 실행
```
- **데이터 주도**: 문제는 하드코딩하지 않고 `PROBLEMS` 배열로 관리. 엔진은 `problem.config`만 읽어 동작.
- **엔진 인터페이스**: `engine(host, problem, api) → { undo?, restart? }`. `api = { status(t), moved(), solved(res) }`.
- 성공 시 엔진이 `api.solved({score, moves, time, detail})` 호출 → 셸이 점수 계산·기록·결과 모달.

## 8개 공통 엔진(학습 유형) → 구현 매핑
1. 조건 카드 분류/후보 제거 → `deduce`
2. 후보 제거/패턴·유추 → `analogy`, `sequence`, `base`, `hub`
3. 상태 이동 → `waterjug`, `river`, `bridge`, `maxpath`, `doors`
4. 균형과 저울 → `mobile`, `balance`
5. 그래프와 경로 → `graph`(analyze/trail)
6. 반복과 전략 → `iterate`, `nim`, `orderSteps`
7. 절차/알고리즘 실행 → `hanoi`, `orderSteps`
8. 해설 표시 엔진 → `ui.renderFullExplanation`

## UI/디자인
- 2000년대 교육용 플래시 감성: 밝은 색, 둥근 큰 버튼, 큰 한글, 짧은 성공 애니메이션(🎉), 단순 배경.
- 일반 인터페이스는 HTML 요소, 복잡한 그림/이동은 **SVG**(모빌·그래프·도형)와 그리드.
- 반응형(모바일/태블릿), 포커스 링, `aria-*`, `aria-live` 상태 알림.

## 접근성
- 키보드(Enter/스페이스), 클릭 후 이동(드래그 불필요), 색+글자/모양 병행, 움직임 줄이기(`reduce-motion`), 소리 음소거.

## 점수 모델
- 엔진이 `detail`(추상화/알고리즘정확성/효율성/설명 중 해당 축) 제공 → 평균을 종합 점수로.
- 효율성은 최소 이동/시간 대비 초과분에 따라 감점. 설명 점수는 서술 작성/규칙 선택으로 반영.
