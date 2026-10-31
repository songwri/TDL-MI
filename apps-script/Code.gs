/**
 * TDL Trend 시트 연결 스크립트 (Google Apps Script)
 *
 * 구글 클라우드·서비스 계정·결제 정보 없이, 이 스프레드시트에 붙여 쓰는 무료 연결 통로입니다.
 * 웹 앱이 이 스크립트의 주소로 요청을 보내면, 스크립트가 이 시트를 읽고 씁니다.
 *
 * 설치: 스프레드시트 메뉴 확장 프로그램 > Apps Script > 이 코드를 전부 붙여 넣기
 *       > 아래 TOKEN 을 길고 아무도 모를 문자열로 바꾸기 > 배포 > 새 배포 > 웹 앱
 *       (실행 사용자: 나 / 액세스 권한: 모든 사용자)
 * 자세한 순서: docs/DEPLOY.md
 */

// 반드시 바꾸세요. 영문·숫자 30자 이상 아무거나. 웹 앱 환경변수 SHEETS_WEBAPP_TOKEN 과 같은 값이어야 합니다.
var TOKEN = '여기에-길고-랜덤한-문자열을-넣으세요';

var VERSION = 1;

function doGet() {
  // 브라우저로 웹 앱 주소를 열었을 때 연결 확인용 (시트 내용은 보여 주지 않음)
  return out_({ ok: true, data: { service: 'TDL Trend sheet bridge', version: VERSION } });
}

function doPost(e) {
  try {
    if (!TOKEN || TOKEN.indexOf('여기에') === 0) return out_({ ok: false, error: 'Code.gs 맨 위의 TOKEN 을 바꾼 뒤 다시 배포해 주세요.' });
    var req = JSON.parse(e.postData.contents);
    if (req.token !== TOKEN) return out_({ ok: false, error: 'unauthorized' });
    return out_({ ok: true, data: run_(req) });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function run_(req) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  switch (req.op) {
    case 'ping':
      return { version: VERSION, spreadsheet: ss.getName(), sheets: titles_(ss) };
    case 'sheets':
      return titles_(ss);
    case 'get':
      return get_(ss, req.range);
    case 'addSheets':
      return locked_(function () { return addSheets_(ss, req.titles); });
    case 'append':
      return locked_(function () { return append_(ss, req.range, req.values); });
    case 'update':
      return locked_(function () { return update_(ss, req.range, req.values); });
    case 'batchUpdate':
      return locked_(function () {
        for (var i = 0; i < req.data.length; i++) update_(ss, req.data[i].range, req.data[i].values);
        return true;
      });
    default:
      throw new Error('알 수 없는 요청: ' + req.op);
  }
}

// 동시에 두 요청이 같은 줄에 쓰지 않도록 한 번에 하나씩 실행
function locked_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function titles_(ss) {
  return ss.getSheets().map(function (s) { return s.getName(); });
}

function addSheets_(ss, titles) {
  var created = [];
  for (var i = 0; i < titles.length; i++) {
    if (!ss.getSheetByName(titles[i])) {
      var sheet = ss.insertSheet(titles[i]);
      sheet.setFrozenRows(1);
      created.push(titles[i]);
    }
  }
  return created;
}

// "A", "Z", "AA" -> 1, 26, 27
function colIndex_(letters) {
  var n = 0;
  for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n;
}

// "Raw_Articles!A2:Z", "Handoffs!A:A", "Raw_Articles!I5", "Raw_Articles!A1"
function parse_(a1) {
  var m = /^(.+)!([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/.exec(a1);
  if (!m) throw new Error('범위를 읽을 수 없습니다: ' + a1);
  return { sheet: m[1], c1: colIndex_(m[2]), r1: m[3] ? Number(m[3]) : 1, c2: m[4] ? colIndex_(m[4]) : null, r2: m[5] ? Number(m[5]) : null };
}

function sheet_(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) throw new Error('시트 탭이 없습니다: ' + name);
  return s;
}

function plain_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString();
  return v;
}

function get_(ss, a1) {
  var p = parse_(a1);
  var sheet = sheet_(ss, p.sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < p.r1 || lastCol < p.c1) return [];
  var r2 = p.r2 ? Math.min(p.r2, lastRow) : lastRow;
  var c2 = p.c2 ? Math.min(p.c2, lastCol) : lastCol;
  if (r2 < p.r1 || c2 < p.c1) return [];
  var rows = sheet.getRange(p.r1, p.c1, r2 - p.r1 + 1, c2 - p.c1 + 1).getValues().map(function (row) { return row.map(plain_); });
  // 아래쪽 빈 줄은 잘라냄 (구글 시트 API 와 같은 동작)
  while (rows.length && rows[rows.length - 1].every(function (c) { return c === ''; })) rows.pop();
  return rows;
}

// 값은 항상 글자(텍스트)로 저장: '=' 로 시작하는 기사 제목이 수식으로 실행되지 않도록 서식을 '일반 텍스트'로 지정
function write_(sheet, startRow, startCol, values) {
  if (!values.length) return;
  var width = 0;
  for (var i = 0; i < values.length; i++) width = Math.max(width, values[i].length);
  var rows = values.map(function (row) {
    var out = [];
    for (var c = 0; c < width; c++) out.push(c < row.length && row[c] !== null && row[c] !== undefined ? String(row[c]) : '');
    return out;
  });
  var needRows = startRow + rows.length - 1;
  var needCols = startCol + width - 1;
  if (sheet.getMaxRows() < needRows) sheet.insertRowsAfter(sheet.getMaxRows(), needRows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < needCols) sheet.insertColumnsAfter(sheet.getMaxColumns(), needCols - sheet.getMaxColumns());
  var range = sheet.getRange(startRow, startCol, rows.length, width);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function append_(ss, a1, values) {
  var p = parse_(a1);
  var sheet = sheet_(ss, p.sheet);
  write_(sheet, sheet.getLastRow() + 1, p.c1, values);
  return true;
}

function update_(ss, a1, values) {
  var p = parse_(a1);
  write_(sheet_(ss, p.sheet), p.r1, p.c1, values);
  return true;
}
