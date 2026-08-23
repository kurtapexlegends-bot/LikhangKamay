# Remote Review Mode (/remote-y & /remote-n)

- **`/remote-y` Active**:
  - The user is on mobile/remote control.
  - Whenever frontend UI/UX changes, views, modals, or user workflows are modified or asked to be reviewed, the agent must run `npm run build` and capture high-resolution screenshots covering **ALL pictures and states of the changes** (the complete end-to-end visual flow, including initial view, modal states, dropdown options, and post-action/redirect screens).
  - Embed all captured images sequentially into the chat response using `![<Caption>](<absolute-image-path>)`.
  - Never hallucinate, mock up fake visuals, or give descriptions without real captures.

- **`/remote-n` Active**:
  - The user is on their laptop/desktop workstation.
  - Skip headless screenshot captures and image embeds to keep turnaround instant.
  - Deliver concise, direct answers and code diffs. The user will test locally in their own browser.
  - This state persists until `/remote-y` is explicitly triggered again.
