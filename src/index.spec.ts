'use strict'

import tap from 'tap'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import faker from 'faker'

import plugin from './index'

function makeStubMercurius() {
  return fp(async () => {}, {
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
      addHook: () => {}
    }
  })

  t.afterEach(async () => {
    return t.teardown(fastify.close.bind(fastify))
  })

  t.test('plugin should exist and load without error', async () => {
    fastify.register(plugin, {
      apiKey: 'test-api-key',
      schema: faker.lorem.paragraph()
    })

    return fastify.ready()
  })

  t.test('plugin should throw an error if api key is missing', async (t) => {
    fastify.register(plugin, {
      schema: faker.lorem.paragraph()
    })

    return t.rejects(
      () => fastify.ready(),
      'an Apollo Studio API key is required'
    )
  })
})
