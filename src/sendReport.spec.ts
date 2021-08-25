import http from 'http'

import { Report } from 'apollo-reporting-protobuf'
import tap from 'tap'

import { sendReport } from './sendReport'

tap.test('sendReport sends', async (t) => {
  const fakeReport = {
    header: {
      hostname: 'www.example.com',
      graphRef: 'alskncka384u1923e8uino1289jncvo019n'
    },
    tracesPerQuery: {
      '# Foo\nquery Foo { user { email pets { name } } }': {
        trace: []
      }
    }
  }

  const requestListener = function (req, res) {
    const chunks: any[] = []
    req.on('data', (chunk: any) => chunks.push(chunk))
    req.on('end', () => {
      const data = Buffer.concat(chunks)

      const reportDecoded = Report.decode(data)

      t.matchSnapshot(reportDecoded)
    })
    res.writeHead(200)
    res.end()
    // TODO decode report and assert
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
