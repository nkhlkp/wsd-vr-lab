# VR Interface for the Work System Design and Virtual Reality Lab

### Reading Document - Mid-Evaluation Prep

_Purpose of this document: this is background reading for everyone in the group before we split up presentation segments._

---

## 1. Motivation / Context

Let's start with _why_ this project exists at all, in plain terms.

The Work System Design and Virtual Reality Lab is a physical lab where students perform experiments related to industrial/work-system concepts - things like measuring how long a task takes, studying how a worker moves while doing a task, checking whether a workstation is arranged efficiently, finding the learing rate of a person based on a task being done and so on. These aren't abstract - they involve real equipment: stopwatches, layout boards, posture-assessment charts, workstation mock-ups.

Right now, the way a new student learns about these experiments is the traditional way:

- An instructor explains the experiment out loud, once, to a batch of students.
- Students read a lab manual (text + maybe a photo or two) before or after.
- If a student misses that walkthrough, forgets it, or wants to revisit it, there's no good fallback - they either bother a TA again or flip through a manual that doesn't really convey what the _space_ and _equipment_ look like.

**A concrete example to picture: compensatory (make-up) labs.** If a student misses a scheduled lab session - illness, CDC or a meeting perhaps, whatever the reason - they're usually slotted into a compensatory class later. These compensatory sessions are exactly where this problem is at its worst: the professor or TA who'd normally walk students through the experiment often _isn't even available_ for the make-up slot (it might be run by a lab assistant, or the student might be told to "figure it out" using the manual and get evaluated on the readings). This is the scenario where a self-paced VR walkthrough stops being a "nice to have" and becomes genuinely necessary - it's the one situation where there may be no live instructor to fall back on at all. We should lean on this as one of our strongest justifications for the project, since it's not a hypothetical efficiency gain, it's a real gap that currently has no good solution.

A second reason, tied directly to how the lab is actually run: experiments happen once a week in the lab session itself, but the lab report is written afterward, from rooms, and submitted the following week. In practice, this means students are writing up procedure, setup, and analysis almost entirely from memory plus whatever raw observation numbers they managed to jot down, with no way to go back and re-check what the setup actually looked like, or re-confirm a step they're unsure about, once they've left the room. A week is long enough for details like exact table arrangement, what order steps were performed in, or what a particular reading was measuring to get fuzzy. A student who can revisit the same 3D station at home, walk back up to "Time Study," re-read the procedure panel, re-check what was being measured and how - is writing that report from a reliable reference instead of a half-remembered afternoon, which should directly improve both the accuracy and the quality of the reports.

This is the gap we're addressing: **there's no self-paced, spatially intuitive, repeatable way for a student to understand what an experiment is, what it looks like, and what to expect - before they actually do it - and this gap is at its sharpest during compensatory sessions where an instructor may not even be present.**

VR (or a browser-based 3D interface, more on that below) is a reasonable answer because it's one of the few mediums that can actually recreate _space_ - where things are, how big they are, how you'd walk up to them - which a PDF or a slide simply cannot do.

---

## 2. Problem Statement

Here's the problem stated tightly, followed by why each part matters:

> **Students entering the Work System Design and Virtual Reality Lab currently have no self-paced, spatially accurate way to explore and understand the lab's experiments before hands-on sessions - leading to repeated instructor overhead, inconsistent orientation quality across batches, and shallow pre-lab understanding.**

Breaking that down:

- **"No self-paced way"** - everything currently depends on a live person explaining it live, at a fixed time.
- **"Spatially accurate"** - a manual can describe an experiment, but it can't show you _where the eye fatigue test table is relative to the layout board_, or what the room actually feels like to walk into. Spatial context genuinely changes how well you understand a setup - this is well established in how people learn physical/procedural tasks.
- **"Repeated instructor overhead"** - TAs/instructors re-explain the same thing to every batch, every semester. This doesn't scale.
- **"Inconsistent orientation quality"** - the explanation you get depends on which TA you got, how rushed they were that day, whether you were paying attention. It's not standardized.
- **"Shallow pre-lab understanding"** - students often walk into an experiment without a real sense of _why_ they're doing it or _what_ they're supposed to observe, which affects how much they actually learn from the hands-on part.

**Situation that makes this concrete:** think of walking into a chemistry lab for the first time without ever having seen a titration setup - you'd fumble with the glassware even if you understood the theory. Same idea here - students often understand the _theory_ of, say, a motion study, but have never seen or navigated the actual physical setup until they're standing in front of it, slightly overwhelmed, with a TA waiting.

**The compensatory-class angle deserves its own callout here.** A student attending a make-up lab is frequently in a worse position than a student attending on schedule - no live walkthrough, sometimes no one qualified in the room to explain the setup, and the expectation that they'll still perform (and be evaluated) at the same standard. For that student, the current fallback (a text manual, or asking around) is genuinely inadequate. A self-paced VR/3D orientation removes the dependency on a live instructor being present at all - the student can walk through the exact same room, tables, and explanations that everyone else got, on their own schedule, with no degradation in orientation quality just because they're in a make-up slot.

---

## 3. Objectives

What we're actually trying to achieve, stated as goals (useful for a slide, and useful for us to check our own scope against later):

1. **Enable self-guided exploration** of every experiment in the lab, without needing a TA present.
2. **Recreate the physical layout** of the lab reasonably faithfully, so students build real spatial familiarity before they walk in physically.
3. **Standardize the orientation experience** - every student gets the same quality of introduction, regardless of batch or TA availability.
4. **Reduce repeated instructor time** spent on basic orientation, freeing that time for actual hands-on guidance.
5. **Make the material more engaging than a static manual** - walking up to a table and seeing it "activate" is a fundamentally different (and stickier) experience than reading a paragraph.
6. **Support compensatory/make-up lab sessions specifically** - give a student who missed the regular session a way to get the same-quality orientation independently, even when no instructor is available to walk them through it in person.

---

## 4. Scope of the Project

Every project needs a boundary - what we're doing _now_, and what we're explicitly leaving out for a later phase (or out entirely). This matters a lot at a mid-eval because it shows the evaluators we know what we're not promising.

**In scope (this project, current phases):**

- A 3D walkable model of the actual lab room (or a close approximation of it).
- Multiple "stations," one per experiment, placed where the real tables/equipment are.
- A way to walk up to a station and get pulled into a focused view/interaction for that experiment.
- A modular system, so that adding a new experiment later doesn't mean rebuilding everything - more on this in Section 6.

**Out of scope (for now, possibly future work):**

- Full physical simulation of experiment mechanics (e.g., actual physics-accurate stopwatch timing against a moving worker).
- Multiplayer / multiple students in the same virtual space at once.
- Login systems, progress tracking, or scoring (we explicitly decided _against_ this - see Section 6).
- Photorealistic, scanned 3D models of the real equipment - we're going with simplified/stylized geometric models instead, which is standard practice for browser-based 3D for performance reasons.

---

## 5. Solution Approach - Overview (Concept Level)

At a high level, we're using a **hub-and-spoke model**, which is a common pattern for this exact kind of "orientation/museum-like" experience (think of how a virtual museum tour or an onboarding app for a large facility is usually structured):

- **The Hub**: a central space - in our case, literally the lab room itself - that a student can walk around freely. This is the "lobby."
- **The Spokes**: each experiment is a "station" placed at its real (or realistic) location in the room. Walking up to a station is how you discover it exists - nothing is hidden behind menus you have to already know about.
- **Entering a spoke**: interacting with a station transitions you into a focused view/interaction specific to that experiment - this is where the actual learning content lives (what the experiment is, what the procedure looks like, what a student would do).
- **Returning to the hub**: after finishing with a station, you're brought back into the room, free to walk to the next one.

**Why this pattern instead of, say, a simple menu/list of experiments?** A dropdown list would be _easier_ to build, but it throws away the one thing VR/3D can actually offer that a website can't: spatial memory. If a student walks past "Time Study" on their way to "Workplace Layout," they build a mental map of the room - the same mental map they'll rely on when they physically walk into the lab later. A flat list gives you none of that.

**A situation to picture how this would feel:** a student puts on a headset (or opens the browser tab), sees a loading screen, then finds themselves standing inside a room that looks like the actual lab - cream walls, a whiteboard, a few tables spread out. They walk toward a table and it visibly reacts (glows, shows a label) - signaling "this is interactive" without needing an instruction manual. They click/press a button, and are taken into a closer, focused version of that one experiment, where they can read about it, see a simplified 3D version of the setup, and get a sense of the procedure. When done, one click brings them back to the room to explore the next table.

---

## 6. Solution Approach - Key Design Decisions

This is where a few real decisions have already been made (some through actual back-and-forth while building a first prototype - see Section 7), and a few are still open. Flagging which is which:

**Decided:**

- **Platform: browser-based ("WebXR-style") rather than a native headset app.** Concretely, this means the interface runs as a web page - using 3D libraries in the browser - rather than requiring a Unity build installed on a headset. The reasoning: it removes the "you need a Quest/Vive to even try this" barrier. Anyone (evaluators included) can open a link on a laptop and walk around with WASD + mouse, no installation needed. It can _also_ work in an actual headset since browser-based 3D supports that, but it doesn't _require_ one.
- **No login, no quiz/scoring system.** We deliberately simplified the scope - this is an orientation tool, not a graded assessment tool. Keeping it that way keeps the build manageable in our timeline.
- **Interaction style: walk-up-and-trigger, not click-a-menu-item.** Proximity to a table triggers a visual cue (glow + label); pressing a key/clicking enters that station. This preserves the spatial-navigation benefit described in Section 5.
- **Movement: first-person, WASD + mouse-look on desktop**, with the same system extending to touch/gyroscope controls on mobile and to headset locomotion (room-scale + teleport) if used on VR hardware.
- **Modular architecture.** Every experiment is being built as a self-contained module (its own file, with a consistent "start" and "stop" behavior) that plugs into the main room system. Practically, this means Person A can build the Time Study module while Person B builds the Workplace Layout module, without either of them touching the core room code - and adding experiment #6 later doesn't require reworking experiments #1–5.

**Not yet decided / still open (we should discuss as a team before finalizing):**

- Exactly how "deep" each experiment station goes - is it a 3D preview + info panel (lighter, faster to build), or a small interactive simulation of the actual procedure (heavier, more impressive, more time)? A prototype currently has this as a placeholder ("Coming in Phase 2") - we need to decide before building all five-plus experiment modules.
- Whether we eventually want any lightweight way to track which stations a student has visited (not a login/score system, just a visual "seen" checkmark) - nice-to-have, not committed.
- The real dimensions and layout of the room, and the real equipment per table - we need actual photos and measurements from the lab to replace the placeholder layout currently in the prototype.

---

## 7. What's Actually Been Built So Far (Phase 1 Prototype)

One of us already started experimenting with an implementation, so instead of treating "solution approach" as purely theoretical, here's what actually exists right now - this should anchor the rest of our discussion instead of us guessing in the abstract.

**What it is:** a browser-based 3D walkable lab room, built using web 3D technology (initially attempted with a framework called A-Frame, later rebuilt using Three.js directly after running into a technical limitation - see "known issues" below).

**What's working in the current build:**

- A room roughly 14×10 meters, with cream walls, a dark floor with grid lines, ceiling lights, a whiteboard labeled "Work System Design Lab," and a door - all placeholder geometry standing in for the real room until we get real photos/measurements.
- Five experiment tables placed around the room, each currently a colored placeholder block (standing in for real equipment models).
- First-person movement (WASD + mouse-look) with collision, so you can't walk through walls or tables.
- Proximity interaction: walking near a table makes it glow and shows a floating label with the experiment's name and an "enter" prompt.
- Clicking/pressing a key on a table transitions into a focused "experiment space" - currently just a placeholder screen ("Coming in Phase 2") with a "Back to Lab" button that returns you to the room.
- A modular code structure: the room, the movement system, the interaction system, and each experiment are all separate, swappable pieces - meaning Phase 2 (building the actual experiments) is a matter of filling in a template per experiment, not rebuilding the system.

**What's explicitly NOT built yet:**

- Any real experiment content - the five stations are placeholders in shape and position only.
- The real room geometry - current layout is an estimate, not based on actual photos/measurements yet.
- Real 3D models of equipment (currently flat colored blocks).

**Known technical issue worth mentioning honestly in the deck (it's a legitimate finding, not a failure):** the first framework tried (A-Frame) didn't load inside certain restricted preview environments, which is why the build was redone using Three.js directly for better compatibility. This is a normal kind of platform trade-off decision in web-based 3D development, and it's a fine thing to mention under "challenges" - it shows we hit a real constraint and adapted, rather than everything going smoothly by luck.

---

## 8. What We Still Need to Do Before Finalizing "Solution Approach"

Since you mentioned the team isn't fully aligned on this part yet, here's what genuinely needs a group discussion, not just my guess:

1. **Confirm or change the platform decision** (browser-based vs. a native headset-only build) - the prototype above assumes browser-based; if the team wants a "real" Quest/Vive-native app instead, that's a different tech stack (Unity) and a different conversation.
2. **Decide the depth of each experiment module** - info-panel-and-preview vs. mini-simulation (Section 6, "not yet decided").
3. **Get real room photos, measurements, and equipment photos/descriptions** from the actual lab - this was already planned (see the "Phase 2" note in the prototype work) but hasn't happened yet.
4. **List the actual experiments** the lab covers, with real names and real procedures - Section 9 below has a placeholder list based on typical Work System Design topics, but it needs to be checked against your actual lab manual/syllabus.

---

## 9. Stretch Ideas - Out-of-the-Box Additions (Not Core Scope Yet)

A couple of ideas came up that go beyond the core hub-and-spoke orientation system. Flagging these separately and clearly as **stretch goals**, not committed scope - we don't want to blur these with Section 4's scope boundary, since overpromising at a mid-eval is worse than under-promising and delivering.

**1. A RAG-based help chatbot, trained on the course's study material.** The idea: instead of (or alongside) the info panels at each station, a student could ask a chatbot a question in plain language - "what's the difference between rating factor and allowance?" - and get an answer grounded in the actual course material (lecture notes, lab manual, textbook excerpts), using retrieval-augmented generation (RAG) so the answers stay accurate to _your_ course's content rather than a generic AI answer. This would sit naturally inside the experiment stations, as a supplementary "ask a question" panel next to the theory/procedure content.

_Why this is interesting:_ it directly extends the "no instructor available" problem from Section 1/2 - a compensatory-class student with a specific doubt currently has no one to ask; a grounded chatbot gives them somewhere to ask it.

_Why it's a stretch, not core scope:_ it needs a text corpus of the course material prepared and indexed, a retrieval pipeline, and an LLM call - meaningfully more infrastructure than the room/experiment system, and it's a separate track of work from the 3D interface itself. Realistic framing for the deck: mention it as a "planned extension" or "if time permits" item, not a Phase 1/2 deliverable.

**2. A voice mode.** Letting a student talk to the chatbot (or navigate/trigger stations) by voice instead of typing/clicking. This would make the experience feel more natural inside an actual headset, where typing is awkward.

_Why it's a stretch:_ voice adds real complexity - speech-to-text, handling ambient noise in a shared lab room, and (if paired with the chatbot) text-to-speech for responses. It's a layer on top of the chatbot idea rather than an independent feature, so it likely only makes sense to pursue after the chatbot itself is working.

**How to position these at the mid-eval:** it's genuinely good to _mention_ these as forward-looking ideas - it shows the team is thinking beyond the minimum and has a growth path. The safe way to present them is as a short "Future Scope / If Time Permits" note, clearly separated from what we're actually committing to build and demo. We should avoid presenting these as if they're already planned into Phase 2/3, since that could invite evaluators to expect them at the final eval.

---

## 10. Experiment Coverage (Placeholder - Needs Verification)

Based on what's typical for a Work System Design lab (and what the earlier prototype discussion assumed), a plausible list looks like:

- **Time Study** - observing and timing a task, applying rating factors and allowances to compute a standard time.
- **Method Study / Motion Study** - breaking a task down into basic motions (therbligs) to find inefficiencies.
- **Work Sampling** - taking random observations of a worker over time to estimate the proportion of time spent on different activities.
- **Workplace Layout Design** - arranging a workstation or facility layout to optimize flow and reduce wasted movement.
- **Ergonomic Assessment** - scoring posture/strain risk (e.g., RULA/REBA-style assessment).
- **Line Balancing** - distributing tasks across stations on a production line to balance workload and maximize efficiency.

**This list must be confirmed or replaced with the real experiments from your lab manual before we commit to it in the final deck** - using the wrong experiment names in front of evaluators who know the lab would undercut an otherwise strong presentation.

---

## 11. Everything After This (For Reference - We'll Build It Out Next)

These are the remaining slide topics from the structure discussed earlier. We're intentionally not writing full content for these yet, since they depend on decisions in Section 8. Rough placeholders for now:

- **System Architecture** - a light diagram of: student (browser) → 3D lab room interface → experiment modules → (optionally) any content/data source. Can be drawn directly from the modular code structure already built (Section 7).
- **Current Progress** - pulls directly from Section 7.
- **Work Plan / Timeline** - Phase 1 (room + system - done), Phase 2 (real room data + first experiment module), Phase 3 (remaining experiments + polish).
- **Challenges / Open Questions** - pulls from Section 8, plus the honest technical note about the framework switch, plus flagging that the chatbot/voice ideas (Section 9) are unscoped and would need their own time/resource estimate if we decide to pursue them.
- **Next Steps** - get real photos/measurements, confirm experiment list, decide interaction depth, build first real experiment module, and decide as a team whether the chatbot is worth pursuing as a stretch goal or left as a mentioned-but-not-built idea.

---

## Notes / Comments Section

_(Add comments here, or inline above near the relevant point, so we can resolve them as a group before moving to slides.)_

-
-
