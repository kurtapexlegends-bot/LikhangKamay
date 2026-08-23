---
description: Switch to Remote Mode (mobile/remote device). Automatically captures and embeds live headless browser screenshots of modified screens into responses.
type: workflow
command: /remote-y
---

# Workflow: /remote-y (Remote Review Mode ON)

When the user activates `/remote-y`:
1. **Activate Remote Mode**: The user is currently on mobile or remote control.
2. **Mandatory Screenshot Captures**:
   - After compiling changes (`npm run build`), run `node scripts/capture_preview.js --route="<route>"` (e.g. `--route="/admin/catalog?tab=sponsorships"`).
   - Embed the captured PNG file directly in the chat response using `![<Caption>](<absolute-file-path>)`.
3. **Zero Fluff & High Fidelity**:
   - No mockups or made-up UI descriptions. Only real visual captures from the local server.
