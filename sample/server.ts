import fastify from 'fastify'
import mercurius from 'mercurius'
import mercuriusMetrics from '../src/index'
import faker from 'faker'
const app = fastify({ logger: true })

const schema = `
  type Post {
    title: String
    body: String
  }
  type Query {
    add(x: Int, y: Int): Int
    word: String
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
    }
  }
}

app.register(require('fastify-cors')) // you need this if you want to be able to add the server to apollo studio and get introspection working in the modal for adding new graph
app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true
})

app.register(mercuriusMetrics, { apiKey: 'yourApiKey' })

app.listen(3333)
