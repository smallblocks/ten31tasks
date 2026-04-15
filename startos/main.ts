import { sdk } from './sdk'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Fold Tasks!')

  const subcontainer = await sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'fold-tasks-web',
  )

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer,
    exec: {
      command: ['supervisord', '-c', '/etc/supervisor/supervisord.conf'],
      env: {
        DB_PATH: '/data/fold-tasks.db',
      },
    },
    ready: {
      display: 'Fold Tasks Ready',
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, 80, {
          successMessage: 'Fold Tasks is ready',
          errorMessage: 'Fold Tasks is not responding',
        }),
    },
    requires: [],
  })
})
