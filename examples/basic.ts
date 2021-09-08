'use strict'

import dotenv from 'dotenv'
import fastify from 'fastify'
import mercurius from 'mercurius'
import faker from 'faker'
import mercuriusApolloRegistry from 'mercurius-apollo-registry'

import mercuriusMetrics from '../src/index'

dotenv.config()

const app = fastify({ logger: true })

const schema = `
  type Post {
    title: String
    body: String
  }
  type Query {
    add(x: Int, y: Int): Int
    word: String
    throwErr: String
    post: Post!
  }
`

const resolvers = {
  Query: {
    async add(_, { x, y }, { reply }) {
      reply.log.info('add called')
      // for (let i = 0; i < 10000000; i++) {}
      return x + y
    },
    async post() {
      return {
        title: '',
        body: ''
      }
    },
    word() {
      return faker.lorem.word()
    },
    throwErr() {
      throw new Error('ss')
    }
  }
}

app.register(require('fastify-cors')) // you need this if you want to be able to add the server to apollo studio and get introspection working in the modal for adding new graph
app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true
})

const apiKey: string = process.env.APOLLO_KEY || ''

app.register(mercuriusApolloRegistry, {
  schema,
  apiKey
})

app.register(mercuriusMetrics, {
  apiKey,
  graphRef: process.env.APOLLO_GRAPH_ID + '@' + process.env.APOLLO_GRAPH_VARIANT
  // sendReportsImmediately: true // this is for lambda-like execution model
})

app.listen(3000)
