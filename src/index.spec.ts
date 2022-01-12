import tap from 'tap'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import mercurius from 'mercurius'

import { basicResolvers, basicSchema } from '../examples/basicSchema'

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

tap.test('trace store', async (t) => {
  let app
  t.beforeEach(async () => {
    app = Fastify()
    app.register(mercurius, {
      schema: basicSchema,
      resolvers: basicResolvers,
      graphiql: true
    })
    app.register(plugin, {
      apiKey: 'APOLLO_KEY',
      endpointUrl: 'http://localhost:3334',
      graphRef: 'APOLLO_GRAPH_ID' + '@' + 'APOLLO_GRAPH_VARIANT',
      sendReportsImmediately: true
    })

    // dummy query to get trace store created
    await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: 'query dummyQuery { word }'
      }
    })
  })

  t.test(
    'should contain trace with reference to field used in query',
    async (tt) => {
      const query = `
      query testQuery {
        post {
          body
        }
      }`

      // prevent from emptying the store too soon
      app.apolloTracingStore.flushTracing = async () => null

      await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: { query }
      })

      tt.equal(app.apolloTracingStore.traceBuilders.length, 1)
      tt.match(app.apolloTracingStore.traceBuilders[0], {
        referencedFieldsByType: {
          Query: {
            fieldNames: ['post']
          },
          Post: {
            fieldNames: ['body']
          }
        }
      })
    }
  )
})
