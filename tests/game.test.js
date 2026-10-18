import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET, nextRotation } from '../dist/game.js';
test('dials land precisely on the letter at the top marker', () => {
  for (const current of [0, 37, 180, 359.99, 2877]) for (const letter of ALPHABET) {
    const rotation = nextRotation(current, letter);
    assert.ok(rotation >= current + 4 * 360 - .000001);
    const marker = (rotation + ALPHABET.indexOf(letter) * 360 / 26) % 360;
    assert.ok(marker < .000001 || marker > 359.999999);
  }
});
