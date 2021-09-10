import http from 'http'
import zlib from 'zlib'

import { Report } from 'apollo-reporting-protobuf'
import tap from 'tap'
import {
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Dispatcher
} from 'undici'
import sinon from 'sinon'

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
      internalTracesContributingToStats: []
    }
  }
}

tap.test('sendReport encodes the report', async (t) => {
  const requestListener = function (req, res) {
    const chunks: any[] = []
    req.on('data', (chunk: any) => chunks.push(chunk))
    req.on('end', () => {
      const data = Buffer.concat(chunks)

      const unzippedData = zlib.unzipSync(data)

      const reportDecoded = Report.decode(unzippedData)
      t.same(reportDecoded, fakeReport)
    })
    res.writeHead(200)
    res.end()
  }

  const server = http.createServer(requestListener)
  server.listen(3334)

  const res = await sendReport(
    fakeReport,
    {
      endpointUrl: 'http://localhost:3334',
      apiKey: 'fakeKey',
      graphRef: 'myGraph@current'
    },
    {} as any
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
  t.test('thing', async (tt) => {
    return tt.equal(2, 2)
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
      {} as any
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

    const logErrorSpy = sinon.spy()
    const res = await sendReport(
      fakeReport,
      {
        endpointUrl,
        apiKey: 'fakeKey',
        graphRef: 'myGraph@current'
      },
      {
        log: {
          error: logErrorSpy
        }
      } as any
    )
    tt.equal(res.statusCode, 400)
    return tt.equal(logErrorSpy.called, true)
  })
})
