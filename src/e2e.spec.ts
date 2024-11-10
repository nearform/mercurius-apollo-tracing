import { test } from 'node:test'

import { Report } from 'apollo-reporting-protobuf'
import fastify from 'fastify'
import mercurius from 'mercurius'

import { basicResolvers, basicSchema } from '../examples/basicSchema'
import mercuriusMetrics from '../src/index'

import { createSimpleServer } from './createSimpleServer'

test('e2e metrics including "sample error" error are reported', async (t) => {
  const endpointUrl = 'http://localhost:3334'
  const server = createSimpleServer((unzippedData) => {
    const reportDecoded = Report.decode(unzippedData)
    delete reportDecoded.header
    t.assert.snapshot(reportDecoded)
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

  t.assert.snapshot(JSON.parse(response.payload).errors)

  await app.apolloTracingStore.flushTracing()

  server.close()
})
