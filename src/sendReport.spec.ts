import { sendReport } from './sendReport'
import http from 'http'
import { Report } from 'apollo-reporting-protobuf'

describe('sendReport', () => {
  let server

  it('should send', async () => {
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

        expect(reportDecoded).toMatchSnapshot(fakeReport)
      })
      res.writeHead(200)
      res.end()
      // TODO decode report and assert
    }

    server = http.createServer(requestListener)
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

    expect(res.statusCode).toBe(200)
  })

  afterAll(() => {
    server.close()
  })
})
