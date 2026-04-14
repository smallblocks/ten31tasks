import { setupManifest } from '@start9labs/start-sdk'

export const manifest = setupManifest({
  id: 'ten31-tasks',
  title: 'Ten31 Tasks',
  license: 'MIT',
  wrapperRepo: 'https://github.com/smallblocks/ten31tasks',
  upstreamRepo: 'https://github.com/smallblocks/ten31tasks',
  supportSite: 'https://github.com/smallblocks/ten31tasks/issues',
  marketingSite: 'https://ten31.xyz',
  donationUrl: null,
  docsUrl: 'https://github.com/smallblocks/ten31tasks#readme',
  description: {
    short: 'Team daily task tracker — six things, in order',
    long: `A self-hosted team productivity tool for Ten31.

Each team member gets their own route (/list/<name>) and writes down the six most important things they need to accomplish tomorrow. Lock the list in. Work top-down. Check off as you go.

The team board gives everyone full visibility into who has committed, what they're working on, and their completion rate — a natural feedback loop of accountability.

Auto-saves every keystroke to server-side SQLite. No save button.

Features:
- Per-user task lists at /list/<name>
- Team board with full task visibility
- Calendar heatmap with monthly stats
- Streak tracking and 7-day rolling completion
- End-of-day reflection journal
- Carry-forward for unfinished tasks`,
  },
  volumes: ['main'],
  images: {
    main: {
      source: { dockerTag: 'localhost/ten31-tasks:latest' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {},
})
