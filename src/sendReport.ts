import { IReport, Report } from 'apollo-reporting-protobuf'
import { request } from 'undici'
import { MercuriusApolloTracingOptions } from '.'

export const sendReport = async (
  report: IReport,
  options: MercuriusApolloTracingOptions
) => {
  console.log('~ report', JSON.stringify(report, null, 2))

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
  )
}
