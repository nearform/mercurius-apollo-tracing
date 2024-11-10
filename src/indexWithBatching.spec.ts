import { beforeEach, describe, test, TestContext } from 'node:test'

import Fastify from 'fastify'
import mercurius from 'mercurius'

import { basicResolvers, basicSchema } from '../examples/basicSchema'

import plugin from './index'

describe('trace store with batching', async () => {
  let app

  beforeEach(async () => {
    app = Fastify()
    await app.register(mercurius, {
      schema: basicSchema,
      resolvers: basicResolvers,
      allowBatchedQueries: true,
      graphiql: true
    })
    await app.register(plugin, {
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

  test('should contain two traces with references to fields used in each query operation', async (t: TestContext) => {
    // prevent from emptying the store too soon
    app.apolloTracingStore.flushTracing = async () => null

    await app.inject({
      method: 'POST',
      url: '/graphql',
      body: [
        {
          operationName: 'FirstQuery',
          query: `query FirstQuery {
              post {
                title
              }
            }`
        },
        {
          operationName: 'SecondQuery',
          query: `query SecondQuery {
              post {
                body
              }
            }`
        }
      ]
    })

    t.assert.deepStrictEqual(app.apolloTracingStore.traceBuilders, [
      {
        querySignature: '# -\nquery FirstQuery{post{title}}',
        referencedFieldsByType: {
          Query: {
            fieldNames: ['post']
          },
          Post: {
            fieldNames: ['title']
          }
        },
        stopped: true
      },
      {
        querySignature: '# -\nquery SecondQuery{post{body}}',
        referencedFieldsByType: {
          Query: {
            fieldNames: ['post']
          },
          Post: {
            fieldNames: ['body']
          }
        },
        stopped: true
      }
    ])
  })
})
