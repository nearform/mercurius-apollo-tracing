import { afterEach, beforeEach, describe, test, TestContext } from 'node:test'

import { Report } from 'apollo-reporting-protobuf'
import { FastifyInstance } from 'fastify'
import sinon from 'sinon'
import {
  Dispatcher,
  getGlobalDispatcher,
  MockAgent,
  setGlobalDispatcher
} from 'undici'

import { createSimpleServer } from './createSimpleServer'
import { sendReport } from './sendReport'

const fakeReport = {
  header: {
    hostname: 'www.example.com',
    graphRef: 'alskncka384u1923e8uino1289jncvo019n'
  },
  tracesPerQuery: {
    '# Foo\nquery Foo { user { email pets { name } } }': {
      trace: [],
      statsWithContext: [],
      referencedFieldsByType: {},
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

test('sendReport encodes the report', async (t: TestContext) => {
  const server = createSimpleServer((unzippedData) => {
    const reportDecoded = Report.decode(unzippedData)
    t.assert.deepStrictEqual(reportDecoded, fakeReport)
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

  t.assert.equal(res.statusCode, 200)

  server.close()
})

describe('with mocked http', async () => {
  const endpointUrl = 'http://www.example.com'

  let agent: MockAgent
  let originalDispatcher: Dispatcher
  beforeEach(() => {
    agent = new MockAgent()
    agent.disableNetConnect()
    originalDispatcher = getGlobalDispatcher()
    setGlobalDispatcher(agent)
  })
  afterEach(() => {
    agent.enableNetConnect()
    setGlobalDispatcher(originalDispatcher)
  })

  test('sendReport success', async (t: TestContext) => {
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
    t.assert.equal(res.statusCode, 200)
  })
  test('sendReport error', async (t: TestContext) => {
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
    t.assert.equal(res.statusCode, 400)
    t.assert.equal(logErrorSpy.called, true)
  })
})
