import os, { hostname } from 'os'

import { FastifyInstance } from 'fastify'
import { ReportHeader, Trace } from 'apollo-reporting-protobuf'
import { computeCoreSchemaHash } from 'apollo-server-core/dist/plugin/schemaReporting'
import { OurReport } from 'apollo-server-core/dist/plugin/usageReporting/stats'
import { GraphQLSchema, printSchema } from 'graphql'

import { ApolloTraceBuilder, dateToProtoTimestamp } from './ApolloTraceBuilder'
import { sendReport } from './sendReport'

import { MercuriusApolloTracingOptions } from './index'

/**
 * periodically gathers all the traces and sends them to apollo ingress endpoint
 */
export function flushTraces(
  app: FastifyInstance,
  traceBuilders: ApolloTraceBuilder[],
  opts: MercuriusApolloTracingOptions
) {
  const flushTracingNow = async () => {
    if (traceBuilders.length === 0) {
      return
    }
    const tracesCount = traceBuilders.length
    app.log.info(`flushing ${tracesCount} apollo traces`)

    const report = prepareReportWithHeaders(app.graphql.schema, opts)

    for (const traceBuilder of traceBuilders) {
      addTraceToReportAndFinishTiming(traceBuilder, report)
    }

    const res = await sendReport(report, opts, app)
    app.log.info(`${tracesCount} apollo traces report sent`)

    traceBuilders.length = 0
    return res
  }
  const interval = setInterval(flushTracingNow, opts.flushInterval ?? 10000)
  interval.unref()
  app.addHook('onClose', (_instance, done) => {
    clearInterval(interval)
    done()
  })

  app.decorate('flushApolloTracing', flushTracingNow)
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
