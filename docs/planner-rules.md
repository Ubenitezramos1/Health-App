# Workout Planner — Research-Backed Rules (v0.1, draft for approval)

The planner is a **rules engine**. It takes three inputs and produces a plan the user can then edit:

1. **Questionnaire** — goals, primary goal, experience, availability, session length, equipment, injuries, wellbeing.
2. **Physique scan** — per-muscle-group rating (lagging / balanced / strong), left–right asymmetries, posture flags.
3. **User overrides** — anything the user changes in the plan editor always wins.

Every plan shows a short **"Why this plan"** card: what was prioritized, what is on maintenance, and why.

---

## 1. Evidence summary (what the rules are built on)

| Topic | Finding | Rule it drives |
|---|---|---|
| Weekly volume | More weekly sets → more growth and strength, with diminishing returns (stronger for strength). Indirect sets count about half. (Pelland et al., 2024/2026) | Volume is counted as **fractional sets** per muscle per week; priority muscles get more sets, with caps. |
| Frequency | Once volume is equal, frequency barely changes growth; strength benefits from training a lift more often. (Pelland et al.) ACSM 2026: train every major muscle group ≥2×/week. | Each muscle is trained **≥2×/week** when there are ≥2 training days; the main lifts for strength goals are trained 2–3×/week. |
| Maintenance | About **1/3 of the original weekly volume** maintained the gains in young adults; older adults needed more. (Bickel et al., 2011) | "Strong" muscles go to **maintenance volume, never zero**. Users 50+ get a higher maintenance floor. |
| Proximity to failure | Growth improves the closer sets get to failure (useful range 0–5 RIR). Strength is similar across a wide RIR range (3–5 RIR is fine). (Robinson et al., 2024); ACSM 2026: failure is not required. | Default target **1–3 RIR**. Isolation exercises may go to 0–1 RIR on the last set. Strength main lifts stay at 2–3 RIR. |
| Load / rep range | Muscle grows across a wide load range; heavier loads are better for 1RM strength. (Schoenfeld et al., 2017) | Rep ranges are set by **goal** (section 4). |
| Rest periods | Longer rests (~3 min) beat 1 min for strength and size on compound lifts. (Schoenfeld et al., 2016) | 2–3 min rest on compounds, 1–2 min on isolations. Antagonist supersets save time for short sessions. |
| Muscle length | Training at **longer muscle lengths** likely gives more growth: seated leg curl beat lying leg curl, and overhead triceps work beat neutral-arm work. (Maeo et al., 2021, 2022; Wolf et al., 2025) Evidence is moderate, not settled. | Exercise picker **prefers lengthened-bias variations** when equipment allows. |
| Cardio alongside lifting | No meaningful interference with growth or max strength. Power suffers mostly when cardio and lifting share a session. (Schumann et al., 2022) Running may slightly blunt type I fiber growth; cycling did not. (Lundberg et al., 2022) | Cardio goes on rest days, or **after lifting / ≥3 h apart**. Cycling is preferred for muscle-gain goals. |
| Deloads | Expert consensus on how to design deloads (Bell et al., 2023). One trial found no muscle advantage from a mid-program deload week (Coleman et al., 2024), so deloads are about fatigue and readiness, not extra gains. | Deloads are **optional by default** and also suggested when performance stalls (see section 7). |
| Big picture | The biggest win is going from no training to some. Consistency beats complexity. (ACSM 2026) | Plans favor **fewer, repeatable exercises** that fit the user's time budget. |

---

## 2. How the scanner shapes the plan

### 2.1 Muscle groups rated
Chest, upper back/lats, shoulders (front/side/rear), biceps, triceps, forearms, core, glutes, quads, hamstrings, calves. Each is rated **Lagging / Balanced / Strong**. The scan also flags:
- **Left–right asymmetries**
- **Posture flags**, such as rounded shoulders or anterior pelvic tilt (shown as "possible," never diagnosed)

### 2.2 Priority tiers
Each muscle group gets one of three tiers:

| Tier | Assigned when | Volume | Placement |
|---|---|---|---|
| **Priority** | Scanner says lagging, **or** the user chose it as a focus area | Top of range | Trained first in the session, 2–3×/week |
| **Standard** | Balanced | Middle of range | Normal order |
| **Maintain** | Scanner says strong (and the user did not select it as a focus) | ~1/3–1/2 of standard, **never below the floor** | Later in the session; fewer exercises |

**Balance guardrails** keep the plan well-rounded:
- **No muscle group is ever dropped.** Every major group keeps at least its maintenance floor (3–6 fractional sets per week, depending on experience and age).
- **At most 3 muscle groups can be Priority at once.** If more qualify, the most lagging ones go first and the rest go into the next block. Prioritizing everything means prioritizing nothing.
- **Push:pull ratio** stays between 1:1 and 1:1.5 (pull ≥ push). If the scan flags rounded shoulders, it moves toward 1:1.5 with extra rear-delt and upper-back work.
- **Quads and hamstrings** each get direct work every week. Glutes and core are always included.
- **User's word wins.** If the user marked a muscle as a focus, it is at least Standard, even if the scan says strong. The scanner can **raise** a muscle's tier but never lower one the user asked for. Every tier can be changed in the plan editor.
- **Time budget is fixed.** Sets for Priority muscles come from Maintain muscles, so total session time stays within the user's chosen length.

### 2.3 Asymmetries
If one side is noticeably behind:
- Add one **unilateral exercise** for that region, such as a single-arm row or Bulgarian split squat.
- Start each set with the weaker side.
- The stronger side matches the weaker side's reps (no extra sets for the strong side).
- The tracker shows left and right reps for those exercises.

### 2.4 Without a scan
The planner works without a scan: every muscle is Standard, and focus areas from the questionnaire become Priority. After a scan, the plan offers to update.

---

## 3. Plan style: Efficient ("less is more") vs Full volume

Users pick a **plan style**. **Efficient is the default** when session length is 30–60 min or availability is 1–3 days. Anyone can switch styles in settings.

### 3.1 What the research says about low volume
| Finding | Source |
|---|---|
| **2–3 sets per exercise was not significantly worse than 4–6 sets** for hypertrophy. 1 set was clearly worse than multiple sets. | Krieger 2010 meta-analysis |
| In trained men, **1, 3, and 5 sets/exercise gave similar strength gains**. 5 sets grew the most muscle. | Schoenfeld et al. 2019 |
| Volume has **diminishing returns**: the first sets give the most benefit per set. | Pelland et al. 2024 |
| For limited time: **at least 4 weekly sets per muscle**, 6–15 RM loads, mostly multi-joint exercises, specific warm-ups only. Supersets, drop sets, and rest-pause **roughly halve session time** while keeping volume. | Iversen et al. 2021 ("No Time to Lift?") |
| Drop sets matched traditional sets for hypertrophy in **about 1/2 to 1/3 of the time**. | Sødal et al. 2023 meta-analysis |
| Lifters can keep gaining 1RM strength on **about 3–6 hard sets/week per lift**. | Androulakis-Korakakis et al. 2021 |
| Growth improves the closer sets get to failure, so **fewer sets need to be harder**. | Robinson et al. 2024 |

**Trade-off to state in the app:** Efficient plans get most of the strength and a large share of the muscle gain for much less time. Users chasing maximum size, especially advanced lifters, gain somewhat more from more weekly sets. Efficient plans make up part of that gap with effort (sets taken closer to failure).

### 3.2 Efficient style rules
- **Sets per exercise:**
  - Main compound lifts: **2 hard working sets**, after 1–2 warm-up sets
  - Secondary compounds: 2 sets
  - Accessory and isolation: 2–3 sets (3 for Priority muscles)
- **Exercises per session:** 4–6 target; the app caps at 7 (8 for 1–2 day plans) so a 3-day plan can still hit every muscle twice a week. Time budget is the real limit.
- **Effort:**
  - Compounds: **1–2 RIR**
  - Isolations: **0–1 RIR on the last set**
  - Because volume is low, every working set counts. There are no "junk" sets.
- **Weekly volume** (fractional sets per muscle):

| Experience | Maintain | Standard | Priority |
|---|---|---|---|
| Beginner | 3–4 | 4–6 | 6–9 |
| Intermediate | 3–4 | 6–8 | 8–12 |
| Advanced | 4 | 6–9 | 9–12 |

  **4 sets/week per muscle is the floor** (Iversen) for Standard and Priority muscles. Maintain muscles may sit at 3–4.

- **Frequency:** with 2+ training days, each muscle is still hit **2×/week**. This spreads the few weekly sets so each session stays short.
- **Time savers, in order:**
  1. **Antagonist supersets** (chest + back, biceps + triceps, quads + hamstrings). No loss of performance and roughly halves rest time.
  2. **Drop set on the last set** of 1–2 isolation exercises for Priority muscles. Optional, toggled per exercise.
  3. **Rest-pause on the last set** of machine or cable isolations. Optional.
  These techniques are only used on isolation and machine exercises. They are **never** used on barbell squats, deadlifts, or other high-skill lifts, for safety.
- **Rest periods:** compounds 2–3 min, isolations 60–90 s, and supersets 60–90 s between pairs.
- **Warm-up:** 5 min general, then 1–2 ramp-up sets on the first compound for each pattern. No long stretching routine unless the goal is flexibility.
- **Progression:** same double progression. Efficient plans **do not add sets over time** by default. Progress comes from load and reps. Adding volume is offered at the end of a block only if the user wants it.

**Example — 3 days, 45 min, intermediate, full body:**
- Squat 2×6–8
- Bench press 2×6–8
- Superset: chest-supported row 2×8–10 + seated leg curl 2×10–12
- Overhead triceps extension 2×10–15
- Incline curl 2×10–15

That comes to about 12 working sets and about 40–45 min. Chest, back, quads, and hamstrings each get about 6–8 fractional sets per week across the 3 days.

### 3.3 Full volume style
Use the table below. This style is for users with more time who want maximum hypertrophy.

## 3b. Full volume weekly targets (fractional sets per muscle per week)

| Experience | Maintain | Standard | Priority |
|---|---|---|---|
| Beginner (< 6 mo) | 3–4 | 6–10 | 10–12 |
| Intermediate (6 mo – 2 yr) | 4–6 | 10–14 | 14–18 |
| Advanced (2 yr +) | 5–6 | 12–16 | 16–20 |

- **Fractional counting:** direct sets count as 1. Sets where the muscle is a secondary mover count as 0.5. For example, a bench press set gives chest 1, triceps 0.5, and front delt 0.5.
- **Per-session cap:** about 8–10 hard sets per muscle. Beyond that, add another training day rather than more sets.
- **Age 50+:** the maintenance floor rises by about 2 sets (older adults needed a higher maintenance dose in Bickel et al.).
- **First block is conservative:** start at the **bottom** of each range. Volume rises in the next block only if recovery check-ins and progression stay good.

### Time budget check
Each session is about: 8–10 min warm-up + sets × (work + rest).
- Compound sets take about 3–3.5 min; isolation sets about 2 min.
- If the plan doesn't fit, the engine first **pairs antagonist muscles in supersets** (such as biceps with triceps), then trims Standard volume. Priority volume is trimmed last.

---

## 4. Rep ranges and effort by primary goal

| Primary goal | Main compounds | Accessories / isolation | RIR | Notes |
|---|---|---|---|---|
| Build muscle | 6–10 | 10–15 (some 12–20) | 1–3 (last isolation set 0–1) | |
| Get stronger | 3–6 | 6–12 | 2–3 on main lifts | Main lifts trained 2–3×/week |
| Lose fat / recomp | 6–10 | 10–15 | 1–3 | Same as muscle-building to keep muscle; adds a daily step goal and 2–3 cardio sessions |
| Endurance | 10–15 | 12–20 | 2–3 | Shorter rests; 3+ cardio sessions |
| Athletic performance | 3–6 strength plus explosive work (jumps, throws at 30–70% effort) | 6–12 | 2–3 | Explosive work comes first in the session and is never done right after cardio |
| General health | 8–12 | 10–15 | 2–3 | ACSM 2026 baseline: all major groups ≥2×/week, plus 150 min/week of moderate cardio |

These ranges feed directly into the tracker's double progression: reps climb to the top of the range on **all sets**, then the weight goes up by the smallest step and reps reset to the bottom of the range.

---

## 5. Split selection

| Days/week | Beginner | Intermediate / Advanced |
|---|---|---|
| 1 | Full body (minimal effective dose) | Full body |
| 2 | Full body A / B | Full body A / B |
| 3 | Full body A / B / A | Full body ×3 **or** Upper / Lower / Full |
| 4 | Upper / Lower ×2 | Upper / Lower ×2 |
| 5 | Upper / Lower / Full / Upper / Lower | Upper / Lower + Push / Pull / Legs |
| 6 | Push / Pull / Legs ×2 | Push / Pull / Legs ×2 |
| 7 | 6 training days + 1 active recovery day (never 7 hard days) | Same |

- The user picks an exact day count within their availability bucket.
- Rest days are filled with walking, cardio, mobility, or stretching, as in your example.
- These structures match long-used templates (full body, upper/lower, PHUL-style power/hypertrophy, PPL). We use the structure, not copied programs.

---

## 6. Exercise selection

Every exercise in the library is tagged with:
- Primary and secondary muscles (with fractional credit)
- Movement pattern: squat, hinge, horizontal or vertical push, horizontal or vertical pull, lunge, carry, isolation, core
- Equipment needed: none / bands / dumbbells / bench / bar / kettlebell / barbell / cable / machine
- Difficulty level
- Unilateral flag
- **Lengthened-bias flag**, such as seated leg curl, overhead triceps extension, incline curl, deficit push-up, or Romanian deadlift
- Injury contraindications by body area (for example, overhead pressing is flagged for current shoulder injuries)
- **2–4 alternates** with the same movement pattern and muscle credit. These power the "swap exercise" button.

**How exercises are picked:**
- Each training day covers its movement patterns. Each Priority muscle gets 1 compound plus 1 isolation per week (more as volume requires).
- A lengthened-bias variation is preferred when the equipment allows it.
- Easier, more stable variations are used for beginners (machines, dumbbells, goblet squats).
- Exercises stay the **same for the whole block** so progressive overload can be tracked. Swaps carry the user's history over when the alternate is very similar.

---

## 7. Progression, fatigue, and deloads

- **Double progression** (already approved): advance only when all sets reach the top of the range. Weight goes up by the smallest step, with an optional 2.5 lb step.
- **Missed target:** the same target is repeated next session.
- **Stall:** 2 sessions in a row with no progress on an exercise. The progress page suggests a fix: hold the weight, drop it about 5–10% and rebuild, or swap to an alternate.
- **Planned deload** (optional, on by default):
  - Beginners: every 8th week. Everyone else: every 6th week.
  - Same exercises, about 50% of the sets, same or about 10% lighter weight, RIR 3–4.
- **Suggested deload:** offered when 2 or more exercises stall, or the daily check-in averages are low for 3 or more days. The user accepts or declines.
- **End of block** (after a deload): the app prompts a re-scan and a questionnaire check. Tiers are recalculated: muscles that were lagging and are now balanced move to Standard, and newly lagging muscles become Priority.

---

## 8. Daily check-in suggestions (user approves; nothing changes automatically)

| Check-in | Suggestion |
|---|---|
| Low energy or poor sleep (≤ 2/5, or under 6 h) | Drop the last set of each exercise, or keep sets and add +1 RIR |
| Very low for several days | Suggest a light day or a deload |
| High energy and good sleep | Proceed as planned (never more volume than the plan) |

---

## 9. Safety rules

- Exercises for **current** injuries are excluded and swapped for alternates that avoid that area.
- **Severe** injuries or flagged conditions (heart, blood pressure, pregnancy, recent surgery) show a "check with your doctor first" prompt. The plan is limited to low-risk options until the user confirms clearance.
- The app never diagnoses. Scanner and posture results are labeled as **estimates**.
- Users must be 18+ and accept the health disclaimer.

---

## Sources
- Pelland et al., *The Resistance Training Dose-Response* (preprint 2024; Sports Medicine) — https://sportrxiv.org/index.php/server/preprint/view/537
- ACSM 2026 resistance training position stand (news coverage) — https://www.newswise.com/articles/acsm-unveils-landmark-2026-resistance-training-guidelines-first-update-in-17-years · https://nfpt.com/beyond-the-guidelines-what-the-2026-acsm-position-stand-gets-right-and-what-it-changes-for-personal-trainers/
- Bickel, Cross & Bamman (2011), *Exercise dosing to retain resistance training adaptations* — https://pubmed.ncbi.nlm.nih.gov/21131862/
- Robinson et al. (2024), *Proximity to failure meta-regressions* — https://www.fau.edu/newsdesk/articles/muscle-growth-strength-study
- Schoenfeld et al. (2017), *Low- vs high-load meta-analysis* — https://pubmed.ncbi.nlm.nih.gov/28834797/
- Schoenfeld et al. (2016), *Longer interset rest periods* — https://pmc.ncbi.nlm.nih.gov/articles/PMC5131226
- Stretch-mediated hypertrophy / training at long lengths — https://www.strongerbyscience.com/stretch-mediated-hypertrophy/ · https://peerj.com/articles/18904
- Schumann et al. (2022), *Concurrent training meta-analysis* — https://sportrxiv.org/index.php/server/preprint/download/37/71/54
- Bell et al. (2023), *Deloading Delphi consensus* — https://shura.shu.ac.uk/32417/
- Coleman et al. (2024), *Gaining more from doing less?* (PeerJ) — https://doi.org/10.7717/peerj.16777

- Krieger (2010), *Single vs multiple sets for hypertrophy* — https://pubmed.ncbi.nlm.nih.gov/20300012/
- Schoenfeld et al. (2019), *Volume enhances hypertrophy but not strength in trained men* — https://bohrium.dp.tech/paper/arxiv/e946ce5988e619a5a5df79e1160b65cac13f0cb2709342f405961f81d5d6bc98
- Radaelli et al. (2015), *1, 3, and 5 sets dose-response* — https://pubmed.ncbi.nlm.nih.gov/25546444/
- Iversen et al. (2021), *No Time to Lift?* — https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772
- Androulakis-Korakakis et al. (2021), *Minimum effective training dose for 1RM strength* — https://frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2021.713655/text
- Sødal et al. (2023), *Drop sets meta-analysis* — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10390395/

Caveat: several findings above were checked against abstracts and reputable summaries, not full texts. Numbers in this doc are planning defaults, not exact effect sizes, and can be tuned.

---

## 10. Bodyweight and band exercises (added Nov 2026)

Weight can't be adjusted in steps here, so a fixed rep target ("2 × 6–10") can leave a set far from failure.
Effort is fixed instead, and reps float.

| Rule | Value | Evidence |
|---|---|---|
| Effort | Stop 1–2 reps short of failure; last set to failure | Proximity to failure drives growth (Robinson 2024); failure itself isn't required (2022 meta-analysis) |
| Rep window | 8–25 (strength/athletic 5–15, endurance 12–30) | Similar hypertrophy across low/moderate/high loads to failure (Lopez 2021); 25–35RM ≈ 8–12RM in trained men (Schoenfeld 2015); very light loads underperform (Lasevicius 2018); heavier is better for strength |
| Sets | Always 3 (efficient) / 3–4 (full); if time is short, drop exercises, not sets | User decision |
| Progress | About +1 rep per set per session, no ceiling | Reps are the overload |
| Step up | Every set past the top of the window, 2 sessions in a row | Mastery, not one good day (reasoned threshold — no study gives an exact number) |
| Step order | 3-second lowering → added weight (if available) → next variation | Smallest jump first; 0.5–8 s reps build similar muscle, >10 s worse (Schoenfeld 2015) |
| Step back | Fewer than 6 reps on a new step | That step was too big |
| Who decides | App offers ("Switch" / "Not yet"); never automatic | User decision |
| After a step | Only sessions at the new step count toward the next one | Prevents back-to-back jumps |

**Choosing variations by experience:** each bodyweight exercise is rated easy / moderate / hard for a trained person.
Trained lifters never get "easy" moves (bodyweight squat, glute bridge, doorframe row) as main or secondary lifts;
beginners don't get "hard" ones. Intermediates reach skill-heavy moves (archer push-up, shrimp squat) through the
ladder rather than on day one. In a full gym, loaded lifts lead; only pull-ups, chin-ups and dips compete with them.

**Ladders (easiest → hardest):** knee → incline → push-up → deficit → decline → archer; doorframe row → bent-knee
inverted row → inverted row → feet-elevated; band-assisted pull-up → pull-up; bodyweight squat → split squat →
Bulgarian → shrimp; pike → elevated pike; glute bridge → single-leg hip thrust; sliding leg curl → Nordic lowering;
dead bug → hollow hold; chair dip → dip. Steps the user lacks equipment for, or that load an injury, are skipped.

Sources: Lopez 2021 (https://pubmed.ncbi.nlm.nih.gov/33433148/) · Schoenfeld 2015 low vs high load
(https://www.bisp-surf.de/Record/PU201510008067) · Lasevicius 2018 (https://www.frontiersin.org/articles/10.3389/fphys.2018.00402/full) ·
Schoenfeld 2015 repetition duration (https://pubmed.ncbi.nlm.nih.gov/25601394/) · Kikuchi & Nakazato 2017
(https://pmc.ncbi.nlm.nih.gov/articles/PMC5812864) · Kotarsky 2018 (https://pubmed.ncbi.nlm.nih.gov/29466268/)
