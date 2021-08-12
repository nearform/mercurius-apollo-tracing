import fastify from 'fastify'
import mercurius from 'mercurius'
import mercuriusMetrics from '../src/index'

const app = fastify({ logger: true })

const schema = `
  type Post {
    title: String
    body: String
  }
  type Query {
    add(x: Int, y: Int): Int
    hello: String
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
    }
  }
}

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true
})

app.register(mercuriusMetrics, { apiKey: 'yourApiKey' })

app.listen(3333)
