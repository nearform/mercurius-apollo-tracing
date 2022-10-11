import { promisify } from 'util'

import tap from 'tap'
import fastify from 'fastify'
import mercurius from 'mercurius'
import WebSocket from 'ws'

import { resolvers, schema } from '../examples/subscriptionSchema'

import plugin from './index'

const sleep = promisify(setTimeout)

tap.test(
  'metrics are reported when client is using subscription',
  async (t) => {
    const app = fastify()
    t.plan(2)

    app.register(mercurius, {
      schema,
      resolvers,
      subscription: {
        keepAlive: 1000
      }
    })

    await app.register(plugin, {
      apiKey: 'APOLLO_KEY',
      endpointUrl: 'http://localhost:3334',
      graphRef: 'APOLLO_GRAPH_ID' + '@' + 'APOLLO_GRAPH_VARIANT',
      sendReportsImmediately: true
    })

    await app.listen({ port: 0 })

    const ws = new WebSocket(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      'ws://localhost:' + app.server.address().port + '/graphql',
      'graphql-ws'
    )
    const client = WebSocket.createWebSocketStream(ws, {
      encoding: 'utf8',
      objectMode: true
    })

    t.teardown(client.destroy.bind(client))

    client.write(
      JSON.stringify({
        type: 'connection_init'
      })
    )

    client.write(
      JSON.stringify({
        id: 1,
        type: 'start',
        payload: {
          query: `
            subscription {
              notificationAdded {
                id
                message
              }
            }
          `
        }
      })
    )

    client.write(
      JSON.stringify({
        id: 2,
        type: 'start',
        payload: {
          query: `
            subscription {
              notificationAdded {
                id
                message
              }
            }
          `
        }
      })
    )

    client.write(
      JSON.stringify({
        id: 2,
        type: 'stop'
      })
    )

    app.apolloTracingStore.flushTracing = async () => null

    client.on('data', (chunk) => {
      const data = JSON.parse(chunk)

      if (data.type === 'data') {
        t.equal(
          chunk,
          JSON.stringify({
            type: 'data',
            id: 1,
            payload: {
              data: {
                notificationAdded: {
                  id: '1',
                  message: 'Hello World'
                }
              }
            }
          })
        )
        t.equal(
          app.apolloTracingStore.traceBuilders[0].querySignature,
          `# -\nmutation{addNotification(message:""){id}}`
        )
        app.close()
        client.end()
        t.end()
      } else if (data.type === 'complete') {
        app.inject({
          method: 'POST',
          url: '/graphql',
          payload: {
            query: `
                mutation {
                  addNotification(message: "Hello World") {
                    id
                  }
                }
              `
          }
        })
      }
    })

    await sleep(1000)
  }
)
