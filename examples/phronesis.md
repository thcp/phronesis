# Phronesis: the same answer, two ways

**Question:** "Is issue #701 valid?" (a reported audio stutter, with a patch attached)

## Without Phronesis

> Great question! I took a look at the issue and the code. It seems like the reporter might
> be onto something here. Basically, the scheduler compares two clocks that drift apart
> when you slow things down, so things can kind of get out of sync over time, which would
> explain the stuttering. The patch they sent looks mostly fine, though there are a couple
> of small things I'd tweak, and also the slider change is a bit of a different story since
> it touches a design decision. By the way, the patch no longer applies cleanly either. Let
> me know if you'd like me to dig deeper!

## With Phronesis

> **Yes, the stutter bug is real.** The slider half is a design decision, not a bug.
>
> **Why** (verified in `chunkedAudioEngine.js:606`): the scheduler compares source time,
> which runs at 1x, with output time, which runs at 0.75x. The gap grows by 0.25 s every
> second, so after about 50 s the audio runs out.
>
> **The patch:**
> 1. The engine fix is correct, with two small changes needed.
> 2. The slider replaces an earlier design decision, so it needs its own decision.
> 3. It no longer applies to `main`. Not verified: whether that conflict is trivial.
>
> **Next action:** reply on #701 confirming the bug. About 5 minutes.

## What changed

| Change | Rule |
|---|---|
| The answer is the first line | 1, first line is the answer or next action |
| "might be onto something", "kind of" become "Yes" and a measured gap | 5, literal; 10, certainty stated |
| "out of sync over time" becomes "0.25 s every second, about 50 s" | 5, literal; 4, time in real units |
| Verified and not verified are marked separately | 10, certainty stated |
| The "by the way" became item 3 of a numbered list | 2, numbered steps; 13, one topic |
| "Let me know..." became one action with its duration | 14, no pleasantries; 4, time |

## A change of plan

> **Changing approach before continuing:** tuning the old time-stretcher only trades echo for
> graininess, so I propose replacing it instead. That is about a day of work rather than 30
> minutes. Go ahead, or keep tuning?

Rule 8: announce changes before acting, with the reason and the cost.
