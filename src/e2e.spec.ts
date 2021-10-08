import tap from 'tap'
import { Report } from 'apollo-reporting-protobuf'
import fastify from 'fastify'
import mercurius from 'mercurius'

import mercuriusMetrics from '../src/index'
import { basicResolvers, basicSchema } from '../examples/basicSchema'

import { createSimpleServer } from './createSimpleServer'

tap.cleanSnapshot = (s) => {
  return s.replace(
    // we need to replace any timings with 0, because they change from run to run
    /"(nanos|seconds|startTime|endTime|durationNs)": [0-9]+,/gm,
    '$1: 0,'
  )
}

// import fp from 'fastify-plugin'

tap.test(
  'e2e metrics including "sample error" error are reported',
  async (t) => {
    const endpointUrl = 'http://localhost:3334'
    const server = createSimpleServer((unzippedData) => {
      const reportDecoded = Report.decode(unzippedData)
      delete reportDecoded.header
      t.matchSnapshot(reportDecoded)
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

    t.equal(response.statusCode, 200)

    t.matchSnapshot(JSON.parse(response.payload).errors)

    await app.apolloTracingStore.flushTracingNow()

    server.close()

    t.end()
  }
)
