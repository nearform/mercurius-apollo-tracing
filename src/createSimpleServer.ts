import http from 'http'
import zlib from 'zlib'

export function createSimpleServer(onData: (arg0: Buffer) => void) {
  const requestListener = function (req, res) {
    const chunks: any[] = []
    req.on('data', (chunk: any) => chunks.push(chunk))
    req.on('end', () => {
      const data = Buffer.concat(chunks)

      const unzippedData = zlib.unzipSync(data)

      onData(unzippedData)
    })
    res.writeHead(200)
    res.end()
  }

  const server = http.createServer(requestListener)
  server.listen(3334)
  return server
}
