import { IReport, Report } from 'apollo-reporting-protobuf'
import { FastifyInstance } from 'fastify'
import { request } from 'undici'

import { MercuriusApolloTracingOptions } from '.'

export const sendReport = async (
  report: IReport,
  options: MercuriusApolloTracingOptions,
  app: FastifyInstance
) => {
  const res = await request(
    `${
      options.endpointUrl || 'https://usage-reporting.api.apollographql.com'
    }/api/ingress/traces`,
    {
      method: 'POST',
      headers: {
        'user-agent': 'ApolloServerPluginUsageReporting',
        'x-api-key': options.apiKey,
        accept: 'application/json'
      },
      body: Report.encode(report).finish()
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
