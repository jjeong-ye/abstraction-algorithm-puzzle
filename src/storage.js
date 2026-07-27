// localStorage 기반 학습 기록 (서버 없음)
const KEY = "puzzle-escape-v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export const Store = {
  data: load(),
  _flush() { save(this.data); },

  getPlayer() { return this.data.player || ""; },
  setPlayer(name) { this.data.player = name; this._flush(); },

  getSettings() {
    return Object.assign({ sound: true, motion: false, teacher: false }, this.data.settings || {});
  },
  setSetting(k, v) {
    this.data.settings = Object.assign(this.getSettings(), { [k]: v });
    this._flush();
  },

  // 스테이지 기록
  getRecord(id) {
    this.data.records = this.data.records || {};
    return this.data.records[id] || {
      cleared: false, bestScore: 0, attempts: 0, hintsUsed: 0,
      minMoves: null, minTime: null, reflection: "", lastPlayed: null,
    };
  },
  updateRecord(id, patch) {
    this.data.records = this.data.records || {};
    const rec = this.getRecord(id);
    Object.assign(rec, patch, { lastPlayed: new Date().toISOString() });
    this.data.records[id] = rec;
    this._flush();
    return rec;
  },
  // 제출 기록 저장 (정답 여부와 무관하게 제출 사실·마지막 제출 보존)
  recordSubmission(id, { isCorrect, score, moves, time, hintsUsed, answerText, lastSubmission }) {
    const rec = this.getRecord(id);
    const patch = {
      submitted: true,
      explanationUnlocked: true,
      attempts: (rec.attempts || 0) + 1,
      hintsUsed: (rec.hintsUsed || 0),
      lastSubmission: lastSubmission || { isCorrect, answerText },
    };
    if (isCorrect) {
      patch.cleared = true;
      patch.bestScore = Math.max(rec.bestScore || 0, score || 0);
      if (moves != null) patch.minMoves = rec.minMoves == null ? moves : Math.min(rec.minMoves, moves);
      if (time != null) patch.minTime = rec.minTime == null ? time : Math.min(rec.minTime, time);
    }
    return this.updateRecord(id, patch);
  },
  addAttempt(id) {
    const rec = this.getRecord(id);
    return this.updateRecord(id, { attempts: (rec.attempts || 0) + 1 });
  },
  addHint(id) {
    const rec = this.getRecord(id);
    return this.updateRecord(id, { hintsUsed: (rec.hintsUsed || 0) + 1 });
  },
  reset() { this.data = {}; this._flush(); },
};
