/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelData } from '../utils/designQuestRules';

export const ALL_LEVELS: LevelData[] = [
  // ==========================================
  // WORLD 1: ASK (Problem Peak)
  // ==========================================
  {
    id: 'lvl-1-1',
    stageId: 'ask',
    worldNumber: 1,
    levelNumber: 1,
    code: '1-1',
    title: 'The Broken Lunchbox Dilemma',
    subtitle: 'Identify the Real Problem vs Symptoms',
    description: 'Students complain that school cafeteria lunches are ruined when transported in backpacks. Is the problem really "lunchboxes are bad", or is there a deeper root cause?',
    conceptTeaser: 'Engineers never jump directly to building until they peel back the layers using the 5 Whys to find the real root cause.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Why is identifying the real root cause better than quickly fixing the first symptom you see?',
    challenges: [
      {
        id: 'c-1-1-1',
        type: 'multiple-choice',
        prompt: 'A 6th grader says: "My sandwich was crushed, so lunchboxes should be banned!" What is this student describing?',
        explanation: 'A crushed sandwich is a symptom/outcome of an underlying issue (lack of rigidity, excessive external pressure, or loose packing), not the root problem definition.',
        options: [
          { id: 'opt1', label: 'The root cause of all cafeteria issues', isCorrect: false, feedback: 'Banning lunchboxes ignores the real need for carrying food safely.' },
          { id: 'opt2', label: 'An observable symptom and emotional reaction', isCorrect: true, feedback: 'Spot on! The crushed sandwich is a visible symptom, not the root structural cause.' },
          { id: 'opt3', label: 'A design constraint', isCorrect: false, feedback: 'A constraint is a limitation like budget or size, not an emotional complaint.' },
          { id: 'opt4', label: 'A biomimicry insight', isCorrect: false, feedback: 'Biomimicry is learning from nature, not a sandwich symptom.' }
        ]
      },
      {
        id: 'c-1-1-2',
        type: 'scenario-decision',
        prompt: 'Apply the "5 Whys" method: Sandwich crushed -> Why? Heavy textbooks rested on top -> Why? Compartments lack vertical support -> What is the best root problem statement?',
        explanation: 'A great problem statement names who is affected, what the core need is, and the condition under which it fails without specifying a pre-baked product.',
        scenario: {
          context: 'You are framing the problem for your engineering design notebook.',
          choices: [
            {
              id: 'sc-1',
              text: 'Design a heavy steel vault box with metal locks so nothing can ever touch the food.',
              points: 20,
              feedback: 'This prescribes a heavy solution immediately before studying backpack weight limits!',
              isBest: false
            },
            {
              id: 'sc-2',
              text: 'How might we protect fragile food items from compressive forces inside a crowded student backpack while keeping it lightweight?',
              points: 100,
              feedback: 'Brilliant! It uses "How Might We", names the core physical challenge (compressive load), and includes the key constraint (lightweight).',
              isBest: true
            },
            {
              id: 'sc-3',
              text: 'Ask parents to stop putting sandwiches in bags.',
              points: 10,
              feedback: 'This dodges the engineering challenge entirely!',
              isBest: false
            }
          ]
        }
      }
    ]
  },
  {
    id: 'lvl-1-2',
    stageId: 'ask',
    worldNumber: 1,
    levelNumber: 2,
    code: '1-2',
    title: 'Criteria vs. Constraints Arena',
    subtitle: 'Sort Desired Goals from Non-Negotiable Limits',
    description: 'Designers must balance Criteria (goals the solution SHOULD achieve) with Constraints (strict limitations like budget, weight, time, and safety).',
    conceptTeaser: 'Criteria = What success looks like. Constraints = The boundary lines you cannot cross.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Give an example of a constraint in your own classroom project that forced you to be more creative.',
    challenges: [
      {
        id: 'c-1-2-1',
        type: 'classify-items',
        prompt: 'Classify each item into CRITERIA (goals of success) or CONSTRAINTS (strict boundaries/limits):',
        explanation: 'Constraints are hard limits (must cost under $5, must not exceed 200 grams, must use non-toxic materials). Criteria define how well it performs (keeps food cold for 4 hours, easy for 5-year-olds to open).',
        categories: [
          { id: 'crit', label: 'Criteria (Success Goals)' },
          { id: 'const', label: 'Constraints (Strict Limits)' }
        ],
        draggableItems: [
          { id: 'item1', text: 'Total material cost cannot exceed $4.00 per unit', correctCategoryId: 'const' },
          { id: 'item2', text: 'Maintains internal temperature below 40°F for at least 4 hours', correctCategoryId: 'crit' },
          { id: 'item3', text: 'Must fit inside a standard 12" x 14" backpack pocket', correctCategoryId: 'const' },
          { id: 'item4', text: 'Can be opened in under 3 seconds by an elementary schooler', correctCategoryId: 'crit' },
          { id: 'item5', text: 'Must be 100% free of BPA and harmful phthalates', correctCategoryId: 'const' }
        ]
      }
    ]
  },
  {
    id: 'lvl-1-3',
    stageId: 'ask',
    worldNumber: 1,
    levelNumber: 3,
    code: '1-3',
    title: 'The "How Might We" Formula',
    subtitle: 'Craft the Ultimate Design Challenge Question',
    description: 'A weak problem statement is either too narrow ("Make a red rubber zipper") or too broad ("Fix all world hunger"). Hit the golden sweet spot!',
    conceptTeaser: 'The best "How Might We" questions open up creative avenues while keeping target users and constraints sharp.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Write down a draft "How Might We..." statement for an issue you notice at your school.',
    challenges: [
      {
        id: 'c-1-3-1',
        type: 'order-steps',
        prompt: 'Arrange the 4 core components of an authentic Problem Statement in logical order:',
        explanation: 'A strong statement begins with the User, establishes their Genuine Need, explains the Insight/Why, and anchors the Constraints.',
        draggableItems: [
          { id: 'st1', text: '1. Identify the specific User / Community affected', correctOrder: 1 },
          { id: 'st2', text: '2. Articulate the unmet Need without naming a specific gadget', correctOrder: 2 },
          { id: 'st3', text: '3. Highlight the root Insight (Why does this matter?)', correctOrder: 3 },
          { id: 'st4', text: '4. Frame measurable Constraints (cost, size, time, safety)', correctOrder: 4 }
        ]
      },
      {
        id: 'c-1-3-2',
        type: 'multiple-choice',
        prompt: 'Which "How Might We" statement is formulated BEST for an engineering sprint?',
        explanation: 'Option C is open enough for multiple creative prototypes while specifying the audience, context, and clear objective.',
        options: [
          { id: 'optA', label: 'HMW buy 500 iPads for the hallway so kids don’t get bored?', isCorrect: false, feedback: 'Too narrow and assumes the exact tech solution beforehand.' },
          { id: 'optB', label: 'HMW make school 100% perfect forever?', isCorrect: false, feedback: 'Far too vague and impossible to design for.' },
          { id: 'optC', label: 'HMW redesign classroom desk organization so students can transition between projects in under 30 seconds?', isCorrect: true, feedback: 'Gold standard! Identifies users, core friction, and measurable time constraint.' },
          { id: 'optD', label: 'HMW paint all lockers neon green?', isCorrect: false, feedback: 'A aesthetic tweak, not a design thinking inquiry.' }
        ]
      }
    ]
  },

  // ==========================================
  // WORLD 2: RESEARCH (Research Rapids)
  // ==========================================
  {
    id: 'lvl-2-1',
    stageId: 'research',
    worldNumber: 2,
    levelNumber: 1,
    code: '2-1',
    title: 'Packaging Research: Fact vs. Assumption',
    subtitle: 'Separate Verified Evidence from Designer Hunches',
    description: 'When researching food packaging to stop a sandwich from being smushed in a backpack, novice designers assume they know what materials work. Master engineers gather empirical data before building.',
    conceptTeaser: 'An assumption untested is a crushed sandwich waiting to happen. Research physical materials and user habits first.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Why is testing food packaging materials with real weights and measuring compression better than guessing how strong a box will be?',
    challenges: [
      {
        id: 'c-2-1-1',
        type: 'classify-items',
        prompt: 'Classify each packaging research statement as an EMPIRICAL FACT (verified through testing/measurement) or an ASSUMPTION (unverified guess):',
        explanation: 'Facts are backed by physical tests and measurements (psi load, material thickness). Assumptions are untested opinions about what kids want or how bread reacts.',
        categories: [
          { id: 'fact', label: 'Empirical Fact (Verified by Test)' },
          { id: 'assump', label: 'Assumption (Needs Testing)' }
        ],
        draggableItems: [
          { id: 'it1', text: 'Corrugated cardboard fluting withstands 35 psi of vertical textbook compression before buckling (measured in lab)', correctCategoryId: 'fact' },
          { id: 'it2', text: 'Every student will gladly carry an extra 3 lbs of solid aluminum lunchbox to school every day', correctCategoryId: 'assump' },
          { id: 'it3', text: 'Standard plastic zip bags provide 0.0 psi resistance against side compression when textbooks slide in a backpack', correctCategoryId: 'fact' },
          { id: 'it4', text: 'Kids only care about food temperature and do not care if their sandwich is completely flattened', correctCategoryId: 'assump' }
        ]
      }
    ]
  },
  {
    id: 'lvl-2-2',
    stageId: 'research',
    worldNumber: 2,
    levelNumber: 2,
    code: '2-2',
    title: 'Biomimicry: Nature’s Protective Packaging',
    subtitle: 'Borrowing 3.8 Billion Years of R&D from Nature',
    description: 'Nature has solved structural rigidity, shock absorption, and protective shells. Match the food packaging marvel to its biological inspiration!',
    conceptTeaser: 'Why reinvent crush protection when clam shells, coconut husks, and burrs have already perfected impact resistance and easy re-closure?',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Which plant shell or animal structure could inspire a lightweight, crush-proof container for school lunches?',
    challenges: [
      {
        id: 'c-2-2-1',
        type: 'multiple-choice',
        prompt: 'Engineers designing crush-resistant food packaging looked at how nature protects fragile, soft fruits and seeds from external impacts. Which natural structure provides the best inspiration for distributing crushing loads around a delicate sandwich?',
        explanation: 'Arched structures like bivalve clam shells, coconut husks, and turtle carapaces redirect compressive forces along outer curved ribs away from soft internal contents, inspiring rigid protective food shells!',
        options: [
          { id: 'b1', label: 'The arched clam shell & coconut husk (outer curved dome redistributes compression around soft interiors)', isCorrect: true, feedback: 'Spot on! Curved arches and fibrous domes redirect heavy compressive loads around the sandwich.' },
          { id: 'b2', label: 'The jellyfish (100% soft and collapses under any external pressure)', isCorrect: false, feedback: 'A jellyfish lacks any rigid structure to protect against compression.' },
          { id: 'b3', label: 'The chameleon skin (rapidly changes color to match surrounding surfaces)', isCorrect: false, feedback: 'Color camouflage does not provide mechanical load resistance.' },
          { id: 'b4', label: 'The cheetah tail (assists balance during sharp turns)', isCorrect: false, feedback: 'Helps with dynamic balance, not structural compression resistance.' }
        ]
      },
      {
        id: 'c-2-2-2',
        type: 'multiple-choice',
        prompt: 'When researching food packaging fasteners that middle schoolers can open quickly without breaking, engineers examined burdock burrs under a microscope. What invention resulted?',
        explanation: 'Burdock burrs clinging to dog fur inspired George de Mestral to invent Velcro (hook-and-loop fasteners), enabling lightweight, reusable packaging seals!',
        options: [
          { id: 'v1', label: 'Duct tape', isCorrect: false, feedback: 'Duct tape uses adhesive rubber, not microscopic mechanical hooks.' },
          { id: 'v2', label: 'Velcro hook-and-loop reusable fasteners', isCorrect: true, feedback: 'Correct! The tiny flexible hooks inspired easy-open, reusable closures for lunch containers.' },
          { id: 'v3', label: 'Super glue', isCorrect: false, feedback: 'Chemical cyanoacrylate, not biomimicry from burrs.' },
          { id: 'v4', label: 'Steel padlocks', isCorrect: false, feedback: 'Padlocks are heavy mechanical tumblers.' }
        ]
      }
    ]
  },
  {
    id: 'lvl-2-3',
    stageId: 'research',
    worldNumber: 2,
    levelNumber: 3,
    code: '2-3',
    title: 'The Empathy Interview Laboratory',
    subtitle: 'Ask Questions That Reveal Hidden Needs',
    description: 'Leading questions ruin interviews. Great researchers ask open-ended questions that uncover true behaviors and physical packing habits instead of polite compliments.',
    conceptTeaser: 'Don’t ask: "Do you like my idea?" Ask: "Tell me about the last time you struggled with this."',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Why are open-ended questions far more valuable than yes/no questions when interviewing students about their lunch storage?',
    challenges: [
      {
        id: 'c-2-3-1',
        type: 'scenario-decision',
        prompt: 'You are researching the smushed sandwich dilemma by interviewing students who carry heavy backpacks. Which question will yield the most authentic behavioral data for designing better food packaging?',
        explanation: 'Asking for a specific recent story ("Walk me through what happened the last time...") reveals real physical workflows, where the sandwich sat, textbook weight, and when it got crushed.',
        scenario: {
          context: 'You have 5 minutes to interview a 6th grader who complained their lunch was ruined.',
          choices: [
            {
              id: 'q1',
              text: 'Don’t you think our hard-shell anti-crush lunch container idea is the coolest thing you have ever seen?',
              points: 0,
              feedback: 'A heavily biased leading question that invites polite praise rather than honest feedback.',
              isBest: false
            },
            {
              id: 'q2',
              text: 'Do you eat sandwiches at school, yes or no?',
              points: 30,
              feedback: 'A binary yes/no question misses all nuance, weight distribution, and backpack packing habits.',
              isBest: false
            },
            {
              id: 'q3',
              text: 'Walk me through how you pack your backpack in the morning, where your sandwich sits, and what happened the last time your lunch got squished?',
              points: 100,
              feedback: 'Outstanding! Unpacks real chronological habits, compression points against textbooks, and exact packaging failure moments.',
              isBest: true
            }
          ]
        }
      }
    ]
  },

  // ==========================================
  // WORLD 3: BRAINSTORM (Brainstorm Bay)
  // ==========================================
  {
    id: 'lvl-3-1',
    stageId: 'brainstorm',
    worldNumber: 3,
    levelNumber: 1,
    code: '3-1',
    title: 'The Judgment-Free Launchpad',
    subtitle: 'The 4 Golden Rules of Ideation',
    description: 'Premature criticism kills revolutionary inventions. Learn to suspend judgment and go for volume first!',
    conceptTeaser: 'In ideation, quantity breeds quality. Wild ideas can be tamed, but boring ideas rarely become breakthroughs.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Have you ever held back an idea because you feared people would laugh? How does suspending judgment help teams?',
    challenges: [
      {
        id: 'c-3-1-1',
        type: 'multiple-choice',
        prompt: 'During the first 15 minutes of brainstorming, teammate Alex says: "That will never work because plastic is too expensive!" How should the team respond?',
        explanation: 'In the divergent ideation phase, deferring judgment is rule #1. Filter and evaluate later in the convergent phase.',
        options: [
          { id: 'b1', label: 'Agree immediately and throw Alex’s sticky note in the trash.', isCorrect: false, feedback: 'Critique during divergence crushes creative momentum.' },
          { id: 'b2', label: 'Remind Alex: "Defer judgment! Let’s capture the idea on the board now, and evaluate feasibility in the filtering phase."', isCorrect: true, feedback: 'Spot on! Protect divergent thinking first; evaluate later.' },
          { id: 'b3', label: 'Cancel the meeting until Alex is in a better mood.', isCorrect: false, feedback: 'Norms should be upheld collaboratively by the whole squad.' },
          { id: 'b4', label: 'Argue loudly for 20 minutes about plastics.', isCorrect: false, feedback: 'Derails the ideation volume.' }
        ]
      }
    ]
  },
  {
    id: 'lvl-3-2',
    stageId: 'brainstorm',
    worldNumber: 3,
    levelNumber: 2,
    code: '3-2',
    title: 'Design Process: Plan & Redesign',
    subtitle: 'From Concept Blueprint to Iterative Redesign',
    description: 'Engineers do not just pick the first idea and build blindly. They create a structured Plan with materials and constraints, test for failure points, and Redesign to improve performance.',
    conceptTeaser: 'Planning turns creative brainstorms into actionable build steps. Redesigning takes early prototype flaws and iterates them into winning solutions.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Why is having a clear plan and being willing to redesign essential when building a prototype?',
    challenges: [
      {
        id: 'c-3-2-1',
        type: 'multiple-choice',
        prompt: 'Your team brainstormed a promising concept for a crush-proof sandwich protector. Before building, what is the main purpose of the "PLAN" step in the design process?',
        explanation: 'Planning requires identifying necessary materials, sketching dimensions, establishing a build sequence, and ensuring the design fits constraints like backpack size and low budget.',
        options: [
          { id: 's1', label: 'To launch a massive TV advertising campaign before testing if the product works.', isCorrect: false, feedback: 'Marketing happens after product validation, not during initial planning.' },
          { id: 's2', label: 'To select materials, sketch dimensions, list construction steps, and verify size & budget constraints.', isCorrect: true, feedback: 'Spot on! The Plan step translates a rough idea into an actionable, measurable blueprint.' },
          { id: 's3', label: 'To freeze the design so that nobody is ever allowed to change or improve it.', isCorrect: false, feedback: 'Engineering is iterative; designs should adapt based on testing.' },
          { id: 's4', label: 'To immediately manufacture 5,000 units without checking if books will crush it.', isCorrect: false, feedback: 'Skipping testing leads to massive failure in the field.' }
        ]
      },
      {
        id: 'c-3-2-2',
        type: 'multiple-choice',
        prompt: 'During an early blueprint review of your planned sandwich box, you notice that a heavy textbook leaning from the side will bend the latch open. How should you apply the "REDESIGN" step?',
        explanation: 'Redesigning means identifying the physical point of failure, modifying the latch mechanism or adding reinforcement ribs, and updating the blueprint before building.',
        options: [
          { id: 'e1', label: 'Analyze the weak latch, redesign with reinforced side ribs and a dual-locking tab, then update the blueprint.', isCorrect: true, feedback: 'Exact! Redesigning directly targets the failure point and strengthens the solution.' },
          { id: 'e2', label: 'Ignore the weakness and blame students for carrying heavy textbooks.', isCorrect: false, feedback: 'Engineers design for real user conditions, not idealized fantasy environments.' },
          { id: 'e3', label: 'Throw away the entire project and abandon the engineering challenge.', isCorrect: false, feedback: 'Flaws are normal and provide valuable design feedback for redesign.' },
          { id: 'e4', label: 'Tell students to wrap their lunchbox in 20 layers of duct tape every day.', isCorrect: false, feedback: 'Duct tape is an inconvenient band-aid, not a sound engineering redesign.' }
        ]
      }
    ]
  },
  {
    id: 'lvl-3-3',
    stageId: 'brainstorm',
    worldNumber: 3,
    levelNumber: 3,
    code: '3-3',
    title: 'The Feasibility Filter',
    subtitle: 'Sorting Realistic Goals from Unrealistic Goals',
    description: 'After generating dozens of brainstormed concepts, an engineering team must filter ideas against reality. Classify ideas into realistic goals vs. unrealistic goals.',
    conceptTeaser: 'Distinguish realistic goals you can build and test this semester from unrealistic goals that exceed time, budget, or physics.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Why is pursuing an unrealistic goal risky for a classroom engineering sprint?',
    challenges: [
      {
        id: 'c-3-3-1',
        type: 'classify-items',
        prompt: 'Sort these 4 student packaging concepts into REALISTIC GOALS vs. UNREALISTIC GOALS:',
        explanation: 'Realistic goals are achievable within student budgets, classroom tools, and physical constraints. Unrealistic goals violate physics, budget, or available school resources.',
        categories: [
          { id: 'realistic', label: 'Realistic Goals (Achievable with budget, tools & time)' },
          { id: 'unrealistic', label: 'Unrealistic Goals (Exceeds physics, extreme cost, or fantasy tech)' }
        ],
        draggableItems: [
          { id: 'q1', text: 'Fold-flat corrugated plastic shell with interlocking tabs costing $1.25 in materials', correctCategoryId: 'realistic' },
          { id: 'q2', text: 'Miniature nuclear-powered anti-gravity levitation field to float sandwiches inside lockers ($50M cost)', correctCategoryId: 'unrealistic' },
          { id: 'q3', text: 'Recycled cardstock shell with internal triangular support trusses cut on school craft cutters', correctCategoryId: 'realistic' },
          { id: 'q4', text: 'Genetically engineering tree leaves that grow into custom zip-lock bread containers in 30 years', correctCategoryId: 'unrealistic' }
        ]
      }
    ]
  },

  // ==========================================
  // WORLD 4: PROTOTYPE (Prototype Peninsula)
  // ==========================================
  {
    id: 'lvl-4-1',
    stageId: 'prototype',
    worldNumber: 4,
    levelNumber: 1,
    code: '4-1',
    title: 'Cardboard Before Code',
    subtitle: 'Low-Fidelity vs. High-Fidelity Prototypes',
    description: 'Never spend weeks coding or 3D printing before validating user interactions with paper, tape, and foam core.',
    conceptTeaser: 'Low-fi prototypes make it cheap to be wrong. When you spend 10 minutes on a prototype, you welcome criticism!',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'What happens to a designer’s attitude toward feedback when they spend 40 hours on their first prototype vs 30 minutes?',
    challenges: [
      {
        id: 'c-4-1-1',
        type: 'multiple-choice',
        prompt: 'Why do master product designers build "paper prototypes" and cardboard mockups in the first sprint?',
        explanation: 'Cardboard and paper allow teams to test physical ergonomics, workflow, and user comprehension in hours rather than weeks, preventing sunk cost bias.',
        options: [
          { id: 'cf1', label: 'Because cardboard is waterproof and indestructible.', isCorrect: false, feedback: 'Cardboard is fragile, which is fine for rapid learning.' },
          { id: 'cf2', label: 'To fail early, learn cheaply, and avoid becoming emotionally attached to a flawed idea.', isCorrect: true, feedback: 'Master principle! Low fidelity invites honest user critique and fast iterations.' },
          { id: 'cf3', label: 'Because real engineers never use digital 3D CAD models.', isCorrect: false, feedback: 'Digital CAD is used in high-fidelity later stages.' },
          { id: 'cf4', label: 'Because paper prototypes can be sold immediately to consumers.', isCorrect: false, feedback: 'Prototypes are testing vehicles, not finished merchandise.' }
        ]
      }
    ]
  },
  {
    id: 'lvl-4-2',
    stageId: 'prototype',
    worldNumber: 4,
    levelNumber: 2,
    code: '4-2',
    title: 'The Structured Prototype Test Cycle',
    subtitle: 'Measure, Stress-Test, and Iterate with Engineering Rigor',
    description: 'Testing is where assumptions meet reality. Order the sequential steps of an engineering test cycle to evaluate your prototype.',
    conceptTeaser: 'Test to break, not just to pass. Finding flaws in controlled testing prevents failure in the student’s backpack.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'How would you test a sandwich protector prototype to see if it actually protects against a 15 lb textbook stack?',
    challenges: [
      {
        id: 'c-4-2-1',
        type: 'order-steps',
        prompt: 'Order the design process steps of a structured prototype test cycle:',
        explanation: 'Every engineering test cycle starts with clear test criteria, followed by constructing a standardized testing rig, conducting repeatable trials with data logging, and analyzing failures to redesign.',
        draggableItems: [
          { id: 't1', text: 'Step 1: Identify Test Criteria & Failure Variables (e.g. withstand 15 lbs textbook load without sandwich bread deflecting > 3mm)', correctOrder: 1 },
          { id: 't2', text: 'Step 2: Construct the Prototype & Standardized Testing Rig (keep drop height, weight pressure, and drop surfaces constant)', correctOrder: 2 },
          { id: 't3', text: 'Step 3: Conduct Controlled Testing Trials & Log Quantitative Data (record deflection millimeters, crack locations, and crushed volume)', correctOrder: 3 },
          { id: 't4', text: 'Step 4: Analyze Test Failures & Redesign Prototype for Next Iteration (modify wall thickness, add gusset ribs, and re-test)', correctOrder: 4 }
        ]
      }
    ]
  },
  {
    id: 'lvl-4-3',
    stageId: 'prototype',
    worldNumber: 4,
    levelNumber: 3,
    code: '4-3',
    title: 'The Iteration Engine',
    subtitle: 'Turning "Failure" into Prototype v2.0',
    description: 'James Dyson built 5,126 failed vacuum prototypes before hitting the dual-cyclone hit. In engineering, "failure" is just data!',
    conceptTeaser: 'Iterating means keeping what worked, diagnosing what broke, and modifying one variable at a time.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Recall a moment when your prototype snapped or broke. What clue did that break point give you?',
    challenges: [
      {
        id: 'c-4-3-1',
        type: 'scenario-decision',
        prompt: 'During trial 3, the bridge joint snapped right where the popsicle sticks met with hot glue under 12 lbs of weight. What should the engineering team do?',
        explanation: 'Changing only one variable at a time (e.g. joint gusset reinforcement or glue type) allows you to isolate causation scientifically.',
        scenario: {
          context: 'You have 1 hour remaining in the maker lab before the final showcase.',
          choices: [
            {
              id: 'it-a',
              text: 'Throw the whole bridge in the trash and build a completely random new shape from scratch.',
              points: 10,
              feedback: 'Scrapping the whole design discards the parts that were working and teaches you nothing about the joint mechanics.',
              isBest: false
            },
            {
              id: 'it-b',
              text: 'Inspect the failure surface: add triangular cardboard gusset plates to redistribute tensile shear stress at that specific joint, then re-test.',
              points: 100,
              feedback: 'Sensational engineering! Diagnosing the shear stress concentration and adding gussets directly tackles the failure mechanism.',
              isBest: true
            },
            {
              id: 'it-c',
              text: 'Just tell the teacher the scale was calibrated incorrectly.',
              points: 0,
              feedback: 'Honesty and objective test rigor are essential to engineering ethics!',
              isBest: false
            }
          ]
        }
      }
    ]
  },

  // ==========================================
  // WORLD 5: PRESENT (Showcase Summit)
  // ==========================================
  {
    id: 'lvl-5-1',
    stageId: 'present',
    worldNumber: 5,
    levelNumber: 1,
    code: '5-1',
    title: 'The Hook & The Story Arc',
    subtitle: 'Captivating Your Audience in the First 30 Seconds',
    description: 'If you start with a boring wall of bullet points, your audience tunes out. Start with a vivid human story or startling statistic!',
    conceptTeaser: 'People don’t buy what you make until they feel why it matters.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'What surprising fact or personal story can you use to open your presentation?',
    challenges: [
      {
        id: 'c-5-1-1',
        type: 'multiple-choice',
        prompt: 'Which opening slide/hook will command the most attention for a presentation on accessible school playgrounds?',
        explanation: 'A vivid human narrative or compelling empathy visual makes the audience emotionally invested in solving the problem.',
        options: [
          { id: 'h1', label: '"Hello, my name is Chris and here is slide 1 of 42 about playground codes."', isCorrect: false, feedback: 'Dry, formulaic, and immediately induces presentation fatigue.' },
          { id: 'h2', label: 'A photo of empty swing chains with the quote: "Imagine every recess, watching your friends play while your wheelchair is trapped in 6 inches of woodchips."', isCorrect: true, feedback: 'Extraordinary hook! Centers empathy, real physical barriers, and an urgent human need.' },
          { id: 'h3', label: '"Playgrounds are outside and kids like them."', isCorrect: false, feedback: 'States the obvious without emotional or intellectual resonance.' },
          { id: 'h4', label: 'Starting with a 5-minute technical spreadsheet of bolt shear strengths.', isCorrect: false, feedback: 'Technical details belong in the prototype evidence section, not the hook.' }
        ]
      }
    ]
  },
  {
    id: 'lvl-5-2',
    stageId: 'present',
    worldNumber: 5,
    levelNumber: 2,
    code: '5-2',
    title: 'Defending Tradeoffs & Honest Data',
    subtitle: 'How True Engineers Handle Tough Questions',
    description: 'Every engineering design involves tradeoffs (e.g. lighter weight vs higher cost). Great presenters embrace tradeoffs with transparent data.',
    conceptTeaser: 'Acknowledging your prototype’s current limitations actually builds trust with judges and teachers!',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'What is one weakness in your current project, and how would you explain your future plan to address it?',
    challenges: [
      {
        id: 'c-5-2-1',
        type: 'scenario-decision',
        prompt: 'A teacher or judge asks: "Your solar tracker works well in direct sun, but how does it perform on heavy overcast days?" What is the best response?',
        explanation: 'Honesty paired with empirical test data and a concrete iteration plan demonstrates professional design thinking maturity.',
        scenario: {
          context: 'You are standing before the class during Q&A after your 5-minute presentation.',
          choices: [
            {
              id: 'p1',
              text: '"It works 100% perfectly all the time, clouds don’t affect it at all, trust me!"',
              points: 0,
              feedback: 'Denying the laws of physics damages your credibility.',
              isBest: false
            },
            {
              id: 'p2',
              text: '"In our overcast trial tests, efficiency dropped by 58%. To address this in v2.0, we have scoped a dual light-sensor threshold sleep mode to conserve battery during low lux."',
              points: 100,
              feedback: 'Perfection! You shared actual logged data, showed vulnerability, and presented a smart engineering countermeasure.',
              isBest: true
            },
            {
              id: 'p3',
              text: '"That question isn’t fair because it wasn’t in our rubric."',
              points: 15,
              feedback: 'Defensive responses miss the opportunity to show engineering problem-solving.',
              isBest: false
            }
          ]
        }
      }
    ]
  },
  {
    id: 'lvl-5-3',
    stageId: 'present',
    worldNumber: 5,
    levelNumber: 3,
    code: '5-3',
    title: 'The Google Classroom Grand Defense',
    subtitle: 'Package Your Portfolio & Ready for Turn-In',
    description: 'The final step of the design loop is sharing your findings with your teacher and community. Learn what makes a complete engineering portfolio!',
    conceptTeaser: 'A completed portfolio proves not just that you built something, but that you grew as a creative problem solver.',
    starThresholds: { oneStar: 60, twoStars: 80, threeStars: 95 },
    reflectionPrompt: 'Which of the 5 design stages (Ask, Research, Brainstorm, Prototype, Present) was your favorite, and why?',
    challenges: [
      {
        id: 'c-5-3-1',
        type: 'order-steps',
        prompt: 'Order the 5 design stages in the standard engineering cycle ready for your final showcase:',
        explanation: 'Ask -> Research -> Brainstorm -> Prototype -> Present forms the classic cycle of engineering design thinking!',
        draggableItems: [
          { id: 'st1', text: 'Step 1: ASK (Define the user, root problem & constraints)', correctOrder: 1 },
          { id: 'st2', text: 'Step 2: RESEARCH (Gather evidence, biomimicry & user empathy)', correctOrder: 2 },
          { id: 'st3', text: 'Step 3: BRAINSTORM (Generate wild ideas, plan & evaluate feasibility)', correctOrder: 3 },
          { id: 'st4', text: 'Step 4: PROTOTYPE (Build cheap, stress test & iterate)', correctOrder: 4 },
          { id: 'st5', text: 'Step 5: PRESENT (Pitch the story, evidence & turn in to Classroom)', correctOrder: 5 }
        ]
      }
    ]
  }
];

export const SAMPLE_PROJECT_TOPICS = [
  {
    id: 'ocean-cleanup',
    title: 'Autonomous Beach & Ocean Litter Drone',
    stageHint: 'Design a solar/wind-powered mechanical skimmer that collects floating micro-plastics without harming marine life.',
    constraints: 'Must cost under $40, float in salt water, and be harmless to crabs & turtles.'
  },
  {
    id: 'accessible-playground',
    title: 'Inclusive Sensory Playground Equipment',
    stageHint: 'Create outdoor play structures accessible to children with wheelchairs, sensory sensitivities, or visual impairments.',
    constraints: 'Complies with ADA clearance, uses recycled playground rubber, resists rain rust.'
  },
  {
    id: 'zero-waste-cafeteria',
    title: 'Cafeteria Food Waste Transformation System',
    stageHint: 'Eliminate unopened milk carton & vegetable waste through smart sorting and rapid classroom composting.',
    constraints: 'Operates in 20-minute lunch shifts without requiring custodial overtime.'
  },
  {
    id: 'earthquake-shelter',
    title: 'Emergency Rapid-Deploy Disaster Shelter',
    stageHint: 'A flat-pack temporary shelter that a family of four can erect in 15 minutes using zero power tools.',
    constraints: 'Packs into the trunk of a compact car, withstands 40 mph gusts, water-resistant.'
  },
  {
    id: 'custom-student',
    title: 'My Custom Classroom Challenge',
    stageHint: 'Enter your teacher’s specific assignment or a real issue you care about solving in your community!',
    constraints: 'Customizable criteria and constraints defined in your design notebook.'
  }
];
