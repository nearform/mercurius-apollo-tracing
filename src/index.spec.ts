import { afterEach, beforeEach, describe, test, TestContext } from 'node:test'

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

describe('plugin registration', async () => {
  let fastify
  beforeEach(async () => {
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

  afterEach(async () => {
    fastify.close()
  })

  test('plugin should exist and load without error', async () => {
    fastify.register(plugin, {
      apiKey: 'test-api-key',
      schema: ''
    })

    await fastify.ready()
  })

  test('plugin should throw an error if api key is missing', async (t) => {
    fastify.register(plugin, {
      schema: ''
    })

    await t.assert.rejects(
      () => fastify.ready(),
      new Error('an Apollo Studio API key is required')
    )
  })
})

describe('trace store', async () => {
  let app
  beforeEach(async () => {
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

  test('should contain trace with reference to field used in query', async (t: TestContext) => {
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

    t.assert.equal(app.apolloTracingStore.traceBuilders.length, 1)
    t.assert.deepStrictEqual(
      app.apolloTracingStore.traceBuilders[0].referencedFieldsByType.Query
        .fieldNames,
      ['post']
    )

    t.assert.deepStrictEqual(
      app.apolloTracingStore.traceBuilders[0].referencedFieldsByType.Post
        .fieldNames,
      ['body']
    )
  })

  test('should contain trace with reference to field used in query with with multiple operations', async (t: TestContext) => {
    const query = `
      query GetPost {
        post {
          body
        }
      }
      query GetWord {
        word
      }
    `

    // prevent from emptying the store too soon
    app.apolloTracingStore.flushTracing = async () => null

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query, operationName: 'GetPost' }
    })

    t.assert.equal(response.statusCode, 200)
    t.assert.ok(JSON.parse(response.body).data.post.body)

    t.assert.equal(app.apolloTracingStore.traceBuilders.length, 1)

    t.assert.deepStrictEqual(
      app.apolloTracingStore.traceBuilders[0].referencedFieldsByType.Query
        .fieldNames,
      ['post']
    )

    t.assert.deepStrictEqual(
      app.apolloTracingStore.traceBuilders[0].referencedFieldsByType.Post
        .fieldNames,
      ['body']
    )
  })

  test('should contain client name and version from request headers', async (t: TestContext) => {
    const query = `
      query GetPost {
        post {
          body
        }
      }
    `

    // prevent from emptying the store too soon
    app.apolloTracingStore.flushTracing = async () => null

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'apollographql-client-name': 'dummy',
        'apollographql-client-version': 'testing'
      },
      payload: { query, operationName: 'GetPost' }
    })

    t.assert.equal(response.statusCode, 200)

    t.assert.deepStrictEqual(
      app.apolloTracingStore.traceBuilders[0].trace.clientName,
      'dummy'
    )

    t.assert.deepStrictEqual(
      app.apolloTracingStore.traceBuilders[0].trace.clientVersion,
      'testing'
    )
  })
})
