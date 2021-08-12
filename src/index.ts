import { defaultUsageReportingSignature } from 'apollo-graphql'

import fp from 'fastify-plugin'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { hrtime } from 'process'

function durationHrTimeToNanoseconds(hrtime: [number, number]) {
  return hrtime[0] * 1e9 + hrtime[1]
}

function setupSchema(schema: GraphQLSchema) {
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
            const reportingSignature = defaultUsageReportingSignature({ definitions: [info.operation], kind: 'Document' }, info.operation.name?.value ?? '')
            // TODO record Report into memory and flush them every 20 sec

            console.log(
              reportingSignature
            )


            const startHrTime = hrtime()
            const startTime = durationHrTimeToNanoseconds(hrtime(startHrTime))
            console.log('starts', startTime)

            return originalFieldResolver(self, arg, ctx, info).finally(() => {
              const endTime = durationHrTimeToNanoseconds(hrtime(startHrTime))
              console.log('ends', endTime)
            })
          }
        }
      }
    }
  }
}

export default fp(
  async function (app) {
    app.log.debug('registering mercuriusApolloTracing')
    setupSchema(app.graphql.schema)
  },
  {
    fastify: '3.x',
    name: 'mercuriusApolloTracing',
    dependencies: ['mercurius']
  }
)
