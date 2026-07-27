// ============================================================
// 🔴 라이브 현황판 연동 설정 (선택 기능)
// ------------------------------------------------------------
// 교실 프로젝터에 "OO님이 월드2 5번 문을 열었습니다!" 를 실시간으로
// 띄우고 싶을 때만 사용합니다. 안 쓰면 enabled: false 로 두세요.
//
// 켜는 방법:
//  1) live/apps-script.js 내용을 구글 시트의 Apps Script에 붙여넣고 웹앱으로 배포
//  2) 배포 후 나오는 /exec 로 끝나는 URL을 아래 apiUrl 에 붙여넣기
//  3) enabled 를 true 로 변경
//  4) classCode 는 반마다 다르게 (예: "2-1") — 현황판에서 반을 구분/필터하는 값
// ============================================================
export const LIVE = {
  enabled: true,
  apiUrl: "https://script.google.com/macros/s/AKfycby5YfKc5wfScRZdI45GOQ_fBpZGGaoK1MWD4Ud-NrxCaAUlqUYmSxqMpA-5FgTqlKoc2g/exec",
  classCode: "2-1",  // 우리 반 코드 (반마다 다르게)

  // (선택) 동료 교사에게 나눠줄 '기록용 구글시트 사본 만들기' 링크.
  // 만드는 법: 내 구글시트 공유를 '링크가 있는 모든 사용자: 뷰어'로 → 주소창 URL 끝의
  //   .../edit... 부분을 /copy 로 바꿔서 여기에 붙여넣기 (예: https://docs.google.com/spreadsheets/d/시트ID/copy)
  // ⚠️ 원본(작업용) 시트 말고, 학생 기록이 없는 '템플릿용 사본'의 /copy 링크를 넣으세요.
  //    (원본을 공개하면 학생 기록까지 남에게 보이므로)
  templateCopyUrl: "",
};
