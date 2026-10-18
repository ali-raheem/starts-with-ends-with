export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function randomIndex(length, rng = Math.random) { return Math.min(length - 1, Math.floor(rng() * length)); }
export function nextRotation(current, letter, turns = 4) {
  const target = (360 - ALPHABET.indexOf(letter) * 360 / 26) % 360;
  return current + turns * 360 + (target - current % 360 + 360) % 360;
}

export const CATEGORIES = [
  { name: 'Animals', words: 'ant bear bat bee bird butterfly camel cat crab deer dog dolphin duck eagle elephant fish fox frog goat horse lion monkey mouse owl panda penguin pig rabbit seal shark sheep snake spider tiger turtle whale wolf zebra' },
  { name: 'Food', words: 'apple apricot avocado banana bean bread broccoli butter cake carrot cheese cherry chocolate coconut cookie corn cucumber egg grape honey jam lemon lettuce melon milk mushroom noodle olive onion orange pasta peach pear pepper pie pizza plum potato rice salt sandwich soup strawberry sugar toast tomato yoghurt' },
  { name: 'Nature', words: 'acorn air ash autumn beach bloom branch breeze cliff cloud coral creek dawn desert dew earth fern field fire flame flower fog forest frost grass hill ice island ivy jungle lake leaf lightning meadow moon moss mountain mud ocean pebble pine pond rain rainbow river rock root sand sea seed sky snow soil spring star stone storm stream summer sun sunset thunder tree valley volcano water wave wind winter wood' },
  { name: 'Home', words: 'bed bell blanket book bowl box broom brush candle carpet chair clock comb couch cup curtain cushion desk dish door drawer fork fridge glass hammer kettle key knife lamp mirror mop mug napkin oven pan pillow plate pot quilt rug shelf sink soap sofa spoon table tap towel vase wall window' },
  { name: 'Clothing', words: 'apron belt beret bikini blazer blouse boot button cap cardigan coat collar dress glove gown hat hood jacket jeans jumper kilt mitten necklace pocket poncho pyjamas raincoat ring robe sandal scarf shirt shoe shorts skirt sleeve slipper sock suit sweater swimsuit tie trouser uniform vest waistcoat watch zip' },
  { name: 'Travel', words: 'aeroplane airport arrival backpack bicycle bike boat bridge bus cabin canoe caravan car coach compass cruise departure ferry flight harbour helicopter highway hotel journey kayak luggage map motorway passport path pilot plane platform port railway road route runway scooter seat ship station suitcase taxi ticket tour traffic train tram trip truck tunnel van vehicle voyage yacht' },
  { name: 'Music', words: 'accordion album anthem bagpipe ballad banjo bass beat bell cello choir chord clarinet concert cymbal drum duet fiddle flute gong guitar harp harmony horn hymn instrument jazz keyboard lyric mandolin melody microphone note oboe opera organ piano pitch recorder rhythm saxophone singer solo song sound stage string symphony tambourine tempo trombone trumpet tune tuba ukulele viola violin voice xylophone' },
  { name: 'Sports', words: 'archery athlete badminton ball baseball basketball bat bowling boxing canoeing champion coach court cricket cycling darts diving fencing field football goal golf gymnastics hockey hoop hurdle javelin judo karate net paddle pitch player polo pool puck race racket referee relay rowing rugby runner running sailing score skiing skating snowboard soccer squash stadium surfing swimming team tennis track training trophy volleyball wrestling yoga' }
].map(category => ({ name: category.name, words: category.words.split(' ') }));

export function chooseRound(mode, previous, rng = Math.random, locks = {}) {
  const groups = CATEGORIES.filter(category => !locks.category || category.name === previous?.category).map(category => {
    let pairs;
    if (mode === 'wild') {
      pairs = [...ALPHABET].flatMap(start => [...ALPHABET].map(end => ({ start, end })));
    } else {
      pairs = [...new Map(category.words.map(word => [word[0] + word.at(-1), {
        start: word[0].toUpperCase(), end: word.at(-1).toUpperCase(), word
      }])).values()];
    }
    pairs = pairs.filter(pair => (!locks.start || pair.start === previous?.start) && (!locks.end || pair.end === previous?.end));
    return { category, pairs };
  }).filter(group => group.pairs.length);
  if (!groups.length) return null;
  // Avoid repeating the complete challenge whenever another legal round exists.
  const alternatives = groups.map(group => ({ ...group, pairs: group.pairs.filter(pair =>
    pair.start !== previous?.start || pair.end !== previous?.end || group.category.name !== previous?.category
  ) })).filter(group => group.pairs.length);
  const available = alternatives.length ? alternatives : groups;
  const group = available[randomIndex(available.length, rng)];
  const pair = group.pairs[randomIndex(group.pairs.length, rng)];
  const word = pair.word ?? group.category.words.find(word => word[0].toUpperCase() === pair.start && word.at(-1).toUpperCase() === pair.end) ?? null;
  return { ...pair, word, category: group.category.name };
}

export function nextCategoryRotation(current, category, turns = 4) {
  const target = (360 - CATEGORIES.findIndex(item => item.name === category) * 360 / CATEGORIES.length) % 360;
  return current + turns * 360 + (target - current % 360 + 360) % 360;
}
