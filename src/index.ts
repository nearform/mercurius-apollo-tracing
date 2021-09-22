import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import 'mercurius' // needed for types
import { Dispatcher } from 'undici'

import { ApolloTraceBuilder } from './ApolloTraceBuilder'
import {
  addTraceToReportAndFinishTiming,
  flushTraces,
  prepareReportWithHeaders
} from './flushTraces'
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
}

declare module 'fastify' {
  interface FastifyRegister {
    (
      plugin: FastifyPluginCallback<MercuriusApolloTracingOptions>,
      opts: MercuriusApolloTracingOptions
    ): FastifyInstance
  }

  interface FastifyInstance {
    flushApolloTracing: () => Promise<Dispatcher.ResponseData | undefined>
  }
}

const traceBuilders: ApolloTraceBuilder[] = []

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
      // @ts-expect-error
      context.__traceBuilder = traceBuilder
      return { document }
    })

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
        setImmediate(() => {
          const report = prepareReportWithHeaders(schema, opts)
          addTraceToReportAndFinishTiming(traceBuilder, report)

          sendReport(report, opts, app)
        })
      } else {
        traceBuilders.push(traceBuilder)
      }
    })

    if (!opts.sendReportsImmediately) {
      flushTraces(app, traceBuilders, opts)
    }
  },
  {
    fastify: '3.x',
    name: 'mercuriusApolloTracing',
    dependencies: ['mercurius']
  }
)
