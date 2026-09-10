# Product Requirements Document
## Village Family Tree & Relationship Tracker

**Version:** 1.0 (Draft)
**Owner:** Bharath Kumar H E
**Status:** For review
**Last updated:** September 2026

---

## 1. Executive Summary

Villages with generations of intermarriage between a small set of families make it genuinely hard to answer a simple question: *"How is this person related to me?"* Names repeat across generations, women's surnames and villages change at marriage, and the same two or three families have been marrying into each other for decades.

This product is a collaborative, visual family-tree application built specifically around **pedigree-chart conventions** (the same visual language geneticists use for family trees) combined with a **village/location layer**, so the app can show not just who is related to whom, but also where each person was born and where they live now — which matters enormously in a patrilocal marriage culture where women relocate to their husband's village and men do not.

The product is an unlimited, crowd-editable tree: any user can add any person, any relationship, and any village, and the tree grows organically with no upper bound on size or depth.

---

## 2. Problem Statement

- Villagers lose track of exact relationships ("is she my second cousin or my father's cousin's daughter?") because the network of intermarried families has grown too large to hold in memory.
- Existing tools (paper diagrams, WhatsApp-shared photos of hand-drawn trees, spreadsheets) don't scale, aren't collaboratively editable, and don't capture *movement* — the fact that a woman's village changes at marriage while her birth family record should stay intact.
- Generic family-tree software (e.g. consumer genealogy apps) is built around a Western nuclear-family model and doesn't surface consanguineous (blood-relative) marriages or village-of-origin clearly, both of which are central to how people in this context think about relationships.

---

## 3. Goals

1. Let any user build and browse a family tree that correctly represents marriage, parentage, sibling, and consanguineous relationships using pedigree conventions.
2. Make **village/town of origin and current residence** a first-class, visually obvious property of every person.
3. Make the canvas usable at unlimited scale — hundreds or thousands of interconnected people — without becoming visually or technically unusable.
4. Make adding a person effortless for a non-technical, possibly first-time smartphone user in a village setting.
5. Prioritize UI/UX clarity above feature breadth in v1.

### Non-Goals (v1)
- DNA/genetic trait tracking (we borrow pedigree *symbols*, not genetic data).
- Automated relationship-inference from external records (e.g. government ID databases).
- Paid/monetization features.
- Full offline-first sync (basic low-data support only in v1; true offline-first is a v2 candidate).

---

## 4. Target Users & Personas

| Persona | Description | Needs |
|---|---|---|
| **Elder record-keeper** (e.g. a village elder or family head) | 50s–70s, may have limited smartphone fluency, holds most relationship knowledge in memory | Extremely simple add-flow, large tap targets, minimal typing, works in local language |
| **Young relative / contributor** (e.g. a college-going grandchild) | 18–30, tech-comfortable, adds and corrects data on behalf of elders | Fast bulk entry, search, ability to merge duplicate entries |
| **Diaspora relative** | Moved to a city/abroad, wants to understand their roots | Browsing, search, "how am I related to X" queries |
| **Casual browser** | Wants to look someone up occasionally | Fast search, clear visual read, no editing needed |

---

## 5. Key Use Cases / User Stories

1. As a user, I can search for a person by name and instantly see their position in the tree.
2. As a user, I can add a new person by attaching them to an existing person (spouse of / child of / parent of / sibling of) — never as a disconnected floating node.
3. As a user, when I add a married woman, the app prompts me for her village *before* and *after* marriage, and automatically shows both.
4. As a user, I can visually tell, at a glance, which marriages are between blood relatives (consanguineous) via a distinct connector style.
5. As a user, I can see people grouped/bounded by their current village or town, using a distinct color per place.
6. As a user, I can zoom out to see the whole network as village clusters, and zoom in to see full pedigree detail for one family.
7. As a user, I can ask "how is Person A related to Person B?" and get the relationship path shown as a highlighted line through the tree.
8. As a contributor, if I try to add a person who may already exist, the app warns me and lets me link to the existing person instead of duplicating.
9. As a user on a basic Android phone with a weak connection, the app loads quickly by only fetching the part of the tree I'm currently viewing.

---

## 6. Data Model (Conceptual)

**Person**
- `id`, `name` (local script + transliteration), `gender`, `date_of_birth` (optional, approximate allowed), `alive/deceased`, `photo` (optional)
- `native_village` — fixed at birth, never changes
- `current_location` — village/town, changes over time (esp. at marriage)
- `location_history[]` — optional timeline: `{location, from_date, event ("birth" / "marriage" / "moved for work")}`
- `added_by`, `last_edited_by`, `verified` (boolean — confirmed by a family member)

**Relationship (edge)**
- `type`: spouse / parent-child / sibling
- For spouse edges: `marriage_date` (optional), `is_consanguineous` (boolean, auto-suggestable if both people share an ancestor within N generations, otherwise user-set)
- For parent-child edges: standard descent link

**Village/Town**
- `id`, `name`, `type` (village / town / city), `assigned_color` (auto-assigned, user-adjustable), `region/district` (optional, for map grounding)

This structure is what lets the UI show: pedigree symbols (from Person + Relationship), village-colored boundaries (from current_location), and migration trails (from location_history).

---

## 7. Core Features (Functional Requirements)

| # | Feature | Priority |
|---|---|---|
| F1 | Add / edit / view a person | Must |
| F2 | Add relationship (spouse, parent-child, sibling) attached to an existing person | Must |
| F3 | Pedigree-style tree canvas rendering (squares/circles, marriage lines, descent lines, double line for consanguineous marriage) | Must |
| F4 | Village/town color-coded boundary grouping | Must |
| F5 | Migration trail indicator (birth village → current village) | Must |
| F6 | Search by name (local script + transliteration) with camera fly-to | Must |
| F7 | Infinite pan + semantic zoom (village view → family view → person view) | Must |
| F8 | "Relationship path finder" between any two people | Should |
| F9 | Duplicate-person detection on add | Should |
| F10 | Minimap / "you are here" overview | Should |
| F11 | Village/family filters (show only one village, one surname line, etc.) | Should |
| F12 | Person verification / "added by" trail | Could |
| F13 | Export a branch as an image/PDF to share on WhatsApp | Could |
| F14 | Multi-language UI (local language toggle) | Should |

---

## 8. UI/UX Design — Priority Section

### 8.1 Design Principles

1. **The map metaphor over the form metaphor.** People should feel like they're exploring a living map of their community, not filling out database forms. Forms exist, but they're a means to update the map, never the primary experience.
2. **Never a floating, disconnected node.** Every add-action starts *from* an existing person. This keeps the graph connected and keeps the mental model simple: "I'm adding someone *to* my tree," not "I'm creating a database entry."
3. **Progressive disclosure by zoom level.** Nobody should ever see the full unlimited tree in full detail at once. Detail reveals itself as you zoom in.
4. **Village = color, always.** Color-by-current-village should be consistent everywhere in the app (canvas, search results, person cards) so users build an intuitive color vocabulary over time.
5. **Big touch targets, minimal typing.** Assume the primary device is a mid-range Android phone, sometimes used by an older person unfamiliar with small UI controls.

### 8.2 Screen Inventory

1. Tree/Map Canvas (home screen)
2. Person Detail Card (bottom sheet / drawer)
3. Add Relative flow (guided, multi-step)
4. Search & Results
5. Relationship Path Finder result view
6. Village Legend / Filter panel
7. Settings (language, unit of village color assignment, export)

### 8.3 Screen-by-Screen Breakdown

#### A) Tree/Map Canvas (home screen)
- Infinite pan-and-zoom canvas, pinch-to-zoom and two-finger pan on mobile; scroll-wheel zoom + click-drag pan on desktop.
- **Zoom level 1 (far out):** Only colored village "blobs" are visible, each labeled with village name + person count. No individual nodes rendered — this keeps far-zoom fast and uncluttered even with thousands of people.
- **Zoom level 2 (mid):** Family clusters appear as small grouped icons within each village blob; surnames/family group labels appear.
- **Zoom level 3 (close):** Full pedigree detail — individual squares/circles, marriage lines (single/double), descent lines, and name labels.
- A floating **search bar** sits at the top at all zoom levels.
- A **minimap** (small inset, bottom-right) shows the viewport's position within the whole network, with village colors reflected.
- A **floating "+" add button** (bottom-right, thumb-reachable) starts the add-relative flow from the last-viewed or last-tapped person.
- Tapping any person node opens the **Person Detail Card** as a bottom sheet (mobile) or side panel (desktop) — the canvas stays visible underneath/beside so context is never lost.

#### B) Person Detail Card
- Name (local script + transliteration), photo if available, gender symbol, alive/deceased indicator.
- **Location block:** "Born in [Village A]" and, if different, "Now living in [Village B] — moved after marriage in [year]" with the two villages shown as small color swatches matching the canvas colors.
- Relationship summary: spouse(s), parents, children, siblings — each name tappable to jump to that node on the canvas.
- "Add relative to this person" button — launches the guided add flow pre-attached to this person.
- "Find my relationship to this person" button — launches the Path Finder from the currently logged-in user's own node (if they've identified themselves in the tree) to this person.
- Edit / suggest-a-correction affordance, with an "added by / last edited by" line kept subtle (small muted text, not a prominent UI element) — accountability without turning it into a bureaucratic feature.

#### C) Add Relative — Guided Flow (not a blank form)
Multi-step, one decision per screen, large tappable options:

1. **"Adding someone related to [Person X]. How are they related?"** — big buttons: Spouse / Child / Parent / Sibling.
2. **Basic details** — name (local script keyboard supported), gender, alive/deceased toggle. Date of birth optional, marked "approximate is fine."
3. **If Spouse selected:** "Is this marriage between two people who share a family ancestor (blood relatives)?" — Yes/No toggle. If Yes, the app renders the double-line connector automatically; no manual drawing required.
4. **Location step (the key differentiator):**
   - If the new person is male → "Which village is he from?" (defaults to matching the existing family's village, editable).
   - If the new person is a woman being added as a spouse → two prompts: "Which village is she from originally?" and "Has she moved here after marriage?" (Yes defaults to the husband's village as current location, and the app auto-generates the migration trail on the canvas).
5. **Possible duplicate check** — before saving, the app searches existing names/relations and shows: "We found a similar person — is this the same [Name]?" with a side-by-side compare and a one-tap "Yes, link instead" / "No, this is a different person."
6. **Confirmation** — the new node animates into place on the canvas at the correct position, with a brief highlight so the user sees exactly where it landed.

#### D) Search & Results
- Search-as-you-type, matches on name (any supported language/script) and village.
- Results list shows: name, relationship to a chosen reference person (if applicable), current village color swatch.
- Tapping a result flies the canvas camera to that node and opens its Person Detail Card.

#### E) Relationship Path Finder
- User picks (or is defaulted to) themselves as the starting point, and any other person as the target.
- Result: the connecting path is **highlighted directly on the canvas** (nodes and lines along the path glow/thicken), with a plain-language caption underneath, e.g. *"Devi is your father's sister's husband's sister — she is your aunt-in-law."*
- This turns an abstract graph traversal into something a non-technical user immediately understands, and it's arguably the single highest-value UI moment in the whole app.

#### F) Village Legend / Filter Panel
- A slide-out panel listing every village/town with its assigned color swatch and person count.
- Tap a village to dim everything else and highlight only that village's people — useful for large trees where visual noise is high.
- Color reassignment: if the auto-assigned palette produces a color a user finds confusing, they can manually swap it (persists app-wide).

### 8.4 Visual System

- **Person symbols:** square = male, circle = female, diamond = unspecified/other — standard pedigree convention, instantly learnable.
- **Marriage line:** single horizontal line. **Double horizontal line = consanguineous marriage.**
- **Descent line:** vertical line from the marriage line down to children.
- **Village boundary:** soft rounded colored region behind clustered nodes, one hue per village, consistent across the whole app.
- **Migration trail:** dashed line from a faded "ghost" marker at the birth village to the person's solid marker at their current village — only shown for people who have relocated.
- **Color palette:** each village gets a distinct hue; within a village, gender still governs node fill/border style so gender and location are both readable without conflict (location = region background, gender = node shape/fill).

### 8.5 Interaction & Motion
- Zoom transitions are smooth and animated (no hard cuts) so users don't lose spatial orientation between zoom levels.
- "Fly to" (from search or path finder) uses an eased camera pan+zoom, not a jump cut, so the user retains a sense of *where* they moved to relative to where they were.
- New node additions animate into place rather than appearing instantly, reinforcing "I just changed the tree" feedback.

### 8.6 Mobile-First & Accessibility Considerations
- Minimum tap target 44x44px; primary actions (+, search, back) always thumb-reachable on mobile.
- Local-language support for both display and input (on-screen keyboard compatibility), with transliteration search so a Latin-script search still finds local-script names.
- High color-contrast mode for village colors, since color is load-bearing for meaning — pair each village color with a distinct pattern (subtle texture or icon) in the legend for colorblind accessibility, not color alone.
- Text sizes stay legible at default zoom for older users; a "larger text" setting affects card and label text sizing.
- Low-bandwidth mode: canvas loads only the currently-visible region's data, fetching more as the user pans/zooms, rather than downloading the entire tree upfront.

---

## 9. Collaboration & Data Integrity

- Anyone can add a person, but only *attached* to an existing node — the tree can never fragment into disconnected floating pieces.
- Soft accountability: every person and relationship stores who added/last edited it, shown subtly on the detail card, not as a gate to editing.
- Duplicate detection is suggested, not enforced — the app always lets the user proceed even after a duplicate warning, since local knowledge of "these are actually two different Devis" should override an algorithm.
- Optional "verified" flag lets a family elder mark a branch as confirmed-accurate, shown as a small badge, giving newer/uncertain entries a visually distinct (lighter/dashed) treatment until verified.

---

## 10. Technical Considerations (High-Level)

- Canvas rendering needs to handle potentially thousands of nodes — this points toward level-of-detail rendering (only render what's in viewport + a buffer) and clustering at low zoom, rather than rendering every node at every zoom level.
- Backend needs a graph-shaped data store (people as nodes, relationships as edges) rather than a rigid relational schema, to comfortably support unlimited branching and multiple relationship types.
- Search needs to support transliteration/fuzzy matching across scripts.
- Real-time or near-real-time updates are nice-to-have for v1 but not essential; last-write-wins with visible "last edited by" is an acceptable v1 conflict strategy.

---

## 11. Success Metrics

- % of village population represented as nodes within 3 months of launch.
- Average time to find a specific person via search (target: under 10 seconds).
- % of marriages correctly tagged as consanguineous vs. not (data quality proxy).
- User-reported "I finally understood how X and I are related" moments (qualitative, via feedback prompt after using Path Finder).
- Retention: % of contributors who return to add a second person after their first.

---

## 12. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Open editing leads to vandalism or incorrect data | Soft accountability trail + "verified" flag + easy revert history |
| Two contributors independently add the same person as separate nodes | Duplicate-detection prompt at add-time; periodic "possible duplicates" review view |
| Sensitive family situations (disputes, estranged relatives, remarriage) surfacing publicly | Consider a privacy/visibility setting per person or per branch (open question — needs discussion) |
| Very large trees become visually overwhelming even with zoom levels | User testing on zoom-level thresholds and clustering behavior before full rollout |
| Village color palette runs out of visually distinct hues at large scale | Cap distinct hues (~12–15) and reuse with distinct border patterns for additional villages |

**Open questions for next discussion:**
1. Should there be any privacy controls (e.g. living persons' details visible only to logged-in relatives), or is this fully open within the village community?
2. Who "owns" edit rights to a person once verified — anyone, or only people directly related to them?
3. Should the app also support villages as GPS-located points on an actual map view, or purely as abstract colored regions on the tree canvas?

---

## 13. Phased Roadmap (Suggested)

**Phase 1 — Core tree + pedigree rendering**
F1, F2, F3, F6, F7 (basic zoom/pan), core Person Detail Card and Add flow.

**Phase 2 — Location intelligence**
F4 (village boundaries), F5 (migration trails), location-aware add flow, village legend/filter (F11).

**Phase 3 — Relationship intelligence & polish**
F8 (path finder), F9 (duplicate detection), F10 (minimap), verification badges, multi-language (F14).

**Phase 4 — Sharing & scale**
F13 (export/share), performance work for very large trees, offline/low-data improvements.

---

*End of document.*
