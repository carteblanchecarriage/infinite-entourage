# Infinite Entourage - Advanced Prompt System

*Last updated: 2026-02-20*

## Overview

The prompt system now intelligently detects subject types and injects diversity for people when not specified. This ensures:

1. **Accurate subject detection** — people, animals, vehicles, plants, objects
2. **Automatic diversity** — random race, gender, age, body type, and clothing style for people
3. **Appropriate styling** — different prompts for each subject type and visual style
4. **Safety compliance** — appropriate attire for human figures

---

## Subject Type Detection

The system automatically detects what type of subject you're requesting:

| Type | Keywords | Example Prompts |
|------|----------|-----------------|
| **Person** | person, man, woman, child, businessman, pedestrian, etc. | "walking down street", "businessman with briefcase" |
| **Animal** | dog, cat, bird, retriever, labrador, puppy, kitten, etc. | "golden retriever", "pigeon flying" |
| **Vehicle** | car, truck, bicycle, bus, motorcycle, etc. | "red car parked", "fire truck" |
| **Plant** | tree, plant, flower, fern, cactus, etc. | "oak tree", "potted fern" |
| **Object** | bench, umbrella, traffic light, laptop, etc. | "park bench", "umbrella" |

### Detection Algorithm

- Exact word matches weighted higher (3x)
- Substring matches weighted lower (1x)
- Starting words get bonus (+2)
- Priority: person > animal > vehicle > plant > object (for ties)

---

## Automatic Diversity Injection (People Only)

When you request a person **without** specifying diversity attributes, the system randomly injects them:

### What Gets Injected (if not specified):

| Attribute | Options | Injection Rate |
|-----------|---------|----------------|
| **Race/Ethnicity** | East Asian, South Asian, Black, White, Hispanic, Latino, Middle Eastern, Native American, etc. | Always |
| **Gender** | man, woman, person | Always |
| **Age** | young adult, adult, middle-aged, elderly, senior, teenager | Always |
| **Body Type** | average, athletic, slender, curvy, tall, short, plus-size | 30% chance |
| **Clothing Style** | casual, business casual, professional, streetwear, bohemian, preppy, athletic | 50% chance |

### Examples:

**User Input:** `"walking down street"`

**Diversity Injected:** `"Mediterranean, woman, young professional, tall, business casual, walking down street"`

**User Input:** `"Asian businessman"`

**Diversity Injected:** `"Asian businessman, middle-aged, bohemian style"` (age and style added, race/gender already specified)

**User Input:** `"young Black man sitting on bench"`

**Diversity Injected:** *None* — all major attributes already specified

---

## Style Adaptation by Subject

Each subject type gets appropriate styling for the selected visual style:

### Realistic Style

- **Person:** photorealistic, authentic skin texture, natural lighting, high detail, 8k quality
- **Animal:** photorealistic, detailed fur/feathers, natural lighting, wildlife photography style
- **Vehicle:** photorealistic, automotive photography, detailed reflections, studio lighting
- **Plant:** photorealistic, botanical photography, natural lighting, detailed textures
- **Object:** photorealistic, product photography, detailed materials, studio lighting

### Illustration Style (Architectural Entourage)

This is the **flat vector style** shown in the reference image — perfect for architectural visualizations:

**Visual Characteristics:**
- Flat vector illustration (not 3D, not photorealistic)
- Solid color blocks (no gradients, no shading)
- Muted pastel color palette
- Minimal detail (no facial features)
- Clean, crisp edges
- Full body figures
- Contemporary clothing
- Diverse representation (built-in)

**Per Subject:**
- **Person:** flat vector architectural entourage, solid color blocks, muted pastels, minimal detail, no facial features, clean crisp edges, cutout people style
- **Animal:** flat vector, solid color shapes, minimal detail, clean edges, architectural entourage style
- **Vehicle:** flat vector, solid color blocks, minimal detail, isometric or side view, architectural entourage style
- **Plant:** flat vector botanical, solid color shapes, minimal detail, architectural entourage style
- **Object:** flat vector product style, solid color blocks, minimal detail, muted pastels

**Reference Style:** This matches professional architectural entourage cutout libraries used in renderings.

### Silhouette Style

All subjects: solid black silhouette, clean edges, high contrast, flat graphic shape, no interior detail

---

## Safety & Framing

### Safety Prompts (People Only)

All person prompts include:
- `"wearing complete everyday outfit, fully clothed, appropriate attire, modest clothing"`

This ensures generated figures are appropriately dressed for architectural visualization.

### Framing Prompts

- **Person:** `full body person from head to toe, complete figure visible, natural candid pose`
- **Animal:** `complete animal fully visible, entire creature in frame, natural pose`
- **Vehicle:** `complete vehicle, full object visible, all wheels/parts in frame`
- **Plant:** `complete plant specimen, full form visible, natural growth pattern`
- **Object:** `complete object, full item visible, all components in frame`

### Universal Context

All prompts include:
- `centered in frame, professional photography, studio lighting, sharp focus, high quality`

**Background Removal Process:**
1. FLUX generates the image with natural lighting (no white background specified)
2. rembg automatically removes the background, creating true transparency
3. Output is PNG with alpha channel (transparent background)

**Shadow Reduction:**
- Prompts include `no shadows, flat lighting, even illumination` to minimize shadow artifacts
- Subjects are lit evenly for clean background removal

---

## Usage Examples

Three examples showing the right level of detail for clean cutout results:

### Example 1: Person Walking
```json
POST /api/getEntourage
{
  "prompt": "businessman walking with briefcase",
  "style": "realistic"
}
```
**Why this works:** Clear action (walking), specific role (businessman), prop (briefcase). No background elements like "on street" or "in park" — just the subject.

### Example 2: Stationary Object
```json
{
  "prompt": "red road bicycle side view",
  "style": "illustration"
}
```
**Why this works:** Specific object (road bicycle), color (red), angle (side view). No "against wall" or "leaning on fence" — those make background removal harder.

### Example 3: Specific Person
```json
{
  "prompt": "elderly woman sitting on bench reading newspaper",
  "style": "realistic"
}
```
**Why this works:** Demographics (elderly woman), pose/action (sitting, reading), prop (newspaper). The bench is part of the entourage, not a background element.

### Tips for Best Results

**DO:**
- Describe the subject clearly (who/what + what they're doing)
- Include poses, clothing, props
- Specify age, gender, style if you have preferences

**DON'T:**
- Add background elements ("in park", "against wall", "on street")
- Include multiple subjects in one prompt
- Request complex scenes or environments

The system handles diversity automatically if you don't specify demographics — "person walking" becomes "young Black woman walking in casual athletic wear" automatically.

---

## Testing

Run the test suite:
```bash
node test-prompts.js
```

This validates:
- Subject detection accuracy
- Diversity injection logic
- Prompt building for all styles

---

## Files

- `lib/promptBuilder.js` — Core prompt building logic
- `test-prompts.js` — Test suite
- `PROMPT_SYSTEM.md` — This documentation

---

## Benefits

1. **Bias reduction** — Random diversity prevents always generating same default demographics
2. **Better prompts** — Subject-specific styling improves FLUX output quality
3. **Flexibility** — Users can still specify exactly what they want
4. **Safety** — Automatic appropriate attire for human figures
5. **Consistency** — Same framing and background treatment across all subjects
