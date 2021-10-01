import os, { hostname } from 'os'

import { FastifyInstance } from 'fastify'
import { ReportHeader, Trace } from 'apollo-reporting-protobuf'
import { computeCoreSchemaHash } from 'apollo-server-core/dist/plugin/schemaReporting'
import { OurReport } from 'apollo-server-core/dist/plugin/usageReporting/stats'
import { GraphQLSchema, printSchema } from 'graphql'
import { ResponseData } from 'undici/types/dispatcher'

import pkgJson from '../package.json'

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
): void {
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
    traceBuilders.length = 0

    let res: ResponseData | null = null
    try {
      res = await sendReport(report, opts, app)
      app.log.info(`${tracesCount} apollo traces report sent`)
    } catch (err) {
      app.log.info(`${tracesCount} apollo traces failed to send`)
      app.log.error(err)
    }

    return res
  }
  const interval = setInterval(
    flushTracingNow,
    opts.reportIntervalMs ?? 10 * 1000
  )
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
): void {
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

export function getTraceSize(trace: ApolloTraceBuilder): number {
  return JSON.stringify(trace).replace(/[[\],"]/g, '').length
}

export function prepareReportWithHeaders(
  schema: GraphQLSchema,
  opts: MercuriusApolloTracingOptions
): OurReport {
  const schemaHash = computeCoreSchemaHash(printSchema(schema))

  const headers: ReportHeader = new ReportHeader({
    hostname: hostname(),
    agentVersion: `mercurius-apollo-tracing@${pkgJson.version}`,
    runtimeVersion: `node ${process.version}`,
    uname: `${os.platform()}, ${os.type()}, ${os.release()}, ${os.arch()}`,
    executableSchemaId: schemaHash,
    graphRef: opts.graphRef
  })

  const report = new OurReport(headers)
  return report
}
