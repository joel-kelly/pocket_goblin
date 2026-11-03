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
  newDecor: ["Ooooh! It really ties the den together.", "Home sweet stinky home!", "So fancy! My den is the fanciest den in the swamp.", "I love it! I'm gonna lick it. Just a little."],
  removeDecor: ["Back in the closet you go!", "Bye bye! See you later!", "Okay, but I'll miss it."],
  denFull: ["My den is full! Put something away first.", "No more room! Not even for a sock."],
  decorPoke: ["I made that! ...Or you did. Either way, it's great.", "My favorite thing in the whole den!", "Don't touch it! ...Okay, you can touch it."],

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

// ---------------- Vacation "Current status" updates ----------------
export const VACATION_STATUS = {
  sock: [
    '🧦 Building a sandcastle out of 400 socks',
    '🦀 Arguing with a crab about who owns a sock',
    '🌊 Surfing on a giant gym sock',
    '😴 Napping in a hammock made of tube socks',
    '👃 Sniffing every sock to find "the one"',
    '🥥 Trying to open a coconut with its forehead',
    '🧦 Wearing 9 socks on one foot. For fashion.',
  ],
  sewer: [
    '🐀 Teaching Steve the rat how to burp',
    '🚢 Steering the boat with its feet',
    '🍽️ Back for a fourth plate at the sewer buffet',
    '🎤 Doing karaoke in an echoey pipe',
    '🦆 Racing rubber ducks. Losing.',
    '🧻 Waving at things floating by',
    '🛶 Taking a selfie with a very old sandwich',
  ],
  volcano: [
    '🌋 Doing a cannonball into the lava tub',
    '🍡 Roasting marshmallows (and eyebrows)',
    '🐉 Playing cards with a dragon. The dragon cheats.',
    '🔥 Getting a "hot stone massage". The stones are VERY hot.',
    '🧴 Putting on SPF 9000',
    '♨️ Steaming its armpits. Ahhhh.',
    '😎 Wearing lava-proof sunglasses (they are melting)',
  ],
  cheese: [
    '🧀 Eating a tunnel through a giant cheese',
    '🐭 Losing a cheese-eating contest to a mouse',
    '🕳️ Stuck in a cheese hole. Again.',
    '🤢 Found the stinkiest cheese. Licked it. Twice.',
    '🎿 Skiing down Mount Cheddar',
    '😴 Napping in a cozy blue-cheese cave',
    '📸 Taking pictures of mold. So beautiful.',
  ],
  moon: [
    '🚀 Doing low-gravity backflips',
    '🌕 Writing its name in moon dust with its butt',
    '🛸 Asking aliens if they have snacks',
    '💨 Using farts to fly around the craters',
    '🗑️ Digging through space trash for treasure',
    '🧑‍🚀 Wearing a fishbowl as a space helmet',
    '⭐ Trying to lick a star. Too hot.',
  ],
};
export const VACATION_STATUS_ANY = [
  '📮 Writing you a postcard (with its tongue out)',
  '💸 Spending all its money on gum',
  '🗺️ Totally lost, but having fun',
  '🧳 Repacking its suitcase. It is full of rocks.',
  '📷 Taking 200 photos of its own feet',
  '🤳 Telling strangers about you',
];

// ---------------- Fart Rocket ----------------
export const ROCKET_ZONES = [
  { alt: 0, name: 'The Swamp' },
  { alt: 60, name: 'Treetops' },
  { alt: 150, name: 'Cloud Town' },
  { alt: 300, name: 'Bird Highway' },
  { alt: 500, name: 'Airplane Lane' },
  { alt: 800, name: 'Edge of Space' },
  { alt: 1200, name: 'The Moon' },
  { alt: 1800, name: 'Planet Pickle' },
  { alt: 2500, name: 'Deep Space Dump' },
  { alt: 3500, name: 'The Butt Nebula' },
];
LINES.rocketStart = ["Let's get this butt in the sky!", 'Fart fuel loaded! I think I ate enough beans.', 'Houston, we have a smell.'];
LINES.rocketZone = ['WHEEEEE!', "I'm FLYING!", 'Look at me goooo!', 'This is the best fart of my LIFE!'];
LINES.rocketLow = ['Running low on fart fuel!', 'More math! My beans are running out!', 'Uh oh... sputter sputter...'];
LINES.rocketWrong = ['*sputter*', 'Pffft... that one was a dud!', 'Oops! Butt misfire!'];
LINES.rocketCrash = ['Out of gas! AAAAAH!', 'Mayday! MAYDAY!', 'Not the pants parachute!'];

// ---------------- Goblin Café ----------------
export const CUSTOMER_NAMES = [
  'Sir Stinksalot', 'Grubnose', 'Moldilocks', 'Burpina', 'Toenail Tim', 'Lady Gackbreath', 'Snorkel', 'Wartimus',
  'Princess Puddle', 'Old Man Crumb', 'Bogsworth', 'Fungus Fred', 'Gloria Gutsy', 'Captain Crust', 'Mucus Max', 'Itchy Ida',
];
export const CUSTOMER_HELLO = [
  "I'm SO hungry I could eat a chair.", 'Make it snappy, I smell food!', 'Extra slime, please.', 'My tummy is growling at me.',
  "I'll have the usual. And also something else.", 'Is the food fresh? I hope not.', 'Hello! I brought exact change. Just kidding.',
];
LINES.cafeStart = ['Café is OPEN! Ring them up fast for big tips!', 'Welcome to my café! Don\'t lick the counter. That\'s MY job.'];
LINES.cafeRight = ['Order up!', 'Enjoy your slop!', 'Ka-ching!', 'Bon appé-goblin!'];
LINES.cafeWrong = ['Oops! Wrong price!', 'Math emergency!', 'Uh oh, they noticed.'];
export const CUSTOMER_HAPPY = ['Yum yum!', 'Delicious!', 'Keep the change!', 'Five stars!', 'Best café in the swamp!'];
export const CUSTOMER_MAD = ['You charged me WHAT?!', "That's not right!", 'Hey! Check your math!', 'I want to see the manager! Oh wait.'];

// ---------------- Swamp Sprint ----------------
LINES.raceStart = ['On your marks! Get set! GOBLIN!', 'My legs are ready. My brain is ready. Mostly my legs.', 'Last one to the finish is a rotten egg! ...I love rotten eggs.'];
LINES.raceBoost = ['ZOOOOM!', 'Feet, go FASTER!', 'Eat my dust!', 'Math power to the legs!'];
LINES.raceStumble = ['Whoa whoa WHOA!', 'My feet got confused!', 'Oops! Wobbly legs!'];
LINES.raceTrip = ['Who left a banana peel here?!', 'OOF! Face, meet mud.', 'I meant to do that!'];
LINES.racePass = ['See ya, {rival}!', 'Beep beep! Coming through!', 'Bye bye, {rival}!', 'Smell ya later, {rival}!'];
LINES.raceRivalTrip = ['Ha! {rival} tripped!', 'Watch your step, {rival}!', '{rival} went SPLAT!'];
LINES.raceWin = ['FIRST PLACE! I am the speediest goblin in the swamp!', 'I WON! Did you see my feet?! They were a blur!'];
LINES.raceFinish = ['Made it! My legs are jelly.', 'Phew! Next time I want gold!'];
LINES.raceLast = ['Last place... but I had the most fun!', 'I was saving my energy. For snacks.'];

// ---------------- Squid Smackdown ----------------
LINES.squidStart = ["A giant squid?! I'm gonna need bigger gloves.", 'Float like a butterfly, smell like a goblin!', "Let's do this, noodle-face!"];
LINES.squidDodge = ['Missed me!', 'Too slow, noodle arms!', 'Nope!', 'Duck and punch!'];
LINES.squidOuch = ['OW! My nose!', 'I saw stars. And fish.', 'Tentacle to the face!'];
LINES.squidKnock = ['DOWN GOES INKY!', 'Stay down, noodle!', "Who's the champ? ME!"];
LINES.squidWin = ["I'M THE CHAMP!", 'Calamari for dinner!', 'K.O.! Ring the bell!'];
LINES.squidLose = ['*sees stars* ...rematch?', "I'll be back! After a nap.", 'Too many arms... not fair...'];
// What Big Inky says
export const SQUID_TAUNTS = {
  start: ['Prepare to get INKED!', 'Eight arms. Four gloves. Zero mercy!', 'I eat goblins for breakfast. With ketchup.'],
  hit: ['SLAP! Ha ha!', 'Bloop! Got you!', 'Tentacle surprise!'],
  wrong: ['Ha! Wrong number!', "You can't count my tentacles either!", 'Math is HARD, huh?'],
  getUp: ["Now I'm ANGRY!", "That's it! No more Mr. Nice Squid!", 'You made my ink BOIL!'],
  lose: ['Okay okay! You win! *bloop*', "I'm going back to the deep end...", 'Not the face... not the face...'],
  win: ['Squid wins! Back to math class, goblin!', 'Too slow! Come back when you are faster!'],
};
