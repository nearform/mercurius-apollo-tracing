import { test, TestContext } from 'node:test'

import { Report } from 'apollo-reporting-protobuf'
import fastify from 'fastify'
import { mercurius } from 'mercurius'

import { basicResolvers, basicSchema } from '../examples/basicSchema'

import { createSimpleServer } from './createSimpleServer'

import mercuriusMetrics from './index'

test('e2e metrics including "sample error" error are reported', async (t: TestContext) => {
  const endpointUrl = 'http://localhost:3334'
  let promiseResolve, promiseReject
  const promise = new Promise<void>((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
  })
  const server = createSimpleServer((unzippedData) => {
    try {
      const reportDecoded = Report.decode(unzippedData)

      t.assert.deepStrictEqual(
        reportDecoded.tracesPerQuery['# -\nquery dummyQuery{word}']
          .referencedFieldsByType!.Query.fieldNames,
        ['word']
      )
      t.assert.deepStrictEqual(
        reportDecoded.tracesPerQuery['# -\nquery dummyQuery{word}']
          .referencedFieldsByType!.Query.isInterface,
        false
      )
      t.assert.deepStrictEqual(reportDecoded.operationCount, 0)
      t.assert.deepStrictEqual(reportDecoded.tracesPreAggregated, false)

      promiseResolve()
    } catch (e) {
      promiseReject(e)
    }
  })

  const app = fastify()
  app.register(mercurius, {
    schema: basicSchema,
    resolvers: basicResolvers,
    graphiql: true
  })

  app.register(mercuriusMetrics, {
    apiKey: 'APOLLO_KEY',
    endpointUrl,
    graphRef: 'APOLLO_GRAPH_ID' + '@' + 'APOLLO_GRAPH_VARIANT'
    // sendReportsImmediately: true // this is for lambda-like execution model
  })
  const query = `
      query testQuery {
        throwErr
        post {
          body
        }
      }`

  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query }
  })

  t.assert.equal(response.statusCode, 200)

  t.assert.deepStrictEqual(JSON.parse(response.payload).errors, [
    {
      locations: [
        {
          column: 9,
          line: 3
        }
      ],
      message: 'sample error',
      path: ['throwErr']
    }
  ])

  await app.apolloTracingStore.flushTracing()

  await promise

  server.close()
})
