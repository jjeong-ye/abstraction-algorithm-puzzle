// ============================================================
// UNLOCK · 라이브 현황판용 Apps Script
// ------------------------------------------------------------
// 사용법:
//  1) 구글 드라이브에서 새 스프레드시트 생성
//  2) 상단 메뉴 [확장 프로그램] → [Apps Script]
//  3) 기존 코드 모두 지우고 이 파일 내용 전체 붙여넣기 → 저장
//  4) 오른쪽 위 [배포] → [새 배포] → 유형: '웹 앱'
//     - 실행 계정: 나
//     - 액세스 권한: '모든 사용자'  (학생들이 접속해야 하므로)
//  5) 배포 후 나오는 '웹 앱 URL'(.../exec)을
//     - 학생 앱: src/live-config.js 의 apiUrl 에 붙여넣기
//     - 교사 현황판: live/board.html 상단 API_URL 에 붙여넣기
// ============================================================

const LOG_SHEET = 'log';       // 기록이 쌓일 시트 이름 (자동 생성)
const GUIDE_SHEET = '📖 사용안내'; // 설정 안내 탭 (사본에 함께 딸려감)
const MAX_FEED = 40;           // 현황판에 내려줄 최근 이벤트 개수

// 안내 탭이 없으면 만든다 (doGet에서 가볍게 호출)
function ensureGuide_() {
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GUIDE_SHEET)) createGuideSheet();
}

// '사용안내' 탭을 예쁘게 다시 그린다. Apps Script 편집기에서 이 함수를 ▶ 실행하면
// 시트 맨 앞에 서식이 잡힌 안내 탭이 생겨서, 사본을 떠 간 선생님도 바로 볼 수 있다.
function createGuideSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const old = ss.getSheetByName(GUIDE_SHEET);
  if (old) ss.deleteSheet(old);              // 항상 최신 서식으로 다시 그림
  const sh = ss.insertSheet(GUIDE_SHEET, 0); // 맨 앞 탭
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 28);   // 왼쪽 여백
  sh.setColumnWidth(2, 860);  // 본문
  sh.setColumnWidth(3, 28);   // 오른쪽 여백

  let r = 1;
  const cell = () => sh.getRange(r, 2);
  const heightFor = (t) => 22 * ((String(t).match(/\n/g) || []).length + 1) + 12;

  // 제목 배너
  cell().setValue('📘  UNLOCK 라이브 현황판 사용 방법')
    .setFontSize(20).setFontWeight('bold').setFontColor('#ffffff')
    .setBackground('#6741d9').setVerticalAlignment('middle');
  sh.setRowHeight(r, 56); r += 2;

  const section = (title, color) => {
    cell().setValue(title).setFontSize(13).setFontWeight('bold')
      .setFontColor('#ffffff').setBackground(color).setVerticalAlignment('middle');
    sh.setRowHeight(r, 34); r++;
  };
  const body = (text) => {
    cell().setValue(text).setFontSize(11).setWrap(true).setVerticalAlignment('middle');
    sh.setRowHeight(r, heightFor(text)); r++;
  };
  const gap = () => { sh.setRowHeight(r, 12); r++; };

  body('이 스프레드시트는 UNLOCK(방탈출 퍼즐) 게임의 “라이브 현황판” 기록용입니다.\n학생이 문제를 풀 때마다 아래 log 탭에 기록이 자동으로 쌓입니다.');
  gap();

  section('① 처음 설정 (딱 한 번만)', '#4dabf7');
  body('1. 상단 메뉴  [확장 프로그램] → [Apps Script]  를 엽니다.\n    (코드는 이 사본에 이미 들어 있어요)');
  body('2. 오른쪽 위  [배포] → [새 배포] → 유형 “웹 앱”\n    · 실행 계정: 나       · 액세스 권한: 모든 사용자');
  body('3. 배포 후 나오는 웹 앱 주소( .../exec )를 복사합니다.');
  body('4. 게임 파일  src/live-config.js  에서\n    apiUrl 에 그 주소를 붙여넣고,  enabled: true  로 바꿉니다.');
  gap();

  section('② 수업에서 쓰는 법', '#51cf66');
  body('· 학생 :  자기 “반”과 닉네임(실명 대신 번호·모둠명)을 넣고 문제를 풉니다.');
  body('· 교사 :  게임에서  🎓 교사 → 코드 입력 → 이 수업 반 입력 → 📺 현황판  을 프로젝터에 띄웁니다.');
  body('· 같은 학교 동료 선생님은  "설정 없이"  이 게임 링크만 열고 자기 반만 고르면 됩니다.\n    (반코드는 학교 안에서 유일하므로 서로 안 섞여요)');
  body('· 현황판은 “오늘 기록만” 보여줘서, 날짜가 바뀌면 자동으로 새로 시작됩니다.');
  gap();

  section('③ 기록·개인정보', '#ff922b');
  body('· 쌓이는 정보는 “닉네임 + 몇 번 문을 열었나” 뿐입니다. (성적·실명 아님)');
  body('· 기록을 완전히 비우려면 아래  “log”  탭의 내용을 지우세요. (안 지워도 됩니다)');
  body('· 이 “사용안내” 탭은 지워도 게임 동작에는 영향이 없어요.');
  gap();

  section('④ 다른 “학교”에서 쓸 때 (학교당 딱 한 번)', '#e64980');
  body('· 학교가 다르면 이 시트를 “사본”으로 하나 만들어(파일 → 사본 만들기),\n    그 사본에서 위 “① 처음 설정”을 한 번만 하면 됩니다. (코드·안내가 함께 복사돼요)');
  body('· 그 뒤 그 학교 동료들은 다시 “링크만” 열면 되고, 학교끼리 기록이 섞이지 않아요.');

  sh.setFrozenRows(1);
  SpreadsheetApp.flush();
}

function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) sh = ss.insertSheet(LOG_SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(['시간', '반코드', '이름', '월드', '방', '문제제목']);
  return sh;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'feed';
  const sh = getLogSheet_();
  try { ensureGuide_(); } catch (e) {}  // 안내 탭이 없으면 만들어 둠

  // ── 학생 앱이 '문 열림'을 보낼 때 ──
  if (action === 'open') {
    const r = sh.getLastRow() + 1;
    // 반코드~제목(B~F)을 '텍스트'로 고정 → "2-1" 이 날짜로 자동 변환되는 것 방지
    sh.getRange(r, 2, 1, 5).setNumberFormat('@');
    sh.getRange(r, 1, 1, 6).setValues([[new Date(), p.code || '', p.name || '', p.world || '', p.room || '', p.title || '']]);
    return json_({ ok: true });
  }

  // ── 교사 현황판이 최근 현황을 읽을 때 ──
  const code = String(p.code || '').trim();
  const last = sh.getLastRow();
  if (last < 2) return json_({ events: [], rank: [] });

  const rows = sh.getRange(2, 1, last - 1, 6).getValues();
  let all = rows.map((r, i) => ({
    seq: i + 2,
    time: r[0] instanceof Date ? r[0].getTime() : 0,
    code: String(r[1] || ''),
    name: String(r[2] || ''),
    world: String(r[3] || ''),
    room: String(r[4] || ''),
    title: String(r[5] || ''),
  }));
  // 진짜 기록만: 시간(날짜)이 있는 줄만 사용 → 제목 줄/빈 줄이 섞여도 걸러짐
  all = all.filter(ev => ev.time > 0);
  if (code) all = all.filter(ev => ev.code === code);

  // 기간 필터: since(밀리초) 이후 기록만 → 현황판이 '오늘 것만' 보여줄 수 있음
  const since = Number(p.since || 0);
  if (since > 0) all = all.filter(ev => ev.time >= since);

  // 순위: 사람별로 '연 서로 다른 방' 개수
  const opened = {};   // name -> Set("world|room")
  all.forEach(ev => {
    if (!ev.name) return;
    (opened[ev.name] = opened[ev.name] || new Set()).add(ev.world + '|' + ev.room);
  });
  const rank = Object.keys(opened)
    .map(name => ({ name: name, count: opened[name].size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return json_({ events: all.slice(-MAX_FEED), rank: rank });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
