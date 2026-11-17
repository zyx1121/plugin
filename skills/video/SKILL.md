---
name: video
description: "House rules for any video Loki makes: product promo, demo, explainer, PSA or screen recording, with any tool (Remotion, screen capture, Veo or Flow). Covers the story order, scope, pacing, motion, voice-over checks and the review loop before delivery. Use when planning a script or storyboard, building or rendering a video, or reviewing a cut. Triggers on '做影片', '宣傳片', '宣導片', 'demo 影片', '介紹影片', '腳本', '分鏡', '配音', 'Remotion', 'promo video', 'explainer video', 'storyboard', 'voice-over'. NOT how a generated shot looks; that's photo-realism."
---

# video

Rules for every video, whatever the tool. Each rule comes from a correction
Loki made more than once. Story rules are settled before any animation is
built. Production rules are checked before every delivery.

## Story

Settle these in the script, before building a frame.

1. **Follow the order a viewer understands.** The pain or need comes first.
   Then what the thing is. Then how it does it. The tagline comes last. A
   tagline only lands after the viewer has seen the thing work.
2. **Keep the case consistent.** The problem in the opening, the action and
   the result are one and the same thing. The case must also make sense in
   real life.
   - Bad: an automatic task that still asks a person to approve it every day.
   - Good: the person asks the agent to drop the approval step, and the agent does it.
3. **One video, one main line.** Cut every scene that does not move the main
   line forward, even a working feature. One tool or framing does not have to
   open every video in a series.
4. **Spend time on the point.** Speed up typing, waiting and loading. A slow
   step that is not the message makes the viewer wait.
5. **Agree on scope first.** List the features or points the video will
   cover. Loki ticks the list before the script is written. A video that
   covers too little gets rebuilt.

## Production

1. **Make 1 test clip first.** Build 1 short section in full style. Loki
   approves the style, then the rest follows that pattern.
2. **Offer looks side by side.** For a visual choice (look, color, layout),
   render 2 to 3 options as stills next to each other. Loki picks. Keep the
   others in the code as options.
3. **Keep motion continuous.**
   - Every element that enters also exits. Nothing pops in or vanishes.
   - Content that a product generates appears the way the product makes it:
     text streams, forms stream, nodes grow.
   - Camera moves ease in and out.
4. **Check every voice-over line.**
   - Keep a pronunciation file for the project: polyphonic characters,
     product names and English words, each with its intended reading.
   - After synthesis, run speech-to-text on each line and compare it with
     the script. Fix and regenerate any line that differs.
   - Use real voices and real data when they exist, instead of a stand-in.
5. **Inspect frames before delivery.** Grab a still at each key moment
   (scene change, click, element entering or leaving). Put them in a grid
   and look at them. Fix what is wrong, then deliver.

## Look

1. **Cloud white, one accent.** The background is an off-white, not pure
   white. Cards are white with a soft shadow. One accent color covers about
   10% of a frame at most.
2. **Mix colors in sRGB.** An oklch mix detours through other hues: white
   to blue flashes pink halfway.
3. **One stroke width and one icon set** per video.
4. **Keep to the safe area.** Nothing within 96px of the sides or 54px of
   the top and bottom. A subtitle line holds 16 Chinese characters at most
   and does not end with a period.
5. **Lines never touch text.** A return arc runs below the labels, and an
   arrowhead clears them.
6. **One star move per shot.** Everything else stays quiet. When
   everything moves, nothing is the point.
7. **Shots leave before the next one enters.** No double exposure at a cut.

## Diagrams

1. **Draw structures and flows in code**, not with stock images: boxes,
   arrows, layers, sequences, topologies.
2. **A packet leads its arrow.** The arrow grows behind it. It rests about
   10 frames at each stop, then the next step starts with no idle gap.
3. **Time each step by its length.** A long arc gets more frames, so the
   pace stays even and nothing suddenly races.
4. **Draw arrowheads on curves yourself**, from the end tangent. Markers on
   a curve sit crooked.
5. **Drive every animation by frame** in Remotion. CSS animation and
   motion libraries do not sync with rendering.

## Subtitles and loudness

1. **Split long subtitles where the voice says them.** Cut at punctuation
   into lines of 16 Chinese characters or fewer, and switch lines at the
   moment the speech reaches each one, timed from word timestamps of a
   transcription of the clip.
2. **Deliver at -14 LUFS** with true peaks under -1 dB, measured after any
   speed-up, so every video plays equally loud.

## Sound effects

1. **Mark the beats, under the voice.** Short effects peak around -13 dB
   and go lower under speech.
2. **Land on the frame of the action**: a box landing, an arrival, a click.
   Check the onsets with ffmpeg `silencedetect` against the frames.
3. **Rise in pitch on repeated actions**, for example a pentatonic step per
   box, so the viewer hears progress.
4. **A moving thing sounds as long as it moves**: the whoosh envelope spans
   the trip.
5. **Close the last step with a different sound**, such as a confirmation.

## Screens and end cards

- Draw product screens from the product's own code or design system when
  the repo is available. A screenshot is a fallback.
- The end card names the product. It does not show a URL.
- Copy on screen and in subtitles follows Loki's text rules: no dashes and
  no middle dot.

## Before delivery

1. Story rules 1 to 5 hold for the final cut.
2. Every voice-over line passed the speech-to-text check.
3. The frame grid shows no element that pops in, vanishes or overlaps.
   Stills every 0.1 s around each cut show no double exposure, and zoomed
   crops of arrowheads, line gaps and color transitions look clean.
4. The file opens and plays from start to end.
