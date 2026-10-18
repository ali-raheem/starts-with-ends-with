import { ALPHABET, CATEGORIES, chooseRound, nextRotation, nextCategoryRotation } from './game.js?v=7';
const $ = id => document.getElementById(id);
let round = 0, spinning = false, active = false, currentPair = { start: 'S', end: 'T', word: 'sunset', category: 'Nature' };
let clockFrame, deadline = 0, audioContext, deferredInstall, answerTimer;
const locks = { category: false, start: false, end: false };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let settings = { mode: 'friendly', timer: false, sound: false };
try {
  const saved = JSON.parse(localStorage.getItem('swew-settings'));
  if (saved && typeof saved === 'object') settings = { mode: saved.mode === 'wild' ? 'wild' : 'friendly', timer: saved.timer === true, sound: saved.sound === true };
} catch { /* The game also works when storage is unavailable. */ }
const saveSettings = () => { try { localStorage.setItem('swew-settings', JSON.stringify(settings)); } catch {} };
const svgNS = 'http://www.w3.org/2000/svg';
function svgElement(name, attributes, text) {
  const element = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text) element.textContent = text;
  return element;
}
function makeWheel(id, labels = [...ALPHABET]) {
  const svg = $(id);
  svg.append(svgElement('circle', { cx:180, cy:180, r:179, class:'outer' }));
  svg.append(svgElement('circle', { cx:180, cy:180, r:169, class:'inner-ring' }));
  svg.append(svgElement('circle', { cx:180, cy:180, r:125, class:'inner-ring' }));
  labels.forEach((letter, i) => {
    const group = svgElement('g', { transform:`rotate(${i * 360 / labels.length} 180 180)` });
    group.append(svgElement('line', { x1:180, y1:15, x2:180, y2:23, class:'tick' }));
    group.append(svgElement('text', { x:180, y:39, 'text-anchor':'middle', 'dominant-baseline':'middle', class:'letter' }, letter));
    group.append(svgElement('line', { x1:180, y1:49, x2:180, y2:55, class:'tick' }));
    svg.append(group);
  });
}
makeWheel('start-wheel'); makeWheel('end-wheel'); makeWheel('category-wheel', CATEGORIES.map(category => category.name));
let categoryRotation = nextCategoryRotation(0, 'Nature', 0);
$('category-wheel').style.transform = `rotate(${categoryRotation}deg)`;
let startRotation = nextRotation(0, 'S', 0), endRotation = nextRotation(0, 'T', 0);
$('start-wheel').style.transform = `rotate(${startRotation}deg)`;
$('end-wheel').style.transform = `rotate(${endRotation}deg)`;
function unlockAudio() {
  if (!settings.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ??= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch {}
}
function tone(frequency = 440, duration = .07, volume = .04) {
  if (!settings.sound || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}
function showSettings() {
  $('mode').value = settings.mode;
  $('timer-toggle').setAttribute('aria-pressed', String(settings.timer));
  $('sound-button').setAttribute('aria-pressed', String(settings.sound));
  $('sound-button').setAttribute('aria-label', `Turn sound ${settings.sound ? 'off' : 'on'}`);
  $('sound-button').querySelector('span').textContent = `Sound ${settings.sound ? 'on' : 'off'}`;
  $('sound-button').querySelector('path').setAttribute('d', settings.sound ? 'M11 5 6 9H3v6h3l5 4zM15 8q6 4 0 8M18 5q9 7 0 14' : 'M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6');
  $('mode-description').textContent = settings.mode === 'friendly' ? 'Every round has a word in its category. Tap a dial to lock it.' : 'Any letters + a category. Tap a dial to lock it.';
}
showSettings();
function stopClock() { cancelAnimationFrame(clockFrame); clockFrame = null; }
function updateClock() {
  if (!active || !settings.timer) return;
  const remaining = Math.max(0, deadline - Date.now());
  $('timer-fill').style.transform = `scaleX(${remaining / 30000})`;
  $('timer-count').textContent = Math.ceil(remaining / 1000) + 's';
  if (remaining === 0) {
    active = false;
    $('got-word').hidden = true;
    tone(220, .4);
    if (settings.mode === 'friendly' && currentPair.word) showAnswer();
    else $('prompt').textContent = 'Time’s up! Reveal a word or give it another spin.';
  } else clockFrame = requestAnimationFrame(updateClock);
}
function startClock() {
  stopClock();
  $('timer-bar').hidden = !settings.timer;
  if (settings.timer && active) { deadline = Date.now() + 30000; updateClock(); }
}
async function turnWheel(id, from, to, duration) {
  const wheel = $(id);
  const animation = wheel.animate([{ transform:`rotate(${from}deg)` }, { transform:`rotate(${to}deg)` }], { duration, easing:'cubic-bezier(.12,.72,.15,1)', fill:'forwards' });
  await animation.finished;
  wheel.style.transform = `rotate(${to % 360}deg)`;
  animation.cancel();
}
function updateLocks() {
  for (const key of Object.keys(locks)) {
    $(key + '-dial').setAttribute('aria-pressed', String(locks[key]));
    $(key + '-dial').classList.toggle('locked', locks[key]);
  }
  const allLocked = Object.values(locks).every(Boolean);
  $('spin-button').disabled = spinning || allLocked;
  $('spin-button').querySelector('span').textContent = spinning ? 'Spinning…' : allLocked ? 'Unlock a dial to spin' : round ? 'Spin again' : 'Spin the dials';
}
for (const key of Object.keys(locks)) {
  $(key + '-dial').addEventListener('click', () => {
    if (spinning) return;
    locks[key] = !locks[key];
    updateLocks();
  });
}
updateLocks();
async function spin() {
  if (spinning || Object.values(locks).every(Boolean) || document.querySelector('dialog[open]')) return;
  const nextPair = chooseRound(settings.mode, currentPair, Math.random, locks);
  if (!nextPair) {
    $('prompt').textContent = 'No word in our list fits these locks. Unlock a dial or try All letters.';
    return;
  }
  spinning = true; active = false; stopClock(); unlockAudio();
  currentPair = nextPair;
  updateLocks(); $('mode').disabled = true; $('timer-toggle').disabled = true;
  $('got-word').hidden = true; $('hint-button').hidden = true; $('keyboard-hint').hidden = false; $('timer-bar').hidden = true;
  $('prompt').textContent = 'Category first. Then the letters. Get ready…';
  document.querySelector('.game').classList.add('spinning');
  const turns = [
    { key:'category', from:categoryRotation, to:nextCategoryRotation(categoryRotation, currentPair.category, 3), label:'category-name', value:currentPair.category, duration:1400 },
    { key:'start', from:startRotation, to:nextRotation(startRotation, currentPair.start, 4), label:'start-letter', value:currentPair.start, duration:2400 },
    { key:'end', from:endRotation, to:nextRotation(endRotation, currentPair.end, 5), label:'end-letter', value:currentPair.end, duration:3400 }
  ];
  for (const turn of turns) {
    turn.settled = locks[turn.key];
    $(turn.key + '-dial').classList.toggle('is-spinning', !turn.settled);
  }
  let ticks = 0;
  const tick = setInterval(() => {
    for (const turn of turns) if (!turn.settled) {
      $(turn.label).textContent = turn.key === 'category' ? CATEGORIES[ticks % CATEGORIES.length].name : ALPHABET[(ticks * (turn.key === 'start' ? 3 : 7)) % 26];
    }
    tone(330 + ticks % 4 * 55, .035, .02); ticks++;
  }, 110);
  try {
    await Promise.all(turns.map(async (turn, index) => {
      if (turn.settled) return;
      await turnWheel(turn.key + '-wheel', turn.from, turn.to, reducedMotion.matches ? 60 * (index + 1) : turn.duration);
      turn.settled = true;
      $(turn.label).textContent = turn.value;
      $(turn.key + '-dial').classList.remove('is-spinning');
      tone(440 + index * 110, .12);
    }));
  } finally { clearInterval(tick); }
  if (!locks.start) startRotation = turns[1].to % 360;
  if (!locks.end) endRotation = turns[2].to % 360;
  if (!locks.category) categoryRotation = turns[0].to % 360;
  round++; spinning = false; active = true;
  $('round-label').textContent = `ROUND ${String(round).padStart(2, '0')}`;
  $('prompt').replaceChildren(Object.assign(document.createElement('strong'), {textContent:currentPair.category}), document.createTextNode('. Starts with '), Object.assign(document.createElement('strong'), {textContent:currentPair.start}), document.createTextNode('. Ends with '), Object.assign(document.createElement('strong'), {textContent:currentPair.end}), document.createTextNode('. Go!'));
  updateLocks(); $('mode').disabled = false; $('timer-toggle').disabled = false;
  $('got-word').hidden = false; $('hint-button').hidden = false; $('keyboard-hint').hidden = true;
  document.querySelector('.game').classList.remove('spinning');
  tone(660, .18); startClock();
}
$('spin-button').addEventListener('click', spin);
$('got-word').addEventListener('click', () => {
  if (!active) return;
  active = false; stopClock();
  $('prompt').textContent = 'Nicely done! First valid word takes the round.';
  $('got-word').hidden = true; tone(880, .2);
});
$('hint-button').addEventListener('click', () => {
  active = false; stopClock(); $('got-word').hidden = true;
  $('prompt').replaceChildren();
  if (currentPair.word) {
    $('prompt').append('One word is ', Object.assign(document.createElement('strong'), {textContent:currentPair.word}), ` (${currentPair.category.toLowerCase()}). Ready for another?`);
  } else $('prompt').textContent = 'No example in this category. This combination may be impossible — spin again!';
  $('hint-button').hidden = true;
});
function showAnswer() {
  $('hint-button').hidden = true;
  $('prompt').replaceChildren('Time’s up! One word is ', Object.assign(document.createElement('strong'), {textContent:currentPair.word}), '.');
  $('answer-word').textContent = currentPair.word;
  $('answer-detail').textContent = `${currentPair.category} · starts with ${currentPair.start}, ends with ${currentPair.end}`;
  let left = 4;
  const count = () => { $('answer-countdown').textContent = `Next spin in ${left}s`; };
  count();
  $('answer-dialog').returnValue = '';
  $('answer-dialog').showModal();
  answerTimer = setInterval(() => { if (--left > 0) count(); else $('answer-dialog').close('next'); }, 1000);
}
$('next-round').addEventListener('click', () => $('answer-dialog').close('next'));
$('stay-round').addEventListener('click', () => $('answer-dialog').close());
// Closing with Esc or "Stay on this round" pauses; the countdown or "Spin now" moves on.
$('answer-dialog').addEventListener('close', () => {
  clearInterval(answerTimer);
  if ($('answer-dialog').returnValue === 'next') spin();
});
$('mode').addEventListener('change', () => { settings.mode = $('mode').value; saveSettings(); showSettings(); });
$('timer-toggle').addEventListener('click', () => {
  settings.timer = !settings.timer; saveSettings(); showSettings();
  stopClock(); $('timer-bar').hidden = true;
  if (active) startClock();
});
$('sound-button').addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); showSettings(); unlockAudio(); tone(660, .12); });
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && !/^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(event.target.tagName) && !event.target.isContentEditable && !$('help-dialog').open) { event.preventDefault(); spin(); }
});
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('lets-play').addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && active && settings.timer) { stopClock(); updateClock(); } });
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    $('offline-help').textContent = 'Offline saving is unavailable in this browser session. Try a regular browser window over HTTPS (or localhost) and allow site storage.';
  });
} else {
  $('offline-help').textContent = 'This browser session cannot save an offline copy. Open the game over HTTPS (or localhost) in a browser with service worker support.';
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; $('install-button').hidden = false; });
$('install-button').addEventListener('click', async () => {
  if (!deferredInstall) return;
  await deferredInstall.prompt(); await deferredInstall.userChoice;
  deferredInstall = null; $('install-button').hidden = true;
});
window.addEventListener('appinstalled', () => { deferredInstall = null; $('install-button').hidden = true; });
// Every load starts a round, so a pull-to-refresh on a phone spins the dials.
spin();
