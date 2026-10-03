# Phronesis sources

Read 2026-10-01. Numbers match "What the rules are built on" in SKILL.md.

1. **Working memory in adult ADHD.** Alderson, Kasper, Hudec and Patros, "Attention-
   deficit/hyperactivity disorder (ADHD) and working memory in adults: a meta-analytic
   review", Neuropsychology, 2013. 38 studies; moderate deficits in phonological and
   visuospatial working memory that persist into adulthood.
   https://hero.epa.gov/reference/1859393/
   Supporting: Pievsky and McGrath, "The Neurocognitive Profile of ADHD: A Review of
   Meta-Analyses", Archives of Clinical Neuropsychology, 2018.
   https://academic.oup.com/acn/article/33/2/143/3926568

2. **Time perception in ADHD.** Zheng, Wang, Chiu and Shum, "Time Perception Deficits in
   Children and Adolescents with ADHD: A Meta-analysis", Journal of Attention Disorders,
   2022. 27 studies, 1,620 participants with ADHD.
   https://journals.sagepub.com/doi/abs/10.1177/1087054720978557
   "Time-Perception Deficits in ADHD: A Systematic Review and Meta-Analysis": 55 studies,
   deficits across all timing paradigms.
   https://www.researchgate.net/publication/376824492
   Limitation: much of the timing evidence comes from children and adolescents.

3. **ADHD in software engineering.** Liebel, Langlois and Gama, "Challenges, Strengths,
   and Strategies of Software Engineers with ADHD: A Case Study", ICSE-SEIS 2024.
   Struggles with task organisation and estimation, attention and relating to others;
   strengths in creativity, puzzle-solving and thinking ahead.
   https://arxiv.org/abs/2312.05029

4. **Autism in software engineering.** Sasportes, Liebel and Goulão, "Investigating the
   Experience of Autistic Individuals in Software Engineering", 2025. 16 interviews (14
   level 1) and a 49-person validation survey. Prefer written over oral communication,
   explicit guidelines, unambiguous tasks and technical feedback; difficulty with tone,
   ambiguity and resuming focus after interruptions.
   https://arxiv.org/html/2511.02736
   Earlier: Morris, Begel and Wiedermann, "Understanding the Challenges Faced by
   Neurodiverse Software Engineering Employees", ASSETS 2015 (Microsoft Research).

5. **Accessible written communication.** Casimiro, Sousa and Heron, "What Matters in
   Accessible Written Communication for Neurodivergent People? A Scoping Review",
   Scandinavian Journal of Disability Research, 2026. 25 studies: plain language,
   important content first, consistent words, defined terms, no idioms, predictable
   general-to-specific order, explicit tone. It found no ADHD-specific recommendations
   distinct from the general ones.
   https://sjdr.se/articles/10.16993/sjdr.1297
   Communication modes: Howard and Sedgewick, "'Anything but the phone!': Communication
   mode preferences in the autism community", Autism, 2021. 245 autistic adults; written
   modes preferred in employment.
   https://journals.sagepub.com/doi/10.1177/13623613211014995

6. **Double empathy.** Crompton, Ropar, Evans-Williams, Flynn and Fletcher-Watson,
   "Autistic peer-to-peer information transfer is highly effective", Autism, 2020.
   Information passed as accurately in all-autistic chains as in all-non-autistic ones,
   and less accurately in mixed chains.
   https://pubmed.ncbi.nlm.nih.gov/32431157

7. **Neurodivergent people's use of LLMs.** Two qualitative studies.
   - Carik, Ping, Ding and Rho, "Exploring Large Language Models Through a Neurodivergent
     Lens: Use, Challenges, Community-Driven Workarounds, and Concerns", 2024. Reddit posts
     from 61 communities.
     Main challenge: "overly neurotypical LLM responses". Workaround: users edit prompts
     to be more neurodivergent-friendly. Concern: overreliance. Read as abstract only.
     https://arxiv.org/abs/2410.06336
   - Chen, Meng and Nie, "Not Just Me and My To-Do List": Understanding Challenges of Task
     Management for Adults with ADHD and the Need for AI-Augmented Social Scaffolds,
     CSCW 2026. 22 interviews and a 20-person follow-up. Suggestions welcomed, directives resisted; users want control over the
     amount and tone of support; extra setup steps are a burden.
     https://arxiv.org/html/2603.17258v1
   Limitations: both are qualitative and report preferences, not measured effects of a
   reply style. The second covers ADHD only. Neither separates autism level 1.

Design guidance: W3C, "Making Content Usable for People with Cognitive and Learning
Disabilities" (Working Group Note): familiar, consistent patterns; uncluttered pages;
clear steps. https://www.w3.org/TR/coga-usable

Built on: ayghri/i-have-adhd (MIT), https://github.com/ayghri/i-have-adhd

## Engineering evidence used by the audit

These support the phronesis-audit skill, not the reply rules, and are not about
neurodivergent readers. Read 2026-10-01.

- Becker, Rush, Barnes and Rein, "Measuring the Impact of Early-2025 AI on Experienced
  Open-Source Developer Productivity", METR, 2025. Randomized trial: 16 developers, 246
  tasks in mature projects they knew well. Predicted a 24% speedup, estimated 20%
  afterwards, measured 19% slower. Limits: early-2025 tools (Cursor Pro, Claude 3.5 and
  3.7 Sonnet), small sample. Used for the audit's baseline step (phase 5) and its warning
  not to assume a gain (phase 1). https://arxiv.org/abs/2507.09089
- DORA, "State of AI-assisted Software Development 2025". Nearly 5,000 respondents; AI
  raises delivery throughput and instability together; strong automated testing, version
  control and fast feedback reduce the instability. Limits: a survey, so correlation. The
  names of its seven AI capabilities were not read. Used for the audit's gate check and
  "missing gates first" ordering. https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report
- Anthropic, "Best practices for Claude Code". Practice guidance, not a controlled study.
  Used for the CLAUDE.md check, verification gates, the fresh-context reviewer and the
  AskUserQuestion interview. https://code.claude.com/docs/en/best-practices
- Anthropic, "Effective context engineering for AI agents". Read through a summary only.
  Used for the cost-per-piece check. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

## Design principles (heuristics, not evidence)

Named software-engineering laws used as reasons in SKILL.md. They are rules of thumb from
practice, not research findings, and they are not in the README research table. Source of
the list: https://github.com/dwmkerr/hacker-laws (licence not checked; this file uses its
own wording).

| Principle | Used for |
|---|---|
| Chesterton's Fence | Find out why something exists before removing it: rule 15, and the audit's CLAUDE.md cuts |
| Goodhart's Law | Use several measures and guard against gaming: the audit's baseline (phase 5) |
| Hick's Law | Fewer options are faster to choose from: rule 12 and the option caps. It has measurement behind it. |
| Principle of Least Astonishment | Behave as the reader expects: rule 15 |
| Kernighan's Law | Plain code beats clever code: rule 15 |
| Gall's Law | Grow from a simple setup that works: the audit's staged install plan |
| Tesler's Law | Complexity moves, it does not vanish, so cut words and never facts: the one rule |
| Hofstadter's Law | Work runs over its estimate even when the estimate allows for it: rule 4 |
| DRY | One authoritative place per fact: used to maintain this repository, for example by keeping "Before sending" short instead of repeating rules 5 and 14 |

## Rule by rule

How each source improves the skill, and the expected benefit. The benefits are expected,
not measured.

| How it improves this plugin | Expected benefit for you | Source |
|---|---|---|
| State is restated every turn (rule 3). | You can leave and return without rereading the whole thread. | Alderson et al., 2013 |
| Lists show at most five items (rule 12). | Less to hold in your head at once. | Pievsky and McGrath, 2018 |
| Time is given in real units with its condition, never "a bit of work" (rule 4). | You can plan your time from a real number. | Zheng et al., 2022 |
| Estimates always carry numbers (rule 4). | Fewer surprises from tasks that take longer than they sounded. | Time-perception review, 55 studies |
| The answer or next action comes first, steps are single and numbered, each reply covers one topic (rules 1, 2, 13). | Starting is easier because the first line tells you what to do. | Liebel et al., 2024 |
| Instructions are explicit, changes are announced, feedback is technical, code changes stay predictable (rules 5, 8, 10, 15). | No hidden meaning to decode, and no tool or structure changes you did not ask for. | Sasportes et al., 2025 |
| The same word is used for the same thing, terms are defined, every reply has the same shape (rules 6, 7). | You know where to look in every reply. | Casimiro et al., 2026 |
| Everything is plain written text, with nothing that depends on a call or on voice (the whole skill). | You can read at your own pace, and come back to it later. | Howard and Sedgewick, 2021 |
| Writing uses the explicit, literal register, with nothing implied (rule 5). | Less guessing about what the AI means. | Crompton et al., 2020 |
| The prompt workaround is built in and persistent (the whole skill, always-on mode). | Less setup work each session. | Carik et al., 2024 |
| The next action is a recommended default you can decline, and the density is yours to set (rule 7, density setting). | You stay in control of what happens next and how much you read. | Chen et al., 2026 |
| Layouts are consistent and uncluttered: familiar shape, short lists, clear steps (rules 7, 12, 2). | Replies are quicker to scan. | W3C, cognitive accessibility note |

Not claimed: these are research findings about groups, not rules about any individual.
None of the sources is a clinical guideline for communication; clinical guidelines such as
NICE's cover diagnosis and treatment.
