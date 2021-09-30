import dotenv from 'dotenv'
import fastify from 'fastify'
import mercurius from 'mercurius'
import cors from 'fastify-cors'

import mercuriusMetrics from '../src/index'

import { basicSchema, basicResolvers } from './basicSchema'

dotenv.config()

export const app = fastify({ logger: true })

app.register(cors) // you need this if you want to be able to add the server to apollo studio and get introspection working in the modal for adding new graph
app.register(mercurius, {
  schema: basicSchema,
  resolvers: basicResolvers,
  graphiql: true,
  persistedQueryProvider: mercurius.persistedQueryDefaults.automatic()
})

const apiKey: string = process.env.APOLLO_KEY as string

app.register(mercuriusMetrics, {
  apiKey,
  graphRef: process.env.APOLLO_GRAPH_ID + '@' + process.env.APOLLO_GRAPH_VARIANT
  // sendReportsImmediately: true // this is for lambda-like execution model
})

app.listen(process.env.PORT as string)
console.log(`listening on ${process.env.PORT}`)
