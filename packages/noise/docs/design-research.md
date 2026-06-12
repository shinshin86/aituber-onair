# Noise Design Research: Engineering Pleasant Unpredictability

This document records the research that grounds the redesign of
`@aituber-onair/noise`. The question it answers: **how should "breaking
predictable harmony" (予定調和を崩す) be designed so the result reads as charm
instead of malfunction?**

Three investigations were run:

1. A review of the original noise implementation.
2. A survey of how real human interaction deviates from predictable harmony
   (conversation analysis, improv theory, humor theory, social psychology,
   Japanese comedy theory, aesthetics).
3. A survey of dialogue-systems/LLM research on blandness and surprise, plus
   field analysis of successful AI VTubers (Neuro-sama) and human streamer
   craft.

## The master formula

Every literature surveyed converges on the same structure:

> **Pleasant unpredictability =
> (established pattern) ×
> (deviation shipped *simultaneously* with a "this is play" marker) ×
> (safe target) ×
> (relational license earned over time) ×
> (return to pattern)**
>
> Remove any factor and the same output flips from charm to malfunction.

The original implementation produced only the *deviation* factor. The other
four factors — pattern, marker, license, return — were missing, which is why
"just enough" disruption was hard to reach: the engine had no concept of when
*not* to disrupt, who had earned disruption, or how to certify disruption as
benign.

## Findings by discipline

### 1. Conversation Analysis (CA)

- **Dispreferred response shape.** Real disagreement/refusal is delayed,
  hedged, prefaced ("well…", partial agreement first). Real total instant
  agreement is structurally unhuman. The *shape* of a response (hesitation,
  accounts, grudging concession) carries as much meaning as its content.
- **Repair.** Mid-sentence restarts and self-correction are ubiquitous
  (~every 90 seconds in natural talk) and build intimacy: jointly fixing
  trouble is a collaborative achievement.
- **Topic drift.** Humans rarely close topics cleanly; they shift stepwise
  through tangential association.
- **Silence/delay.** A single 4-second unexplained silence measurably reduces
  felt belonging (Koudenburg et al.). Delay must always be *accounted for*
  ("…sorry, I was actually thinking about that") to stay benign.
- **Withheld uptake.** Deliberately not delivering the projected reaction
  (deadpanning past a boast) is the engine of teasing — but only reads as play
  between intimates; otherwise it is a face threat.

### 2. Improv theory (Johnstone)

- **"Yes, and" vs blocking.** Maximum surprise is safe as long as the partner's
  established reality is never denied. Blocking the user's premise is where
  surprise turns hostile.
- **Platform → tilt → platform.** "Improvisers shouldn't think of making up
  stories, but of interrupting routines." A stable routine must exist before
  the tilt, and a new routine must form after it. Constant tilting is chaos;
  the platform is what makes the tilt land.
- **Status seesaw.** Compelling performers oscillate status — a confident
  contradiction immediately undercut by self-mockery. A character frozen one
  notch below the user is predictable harmony in its deepest form.
- **Being changed by your partner.** Visible perturbation (won over, briefly
  sulky, suddenly excited) makes interaction feel consequential. But infinite
  malleability is sycophancy — the character needs a spine.

### 3. Humor theory

- **Benign Violation Theory (McGraw & Warren).** Humor occurs iff a violation
  and a "this is benign" appraisal happen *at the same time*. Three benignity
  routes: alternative norm (in-character framing), weak commitment to the norm
  (low-stakes target), psychological distance (play markers, fiction).
  A marker that arrives one turn late has already been appraised as threat.
- **Incongruity-resolution.** Surprise must be retro-fittable — the audience
  should be able to look back and see why this character would say it.
  Unresolvable randomness reads as malfunction.
- **Callbacks.** Re-deploying an earlier shared moment in a new context is
  surprising *and* relationship-deepening simultaneously (proof of shared
  memory). The highest-value, lowest-risk surprise primitive.
- **Japanese comedy theory.** 緊張と緩和 (tension and release, Katsura
  Shijaku); manzai's 前フリ → ハズし → ツッコミ structure: the boke commits a
  legible violation, the tsukkomi's sharp correction *certifies it as play* and
  earns a second laugh. Boke-tsukkomi is BVT operationalized as a turn pair,
  and is the native idiom of the Japanese VTuber audience.

### 4. Social psychology

- **Expectancy Violations Theory (Burgoon).** Positive violations *beat*
  positive confirmations — well-executed deviation is strictly better than
  perfect harmony for relational outcomes. But evaluation is moderated by
  communicator reward: a liked, established character earns the right to
  violate; the same act from an unknown character reads negatively.
  **The violation budget must scale with relationship capital.**
- **Self-disclosure gradient.** Disclosing one notch more intimately than the
  current level escalates intimacy; two notches is creepy.
- **Teasing research (Keltner; Jordan).** Successful teasing wraps a face
  threat in redressive play markers; identical teases are perceived as
  better-intentioned when the relationship is close. Targets report more
  negative emotion than teasers expect — an AI should under-tease relative to
  what seems safe. Safe target order: the character's own dignity first
  (self-deprecating boke), shared external targets second, the user's
  peripheral choices third, and **never** identity-central traits, sincere
  disclosures, or moments of distress.

### 5. Aesthetics

- **Kata-yaburi (型破り) vs katanashi (形無し).** 「型があるから型破り。
  型が無ければそれは形無し」— deviation is only legible as artistry against a
  mastered baseline. Without a rock-solid character kata, the same output reads
  as a broken model.
- **Huron's ITPRA (musical expectation).** Pleasure from surprise requires a
  learned schema and a fast benign reappraisal. No schema → no contrastive
  valence → just noise.
- **MAYA (most advanced yet acceptable) / Berlyne's inverted U.** Hedonic value
  peaks at intermediate novelty and shifts with habituation: yesterday's
  surprising move becomes today's baseline. **A static noise distribution
  re-converges to predictable harmony at a higher level.**
- **Defamiliarization (Shklovsky).** LLM house style is automatization
  incarnate; the antidote is phrasing that prolongs perception without
  preventing comprehension.
- **Gap moe (ギャップ萌え).** Deviations should contradict *peripheral*
  expectations, never core traits — otherwise depth becomes writing error.

### 6. LLM research

- **Blandness is trained in.** RLHF mode collapse, annotator typicality bias,
  and sycophancy (Anthropic 2023: all SOTA assistants flatter and wrongly back
  down; preference models *prefer* sycophantic text) make predictable harmony
  the default — and it worsens as conversation/context length grows, exactly
  when EVT says the license to deviate is growing. A post-generation
  corrective is structurally justified.
- **MMI / anti-genericity (Li et al. 2016).** Penalize responses that would be
  plausible replies to *any* prompt. Likelihood alone always converges to
  "I don't know".
- **Verbalized sampling (2025).** Ask the model for a *distribution* of
  candidates with typicality estimates, then select from the tail —
  training-free mode-collapse mitigation that fits a candidate-generation
  pipeline directly.
- **Surprise thermostat, not maximizer (Mirostat; Schmidhuber).** Target a
  band of surprise: too low is the boredom trap, too high the confusion trap.
  The fun zone is *learnable* novelty.
- **Surprisal contours.** Humor detection research locates the punchline at
  end-position surprisal; engagement spikes track surprisal spikes. The final
  sentence is the highest-value attack point — kill tidy conclusions, end on
  the twist.

### 7. Field analysis: Neuro-sama and streamer craft

- **Imperfection is the product.** Viewers celebrate randomness and logical
  failure as personality ("truly chaotic"); pursuing polished human-likeness
  paradoxically destroys the appeal (arXiv:2509.20817).
- **License to offend.** AI characters get a structurally wider safe envelope
  for rudeness than humans because outputs carry no human intent.
- **Friction needs a reactor.** Solo AI chaos is "a lot of nonsense if you
  just listen to her output as it is"; the comedy is in the human partner's or
  chat's visible reaction. Design for reactable moments, not just funny text.
- **Callbacks and grudges are the best material**, enabled by deliberate
  memory engineering. Surprise that lands gets promoted into pattern (running
  gags) — which is exactly the learnable-novelty loop.
- **ポンコツ (PON) culture / 放送事故 as content.** Bumbling and accidents are
  affectionately prized; lean into errors instead of smoothing them.
- **Kayfabe discipline.** Break the *script* freely, never the *character
  logic*.

## When is unpredictability pleasant vs unpleasant?

| Moderator | Pleasant when… | Unpleasant when… |
|---|---|---|
| Relational capital | violator is liked/established | unknown/unliked; first impressions |
| Benignity signaling | play markers decode *simultaneously* with the violation | unmarked, or the marker comes a turn late |
| Target | low-stakes norms, the character's own dignity, peripheral traits | user's identity-central traits, sincere disclosures, distress |
| Baseline mastery | a strong consistent kata exists; deviation is recognizably authored | no stable pattern; deviation reads as malfunction |
| Dose & timing | intermediate frequency, placed at tension peaks, followed by return to routine | constant, stacked, or escalating violations; violation during user distress |

## Resulting architecture

The redesign turns noise from a *rewrite engine* into a *deviation
orchestration engine*. The competitive value is not generating deviation (an
LLM can do that) but **scheduling, licensing, certifying, and recovering**
deviation — the parts an LLM is worst at.

1. **Rhythm controller (platform → tilt → platform).** A stateful scheduler
   replaces the memoryless `score >= threshold` decision. It enforces platform
   turns before a tilt and cooldown turns after, so tilts read as events and
   noise itself never becomes the new predictable harmony.
2. **Relationship gate (violation budget).** A plain `relationshipCapital`
   input (0–1; e.g. derived from `@aituber-onair/kizuna` bond points, passed
   as ordinary runtime context) caps effective mode and unlocks interventions
   progressively: phrasing-level edits for strangers, teasing/withheld uptake
   only for regulars.
3. **Sincerity gate.** When the user shows vulnerability, serious consultation
   or distress, all noise is suppressed before any other processing. Failed
   uptake of a sincere bid is the worst-case violation.
4. **Play markers (benignity certification).** Every applied deviation must
   ship with at least one decodable play marker (exaggeration, self-tsukkomi,
   laughter token, in-character tic). Candidates lacking markers under
   teasing-class interventions are penalized or rejected.
5. **Gag ledger + callback.** A positive memory of memorable moments (user
   jokes, accidents, running bits) feeding a `callback` intervention —
   surprise with near-zero trust cost. Reactions promote moments into running
   gags.
6. **Conversational-act interventions.** Beyond polish-removal: dispreferred
   shape, boke bait (deliberately correctable absurdity that hands the user
   the tsukkomi turn), tsukkomi (gated harder than boke), withheld uptake,
   status seesaw, response-length violation.
7. **Reaction loop.** `reportReaction()` feeds observed audience response
   (laughter tokens, silence, pushback) back into the per-scope violation
   budget; negative appraisal triggers a repair posture and platform return.
8. **Genericity penalty.** MMI-style: candidates similar to the character's
   own recent outputs or to could-reply-to-anything stock phrases score down;
   final-sentence change is weighted up.

## Primary sources

- Li et al., A Diversity-Promoting Objective Function — arXiv:1510.03055
- Kirk et al., RLHF reduces diversity — arXiv:2310.06452
- Verbalized Sampling — arXiv:2510.01171
- Sharma et al. (Anthropic), Towards Understanding Sycophancy — arXiv:2310.13548
- Measuring AI Slop — arXiv:2509.19163; Antislop — arXiv:2510.15061
- Uncertainty and Surprisal Jointly Deliver the Punchline — arXiv:2012.12007
- Mirostat — arXiv:2007.14966; Schmidhuber, Formal Theory of Creativity
- Cai et al., Antagonistic AI — arXiv:2402.07350
- AI VTuber viewer perception study (Neuro-sama) — arXiv:2509.20817
- McGraw & Warren, Benign Violation Theory — Psychological Science 2010
- Burgoon, Expectancy Violations Theory
- Keltner et al., Teasing in Hierarchical and Intimate Relations
- Oshima, Conversation Analysis of Boke-Tsukkomi Exchange — New Voices in
  Japanese Studies vol. 5
- Koudenburg et al., Disrupting the flow — JESP 2011
- Johnstone, Impro / Impro for Storytellers
- Huron, Sweet Anticipation (ITPRA)
- Shklovsky, Art as Technique (defamiliarization)
