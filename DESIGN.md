---
name: DepthCheck
description: A warm-glass market board for transparent trade-footprint context
colors:
  ink: "#302b29"
  muted: "#70655f"
  cream: "#fff9f2"
  green: "#356f60"
  amber: "#966628"
  red: "#a55b5a"
  violet: "#766396"
typography:
  body: Inter, Segoe UI, Arial, sans-serif
---

# Overview
An English-language, read-first market workspace. Present calculated context, not a trading signal. The interface uses a warm translucent shell and four softly tinted columns for small, review, large, and unknown footprints.

# Color
The dark brown glass shell supports cream text; white asset cards use dark ink. Green, amber, red, and violet distinguish the four calculated categories. Never rely on color alone: retain category names, numbers, and missing-data text.

# Typography
Use the existing Inter/Segoe UI/Arial stack. Give the main headline generous scale and restrained weight; keep figures tabular and labels legible. Formulas and API evidence use a monospace face.

# Layout
The board is four columns on wide screens, two on tablets, and one on phones. Keep the trade amount, source choice, search, sort, and refresh controls visible before the board. Cards belong to their computed column and are not draggable.

# Components
Rounded pill controls, lightly bordered glass panels, pastel column surfaces, and opaque asset cards. Preserve visible keyboard focus, explicit live/demo labeling, clear errors, and an expandable methodology/evidence section.

# Motion
Use subtle hover elevation and short transitions only; honor reduced-motion preferences. Motion must not communicate a safety assessment.
