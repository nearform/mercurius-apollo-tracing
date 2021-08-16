import { ITracesAndStats } from 'apollo-reporting-protobuf'
import { FastifyInstance } from 'fastify'
import { dateToProtoTimestamp } from './ApolloTraceBuilder'
import { sendReport } from './sendReport'
import { MercuriusApolloTracingOptions, traceBuilders } from './index'

/**
 * periodically gathers all the traces and sends them to apollo ingress endpoint
 */
export function flushTraces(
  app: FastifyInstance,
  opts: MercuriusApolloTracingOptions
) {
  const interval = setInterval(() => {
    console.log('flush')
    const tracesPerQuery: { [k: string]: ITracesAndStats } = {}
    for (const traceBuilder of traceBuilders) {
      const { querySignature } = traceBuilder
      if (
        tracesPerQuery[querySignature] &&
        tracesPerQuery[querySignature].trace
      ) {
        tracesPerQuery[querySignature].trace!.push(traceBuilder.trace)
      } else {
        tracesPerQuery[querySignature] = {
          trace: [traceBuilder.trace]
        }
      }
    }

    sendReport(
      {
        tracesPerQuery,
        endTime: dateToProtoTimestamp(new Date()),
        header: {
          // TODO
        }
      },
      opts
    )

    traceBuilders.length = 0 // clear the array
  }, opts.flushInterval ?? 20000)

  app.addHook('onClose', (_instance, done) => {
    clearInterval(interval)
    done()
  })
}
