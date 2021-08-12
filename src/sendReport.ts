import { IReport, Report } from 'apollo-reporting-protobuf'
import { request } from 'undici'

export const sendReport = async (
  report: IReport,
  options: { endpointUrl: string; apiKey: string }
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
        'content-encoding': 'gzip',
        accept: 'application/json'
      },
      body: Report.encode(report).finish()
    }
  )
}
