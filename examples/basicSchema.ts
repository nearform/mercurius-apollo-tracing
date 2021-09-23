import faker from 'faker'

export const basicSchema = `
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

export const basicResolvers = {
  Query: {
    async add(_, { x, y }, { reply }) {
      reply.log.info('add called')
      // for (let i = 0; i < 10000000; i++) {}
      return x + y
    },
    async post() {
      return {
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(6)
      }
    },
    word() {
      return faker.lorem.word()
    },
    throwErr() {
      throw new Error('sample error')
    }
  }
}
