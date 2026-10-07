---
name: photo-realism
description: "Make AI-generated images read as real photos with a two-stage pattern: pre-processing specialises the generation prompt through a fixed slot skeleton, and optional post-processing measures 3 photo statistics (highlight R-B, near-black ratio, grain sigma) against a same-condition real reference and fixes only the ones that are off, via a bundled script. Use when generating photorealistic images, fixing the plastic or waxy AI look, or deciding whether an AI image needs grading or grain. Triggers on 'AI 生圖', '塑膠感', '去 AI 感', '像真的', '寫實', '像照片', '加顆粒', '後處理', 'photorealistic', 'AI look', 'plastic skin', 'film grain', 'make it look real'. NOT illustration, anime or deliberately stylised art."
---

# Photo Realism

The AI look comes from excess perfection: waxed skin, flattering even light, dead-centre composition, candy colours, uniform sharpness and no sensor noise. The fix is to put the imperfections of a real camera and a real scene back.

There is no fixed answer. The pattern is fixed; every value inside it comes from the case.

## The Pattern

1. **Anchor the case**: decide who shot it and under what light (device, light source, time, indoor or outdoor). Every later value derives from this anchor.
2. **Pre-processing (always)**: specialise the prompt by filling the slot skeleton below with values from the anchor.
3. **Gate**: look at the result at 100%. If it already reads as a photo, stop. Post-processing is optional.
4. **Post-processing (only when needed)**: measure the 3 statistics against a real reference shot under the same anchor, and fix only the ones that are visibly off.
5. **Eyes over numbers**: if a stat now matches but the image looks worse, revert that step.

Structural errors (hands, text, light direction, reflections, impossible geometry) are not fixable by either stage's grading. Regenerate or inpaint them.

## Stage 1: Pre-processing (Prompt Specialisation)

Slot skeleton, in this order:

```
[capture device], [scene and subject], [light source and direction], [composition], [imperfections and lived-in details]
```

| Slot | What to write | Example values |
|---|---|---|
| Capture device | The camera that implies a colour, noise and depth-of-field signature | `candid iPhone snapshot`, `handheld phone photo, night mode`, `35mm film, Fujifilm Superia` |
| Scene and subject | Concrete, local, ordinary | `middle-aged man in a small noodle shop` |
| Light | One named source with a direction, never "good lighting" | `afternoon window light from the left`, `overcast`, `shop signs and wet pavement reflections` |
| Composition | Break the centred, everything-sharp default | `off-center`, `shallow depth of field`, `foreground partly cut off`, `slightly tilted` |
| Imperfections | Texture and disorder that real scenes have | `visible pores, stubble, stray hair, wrinkled shirt`, `clutter, puddles, uneven signage` |

Rules:

- Drop polish words: `masterpiece`, `8k`, `ultra detailed`, `hyperrealistic`, `perfect skin`. They push towards a retouched render.
- Natural daylight and a single source reveal texture; flat studio light hides it.
- Negative prompts are model-specific. Some guides put `JPEG artifacts` in the negative while others add compression on purpose; pick by the capture device in the anchor, not by habit.
- When the generator takes a seed, fix it while iterating on the prompt so only the prompt changes.

## Gate: Is Post-processing Needed?

Skip post-processing when the image already reads as a photo at 100% crop. Post-processing helps most with plastic skin and surfaces that are too clean. It does little for scenes whose light and structure are already right; adding grain to a bright, sunny scene often makes it look like a dim-light phone shot instead.

## Stage 2: Post-processing (Script)

`scripts/realism.ts` (Bun + sharp). The stats:

| Stat | Measures | Depends on |
|---|---|---|
| `rb` highlight R-B | mean(R - B) over the brightest 5% of pixels: the colour of the light | Light source: sun and tungsten warm (+20 to +40), overcast or window near 0, shade cool |
| `black` near-black ratio | share of pixels with luma < 16: the depth of the shadows | Scene brightness: night scenes reach 30-40%, soft daylight sits near 0%, film looks lift the black point |
| `grain` grain sigma | std of high-pass luma in the flattest regions: sensor noise | Light level and resolution: more in low light, less in bright light, much less after downscaling |

None has a universal target. On 2026-10-07, 8 real photos spanned `rb` -12 to +42, `black` 0% to 34%, and `grain` 0.1 to 1.2 (downscaled to 1024 px). Always take targets from a reference.

### Steps

1. Find a real reference photo with the same anchor (light, device, roughly the same framing). The script downscales it to the AI image size so grain compares at the same scale.
2. Set up once, outside any synced or plugin directory:

   ```bash
   mkdir -p ~/work/realism && cp <skill-dir>/scripts/realism.ts ~/work/realism/ && cd ~/work/realism && bun add sharp
   ```

3. Diff, fix, compare:

   ```bash
   bun realism.ts diff ai.png ref.jpg                  # which stats are off, and the targets
   bun realism.ts fix ai.png out.png --ref ref.jpg     # fixes only the flagged stats
   bun realism.ts compare ai.png out.png cmp.jpg 380 250   # full frames on top, 100% crops below
   ```

4. Look at `cmp.jpg`. Override any step by hand with explicit targets, `-` skips a step:

   ```bash
   bun realism.ts fix ai.png out.png - 0.02 2.5   # keep the light colour, set black and grain
   ```

`diff` flags a stat when `rb` differs by more than 8, `black` is under half or over double the reference (and more than 0.5 points apart), or the reference has at least 0.5 more grain. Grain is only ever added, never removed. Without a reference, use the "Depends on" column to pick explicit targets and judge by eye.

### What the Script Does

Order is fixed: tone, then colour, then grain.

- `black`: a shadow-only toe curve (values under 96) found by binary search. It deepens or lifts shadows without moving midtones.
- `rb`: shifts R up and B down, weighted to the top of the tonal range, in 2 passes.
- `grain`: clumped luma noise with a little chroma noise, stronger in the shadows like a sensor; the amplitude is calibrated against the metric until it hits the target.

## Pitfalls

- A fixed target breaks scenes. Forcing `rb` to +6 on a sunny kitchen (+37) or a neon alley (+39) makes them wrong.
- A linear levels cut to raise `black` darkens the whole frame. The script uses a shadow toe for this reason.
- JPEG re-encoding eats grain: q92 halved the measured grain of an untouched image. Write `.png`; `.jpg` output is q97 4:4:4.
- Downscaled or heavily processed reference photos (stock sites) read very low on grain. Prefer an original-resolution reference, or treat its grain as a floor.
- Matching all 3 numbers does not make an image real, and it does not defeat forensic detection (frequency analysis, C2PA). It only removes what the eye reads as fake.

## Provenance

Built from a 2026-10-07 experiment: 3 scenes (portrait, sunny kitchen, night alley) from qwen-image-2.1, measured against 8 real photos. The portrait gained the most; the alley needed nothing; the kitchen showed that grain on a bright scene hurts. Prompt guidance is the consensus of public realism guides (realism anchors, named light, candid capture, written imperfections).
