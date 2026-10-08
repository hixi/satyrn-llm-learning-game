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
