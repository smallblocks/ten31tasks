import { sdk } from './sdk'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Ten31 Tasks!')

  const subcontainer = await sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'ten31-tasks-web',
  )

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer,
    exec: {
      command: ['supervisord', '-c', '/etc/supervisor/supervisord.conf'],
      env: {
        DB_PATH: '/data/ten31-tasks.db',
      },
    },
    ready: {
      display: 'Ten31 Tasks Ready',
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, 80, {
          successMessage: 'Ten31 Tasks is ready',
          errorMessage: 'Ten31 Tasks is not responding',
        }),
    },
    requires: [],
  })
})
