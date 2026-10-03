// Frozen content bundle — authored source of truth, plain TypeScript. Edit here.
import type { Content, ContentDiagnostics } from './types';

export const content: Content = {
  "concepts": {
    "concept.agent": {
      "id": "concept.agent",
      "term": "Agent",
      "short": "A model given tools, memory, and the ability to act.",
      "body": "An agent is a model that has been given something to do and some way to do it. It takes a step, looks at the result, and takes another. Left alone, an agent will keep stepping; whether it stops in the right place is a matter of the rig you built around it.",
      "related": [
        "concept.harness"
      ]
    },
    "concept.ai-system": {
      "id": "concept.ai-system",
      "term": "AI system",
      "short": "A model plus the tools, memory, and limits around it.",
      "body": "An AI system is more than a model. It is the model together with the tools it may call, the memory it carries, and the limits it works within. Change any of those and you have changed the system, even if the model is the same.",
      "related": []
    },
    "concept.attention": {
      "id": "concept.attention",
      "term": "Attention",
      "short": "What is lit is all the system knows.",
      "body": "A model does not see everything at once. It sees what you bring into view. The lantern in this room is a picture of that: whatever it lights is the whole world to the Satyrn, and everything else simply does not exist yet.",
      "related": [
        "concept.ai-system"
      ]
    },
    "concept.cloud": {
      "id": "concept.cloud",
      "term": "Cloud",
      "short": "A model reached over a pipe to someone else's lake.",
      "body": "A cloud model is reached over a pipe. It is quick and vast, and someone else keeps it running for you — for a price, and on their terms. Your prompts travel down the pipe and your privacy travels with them.",
      "related": [
        "concept.local-model"
      ]
    },
    "concept.community": {
      "id": "concept.community",
      "term": "Community",
      "short": "People who build together in the open.",
      "body": "A community is what turns a tool into a commons. Its members write down what they learn, lend each other a hand, and keep the door open for whoever comes next. Nothing here grows on its own; it grows because someone added to it.",
      "related": [
        "concept.contribution"
      ]
    },
    "concept.constraint": {
      "id": "concept.constraint",
      "term": "Constraint",
      "short": "A condition that narrows what is allowed.",
      "body": "A constraint says what must be true for something to pass. An ambiguous constraint leaves an edge case for the reader to guess, and a literal reader will guess with perfect confidence. The wording is the engineering.",
      "related": []
    },
    "concept.context-window": {
      "id": "concept.context-window",
      "term": "Context window",
      "short": "The finite cup everything must fit inside.",
      "body": "A model can only hold so much text at once. That limit is the context window. Whatever does not fit is not there for the model at all. Pouring more in does not widen the cup; it only spills what was already there.",
      "related": [
        "concept.tokens"
      ]
    },
    "concept.contribution": {
      "id": "concept.contribution",
      "term": "Contribution",
      "short": "The act of adding something back.",
      "body": "A contribution is anything you give back: a Bead, a note, a correction, a report from your own machine. It does not have to be grand. A single honest account of what worked and what did not is worth more than a polished claim.",
      "related": []
    },
    "concept.evaluation": {
      "id": "concept.evaluation",
      "term": "Evaluation",
      "short": "Judging whether something actually works.",
      "body": "Evaluation is how you decide whether a result is any good. A reading is only as trustworthy as the check behind it. A scale that cannot fail will tell you that everything is excellent, and you will learn nothing from it.",
      "related": [
        "concept.evidence"
      ]
    },
    "concept.evidence": {
      "id": "concept.evidence",
      "term": "Evidence",
      "short": "A check that could have failed and did not.",
      "body": "Evidence is not a claim repeated more firmly. It is the result of a check that had a real chance of failing. Verify, do not assert: build the test that could say no, and then show that it said yes.",
      "related": []
    },
    "concept.harness": {
      "id": "concept.harness",
      "term": "Harness",
      "short": "The rig around the model — the loop, the limits, the checks.",
      "body": "The harness is everything around the model that keeps it on the road: how it loops, how far it may go before it must stop, and how it knows it has arrived. A good harness lets a small model finish what a bare one would bolt past or never reach.",
      "related": []
    },
    "concept.instruction": {
      "id": "concept.instruction",
      "term": "Instruction",
      "short": "A standing order a literal reader follows exactly.",
      "body": "An instruction is what you tell the system to do. A literal reader does not guess your intent; it does precisely what the words say. Most trouble with a model is not defiance — it is a reasonable reading of an unreasonable order.",
      "related": [
        "concept.constraint"
      ]
    },
    "concept.local-model": {
      "id": "concept.local-model",
      "term": "Local model",
      "short": "A model on your own machine — private, yours, bounded by what you own.",
      "body": "A local model runs on the machine in front of you. Your work does not leave the house, you keep the tap, and nothing changes underneath you without your say. The trade is that you are bounded by what your own machine can hold.",
      "related": []
    },
    "concept.loop-breaker": {
      "id": "concept.loop-breaker",
      "term": "Loop breaker",
      "short": "Noticing the repetition without halting the useful work.",
      "body": "A loop breaker watches for the same step returning and changes the pattern before the work is spent. The trick is that it must not simply stop everything: the useful steps taken before the circle began are still worth keeping.",
      "related": []
    },
    "concept.models": {
      "id": "concept.models",
      "term": "Model",
      "short": "What actually does the reading and writing.",
      "body": "A model is the thing that takes your tokens and produces an answer. Models differ in size, speed, and care. A small one is quick and cheap; a large one is slower and holds more. None of them is simply \"better\".",
      "related": [
        "concept.taxonomy"
      ]
    },
    "concept.runaway-loop": {
      "id": "concept.runaway-loop",
      "term": "Runaway loop",
      "short": "Repeating the same step while nothing changes.",
      "body": "A runaway loop is work that looks like progress and is not. The same step is taken again and again with no new result, and the budget drains away while the task stands still. It is not laziness; it is a pattern the system cannot see from inside.",
      "related": [
        "concept.loop-breaker"
      ]
    },
    "concept.spec": {
      "id": "concept.spec",
      "term": "Spec",
      "short": "A description precise enough for someone else to build and check.",
      "body": "A spec says what is to be built in terms another person can act on and verify. \"Sturdy enough\" cannot be built, because no two builders would agree on what it means. \"Twenty bricks high\" can be built, and then measured.",
      "related": [
        "concept.verification"
      ]
    },
    "concept.taxonomy": {
      "id": "concept.taxonomy",
      "term": "Taxonomy",
      "short": "Naming the kinds, so you can choose between them.",
      "body": "A taxonomy is a way of sorting things into named kinds. Once you can say \"this is a swift little model\" or \"this is a vast careful one\", you can match the kind to the errand instead of hoping one size fits all.",
      "related": []
    },
    "concept.tokens": {
      "id": "concept.tokens",
      "term": "Token",
      "short": "The unit of text a model reads and writes.",
      "body": "A model does not read letters or words the way you do. It reads tokens: small chunks of text. Everything you show it is measured in tokens, and every token you spend is a token the model must hold in view at once.",
      "related": []
    },
    "concept.verification": {
      "id": "concept.verification",
      "term": "Verification",
      "short": "How you know the build matches the drawing.",
      "body": "Verification is the check that turns a claim into evidence. It needs a case that can pass and a case that can fail; without both, it is not a check at all. Build from the spec, then measure the result against it.",
      "related": []
    }
  },
  "characters": {
    "character.assayer": {
      "id": "character.assayer",
      "name": "the Assayer",
      "title": "keeper of the scale",
      "description": "She weighs what the mill produced. Her gleaming scale reads \"excellent\" for everything, and she has begun to distrust a reading that has never once disagreed with her."
    },
    "character.birdwright": {
      "id": "character.birdwright",
      "name": "the Birdwright",
      "title": "keeper of the aviary",
      "description": "She keeps birds of every temperament, because no single bird suits every errand. Choosing well is her whole craft."
    },
    "character.cartwright": {
      "id": "character.cartwright",
      "name": "the Cartwright",
      "title": "keeper of the yard",
      "description": "She builds the cart, but she cares more about the rig around the horse: the loop that keeps it moving, the limit that stops it, and the check that tells it when it has arrived."
    },
    "character.draughtswoman": {
      "id": "character.draughtswoman",
      "name": "the Draughtswoman",
      "title": "keeper of the blueprint",
      "description": "She draws what is to be built. A drawing with no measurements in it, she says, is not a plan — it is a wish, and you cannot build a wish."
    },
    "character.gardener": {
      "id": "character.gardener",
      "name": "the Gardener",
      "title": "keeper of the commons",
      "description": "She keeps the commons: a garden where every Bead anyone plants is welcome. It grows by exactly the number of people who add to it, and no other way."
    },
    "character.gatekeeper": {
      "id": "character.gatekeeper",
      "name": "the Gatekeeper",
      "title": "keeper of the orders",
      "description": "She does not decide who enters. She holds the standing orders, and she follows them exactly as written — which is why the writing matters."
    },
    "character.mason": {
      "id": "character.mason",
      "name": "the Mason",
      "title": "keeper of the build",
      "description": "She builds only from numbers she can check. Hand her a wish and she waits; hand her a measurement and she lays the stone and then proves it fits."
    },
    "character.miller": {
      "id": "character.miller",
      "name": "the Miller",
      "title": "keeper of the round path",
      "description": "She has watched the mule walk the same circle all night. The morning's work was finished long before; the circle was not work at all, only motion."
    },
    "character.moon": {
      "id": "character.moon",
      "name": "the Moon",
      "title": "your reflection",
      "description": "A calm, wry presence that remembers the journey and asks how you could know something is true. Your journal and your counterweight."
    },
    "character.satyrn": {
      "id": "character.satyrn",
      "name": "the Satyrn",
      "title": "your companion",
      "description": "A small, curious, horned creature. Quick and eager, easily distracted. It is the little local model you will learn to keep on track."
    },
    "character.waterwarden": {
      "id": "character.waterwarden",
      "name": "the Waterwarden",
      "title": "keeper of the terrace",
      "description": "She measures every drop that falls on the terrace. The cup is small and the season is long, so she has learned that choosing what to keep is the whole work."
    },
    "character.well-digger": {
      "id": "character.well-digger",
      "name": "the Well-Digger",
      "title": "keeper of the well",
      "description": "She dug the well and owns every drop of it. The pipe from the distant lake is fast and cheap today, but the water is not hers, and someone else holds the tap."
    }
  },
  "worlds": {
    "world.assayers-scale": {
      "id": "world.assayers-scale",
      "title": "The Assayer's Scale",
      "act": "act2",
      "order": 6,
      "keeper": "character.assayer",
      "dialogue": "dialogue.assayer.intro",
      "concepts": [
        "concept.evaluation",
        "concept.evidence"
      ],
      "mechanic": "mechanic.assayers-scale",
      "summary": "A scale that praises everything, and the one weight it cannot catch.",
      "intro": "The Assayer sets a gleaming scale before you. \"It says everything is excellent,\" she says. \"I have stopped believing it. Find me a reading that could disagree, and then find the weight that is wrong.\""
    },
    "world.aviary-of-whispers": {
      "id": "world.aviary-of-whispers",
      "title": "The Aviary of Whispers",
      "act": "act1",
      "order": 2,
      "keeper": "character.birdwright",
      "dialogue": "dialogue.birdwright.intro",
      "concepts": [
        "concept.models",
        "concept.taxonomy"
      ],
      "mechanic": "mechanic.aviary",
      "summary": "Three errands, three birds, and a rule that each bird carries one.",
      "intro": "The Birdwright opens the aviary. \"Every bird is good at something,\" she says, \"and none is good at everything. Match them.\""
    },
    "world.blueprint-and-mason": {
      "id": "world.blueprint-and-mason",
      "title": "The Blueprint and the Mason",
      "act": "act3",
      "order": 7,
      "keeper": "character.draughtswoman",
      "dialogue": "dialogue.draughtswoman.intro",
      "concepts": [
        "concept.spec",
        "concept.verification"
      ],
      "mechanic": "mechanic.blueprint",
      "summary": "A drawing, a mason, and the difference between a wish and a spec.",
      "intro": "The Draughtswoman unrolls a drawing: a wall sixty bricks wide and twenty high. \"The Mason will build it,\" she says, \"but only from a spec she can measure. Give her a wish and she will stand there all day.\""
    },
    "world.cartwrights-yard": {
      "id": "world.cartwrights-yard",
      "title": "The Cartwright's Yard",
      "act": "act1",
      "order": 3,
      "keeper": "character.cartwright",
      "dialogue": "dialogue.cartwright.intro",
      "concepts": [
        "concept.agent",
        "concept.harness"
      ],
      "mechanic": "mechanic.cartwright",
      "summary": "A cart, a horse, a market, and the rig that gets one to the other.",
      "intro": "The Cartwright sets three empty slots before you. \"The horse is willing,\" she says. \"It is the rig that decides whether it arrives.\""
    },
    "world.commons-garden": {
      "id": "world.commons-garden",
      "title": "The Commons Garden",
      "act": "act3",
      "order": 9,
      "keeper": "character.gardener",
      "dialogue": "dialogue.gardener.intro",
      "concepts": [
        "concept.community",
        "concept.contribution"
      ],
      "mechanic": "mechanic.commons-garden",
      "summary": "A garden of Beads planted by others, and a plot waiting for yours.",
      "intro": "The Gardener waves you into the garden. Beads stand in neat rows, each one planted by someone who came before. \"Every one of these is a thing somebody chose to share,\" she says. \"There is a plot for yours.\""
    },
    "world.gate-of-orders": {
      "id": "world.gate-of-orders",
      "title": "The Gate of Orders",
      "act": "act2",
      "order": 5,
      "keeper": "character.gatekeeper",
      "dialogue": "dialogue.gatekeeper.intro",
      "concepts": [
        "concept.instruction",
        "concept.constraint"
      ],
      "mechanic": "mechanic.gate-of-orders",
      "summary": "One gate, four travellers, and a set of orders that must survive every case.",
      "intro": "The Gatekeeper taps a written order. \"I do not interpret,\" she says. \"I obey the words. Write them so the words mean what you meant.\""
    },
    "world.lantern-room": {
      "id": "world.lantern-room",
      "title": "The Lantern Room",
      "act": "prologue",
      "order": 0,
      "keeper": "character.satyrn",
      "dialogue": "dialogue.satyrn.intro",
      "concepts": [
        "concept.ai-system",
        "concept.attention"
      ],
      "mechanic": "mechanic.lantern",
      "summary": "A dark workshop, one lantern, and a question about what a model can see.",
      "intro": "The Satyrn hands you a lantern in a dark workshop. \"Point it,\" it says. \"What you light is all I know.\""
    },
    "world.rain-gauge-terrace": {
      "id": "world.rain-gauge-terrace",
      "title": "The Rain-Gauge Terrace",
      "act": "act1",
      "order": 1,
      "keeper": "character.waterwarden",
      "dialogue": "dialogue.waterwarden.intro",
      "concepts": [
        "concept.tokens",
        "concept.context-window"
      ],
      "mechanic": "mechanic.rain-gauge",
      "summary": "A terrace, a fixed cup, and more rain than the cup can hold.",
      "intro": "The Waterwarden holds out a cup the size of a fist. \"Five drops, no more,\" she says. \"The chatter will tempt you. Keep only what the plants need.\""
    },
    "world.round-path": {
      "id": "world.round-path",
      "title": "The Round Path",
      "act": "act2",
      "order": 4,
      "keeper": "character.miller",
      "dialogue": "dialogue.miller.intro",
      "concepts": [
        "concept.runaway-loop",
        "concept.loop-breaker"
      ],
      "mechanic": "mechanic.round-path",
      "summary": "A mule that has been walking the same small circle since midnight.",
      "intro": "The Miller leads you to the yard. \"The work was done by dark,\" she says. \"But she has been going round since. I mind the circling more than the work.\""
    },
    "world.well-and-pipe": {
      "id": "world.well-and-pipe",
      "title": "The Well and the Pipe",
      "act": "act3",
      "order": 8,
      "keeper": "character.well-digger",
      "dialogue": "dialogue.well-digger.intro",
      "concepts": [
        "concept.local-model",
        "concept.cloud"
      ],
      "mechanic": "mechanic.well-and-pipe",
      "summary": "A well you own, a pipe to a distant lake, and a day's needs to route.",
      "intro": "The Well-Digger shows you the well, then the pipe. \"The pipe is quicker,\" she says. \"But the water is not yours, and it carries your business down the valley. Choose what leaves the house.\""
    }
  },
  "mechanics": {
    "mechanic.assayers-scale": {
      "id": "mechanic.assayers-scale",
      "title": "The Assayer's Scale",
      "description": "The gleaming scale reads \"excellent\" for every weight. Find a check that can actually fail, rely on it, and mark the weight that is truly unsound.",
      "a11y": "Choose a check to rely on, then mark the unsound weight. Only a check that can fail proves anything. You can also continue without playing.",
      "params": {
        "items": [
          {
            "id": "millers-measure",
            "label": "the miller's measure",
            "sound": true
          },
          {
            "id": "bakers-measure",
            "label": "the baker's measure",
            "sound": true
          },
          {
            "id": "cracked-weight",
            "label": "the cracked weight",
            "sound": false
          },
          {
            "id": "ferrymans-measure",
            "label": "the ferryman's measure",
            "sound": true
          }
        ],
        "checks": [
          {
            "id": "gleaming",
            "label": "the gleaming scale",
            "kind": "vanity"
          },
          {
            "id": "assay",
            "label": "the assay, weighed against a known good",
            "kind": "honest"
          },
          {
            "id": "stubborn",
            "label": "the stubborn scale",
            "kind": "broken"
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.aviary": {
      "id": "mechanic.aviary",
      "title": "The Aviary of Whispers",
      "description": "Three errands, three birds, and each bird can take only one errand. Match the temperament to the task.",
      "a11y": "For each task choose a bird from the list. A bird may carry only one task. You can also continue without playing.",
      "params": {
        "birds": [
          {
            "id": "swift",
            "name": "the swift wren",
            "traits": [
              "swift",
              "small"
            ]
          },
          {
            "id": "patient",
            "name": "the patient heron",
            "traits": [
              "patient",
              "careful"
            ]
          },
          {
            "id": "vast",
            "name": "the vast crane",
            "traits": [
              "vast",
              "careful"
            ]
          }
        ],
        "tasks": [
          {
            "id": "many",
            "label": "carry many small messages quickly",
            "needs": [
              "swift",
              "small"
            ]
          },
          {
            "id": "gentle",
            "label": "tend a fragile nest for hours",
            "needs": [
              "patient",
              "careful"
            ]
          },
          {
            "id": "wide",
            "label": "survey the whole valley at once",
            "needs": [
              "vast",
              "careful"
            ]
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.blueprint": {
      "id": "mechanic.blueprint",
      "title": "The Blueprint and the Mason",
      "description": "Choose the clauses that make a spec the Mason can build and check. A vague clause leaves her waiting; the measurements must match the drawing.",
      "a11y": "Choose clauses to form a spec, then ask the Mason to build. Only measurable clauses can be built and checked. You can also continue without playing.",
      "params": {
        "blueprint": {
          "width": 60,
          "height": 20
        },
        "clauses": [
          {
            "id": "w60",
            "text": "60 bricks wide",
            "kind": "width",
            "value": 60
          },
          {
            "id": "w40",
            "text": "40 bricks wide",
            "kind": "width",
            "value": 40
          },
          {
            "id": "h20",
            "text": "20 bricks high",
            "kind": "height",
            "value": 20
          },
          {
            "id": "h30",
            "text": "30 bricks high",
            "kind": "height",
            "value": 30
          },
          {
            "id": "sturdy",
            "text": "sturdy enough",
            "kind": "vague"
          },
          {
            "id": "about-right",
            "text": "looks about right",
            "kind": "vague"
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.cartwright": {
      "id": "mechanic.cartwright",
      "title": "The Cartwright's Yard",
      "description": "Rig the cart so the horse reaches the market — and stops there. Fit a work tool, a limit, and a check; a missing piece sends it bolting or stuck.",
      "a11y": "For each slot choose a component, then send the cart. The cart must reach the market and stop. You can also continue without playing.",
      "params": {
        "goal": 8,
        "slots": [
          {
            "id": "work",
            "label": "how it works"
          },
          {
            "id": "limit",
            "label": "how far it may go"
          },
          {
            "id": "check",
            "label": "how it knows it arrived"
          }
        ],
        "components": [
          {
            "id": "steady",
            "name": "a steady work tool",
            "type": "work",
            "power": 2
          },
          {
            "id": "tiny",
            "name": "a tiny work tool",
            "type": "work",
            "power": 1
          },
          {
            "id": "budget",
            "name": "a turn budget",
            "type": "limit",
            "limit": 12
          },
          {
            "id": "nudge",
            "name": "a gentle nudge",
            "type": "distraction"
          },
          {
            "id": "marker",
            "name": "a market marker",
            "type": "verify"
          },
          {
            "id": "bell",
            "name": "a pretty bell",
            "type": "distraction"
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.commons-garden": {
      "id": "mechanic.commons-garden",
      "title": "The Commons Garden",
      "description": "Wander a few Beads other people planted, then plant one of your own. The garden grows by every Bead that is added to it.",
      "a11y": "Visit a community Bead, type a name for your own, choose a seed, and plant it. You can also continue without playing.",
      "params": {
        "seeds": [
          {
            "id": "seed-attention",
            "name": "Attention"
          },
          {
            "id": "seed-evidence",
            "name": "Evidence"
          },
          {
            "id": "seed-constraint",
            "name": "Constraint"
          },
          {
            "id": "seed-tending",
            "name": "Tending"
          }
        ],
        "communityBeads": [
          {
            "id": "fog-alphabet",
            "name": "The Fog Alphabet",
            "keeper": "a lighthouse keeper",
            "about": "A Bead about lighting one thing at a time so the whole coast is not lost in fog."
          },
          {
            "id": "long-ledger",
            "name": "The Long Ledger",
            "keeper": "a bookkeeper",
            "about": "A Bead about counting what a small model spends, one turn at a time."
          },
          {
            "id": "second-lantern",
            "name": "The Second Lantern",
            "keeper": "a night watch",
            "about": "A Bead about keeping a spare check ready for the moment the first one fails."
          }
        ]
      }
    },
    "mechanic.gate-of-orders": {
      "id": "mechanic.gate-of-orders",
      "title": "The Gate of Orders",
      "description": "Choose the one standing order that admits exactly those who should enter. The gate reads it literally, so an order that misses an edge case will let the wrong traveller through.",
      "a11y": "Choose one standing order from the list. The gate applies it to every traveller and reports which cases fail. You can also continue without playing.",
      "params": {
        "travellers": [
          {
            "id": "merchant-lantern",
            "label": "the merchant with a lantern",
            "attributes": [
              "merchant",
              "lantern"
            ],
            "shouldEnter": true
          },
          {
            "id": "merchant-dark",
            "label": "the merchant with no lantern",
            "attributes": [
              "merchant"
            ],
            "shouldEnter": false
          },
          {
            "id": "pilgrim-lantern",
            "label": "the pilgrim with a lantern",
            "attributes": [
              "pilgrim",
              "lantern"
            ],
            "shouldEnter": true
          },
          {
            "id": "pilgrim-dark",
            "label": "the pilgrim with no lantern",
            "attributes": [
              "pilgrim"
            ],
            "shouldEnter": false
          }
        ],
        "orders": [
          {
            "id": "any-lantern",
            "text": "Admit anyone carrying a lantern.",
            "allow": [
              "lantern"
            ],
            "deny": []
          },
          {
            "id": "merchants-only",
            "text": "Admit merchants; turn away pilgrims.",
            "allow": [
              "merchant"
            ],
            "deny": []
          },
          {
            "id": "everyone",
            "text": "Admit everyone, and turn away no one.",
            "allow": [],
            "deny": []
          },
          {
            "id": "carrying-nothing",
            "text": "Admit only those who carry nothing.",
            "allow": [],
            "deny": [
              "lantern"
            ]
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.lantern": {
      "id": "mechanic.lantern",
      "title": "The Lantern",
      "description": "Move the lantern through the dark workshop and light what you attend to. Only the lit part exists to the Satyrn.",
      "a11y": "Move the lantern with the arrow keys and press Enter to light a spot. You can also continue without playing.",
      "params": {
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.rain-gauge": {
      "id": "mechanic.rain-gauge",
      "title": "The Rain-Gauge",
      "description": "The terrace's cup holds only five drops, and the plants need five particular ones. Choose what to keep; what you keep beyond the cup spills.",
      "a11y": "For each drop, choose Keep or Let fall. The cup holds a fixed number of drops. You can also continue without playing.",
      "params": {
        "capacity": 5,
        "drops": [
          {
            "id": "seed",
            "label": "seed",
            "essential": true
          },
          {
            "id": "chatter",
            "label": "chatter",
            "essential": false
          },
          {
            "id": "root",
            "label": "root",
            "essential": true
          },
          {
            "id": "rumour",
            "label": "rumour",
            "essential": false
          },
          {
            "id": "shoot",
            "label": "shoot",
            "essential": true
          },
          {
            "id": "echo",
            "label": "echo",
            "essential": false
          },
          {
            "id": "bloom",
            "label": "bloom",
            "essential": true
          },
          {
            "id": "harvest",
            "label": "harvest",
            "essential": true
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.round-path": {
      "id": "mechanic.round-path",
      "title": "The Round Path",
      "description": "The mule's night is a list of steps. Some are this morning's work; then the same small circle, over and over. Mark the first full turn of the circle and break it — without losing the work.",
      "a11y": "Select the steps that make up one turn of the repeating circle, then choose Break the loop. You can also continue without playing.",
      "params": {
        "cycleStart": 3,
        "cycleLength": 2,
        "steps": [
          {
            "id": "fetch-grain",
            "label": "fetch grain"
          },
          {
            "id": "grind-flour",
            "label": "grind flour"
          },
          {
            "id": "bag-flour",
            "label": "bag flour"
          },
          {
            "id": "pat-post",
            "label": "pat the post"
          },
          {
            "id": "find-nothing",
            "label": "find nothing new"
          },
          {
            "id": "pat-post-2",
            "label": "pat the post"
          },
          {
            "id": "find-nothing-2",
            "label": "find nothing new"
          },
          {
            "id": "pat-post-3",
            "label": "pat the post"
          },
          {
            "id": "find-nothing-3",
            "label": "find nothing new"
          },
          {
            "id": "pat-post-4",
            "label": "pat the post"
          },
          {
            "id": "find-nothing-4",
            "label": "find nothing new"
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    },
    "mechanic.well-and-pipe": {
      "id": "mechanic.well-and-pipe",
      "title": "The Well and the Pipe",
      "description": "Route each of the day's needs to your own well or to the pipe from the lake. Sensitive work must stay in the well, and the well holds only so much.",
      "a11y": "For each need, choose Well or Pipe. Sensitive needs must go to the well; the well has a fixed capacity. You can also continue without playing.",
      "params": {
        "wellCapacity": 5,
        "tasks": [
          {
            "id": "drinking",
            "label": "drinking water",
            "need": 2,
            "sensitive": true
          },
          {
            "id": "bathing",
            "label": "bathing water",
            "need": 2,
            "sensitive": true
          },
          {
            "id": "laundry",
            "label": "laundry",
            "need": 3,
            "sensitive": false
          },
          {
            "id": "garden",
            "label": "watering the garden",
            "need": 5,
            "sensitive": false
          }
        ],
        "stars": {
          "three": 0,
          "two": 2
        }
      }
    }
  },
  "achievements": {
    "achievement.broken-circle": {
      "id": "achievement.broken-circle",
      "title": "Broken Circle",
      "description": "Broke the repeating loop and kept the morning's work.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.round-path"
      }
    },
    "achievement.can-fail": {
      "id": "achievement.can-fail",
      "title": "A Check That Can Fail",
      "description": "Relied on a check that could fail, and caught the unsound weight.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.assayers-scale"
      }
    },
    "achievement.first-light": {
      "id": "achievement.first-light",
      "title": "First Light",
      "description": "Lit every corner of the Lantern Room.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.lantern"
      }
    },
    "achievement.measurable": {
      "id": "achievement.measurable",
      "title": "Measurable",
      "description": "Wrote a spec the Mason could build and check.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.blueprint"
      }
    },
    "achievement.planted": {
      "id": "achievement.planted",
      "title": "Planted",
      "description": "Wandered the commons and added a Bead of your own.",
      "kind": "journey",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.commons-garden"
      }
    },
    "achievement.rigged-right": {
      "id": "achievement.rigged-right",
      "title": "Rigged Right",
      "description": "Built a harness that reached the market and stopped there.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.cartwright"
      }
    },
    "achievement.right-bird": {
      "id": "achievement.right-bird",
      "title": "Right Bird for the Errand",
      "description": "Matched every task to a bird that suited it — no bird twice.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.aviary"
      }
    },
    "achievement.standing-order": {
      "id": "achievement.standing-order",
      "title": "A Standing Order That Stands",
      "description": "Found the one order that survives every edge case.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.gate-of-orders"
      }
    },
    "achievement.steady-hand": {
      "id": "achievement.steady-hand",
      "title": "Steady Hand",
      "description": "Kept the cup to what the terrace truly needed.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.rain-gauge"
      }
    },
    "achievement.wanderer": {
      "id": "achievement.wanderer",
      "title": "The Wanderer",
      "description": "Chose to move on and come back later. That is allowed, and honest.",
      "kind": "skip",
      "condition": {
        "event": "world.skipped"
      }
    },
    "achievement.your-own-well": {
      "id": "achievement.your-own-well",
      "title": "Your Own Well",
      "description": "Kept what was private in the well, and sent the rest down the pipe.",
      "kind": "lesson",
      "condition": {
        "event": "mechanic.completed",
        "mechanic": "mechanic.well-and-pipe"
      }
    }
  },
  "dialogues": {
    "dialogue.assayer.intro": {
      "id": "dialogue.assayer.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.assayer",
          "text": "A scale that never says no is not evidence. It is flattery with a needle.",
          "choices": [
            {
              "id": "ask",
              "text": "Then what makes a reading trustworthy?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.assayer",
          "text": "One that could have said no and did not. Build the check that can fail, and then trust what it tells you.",
          "choices": []
        }
      }
    },
    "dialogue.birdwright.intro": {
      "id": "dialogue.birdwright.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.birdwright",
          "text": "People ask me for the best bird. I ask them for the errand. There is no best bird, only a right one.",
          "choices": [
            {
              "id": "ask",
              "text": "What if one errand needs two gifts?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.birdwright",
          "text": "Then you need a bird that has both. That is why I keep such different kinds, and why I can lend each of them only once.",
          "choices": []
        }
      }
    },
    "dialogue.cartwright.intro": {
      "id": "dialogue.cartwright.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.cartwright",
          "text": "A bare horse bolts. A harnessed one arrives. Three slots stand between the two.",
          "choices": [
            {
              "id": "ask",
              "text": "What if I fit everything?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.cartwright",
          "text": "Everything includes the pretty bell. It rings, and does nothing else. The rig is not more parts; it is the right parts.",
          "choices": []
        }
      }
    },
    "dialogue.draughtswoman.intro": {
      "id": "dialogue.draughtswoman.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.draughtswoman",
          "text": "Writing \"make it good\" is not a plan. The Mason cannot measure good. What can she measure?",
          "choices": [
            {
              "id": "ask",
              "text": "What if I am not sure of the number yet?",
              "next": "answer"
            },
            {
              "id": "mason",
              "text": "Let me ask the Mason what she needs.",
              "next": "mason"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.draughtswoman",
          "text": "Then you are not ready to build. A spec you cannot check is a promise you cannot keep.",
          "choices": [
            {
              "id": "mason",
              "text": "Let me ask the Mason what she needs.",
              "next": "mason"
            }
          ]
        },
        "mason": {
          "id": "mason",
          "speaker": "character.mason",
          "text": "Give me numbers I can lay a stone against, and I will build it and then prove it fits. Give me a wish and I will stand here, waiting, all day.",
          "choices": []
        }
      }
    },
    "dialogue.gardener.intro": {
      "id": "dialogue.gardener.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.gardener",
          "text": "You have mended a lot of machines. Would you leave the garden with nothing in it of yours?",
          "choices": [
            {
              "id": "ask",
              "text": "What if what I know is small?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.gardener",
          "text": "Small is how every row began. Plant what you learned; the next traveller will thank you for it.",
          "choices": []
        }
      }
    },
    "dialogue.gatekeeper.intro": {
      "id": "dialogue.gatekeeper.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.gatekeeper",
          "text": "\"Admit the worthy.\" Every traveller is worthy to someone. Tell me what they must carry, and I will admit exactly those.",
          "choices": [
            {
              "id": "ask",
              "text": "What if I forget an edge case?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.gatekeeper",
          "text": "Then I will obey the gap, and let the wrong one through. I will not know it was a mistake. I only know the order.",
          "choices": []
        }
      }
    },
    "dialogue.miller.intro": {
      "id": "dialogue.miller.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.miller",
          "text": "Motion is not work. She takes the same two steps and learns nothing, and I pay for every one of them.",
          "choices": [
            {
              "id": "ask",
              "text": "Should I simply stop her?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.miller",
          "text": "Stop her and you lose the grain she already ground. Break the circle, and the morning's work still stands.",
          "choices": []
        }
      }
    },
    "dialogue.satyrn.intro": {
      "id": "dialogue.satyrn.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.satyrn",
          "text": "I am quick, but I wander. Point the lantern where you want me to look, and I will see only that.",
          "choices": [
            {
              "id": "ask",
              "text": "What can you see right now?",
              "next": "answer"
            },
            {
              "id": "skip",
              "text": "I have been here before. Let us move on.",
              "condition": {
                "event": "world.entered",
                "world": "world.lantern-room"
              }
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.satyrn",
          "text": "Only the dark, until you light something. That is the whole trick of it: attention is what a model gets to know.",
          "choices": []
        }
      }
    },
    "dialogue.waterwarden.intro": {
      "id": "dialogue.waterwarden.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.waterwarden",
          "text": "Every drop costs room. The cup does not grow. Tell me — what will you keep when the rain does not stop?",
          "choices": [
            {
              "id": "ask",
              "text": "What happens to what I let fall?",
              "next": "answer"
            },
            {
              "id": "again",
              "text": "I have filled this cup before.",
              "condition": {
                "event": "world.entered",
                "world": "world.rain-gauge-terrace"
              }
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.waterwarden",
          "text": "It is gone. The model never saw it. That is not cruelty; it is simply the size of the cup.",
          "choices": []
        }
      }
    },
    "dialogue.well-digger.intro": {
      "id": "dialogue.well-digger.intro",
      "start": "start",
      "nodes": {
        "start": {
          "id": "start",
          "speaker": "character.well-digger",
          "text": "A pipe is convenient right up until someone else turns it off, or reads what you sent. Which of today's needs would you mind a stranger seeing?",
          "choices": [
            {
              "id": "ask",
              "text": "Is the pipe ever the right choice?",
              "next": "answer"
            }
          ]
        },
        "answer": {
          "id": "answer",
          "speaker": "character.well-digger",
          "text": "Often. Use it for what is heavy and public, and keep the well for what is private. The mistake is sending everything one way.",
          "choices": []
        }
      }
    }
  },
  "threads": {
    "thread.main": {
      "id": "thread.main",
      "title": "The Thread",
      "sequence": [
        "world.lantern-room",
        "world.rain-gauge-terrace",
        "world.aviary-of-whispers",
        "world.cartwrights-yard",
        "world.round-path",
        "world.gate-of-orders",
        "world.assayers-scale",
        "world.blueprint-and-mason",
        "world.well-and-pipe",
        "world.commons-garden"
      ]
    }
  },
  "strings": {
    "strings.ui": {
      "id": "strings.ui",
      "title": "UI",
      "values": {
        "appTitle": "Satyrn — The Thread",
        "threadMode": "Thread",
        "wanderMode": "Wander",
        "continueWithoutPlaying": "Continue without playing",
        "mapHeading": "The Thread",
        "wanderHeading": "All the Beads",
        "journalHeading": "The Moon's Memory",
        "notInstalled": "This mechanic is not installed — you can continue.",
        "threadNarration": "The Moon remembers the road. Follow the lantern-light from one Bead to the next.",
        "threadContinue": "Continue the Thread",
        "threadComplete": "You have walked the whole Thread.",
        "backToThread": "Back to the Thread",
        "backToMap": "Back to the map"
      }
    }
  }
};

export const diagnostics: ContentDiagnostics = {
  "dangling": [],
  "scenarioProblems": []
};
