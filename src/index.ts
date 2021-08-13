import { defaultUsageReportingSignature } from 'apollo-graphql'
import { ITrace, ITracesAndStats, Report } from 'apollo-reporting-protobuf'

import fp from 'fastify-plugin'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { hrtime } from 'process'
import { ApolloTraceBuilder } from './ApolloTraceBuilder'

function durationHrTimeToNanoseconds(hrtime: [number, number]) {
  return hrtime[0] * 1e9 + hrtime[1]
}

export const traces: ApolloTraceBuilder[] = []

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

export default fp(
  async function (app) {
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

    app.graphql.addHook('onResolution', async (execution, context) => {
      // @ts-expect-error
      context.__traceBuilder.stopTiming()
      // @ts-expect-error

      console.log('ends2', context.__traceBuilder)
    })
  },
  {
    fastify: '3.x',
    name: 'mercuriusApolloTracing',
    dependencies: ['mercurius']
  }
)
