export interface HelpSection {
  heading: string;
  lines: string[];
}

export interface HelpPage {
  title: string;
  intro: string;
  sections: HelpSection[];
}

export const TRAINING_HELP: HelpPage = {
  title: 'The Training Hall',
  intro:
    'You are building a tiny model. It does not know what a note means — it only learns what tended to come next in the examples it was shown.',
  sections: [
    {
      heading: 'The four steps',
      lines: [
        '1 · Walk to the notebook desk and open it.',
        '2 · Play notes on the eight keys (or keys 1–8). Each key is a note and a word.',
        '3 · Press Train and watch the network learn.',
        '4 · Leave and hear your model in the Echo Hall, on the other side of the clearing.',
      ],
    },
    {
      heading: 'What "Train" actually does',
      lines: [
        'It reads your phrase from left to right. For every note it writes down the note that followed, and adds one to that count.',
        'Those counts are the entire model. Nothing smarter is happening — a model is a summary of the examples it has seen.',
        'Add a second, very different phrase and Train again: the counts mix, and the model becomes a blend of both.',
      ],
    },
    {
      heading: 'Counter or network?',
      lines: [
        'The Method stand chooses what Train builds.',
        'Counter: it tallies which note followed which. Instant, exact and easy to read — and it can do nothing but replay those tallies.',
        'Network: a real neural network — 208 weights, learned by trial and error (gradients) over many passes through your notes. You watch the loss fall and the hidden layer light up.',
        'With only one short phrase the loss drops near zero: it has memorised. Ask it anything outside that phrase and it flounders. That is overfitting — and it is why real language models need enormous amounts of varied text.',
      ],
    },
    {
      heading: 'Reading the panel',
      lines: [
        'Left column: a note it just heard.',
        'Right column: the notes it expects next.',
        'Line thickness: how often that pair followed each other in your phrases.',
        'The bars next to the right column are the chance it gives to each possible next note.',
        'During training the caption narrates every step: after "the" it saw "a", and so on.',
      ],
    },
    {
      heading: 'Why words as well as notes',
      lines: [
        'The eight notes carry a small vocabulary — the, cat, sat, on, a, mat, and, then — so you can read a phrase as a sentence.',
        'You will notice the model only tracks order, not meaning: it happily produces "mat the a". That is exactly what a next-token model does without understanding.',
      ],
    },
    {
      heading: 'Your shelf',
      lines: [
        'Every Train saves a named model (Model 1, Model 2 …). Up to six are kept; the oldest slides off.',
        'The stand shows which model is currently selected for both halls. Step on it to cycle.',
        '"Forget all models" removes everything you trained and returns to the built-in Old Songs.',
        'Your notebook draft is kept, so a half-written phrase survives leaving the hall.',
      ],
    },
    {
      heading: 'Try this',
      lines: [
        '• Train on one phrase. Then train on two phrases that feel opposite, and compare what the Echo Hall does with the same prompt.',
        '• Train until the panel is boringly predictable — then add one more phrase and watch it get less sure.',
      ],
    },
  ],
};

export const ECHO_HELP: HelpPage = {
  title: 'The Echo Hall',
  intro:
    'This is inference: the model is frozen, and you give it a prompt. It answers one note at a time with the note it expects next.',
  sections: [
    {
      heading: 'The four steps',
      lines: [
        '1 · Choose a model on the stand — the Old Songs, or one you trained.',
        '2 · Play a prompt of your own on the ask keys (1–4 notes), or press Sample.',
        '3 · Watch the sheet and the panel: "expects …" shows what it thinks comes next.',
        '4 · Press Let it continue and listen to where it goes.',
      ],
    },
    {
      heading: 'What "continues" means',
      lines: [
        'It picks a next note from its expectations, plays it, then adds that note to the prompt and asks again — eight times.',
        'Its own answer becomes its next input. Nothing is planned ahead; every note is a fresh guess.',
        'That loop, prompt → expectation → append → repeat, is how language models generate text too.',
      ],
    },
    {
      heading: 'The two cranks',
      lines: [
        'Heat (temperature): low means it usually takes the most likely note — safe, and easily stuck in a loop. High gives unlikely notes a chance, so it wanders and sometimes invents a turn your phrase never had.',
        'Memory: how many of your most recent notes it conditions on. With 1 it can lose the thread; with 2 it stays truer to the pattern it learned.',
      ],
    },
    {
      heading: 'Your prompt is your input',
      lines: [
        'You play the prompt yourself — it is not a training example.',
        'Sample is only a convenience: it fills the keys with the opening of something the model already knows, so you can start quickly.',
      ],
    },
    {
      heading: 'A model is its data',
      lines: [
        'The stand cycles every model on the shelf. Ask the same prompt and you get a different singer, because the counts came from different phrases.',
        'Train a model on nonsense and it will answer with confident nonsense. Train it on more of a tune and it holds the tune.',
        'Nothing here is hidden: the drawn network is the whole model.',
      ],
    },
    {
      heading: 'Two kinds of model',
      lines: [
        'The Old Songs ships twice: as a counter that tallies what followed what, and as a trained network with the same corpus. Models you train can be either kind too.',
        'A network answers from learned weights. Its Memory crank blanks the older slot of its input, so at Memory 1 it sees an input it was rarely trained on and sounds less sure.',
        'Load each kind and ask both the same prompt: same question, different machinery underneath.',
      ],
    },
    {
      heading: 'Try this',
      lines: [
        '• Play a prompt and let it run with Heat on cautious, then wild. Note where it leaves your phrase.',
        '• Raise Memory to 2 with the same prompt and see it stay closer to the pattern.',
        '• Load the Old Songs, then a model you trained, and ask both the same two notes.',
      ],
    },
  ],
};

export const GALLERY_HELP: HelpPage = {
  title: 'The Hall of History',
  intro:
    'Three exhibits, in the order the ideas arrived. Each is a room you can walk into, and each bends one idea until you can feel it.',
  sections: [
    {
      heading: 'The exhibits',
      lines: [
        'The Perceptron (1958) — one neuron, weights you can nudge, and the XOR wall nobody could climb for twenty years.',
        'The Signal Board — teach a machine to see numbers or Morse by showing it examples, and watch its weights become pictures of what it expects.',
        'The Piano Room — the whole idea on one keyboard: play, switch between learning the notes and asking the model to continue them.',
      ],
    },
    {
      heading: 'The timeline',
      lines: [
        'Plaques along the wall tell the short version, from McCulloch & Pitts to large language models.',
        'Walk up to a plaque and press to read it.',
      ],
    },
    {
      heading: 'The badge',
      lines: ['Visit all three exhibits and a token appears on the pedestal by the door.'],
    },
  ],
};

export const PERCEPTRON_HELP: HelpPage = {
  title: 'The Perceptron (1958)',
  intro:
    'The first trainable neuron. It takes two inputs, multiplies each by a weight, adds a bias, and fires if the total passes zero.',
  sections: [
    {
      heading: 'How it learns',
      lines: [
        'Show it an example. If it answers correctly, change nothing.',
        'If it is wrong, nudge every weight toward the right answer: wrong-but-should-fire pushes weights up, wrong-but-fired pushes them down.',
        'That single rule, applied to examples over and over, is the whole idea of learning from data.',
      ],
    },
    {
      heading: 'The picture',
      lines: [
        'Four examples sit on the board: filled circles want 1, hollow want 0.',
        'The line is what the neuron currently believes. Learning moves the line until it separates the two kinds.',
        'AND and OR can be separated by a line. XOR cannot — the two kinds sit on opposite corners.',
      ],
    },
    {
      heading: 'The wall',
      lines: [
        'Try XOR: the mistakes never reach zero, because no straight line can do it.',
        'That failure, proved plainly in 1969, froze the field for years. The way through is a hidden layer — which is what every later exhibit is built on.',
      ],
    },
    {
      heading: 'Try this',
      lines: [
        '• Train AND one pass at a time and watch the line settle.',
        '• Then switch to XOR, press Learn until it stops, and read what it says.',
      ],
    },
  ],
};

export const SIGNAL_HELP: HelpPage = {
  title: 'The Signal Board',
  intro:
    'Many inputs, a few classes, and one tiny learner. You teach it by example; its weights become pictures of what it looks for.',
  sections: [
    {
      heading: 'How to teach it',
      lines: [
        'Ink a pattern on the grid — a digit, or a Morse letter.',
        'Choose the class it belongs to and press Add example. Add several of each.',
        'Press Train: each class gets its own set of weights, nudged whenever it answers wrongly (one-vs-rest).',
        'Press Recognise to see what it thinks of the current grid, class by class.',
      ],
    },
    {
      heading: 'Reading the weights',
      lines: [
        'The four small grids are the learned weights for the four classes: gold where ink makes a class more likely, blue where ink argues against it.',
        'After a few examples they look like ghostly pictures of the patterns themselves.',
        'That is all a model is here: weights that agree with the examples you gave it. Change the examples and the picture changes.',
      ],
    },
    {
      heading: 'Numbers and Morse',
      lines: [
        'Numbers use a 5×5 grid (25 inputs). Morse uses five positions, each dot / dash / blank (10 inputs).',
        'Morse is a good lesson in why the input representation matters: the same learner, given a friendlier shape, learns faster.',
      ],
    },
    {
      heading: 'Try this',
      lines: [
        '• Teach it two digits with one example each, then add three more of one digit and watch its weights sharpen.',
        '• Give it a pattern it has never seen — a slightly wrong digit — and see how sure it is.',
      ],
    },
  ],
};

export const PIANO_HELP: HelpPage = {
  title: 'The Piano Room',
  intro:
    'The whole idea on one keyboard. One switch decides whether your notes teach the model or ask it to continue.',
  sections: [
    {
      heading: 'Learn mode',
      lines: [
        'Every note you play is written into the notebook below the keys.',
        'Press Train and the model is built from those notes — a counter or a network, your choice — and saved to the shelf with a name.',
        'Same notebook, same keys, same build as the Training Hall; only the room is bigger.',
      ],
    },
    {
      heading: 'Inference mode',
      lines: [
        'Play a few notes: that is your prompt. Sample borrows an opening if you want a quick start.',
        'Press Let it continue and the loaded model answers, note by note, with what it expects next.',
        'Heat and Memory still apply, and the model stand still cycles every model on the shelf.',
      ],
    },
  ],
};

export const TIMELINE: { year: string; page: HelpPage }[] = [
  {
    year: '1943',
    page: {
      title: '1943 · A neuron, on paper',
      intro: 'McCulloch and Pitts describe a nerve cell as arithmetic: add up the signals, fire if the total passes a threshold.',
      sections: [
        {
          heading: 'Why it mattered',
          lines: [
            'It said thinking might be made of simple units wired together — the founding assumption of every network since.',
            'There was no learning yet: someone had to set the dials by hand.',
          ],
        },
      ],
    },
  },
  {
    year: '1958',
    page: {
      title: '1958 · The Perceptron',
      intro: 'Rosenblatt builds a machine that sets its own dials from examples, and the newspapers promise thinking machines.',
      sections: [
        {
          heading: 'The claim',
          lines: [
            'Show it examples and it learns the boundary between them — the exhibit next door walks through exactly this.',
            'It is also where the hype cycle starts, and where it breaks.',
          ],
        },
      ],
    },
  },
  {
    year: '1969',
    page: {
      title: '1969 · The winter',
      intro: 'Minsky and Papert prove a single layer cannot learn XOR. Funding freezes; the field goes quiet.',
      sections: [
        {
          heading: 'The lesson',
          lines: [
            'A straight line cannot separate XOR, and no amount of training changes that.',
            'The fix — more layers — was known in principle and unreachable in practice for years.',
          ],
        },
      ],
    },
  },
  {
    year: '1986',
    page: {
      title: '1986 · Backpropagation',
      intro: 'Rumelhart, Hinton and Williams show how to train many layers at once by sending the error backwards.',
      sections: [
        {
          heading: 'The thaw',
          lines: [
            'Hidden layers become trainable, so the XOR wall comes down.',
            'This is the gradient descent your Piano Room uses when you train a network: real weights, nudged by their share of the blame.',
          ],
        },
      ],
    },
  },
  {
    year: '2012',
    page: {
      title: '2012 · Scale',
      intro: 'Big data plus graphics cards: a deep network crushes the hand-made image features people had used for decades.',
      sections: [
        {
          heading: 'What changed',
          lines: [
            'The maths was old. What was new was enough examples, enough compute, and enough patience.',
            'The Signal Board makes the same point at toy size: more examples, better weights.',
          ],
        },
      ],
    },
  },
  {
    year: '2017',
    page: {
      title: '2017 · Attention',
      intro: 'The transformer lets every token weigh every other token, instead of reading strictly left to right.',
      sections: [
        {
          heading: 'Why it scaled',
          lines: [
            'It trains in parallel and grows gracefully, which is what made very large models practical.',
            'The next-token game itself never changed: predict what comes next, then append it.',
          ],
        },
      ],
    },
  },
  {
    year: '2020s',
    page: {
      title: '2020s · Large language models',
      intro: 'The same next-token game, at a scale you cannot draw. Billions of weights, trained on most of the written web.',
      sections: [
        {
          heading: 'What the halls say about it',
          lines: [
            'Nothing new in kind: data becomes weights, weights become expectations, expectations become text.',
            'What changes with size is how much of the world fits in the weights — and how much we cannot see inside them.',
          ],
        },
      ],
    },
  },
];
