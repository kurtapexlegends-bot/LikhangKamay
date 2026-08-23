---
description: Switch to Local/Laptop Mode. Disables automatic screenshot capture so the user tests directly on their machine.
type: workflow
command: /remote-n
---

# Workflow: /remote-n & /remote-m (Remote Review Mode OFF)

When the user activates `/remote-n` or `/remote-m`:
1. **Activate Laptop Mode**: The user is back on their workstation and testing directly in their browser.
2. **Lean & Concise Output**:
   - Do NOT run headless browser captures or embed image files.
   - Deliver concise, direct answers and code diffs.
3. **Persistence**:
   - Remain in Laptop Mode for the entire conversation until the user explicitly triggers `/remote-y`.
