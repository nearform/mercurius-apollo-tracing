import fp from 'fastify-plugin'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { ApolloTraceBuilder } from './ApolloTraceBuilder'
import {
  addTraceToReportAndFinishTiming,
  flushTraces,
  prepareReportWithHeaders
} from './flushTraces'
import 'mercurius' // needed for types

import { FastifyPluginCallback } from 'fastify'
import { sendReport } from './sendReport'

function hookIntoSchemaResolvers(schema: GraphQLSchema) {
  const schemaTypeMap = schema.getTypeMap()

  for (const schemaType of Object.values(schemaTypeMap)) {
    // Handle fields on schema type
    if (typeof (schemaType as GraphQLObjectType).getFields === 'function') {
      for (const [_fieldName, field] of Object.entries(
        (schemaType as GraphQLObjectType).getFields()
      )) {
        // Override resolvers so that we can do timing recording
        if (typeof field.resolve === 'function') {
          const originalFieldResolver = field.resolve
          field.resolve = (self, arg, ctx, info) => {
            const operationName = info.operation.name?.value

            if (operationName === 'IntrospectionQuery') {
              return originalFieldResolver(self, arg, ctx, info)
            }
            const traceBuilder: ApolloTraceBuilder = ctx.__traceBuilder

            const endTimingCallback = traceBuilder.willResolveField(info)

            const resolvedValue = originalFieldResolver(self, arg, ctx, info)

            if (resolvedValue instanceof Promise) {
              return resolvedValue.finally(() => {
                endTimingCallback()
              })
            }
            endTimingCallback()
            return resolvedValue
          }
        }
      }
    }
  }
}

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
  flushInterval?: number
}

declare module 'fastify' {
  interface FastifyRegister {
    (
      plugin: FastifyPluginCallback<MercuriusApolloTracingOptions>,
      opts: MercuriusApolloTracingOptions
    ): FastifyInstance
  }
}

export const traceBuilders: ApolloTraceBuilder[] = []

export default fp(
  async function (app, opts: MercuriusApolloTracingOptions) {
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

    app.graphql.addHook('onResolution', async (_execution, context) => {
      // @ts-expect-error
      const traceBuilder = context.__traceBuilder

      traceBuilder.stopTiming()

      const schema = app.graphql.schema
      if (opts.sendReportsImmediately) {
        setImmediate(() => {
          const report = prepareReportWithHeaders(schema, opts)
          addTraceToReportAndFinishTiming(traceBuilder, report)
          sendReport(report, opts)
        })
      } else {
        traceBuilders.push(traceBuilder)
      }
    })

    if (!opts.sendReportsImmediately) {
      flushTraces(app, opts, app.graphql.schema)
    }
  },
  {
    fastify: '3.x',
    name: 'mercuriusApolloTracing',
    dependencies: ['mercurius']
  }
)
