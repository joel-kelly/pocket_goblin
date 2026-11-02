// Everything the goblin says. {kid} = player's name, {gob} = goblin's name.
// Add more! The sillier the better.
export const LINES = {
  greet: [
    "{kid}! You're back! I only licked SOME of your stuff.",
    "Oh hi {kid}! I was just practicing my burps. Wanna hear? *BRAAAP*",
    "Welcome back! I named a booger after you. It's beautiful.",
    "{kid}!!! I missed you more than I miss my left sock.",
    "Hey hey hey! Ready to do some math and buy me stuff?",
  ],
  greetHungry: [
    "{kid}... I'm so hungry I ate a sock. It was not delicious. Feed me?",
    "My tummy is making whale noises. Food please?",
    "I'm STARVING. I almost ate the doormat. Again.",
  ],
  idle: [
    "*picks nose thoughtfully*",
    "Do you think worms have best friends?",
    "I can smell my own feet from here. Impressive, right?",
    "If I sneeze really hard, do my ears flap?",
    "*scratches butt* ...what? Everybody does it.",
    "I'm thinking about cheese. I'm always thinking about cheese.",
    "Hmm hmm hmm *hums the song of my people*",
    "Fun fact: goblins have 3 stomachs. All of them are hungry.",
    "I bet I could beat you in a burping contest.",
    "Math makes my brain go brrrrrr.",
    "I once had a pet rock. It ran away.",
    "Is it snack time? It feels like snack time.",
  ],
  hungry: ["Feed me, human!", "My tummy is eating itself!", "I could eat a whole trash can.", "Snaaaacks pleeeease..."],
  thirsty: ["Water... any water... even toilet water...", "My tongue is a raisin.", "I'm so thirsty I'm turning into goblin jerky."],
  stinky: ["Even I think I smell bad. That's REALLY bad.", "Flies are following me. Flies have standards!", "A bath? NO. ...maybe. ...ugh FINE."],
  bored: ["I'm bored. Let's do some math! Or poke me!", "Entertain me, human!", "So... bored... gonna count my toes again."],
  happy: ["Life is GOOD.", "I feel like a million moldy bucks!", "Best. Day. EVER."],

  poke: ["Hee hee! That tickles!", "HEY! Personal space!", "Boop!", "Ow. ...do it again.", "You found my ticklish spot! It's all of them!", "Stop poking me! (don't stop)"],
  pokeFart: ["Oops. You poked the fart out.", "That's what happens when you poke a goblin!", "...I blame the cheese."],

  eat: ["NOM NOM NOM.", "*chomps loudly with mouth open*", "Mmmmm! Crunchy!", "Delicious! 10 out of 10 goblins agree!", "Ooh it's still wiggling!"],
  drink: ["*GLUG GLUG GLUG*", "Ahhhhh. Refreshing!", "Slurrrrrp!", "Tastes like puddle. PERFECT."],
  full: ["I'm stuffed! Maybe one more bite... no. No. ...okay one more.", "My belly is FULL. Let me digest. Loudly."],
  afterFart: ["Excuse me!", "That one was for you, {kid}.", "Whoa. That came from DEEP inside.", "I'd stay away from back here for a while.", "*waves hand* ...nobody smelled that.", "It's a goblin's way of saying thank you."],
  afterBurp: ["Pardon me!", "BRAAAAP! Ahhh. Better.", "That one rattled my ears.", "I can taste it again. Yum!"],

  bath: ["NOOOO! NOT THE SOAP!", "It burns! It's so... clean!", "Why do you hate me?!", "I'll get you for this, {kid}!"],
  afterBath: ["Ugh. I smell like FLOWERS.", "I feel so... squeaky.", "Great. Now I have to roll in mud again."],

  newOutfit: ["Do I look fabulous? I look FABULOUS.", "Check me out! *strikes a pose*", "Oooh, fancy! I'm the fanciest goblin in the swamp!", "I love it! Can I sleep in it? I'm gonna sleep in it."],
  takeOff: ["Okay, but I'm keeping it under my bed.", "Naked goblin time!"],

  mathStart: ["Let's GO! Math power, activate!", "You got this, {kid}! I believe in you! (I can't count.)", "Numbers, prepare to be CRUSHED!"],
  correct: ["YES!", "Nailed it!", "Big brain!", "Woo!", "Smart!", "Boom!", "Correct-o!", "Zoom!", "Ka-ching!"],
  combo5: ["5 in a row! You're on FIRE!", "Combo! My ears are tingling!"],
  combo10: ["10 IN A ROW?! Are you a calculator?!", "UNSTOPPABLE! I'm gonna faint from excitement!"],
  combo15: ["15! Legendary! The other goblins won't believe me!", "Your brain is so big it has its own weather!"],
  combo20: ["TWENTY?! I need to sit down. I'm so proud.", "You're a MATH WIZARD. I'm crying slime tears!"],
  wrong: ["NOOOOOO!", "Ack! So close!", "My ears! MY EARS!", "Oof. That one bit me.", "*faints dramatically*", "Nooo! The numbers tricked us!", "Wahhh! It's okay, we'll get the next one!"],
  timeUp: ["TIME! How'd we do?!", "Phew! My brain is sweaty!"],
  newBest: ["NEW RECORD! I'm telling EVERYONE!", "A NEW HIGH SCORE! *happy fart*"],

  buy: ["Ooooh! For ME?!", "Shiny! I love it!", "You're the best human EVER!", "Gimme gimme gimme!"],
  broke: ["Not enough coins! Do more math!", "We're broke! To the math mines!"],

  vacationLeave: ["Bye! I'll send a postcard!", "Off I go! Don't touch my sock pile!", "Vacation time! Try not to miss me too much!"],
  vacationBack: ["I'M BAAACK! Did you miss me?!", "Home sweet smelly home!", "I brought you a postcard! And a weird rash!"],
};

export function pick(list, vars = {}) {
  const s = list[Math.floor(Math.random() * list.length)];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// ---------------- Vacations & postcards ----------------
export const DESTINATIONS = [
  {
    id: 'sock', name: 'Sock Island', cost: 20, minutes: 5,
    desc: 'A beach made of lost socks. Smells like gym class.',
    sky: ['#7fd4ff', '#d6f3ff'], ground: '#f2d7a0', accent: '#ff6fa0',
    lines: [
      "Found 300 socks. None of them match. It's perfect.",
      "I built a sock castle. A seagull pooped on it. Still a 10/10.",
      "The locals here are all socks. They're very quiet.",
    ],
  },
  {
    id: 'sewer', name: 'Sewer Cruise', cost: 30, minutes: 10,
    desc: 'A luxury boat ride through the finest sewers.',
    sky: ['#3d5a3d', '#6b8f5a'], ground: '#5a7a2a', accent: '#c9a227',
    lines: [
      "The buffet here is AMAZING. Mostly brown though.",
      "Made friends with a rat named Steve. He's the captain now.",
      "Went swimming. Don't ask in what.",
    ],
  },
  {
    id: 'volcano', name: 'Volcano Hot Tub', cost: 40, minutes: 10,
    desc: 'Relax in bubbling lava. Bring a fireproof towel.',
    sky: ['#ff7b3d', '#ffd36b'], ground: '#5a2a1a', accent: '#ff3b1f',
    lines: [
      "The hot tub is VERY hot. My butt is now crispy.",
      "I roasted marshmallows. And my eyebrows. Mostly my eyebrows.",
      "A dragon asked for my autograph. I signed it with a burp.",
    ],
  },
  {
    id: 'cheese', name: 'Cheese Caves', cost: 50, minutes: 15,
    desc: 'Caves made entirely of old, stinky cheese. Paradise.',
    sky: ['#f5c542', '#ffe9a0'], ground: '#e0a72a', accent: '#6bbf3a',
    lines: [
      "I ate a wall. Then another wall. I may have eaten the exit.",
      "The cheese here is SO moldy. I'm crying happy tears.",
      "Took a nap in a cheese hole. Woke up as part of the cheese.",
    ],
  },
  {
    id: 'moon', name: 'The Moon Dump', cost: 80, minutes: 20,
    desc: 'The best trash in the solar system. Low gravity burps!',
    sky: ['#0b0b2a', '#2a2a5a'], ground: '#b8b8c8', accent: '#ffe14d',
    lines: [
      "Burps in space go SO far. I hit a satellite.",
      "Found an old astronaut sandwich. Ate it. Tasted like stars.",
      "Low gravity means my farts launch me. I'm basically a rocket now.",
    ],
  },
];

const POSTCARD_OPENERS = ['Dear {kid},', 'Hey {kid}!!!', 'To my favorite human, {kid}:', 'Yo {kid},', 'Greetings, {kid}!'];
const POSTCARD_MIDDLES = [
  'The weather is gross. I love it.',
  'I have not taken a bath once. Not even ONE time.',
  'Wish you were here! (to carry my snacks)',
  'I bought you a souvenir but I ate it.',
  'I practiced my times tables. 7 x 8 = burp.',
  "Everyone here says I'm the best-dressed goblin. They're right.",
];
const POSTCARD_CLOSERS = ['Love, {gob}', 'Stinky hugs, {gob}', 'Your pal, {gob}', 'xoxo (with extra goo), {gob}', 'See you soon! -{gob}'];

export function writePostcard(dest, vars) {
  const r = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return {
    opener: fill(r(POSTCARD_OPENERS)),
    body: `${r(dest.lines)} ${r(POSTCARD_MIDDLES)}`,
    closer: fill(r(POSTCARD_CLOSERS)),
  };
}
