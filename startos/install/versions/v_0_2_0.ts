import { VersionInfo } from '@start9labs/start-sdk'

export const v_0_2_0 = VersionInfo.of({
  version: '0.2.0:0',
  releaseNotes: {
    en_US: 'v0.2.0 — Server-side persistence via FastAPI + SQLite. Auto-saves on every keystroke and action. Team data is shared across all browsers.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
