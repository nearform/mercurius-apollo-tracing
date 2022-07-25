import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import 'mercurius' // needed for types
import { calculateReferencedFieldsByType } from '@apollo/utils.usagereporting'
import { getOperationAST } from 'graphql'

import { ApolloTraceBuilder } from './ApolloTraceBuilder'
import { TraceBuildersStore } from './TraceBuildersStore'
import { hookIntoSchemaResolvers } from './hookIntoSchemaResolvers'

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
    apolloTracingStore: TraceBuildersStore
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
      const operationAST = getOperationAST(document)
      traceBuilder.referencedFieldsByType = calculateReferencedFieldsByType({
        document,
        schema: _schema,
        resolvedOperationName: operationAST?.name?.value ?? null
      })
      return { document }
    })

    const store = new TraceBuildersStore(app, opts)
    app.decorate('apolloTracingStore', store)

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

      if (opts.sendReportsImmediately) {
        store.traceBuilders.push(traceBuilder)
        store.flushTracing()
      } else {
        // avoid blocking the hook execution as the hook is awaited in mercurius

        setImmediate(() => {
          store.pushTraceAndFlushIfTooBig(traceBuilder)
        })
      }
    })

    if (!opts.sendReportsImmediately) {
      store.runFlushTracesConsumer()
    }
  },
  {
    fastify: '4.x',
    name: 'mercuriusApolloTracing',
    dependencies: ['mercurius']
  }
)
