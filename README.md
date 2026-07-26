# 퍼즐 탐험대 · 추상화와 알고리즘

2022 개정 중학교 정보 교과의 **추상화·알고리즘** 학습용 웹 퍼즐 게임입니다.
학습 자료 출처: 최재혁, 「퍼즐을 이용한 창의성 교육」(신라대학교, 2013) — 프로젝트 폴더의 PDF를 분석해 24개 스테이지로 재구성했습니다.

## 실행 방법 (중요)
이 앱은 **ES 모듈**을 사용하므로 `index.html`을 그냥 더블클릭하면(파일 프로토콜) 브라우저 보안정책 때문에 동작하지 않습니다.
**로컬 서버로 열어야 합니다.**

- **가장 쉬운 방법 (VS Code / Kiro):** 확장 프로그램 **Live Server**를 설치하고 `index.html`에서 우클릭 → *Open with Live Server*.
- 또는 정적 서버를 띄운 뒤 `http://localhost:.../index.html` 접속.

## GitHub Pages 배포 (URL로 사용)
GitHub Pages는 HTTPS로 서빙하므로 **이 프로젝트를 그대로 올리면 바로 동작**합니다(로컬 서버 불필요, 코드가 전부 상대경로라 `user.github.io/저장소이름/` 하위에서도 정상).

1. 새 저장소 생성(예: `puzzle-explorer`).
2. **이 폴더 안의 파일들**(index.html, test.html, styles.css, src/, docs/ 등)을 저장소 **루트**에 올린다.
   - `.gitignore`가 **교재 PDF·Node 런타임·node_modules**를 자동 제외합니다. (PDF는 저작권 자료이므로 공개 게시 금지)
3. 저장소 **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/(root)`** 선택 → 저장.
4. 1~2분 후 `https://<사용자>.github.io/<저장소이름>/` 로 접속.
   - 자동 검증 페이지: `.../test.html`
- 주의: 파일명 대소문자가 정확히 일치해야 합니다(이미 일치하도록 구성됨). 학생 진행 기록은 각자 브라우저 localStorage에 저장됩니다.

## 폴더 구조
```
추상화와 알고리즘/
├─ index.html            게임 본체
├─ test.html             자동 검증 테스트 실행 페이지
├─ styles.css
├─ teacher-guide.md      교사용 완전 가이드
├─ src/
│  ├─ data.js            24개 문제 데이터(원문·정답·해설·태그·엔진설정)
│  ├─ engines.js         17개 인터랙션 엔진(8개 학습 유형)
│  ├─ app.js             화면 전환·게임 셸·점수·기록
│  ├─ ui.js              공용 UI(소리·모달·SVG 도형·해설 렌더)
│  ├─ storage.js         localStorage 학습 기록
│  └─ verification/      정답 검증 solver + 테스트
├─ docs/                 요구사항·설계·검증 등 문서 10종
└─ _tools/               PDF 분석에 사용한 스크립트(참고용)
```

## 게임 구성
- **월드 1 추상화(8)**, **월드 2 알고리즘(9)**, **월드 3 추상화＋알고리즘(7)** = 24 스테이지
- 각 스테이지: 문제 분석 → 조작/실행 → 5단계 힌트 → 단계별·완전 해설 → 설명 쓰기(평가)
- 기능: 학생 이름, 월드/스테이지 선택, 힌트, 실행취소, 다시시작, 교사 모드, 소리·움직임 줄이기, 전체화면, localStorage 기록

## 자동 검증
- **브라우저**: `test.html`을 로컬 서버로 열면 solver 정답 검증 + 24개 스테이지의 '제출 전 미노출/제출 게이트/과정 기록' 규칙 검사 결과가 표로 나옵니다.
- **헤드리스(설치형, 선택)**: 무설치 Node를 `_tools/nodedist/`에, linkedom을 `_tools/harness/`에 설치해 두었습니다.
  ```
  _tools\nodedist\node-v20.18.1-win-x64\node.exe  _tools\harness\harness.mjs
  ```
  실행하면 `_tools/harness/result.txt` 에 결과가 저장됩니다. **최신 실행: 총 206개 전부 통과.**
  (Node/harness 폴더는 테스트 전용이라 삭제해도 게임 실행에는 영향 없습니다.)

## 기술 참고
권장 스택은 Vite/React/TypeScript였으나, 본 개발 환경에 Node.js가 없어 **빌드가 필요 없는 바닐라 ES 모듈 + HTML/CSS**로 구현했습니다(동일한 모듈형 엔진 구조 유지). TypeScript 대신 명확한 데이터 스키마와 주석으로 대체했습니다.
