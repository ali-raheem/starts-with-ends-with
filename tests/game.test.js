import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET, PAIRS, choosePair, nextRotation } from '../dist/game.js';
test('every friendly pair has a real example matching its letters', () => {
  assert.ok(PAIRS.length > 150);
  assert.equal(new Set(PAIRS.map(p => p.start + p.end)).size, PAIRS.length);
  for (const pair of PAIRS) {
    assert.match(pair.word, /^[a-z]{2,}$/);
    assert.equal(pair.word[0].toUpperCase(), pair.start);
    assert.equal(pair.word.at(-1).toUpperCase(), pair.end);
  }
});
test('friendly selection excludes previous pair at both random boundaries', () => {
  for (const previous of PAIRS) for (const rng of [() => 0, () => .99999999]) {
    const next = choosePair('friendly', previous, rng);
    assert.notEqual(next.start + next.end, previous.start + previous.end);
    assert.ok(next.word);
  }
});
test('all-letters mode covers every alternative pair exactly once', () => {
  const previous = { start:'M', end:'N' }, results = new Set();
  for (let i = 0; i < 675; i++) {
    const pair = choosePair('wild', previous, () => (i + .5) / 675);
    results.add(pair.start + pair.end);
    assert.notEqual(pair.start + pair.end, 'MN');
  }
  assert.equal(results.size, 675);
});
test('dials land precisely on the letter at the top marker', () => {
  for (const current of [0, 37, 180, 359.99, 2877]) for (const letter of ALPHABET) {
    const rotation = nextRotation(current, letter);
    assert.ok(rotation >= current + 4 * 360 - .000001);
    const marker = (rotation + ALPHABET.indexOf(letter) * 360 / 26) % 360;
    assert.ok(marker < .000001 || marker > 359.999999);
  }
});
