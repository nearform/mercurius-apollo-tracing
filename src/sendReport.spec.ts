import { Report } from 'apollo-reporting-protobuf'
import tap from 'tap'
import {
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Dispatcher
} from 'undici'
import sinon from 'sinon'
import { FastifyInstance } from 'fastify'

import { sendReport } from './sendReport'
import { createSimpleServer } from './createSimpleServer'

const fakeReport = {
  header: {
    hostname: 'www.example.com',
    graphRef: 'alskncka384u1923e8uino1289jncvo019n'
  },
  tracesPerQuery: {
    '# Foo\nquery Foo { user { email pets { name } } }': {
      trace: [],
      statsWithContext: [],
      internalTracesContributingToStats: []
    }
  }
}

const logErrorSpy = sinon.spy()
const fakeFastifyInstance = {
  log: {
    error: logErrorSpy,
    info: sinon.spy()
  }
} as any as FastifyInstance

tap.test('sendReport encodes the report', async (t) => {
  const server = createSimpleServer((unzippedData) => {
    const reportDecoded = Report.decode(unzippedData)
    t.same(reportDecoded, fakeReport)
  })

  const res = await sendReport(
    fakeReport,
    {
      endpointUrl: 'http://localhost:3334',
      apiKey: 'fakeKey',
      graphRef: 'myGraph@current'
    },
    fakeFastifyInstance
  )

  t.equal(res.statusCode, 200)

  server.close()
  t.end()
})

tap.test('with mocked http', async (t) => {
  const endpointUrl = 'http://www.example.com'

  let agent: MockAgent
  let originalDispatcher: Dispatcher
  t.beforeEach(() => {
    agent = new MockAgent()
    agent.disableNetConnect()
    originalDispatcher = getGlobalDispatcher()
    setGlobalDispatcher(agent)
  })
  t.afterEach(() => {
    agent.enableNetConnect()
    setGlobalDispatcher(originalDispatcher)
  })

  t.test('sendReport success', async (tt) => {
    agent
      .get(endpointUrl)
      .intercept({
        path: '/api/ingress/traces',
        method: 'POST'
      })
      .reply(200, {})

    const res = await sendReport(
      fakeReport,
      {
        endpointUrl,
        apiKey: 'fakeKey',
        graphRef: 'myGraph@current'
      },
      fakeFastifyInstance
    )
    return tt.equal(res.statusCode, 200)
  })
  t.test('sendReport error', async (tt) => {
    agent
      .get(endpointUrl)
      .intercept({
        path: '/api/ingress/traces',
        method: 'POST'
      })
      .reply(400, 'something went wrong')

    const res = await sendReport(
      fakeReport,
      {
        endpointUrl,
        apiKey: 'fakeKey',
        graphRef: 'myGraph@current'
      },
      fakeFastifyInstance
    )
    tt.equal(res.statusCode, 400)
    return tt.equal(logErrorSpy.called, true)
  })
})
