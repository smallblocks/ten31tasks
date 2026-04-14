import { sdk } from './sdk'

const webPort = 80

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const webMulti = sdk.MultiHost.of(effects, 'web-multi')
  const webMultiOrigin = await webMulti.bindPort(webPort, {
    protocol: 'http',
  })

  const webUi = sdk.createInterface(effects, {
    name: 'Ten31 Tasks',
    id: 'webui',
    description: 'Team daily task tracker',
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const webReceipt = await webMultiOrigin.export([webUi])

  return [webReceipt]
})
