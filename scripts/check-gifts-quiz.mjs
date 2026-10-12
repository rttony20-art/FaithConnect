// Checks the quiz is fair. Run from the repo root:  node scripts/check-gifts-quiz.mjs
import assert from "node:assert";
import { QUESTIONS, GIFT_KEYS, GIFTS, buildQuiz, scoreAnswers } from "../src/giftsQuiz.js";

assert.equal(QUESTIONS.length, 15);
const seen = Object.fromEntries(GIFT_KEYS.map(k => [k, 0]));
const pairs = new Set();
for (const q of QUESTIONS) {
  assert.equal(q.a.length, 4);
  const gifts = q.a.map(x => x[0]);
  assert.equal(new Set(gifts).size, 4, "a question repeats a gift");
  gifts.forEach(g => { assert(GIFTS[g], "unknown gift " + g); seen[g]++; });
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const p = [gifts[i], gifts[j]].sort().join("+");
    assert(!pairs.has(p), "pair repeated: " + p); pairs.add(p);
  }
}
for (const k of GIFT_KEYS) assert.equal(seen[k], 4, `${k} appears ${seen[k]} times, expected 4`);

// Pattern test: always tapping the same position must not favour any gift.
for (const position of [0, 1, 2, 3]) {
  const wins = Object.fromEntries(GIFT_KEYS.map(k => [k, 0]));
  const runs = 6000;
  for (let r = 0; r < runs; r++) {
    const quiz = buildQuiz();
    const answers = Object.fromEntries(quiz.questions.map((_, i) => [i, position]));
    wins[scoreAnswers(quiz, answers, 1)[0].key]++;
  }
  const rates = Object.values(wins).map(w => w / runs);
  console.log(`always option ${position + 1}: top gift share min ${(Math.min(...rates) * 100).toFixed(1)}%  max ${(Math.max(...rates) * 100).toFixed(1)}%  (even would be 6.7%)`);
  assert(Math.max(...rates) < 0.12 && Math.min(...rates) > 0.03, "pattern answers favour some gifts");
}
// Honest answers: choosing a gift every time it appears gives it the full 4 points.
for (const k of GIFT_KEYS) {
  const quiz = buildQuiz();
  const answers = {};
  quiz.questions.forEach((q, i) => { const idx = q.a.findIndex(x => x[0] === k); if (idx >= 0) answers[i] = idx; else answers[i] = 0; });
  assert.equal(scoreAnswers(quiz, answers, 15).find(g => g.key === k).points, 4);
}
console.log("OK - quiz is balanced");
