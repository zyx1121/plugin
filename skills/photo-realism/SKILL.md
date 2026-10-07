---
name: photo-realism
description: "Default for EVERY image or video generation request: the output must read as a real photo or real footage that nobody can tell was generated, even when the content is absurd (a cow on the subway, a medieval vending machine, a supermarket underwater). Covers the prompt slot skeleton, inspection and optional post-processing (a script matching grain, black level and highlight colour to a real reference). Load it before calling any image tool and before writing prompts the user pastes into Flow, Veo or Midjourney. Triggers on '生圖', '畫一張', '做張圖', '出圖', '生成圖片', '生影片', '寫 prompt', '分鏡 prompt', '塑膠感', '去 AI 感', '像真的', 'generate an image', 'make a picture', 'image prompt', 'photorealistic', 'AI look'. Skip only when the user explicitly asks for a drawn style (illustration, anime, icon, diagram, logo)."
---

# Photo Realism

Every generated image or video is photoreal by default: it must pass as something a real camera captured. Absurd content is welcome; the absurdity lives in what is in front of the camera, never in how it was captured.

The AI look comes from excess perfection: waxed skin, flattering even light, dead-centre composition, candy colours, uniform sharpness, no sensor noise, and a staged, advertising feel. The fix is to put the imperfections of a real camera, a real operator and a real place back.

The pattern is fixed; every value inside it comes from the case.

## Workflow

1. **Anchor the case**: decide who shot it, with what, and under what light (device, operator, light source, time, place). Every later value derives from this anchor.
2. **Write the prompt** with the slot skeleton below. For absurd content, also apply the absurd-content rules.
3. **Generate** with whatever tool the session has. When the user generates by hand (Flow, Veo, Midjourney), the deliverable is the prompt itself, one per shot.
4. **Inspect** at full size against the checklist. Regenerate (change the prompt or the seed) for structural failures.
5. **Post-process only if needed** (see Stage 2). Skip it when the image already passes.

## Stage 1: The Prompt

Slot skeleton, in this order, written as plain descriptive sentences rather than a keyword list:

```
[capture device and operator], [place and time], [subject and action], [light source and direction], [composition and framing], [imperfections and lived-in details]
```

| Slot | What to write | Example values |
|---|---|---|
| Capture | A device that implies colour, noise and depth of field, plus who is holding it | `candid phone photo taken by a commuter`, `security camera footage`, `news photo`, `2000s CCD point-and-shoot with flash`, `35mm film snapshot` |
| Place and time | Concrete, local, ordinary, with a time of day | `inside a crowded Taipei MRT car on a weekday morning` |
| Subject and action | What is happening, stated flatly | `a full-size dairy cow stands in the aisle` |
| Light | One named source with a direction and its flaws | `flat fluorescent ceiling light, slightly greenish`, `afternoon window light from the left`, `on-camera flash, hard shadow behind` |
| Composition | Break the centred, everything-sharp default | `shot from a seated position, off-center`, `subject partly cut off by the frame edge`, `blurred shoulder in the foreground`, `slightly tilted` |
| Imperfections | Texture, wear and disorder | `scuff marks on the floor, mud on its legs, smudged windows, worn seat fabric, slight motion blur` |

Rules:

- Drop polish words: `realistic`, `hyperrealistic`, `masterpiece`, `8k`, `highly detailed`, `cinematic`, `perfect`. They push towards a retouched advertising render.
- Name the light source; never write "good lighting" or "dramatic lighting".
- Write the prompt in English unless the tool is known to do better in another language. Text that must appear in the image goes in quotes.
- Negative prompts are model-specific. Choose them from the capture device in the anchor (a CCD look wants compression and noise, a DSLR look does not).
- When the tool takes a seed, fix it while iterating so only the prompt changes.

## Absurd Content

The camera does not know the scene is absurd. Everything except the one impossible element follows ordinary physics and ordinary life.

- **State the absurd element as plain fact** in the subject slot. No adjectives like "surreal", "whimsical", "fantasy", "magical" or "bizarre"; they switch the model into concept-art mode.
- **Put it in a mundane place** with mundane clutter: a commuter train, a convenience store, a car park, a school corridor.
- **Pick a witness device**: phone snapshot, CCTV, dashcam, news photo, amateur CCD. Documentary capture makes the impossible believable; studio capture makes it look staged.
- **Anchor it physically**: contact shadows, weight on the floor, dirt or water where it touches the world, reflections in nearby glass, correct scale against people and objects.
- **Bystanders react like real people**: most ignore it or film it on their phones, one or two lean away. No crowd of amazed faces turned to camera.
- **Keep one absurd element per shot.** Stacking several pushes the result into fantasy.

Tested 2026-10-07 on qwen-image-2.1, same seed: `A cow riding the Taipei MRT, realistic, highly detailed, 8k` produced a staged advertising shot with the cow outside the train. The skeleton prompt (commuter phone photo, fluorescent light, off-center, blurred shoulder, passengers ignoring it, mud on its legs) produced a believable snapshot of a cow inside the car.

## Inspection Checklist

Regenerate when any of these fail; post-processing cannot fix them:

1. Hands, faces, text and signage are coherent.
2. Light direction and shadows agree across every object.
3. Reflections and contact points exist and match.
4. Scale is right against people and known objects.
5. It does not look staged: no centred hero pose, no studio light, no eye contact from the whole crowd.

## Stage 2: Post-processing (Optional)

Use it when the image passes the checklist but still feels too clean, typically plastic skin or spotless surfaces. It does little for scenes whose light and structure are already right, and grain on a bright sunny scene makes it look like a dim-light phone shot instead.

`scripts/realism.ts` (Bun + sharp) measures 3 stats:

| Stat | Measures | Depends on |
|---|---|---|
| `rb` highlight R-B | mean(R - B) over the brightest 5% of pixels: the colour of the light | Light source: sun and tungsten warm (+20 to +40), overcast or window near 0, shade cool |
| `black` near-black ratio | share of pixels with luma < 16: the depth of the shadows | Scene brightness: night scenes reach 30-40%, soft daylight sits near 0%, film looks lift the black point |
| `grain` grain sigma | std of high-pass luma in the flattest regions: sensor noise | Light level and resolution: more in low light, less in bright light, much less after downscaling |

None has a universal target: 8 real photos spanned `rb` -12 to +42, `black` 0% to 34%, `grain` 0.1 to 1.2. Take targets from a real reference shot under the same anchor (light, device, roughly the same framing); the script downscales it to the AI image size so grain compares at the same scale.

Set up once, outside any synced or plugin directory (Bun's auto-install hangs on sharp's native binary):

```bash
mkdir -p ~/work/realism && cp <skill-dir>/scripts/realism.ts ~/work/realism/ && cd ~/work/realism && bun add sharp
```

Run:

```bash
bun realism.ts diff ai.png ref.jpg                       # which stats are off, and the targets
bun realism.ts fix ai.png out.png --ref ref.jpg          # fixes only the flagged stats
bun realism.ts fix ai.png out.png - 0.02 2.5             # explicit targets, "-" skips a step
bun realism.ts compare ai.png out.png cmp.jpg 380 250    # full frames on top, 100% crops below
```

`diff` flags a stat when `rb` differs by more than 8, `black` is under half or over double the reference (and more than 0.5 points apart), or the reference has at least 0.5 more grain. Grain is only added, never removed. Without a reference, pick explicit targets from the "Depends on" column and judge by eye.

The script works in a fixed order (tone, colour, grain): a shadow-only toe curve for `black` (a linear levels cut darkens the whole frame), a highlight-weighted R/B shift for `rb`, and sensor-like grain (stronger in shadows) calibrated against the metric.

Pitfalls:

- A fixed target breaks scenes: forcing `rb` to +6 on a sunny kitchen (+37) or a neon alley (+39) makes them wrong.
- JPEG re-encoding eats grain (q92 halved it on an untouched image). Write `.png`; `.jpg` output is q97 4:4:4.
- Stock-site reference photos are downscaled and processed, so their grain reads very low. Prefer an original-resolution reference.
- For video, apply the look in post on clean footage (generate clean, no grain, no grading), then add noise and grading per shot so the shots match.
- Matching the stats removes what the eye reads as fake; it does not defeat forensic detection (frequency analysis, C2PA).
