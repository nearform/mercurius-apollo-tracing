import { GraphQLObjectType, GraphQLSchema } from 'graphql'

import { ApolloTraceBuilder } from './ApolloTraceBuilder'

export function hookIntoSchemaResolvers(schema: GraphQLSchema) {
  const schemaTypeMap = schema.getTypeMap()

  for (const schemaType of Object.values(schemaTypeMap)) {
    // Handle fields on schema type
    if (typeof (schemaType as GraphQLObjectType).getFields === 'function') {
      for (const [, field] of Object.entries(
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
