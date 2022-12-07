import os, { hostname } from 'os'

import { FastifyInstance } from 'fastify'
import { ReportHeader, Trace } from 'apollo-reporting-protobuf'
import { computeCoreSchemaHash } from 'apollo-server-core/dist/plugin/schemaReporting'
import { OurReport } from 'apollo-server-core/dist/plugin/usageReporting/stats'
import { GraphQLSchema, printSchema } from 'graphql'
import Dispatcher from 'undici/types/dispatcher'

import pkgJson from '../package.json'

import { ApolloTraceBuilder, dateToProtoTimestamp } from './ApolloTraceBuilder'
import { sendReport } from './sendReport'

import { MercuriusApolloTracingOptions } from './index'

const DEFAULT_MAX_REPORT_SIZE = 4 * 1024 * 1024
const DEFAULT_MAX_REPORT_TIME = 10 * 1000
const DEFAULT_CHECK_REPORT_SIZE_REQUEST_COUNT_INTERVAL = 100

export class TraceBuildersStore {
  app: FastifyInstance
  opts: MercuriusApolloTracingOptions
  traceBuilders: ApolloTraceBuilder[] = []

  constructor(app: FastifyInstance, opts: MercuriusApolloTracingOptions) {
    this.app = app
    this.opts = opts
  }

  getByteSize(): number {
    const serialized = JSON.stringify(this.traceBuilders)
    // from apollo-server core https://github.com/apollographql/apollo-server/blob/45be2704be5498595bd7a24ca7f330e59f628e3c/packages/apollo-server-core/src/plugin/usageReporting/stats.ts#L349
    return 2 + Buffer.byteLength(serialized)
  }

  async pushTraceAndFlushIfTooBig(
    traceBuilder: ApolloTraceBuilder
  ): Promise<void> {
    const { traceBuilders, opts } = this
    traceBuilders.push(traceBuilder)

    if (
      // we don't need to check size after each request. Usually one trace is between 1k and 2k, so even doing it every 1000th request would be sufficient in most cases
      traceBuilders.length %
        (opts.checkReportSizeRequestCountInterval ??
          DEFAULT_CHECK_REPORT_SIZE_REQUEST_COUNT_INTERVAL) ===
      0
    ) {
      const byteSize = this.getByteSize()

      const reachedMaxSize: boolean =
        byteSize >= (opts.maxUncompressedReportSize || DEFAULT_MAX_REPORT_SIZE)

      if (reachedMaxSize) {
        await this.flushTracing()
      }
    }
  }

  async flushTracing(): Promise<Dispatcher.ResponseData | null | undefined> {
    const { traceBuilders, opts, app } = this

    if (!traceBuilders || traceBuilders.length === 0) {
      return
    }
    const tracesCount = traceBuilders.length
    app.log.info(`flushing ${tracesCount} apollo traces`)

    const report = prepareReportWithHeaders(app.graphql.schema, opts)

    for (const traceBuilder of traceBuilders) {
      addTraceToReportAndFinishTiming(traceBuilder, report)
    }
    traceBuilders.length = 0

    let res: Dispatcher.ResponseData | null = null
    try {
      res = await sendReport(report, opts, app)
      app.log.debug(`${tracesCount} apollo traces report sent`)
    } catch (err) {
      app.log.debug(`${tracesCount} apollo traces failed to send`)
      app.log.error(err)
    }

    return res
  }

  runFlushTracesConsumer(): void {
    const { opts, app } = this

    const interval = setInterval(
      this.flushTracing.bind(this),
      opts.reportIntervalMs ?? DEFAULT_MAX_REPORT_TIME
    )
    interval.unref()
    app.addHook('onClose', (_instance, done) => {
      clearInterval(interval)
      done()
    })
  }
}

/**
 * periodically gathers all the traces and sends them to apollo ingress endpoint
 */
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
    includeTracesContributingToStats: false,
    referencedFieldsByType: traceBuilder.referencedFieldsByType
  })
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
