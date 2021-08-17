import { ITracesAndStats, Trace } from 'apollo-reporting-protobuf'
import { FastifyInstance } from 'fastify'
import { dateToProtoTimestamp } from './ApolloTraceBuilder'
import { sendReport } from './sendReport'
import { MercuriusApolloTracingOptions, traceBuilders } from './index'
import { GraphQLSchema, printSchema } from 'graphql'
import { computeCoreSchemaHash } from 'apollo-server-core/dist/plugin/schemaReporting'
import { OurReport } from 'apollo-server-core/dist/plugin/usageReporting/stats'
import os, { hostname } from 'os'
/**
 * periodically gathers all the traces and sends them to apollo ingress endpoint
 */
export function flushTraces(
  app: FastifyInstance,
  opts: MercuriusApolloTracingOptions,
  schema: GraphQLSchema
) {
  const interval = setInterval(() => {
    if (traceBuilders.length === 0) {
      return
    }
    console.log(`flush ${traceBuilders.length}`)

    const schemaHash = computeCoreSchemaHash(printSchema(schema))

    const headers = {
      hostname: hostname(),
      agentVersion: `mercurius-apollo-tracing@${
        require('../package.json').version
      }`,
      runtimeVersion: `node ${process.version}`,
      uname: `${os.platform()}, ${os.type()}, ${os.release()}, ${os.arch()}`,
      executableSchemaId: schemaHash,
      graphRef: opts.graphRef
    }

    const tracesPerQuery: { [k: string]: ITracesAndStats } = {}
    for (const traceBuilder of traceBuilders) {
      const { querySignature, trace } = traceBuilder
      trace.http = {
        method: Trace.HTTP.Method.POST
      }

      // const report = new OurReport(headers)
      // report.endTime = dateToProtoTimestamp(new Date())
      if (
        tracesPerQuery[querySignature] &&
        tracesPerQuery[querySignature].trace
      ) {
        tracesPerQuery[querySignature].trace!.push(trace)
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
        header: headers
      },
      opts
    ).then(async (res) => {
      console.log('~ res', res)
      if (res.statusCode > 399) {
        try {
          console.error(await res.body.text())
        } catch (err) {
          console.error(err)
        }
      }
    })

    traceBuilders.length = 0 // clear the array
  }, opts.flushInterval ?? 10000)
  interval.unref()
  app.addHook('onClose', (_instance, done) => {
    clearInterval(interval)
    done()
  })
}
