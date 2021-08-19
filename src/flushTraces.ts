import { ReportHeader, Trace } from 'apollo-reporting-protobuf'
import { FastifyInstance } from 'fastify'
import { ApolloTraceBuilder, dateToProtoTimestamp } from './ApolloTraceBuilder'
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
  opts: MercuriusApolloTracingOptions
) {
  const interval = setInterval(() => {
    if (traceBuilders.length === 0) {
      return
    }
    app.log.info(`flushing ${traceBuilders.length} apollo traces`)

    const report = prepareReportWithHeaders(app.graphql.schema, opts)

    for (const traceBuilder of traceBuilders) {
      addTraceToReportAndFinishTiming(traceBuilder, report)
    }

    sendReport(report, opts, app).then(() => {
      app.log.info(`${traceBuilders.length} apollo traces report sent`)
    })

    traceBuilders.length = 0 // clear the array
  }, opts.flushInterval ?? 10000)
  interval.unref()
  app.addHook('onClose', (_instance, done) => {
    clearInterval(interval)
    done()
  })
}

export function addTraceToReportAndFinishTiming(
  traceBuilder: ApolloTraceBuilder,
  report: OurReport
) {
  const { querySignature, trace } = traceBuilder
  trace.http = {
    method: Trace.HTTP.Method.POST
  }

  const protobufError = Trace.verify(trace)
  if (protobufError) {
    throw new Error(`Error encoding trace: ${protobufError}`)
  }

  report.endTime = dateToProtoTimestamp(new Date())
  report.addTrace({
    statsReportKey: querySignature,
    trace,
    asTrace: true,
    includeTracesContributingToStats: false
  })
}

export function prepareReportWithHeaders(
  schema: GraphQLSchema,
  opts: MercuriusApolloTracingOptions
) {
  const schemaHash = computeCoreSchemaHash(printSchema(schema))

  const headers: ReportHeader = new ReportHeader({
    hostname: hostname(),
    agentVersion: `mercurius-apollo-tracing@${
      require('../package.json').version
    }`,
    runtimeVersion: `node ${process.version}`,
    uname: `${os.platform()}, ${os.type()}, ${os.release()}, ${os.arch()}`,
    executableSchemaId: schemaHash,
    graphRef: opts.graphRef
  })

  const report = new OurReport(headers)
  return report
}
