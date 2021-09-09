import zlib from 'zlib'
import { promisify } from 'util'

import { IReport, Report } from 'apollo-reporting-protobuf'
import { FastifyInstance } from 'fastify'
import { request } from 'undici'

import { MercuriusApolloTracingOptions } from '.'

const gzip = promisify(zlib.gzip)

export const sendReport = async (
  report: IReport,
  options: MercuriusApolloTracingOptions,
  app: FastifyInstance
) => {
  const gzippedReport = await gzip(Report.encode(report).finish())

  const res = await request(
    `${
      options.endpointUrl || 'https://usage-reporting.api.apollographql.com'
    }/api/ingress/traces`,
    {
      method: 'POST',
      headers: {
        'user-agent': 'ApolloServerPluginUsageReporting',
        'x-api-key': options.apiKey,
        accept: 'application/json',
        'content-encoding': 'gzip'
      },
      body: gzippedReport
    }
  )

  if (res.statusCode >= 400) {
    try {
      app.log.error(await res.body.text())
    } catch (err) {
      app.log.error(err)
    }
  }
  return res
}
