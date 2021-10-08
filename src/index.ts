import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import 'mercurius' // needed for types
import { Dispatcher } from 'undici'

import { ApolloTraceBuilder } from './ApolloTraceBuilder'
import {
  addTraceToReportAndFinishTiming,
  runFlushTracesConsumer,
  getTraceSize,
  prepareReportWithHeaders,
  TraceBuildersStore
} from './TraceBuildersStore'
import { hookIntoSchemaResolvers } from './hookIntoSchemaResolvers'
import { sendReport } from './sendReport'

export type MercuriusApolloTracingOptions = {
  endpointUrl?: string
  graphRef: string
  apiKey: string
  /**
   * useful for lambda-like environment where the whole process exits
   */
  sendReportsImmediately?: true
  /**
   * flush interval in milliseconds
   */
  reportIntervalMs?: number
  /**
   * max report size in bytes
   */
  maxUncompressedReportSize?: number

  /**
   * this allows to tweak how often plugin checks the size of the payload for apollo-studio ingress endpoint
   */
  checkReportSizeRequestCountInterval?: number
}

declare module 'fastify' {
  interface FastifyInstance {
    flushApolloTracing: () => Promise<Dispatcher.ResponseData | undefined>
  }

  interface FastifyRegister {
    (
      plugin: FastifyPluginCallback<MercuriusApolloTracingOptions>,
      opts: MercuriusApolloTracingOptions
    ): FastifyInstance
  }
}

declare module 'mercurius' {
  interface MercuriusContext {
    __traceBuilder: ApolloTraceBuilder
  }
}

export default fp(
  async function (app, opts: MercuriusApolloTracingOptions) {
    if (!opts.apiKey) {
      throw new Error('an Apollo Studio API key is required')
    }

    app.log.debug('registering mercuriusApolloTracing')
    hookIntoSchemaResolvers(app.graphql.schema)

    app.graphql.addHook('preExecution', async (_schema, document, context) => {
      const traceBuilder: ApolloTraceBuilder = new ApolloTraceBuilder(
        document,
        {}
      )
      traceBuilder.startTiming()

      context.__traceBuilder = traceBuilder
      return { document }
    })

    const store = new TraceBuildersStore(app, opts)

    app.graphql.addHook('onResolution', async (execution, context: any) => {
      const traceBuilder: ApolloTraceBuilder = context.__traceBuilder

      if (context.errors) {
        // The below reports errors if they are returned from preExecution hook
        traceBuilder.didEncounterErrors(context.errors)
      } else if (execution.errors) {
        // this reports errors from execution
        traceBuilder.didEncounterErrors(execution.errors)
      }

      traceBuilder.stopTiming()

      const schema = app.graphql.schema
      if (opts.sendReportsImmediately) {
        // avoid blocking the hook execution as the hook is awaited in mercurius

        setImmediate(() => {
          const report = prepareReportWithHeaders(schema, opts)
          addTraceToReportAndFinishTiming(traceBuilder, report)

          sendReport(report, opts, app)
        })
      } else {
        // avoid blocking the hook execution as the hook is awaited in mercurius

        setImmediate(() => {
          store.pushTraceAndFlushIfTooBig(traceBuilder)
        })
      }
    })

    if (!opts.sendReportsImmediately) {
      runFlushTracesConsumer(app, store.traceBuilders, opts)
    }
  },
  {
    fastify: '3.x',
    name: 'mercuriusApolloTracing',
    dependencies: ['mercurius']
  }
)
