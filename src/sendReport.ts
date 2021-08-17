import { IReport, Report } from 'apollo-reporting-protobuf'
import { request } from 'undici'
import { MercuriusApolloTracingOptions } from '.'

export const sendReport = async (
  report: IReport,
  options: MercuriusApolloTracingOptions
) => {
  return request(
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
  ).then(async (res) => {
    if (res.statusCode >= 400) {
      try {
        console.error(await res.body.text())
      } catch (err) {
        console.error(err)
      }
    }
    return res
  })
}
