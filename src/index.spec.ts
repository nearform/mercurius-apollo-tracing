import tap from 'tap'
import Fastify from 'fastify'
import fp from 'fastify-plugin'

import plugin from './index'

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

function makeStubMercurius() {
  return fp(noop, {
    name: 'mercurius'
  })
}

tap.test('plugin registration', async (t) => {
  let fastify
  t.beforeEach(async () => {
    fastify = Fastify()
    fastify.register(makeStubMercurius())
    fastify.graphql = {
      schema: {
        getTypeMap: () => {
          return { type: 'map' }
        }
      },
      addHook: noop
    }
  })

  t.afterEach(async () => {
    return t.teardown(fastify.close.bind(fastify))
  })

  t.test('plugin should exist and load without error', async () => {
    fastify.register(plugin, {
      apiKey: 'test-api-key',
      schema: ''
    })

    return fastify.ready()
  })

  t.test('plugin should throw an error if api key is missing', async (t) => {
    fastify.register(plugin, {
      schema: ''
    })

    return t.rejects(
      () => fastify.ready(),
      'an Apollo Studio API key is required'
    )
  })
})
