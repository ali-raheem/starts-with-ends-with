import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, chooseRound, nextCategoryRotation } from '../dist/game.js';
const previous = { category:'Nature', start:'S', end:'T', word:'sunset' };
test('friendly rounds honour every lock combination and always have an example in the category', () => {
  for (let mask = 0; mask < 8; mask++) {
    const locks = { category:!!(mask & 1), start:!!(mask & 2), end:!!(mask & 4) };
    for (let i = 0; i < 50; i++) {
      const round = chooseRound('friendly', previous, () => i / 50, locks);
      assert.ok(round);
      for (const key of Object.keys(locks)) if (locks[key]) assert.equal(round[key],previous[key]);
      assert.ok(CATEGORIES.find(category => category.name === round.category).words.includes(round.word));
      assert.equal(round.word[0].toUpperCase(), round.start);
      assert.equal(round.word.at(-1).toUpperCase(), round.end);
    }
  }
});
test('all-letter rounds honour locks and never reveal an example from another category', () => {
  for (let mask = 0; mask < 8; mask++) {
    const locks = { category:!!(mask & 1), start:!!(mask & 2), end:!!(mask & 4) };
    for (let i = 0; i < 20; i++) {
      const round = chooseRound('wild', previous, () => i / 20, locks);
      for (const key of Object.keys(locks)) if (locks[key]) assert.equal(round[key],previous[key]);
      if (round.word) {
        assert.ok(CATEGORIES.find(category => category.name === round.category).words.includes(round.word));
        assert.equal(round.word[0].toUpperCase(),round.start);
        assert.equal(round.word.at(-1).toUpperCase(),round.end);
      }
    }
  }
});
test('unsupported friendly locks return no round instead of changing locked letters', () => {
  assert.equal(chooseRound('friendly', { category:'Animals', start:'Q', end:'Q' }, Math.random, { start:true, end:true }), null);
});
test('category dial aligns its chosen label with the top marker', () => {
  for (const [index, category] of CATEGORIES.entries()) {
    const rotation = nextCategoryRotation(137,category.name);
    assert.equal((rotation + index * 360 / CATEGORIES.length) % 360,0);
    assert.ok(rotation >= 137 + 1440);
  }
});
test('unlocked rounds avoid repeating the exact challenge', () => {
  for (const category of CATEGORIES) {
    const word = category.words[0];
    const last = { category:category.name, start:word[0].toUpperCase(), end:word.at(-1).toUpperCase() };
    for (const mode of ['friendly','wild']) {
      const next = chooseRound(mode,last,()=>0);
      assert.notEqual(next.category + next.start + next.end,last.category + last.start + last.end);
    }
  }
});
