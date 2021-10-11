# mercurius-apollo-tracing

Fastify plugin to be used with [Mercurius](https://mercurius.dev) to collect performance metrics from your Graphql resolvers and send them to apollo studio.

## Install

```sh
npm i mercurius-apollo-tracing
```

## Usage

plugin can be registered like this:

```js
const fastify = require('fastify')
const mercuriusTracing = require('mercurius-apollo-tracing')
const app = fastify()

// you need this if you want to be able to add the server to apollo studio
// they ping your server directly from the browser
app.register(require('fastify-cors'))

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true
}) // must be done before registering mercuriusTracing

app.register(mercuriusTracing, {
  apiKey: 'your:Api:Key', // replace 'your:Api:Key' with the one from apollo studio
  graphRef: 'yourGraph@ref' // replace 'yourGraph@ref'' with the one from apollo studio
})
```

## API

### Manual flush

You can flush traces manually at any time by :

```js
app.apolloTracingStore.flushTracingNow()
```

## Options

- `endpointUrl?: string`
- `graphRef: string`
- `apiKey: string`
- `sendReportsImmediately?: boolean` default: `false`
  - useful for lambda-like environment where the whole process exits right after serving the GQL request
- `reportIntervalMs?: number` default: `10000`
- `maxUncompressedReportSize?: number` default: `4194304` maximum size of the payload in bytes
  - apollo studio ingress endpoint might not be able to handle bigger payloads, so we recommend tweaking this option carefully
- `checkReportSizeRequestCountInterval?: number` default: `100`
  - defines how often the size of the metrics payload is checked. Lower value means more frequent byte size checks are performed on the traces awaiting to be sent.

## Lambda

If you are running in lambda-like environment, keep in mind to pass `sendReportsImmediately: true` flag to registration options to make sure the report is send before process exits.

## Performance

Plugin hooks into each resolver in your schema, so performance will be negatively affected. Performance will be impacted more if you have many fast/small resolvers. If you have less resolvers and it takes more time to resolve them, perf difference is lower.
We've measured it in the benchmark [here](https://github.com/benawad/node-graphql-benchmarks/blob/4cc68bcf3134056da0ca0ae6af4ef860e948d887/benchmarks/mercurius+graphql-jit.js) and observed slow down of roughly 25 percent. This is still smaller penalty than compared to running with tracing on apollo-server-fastify.
Also in real world API where resolvers actually do something the difference will be much smaller though. These were actual results:

| server                            | Without tracing(Requests/s) | With tracing enabled(Requests/s) |
| --------------------------------- | --------------------------- | -------------------------------- |
| apollo-server-fastify+graphql-jit | 4162.8                      | 1478.4                           |
| mercurius                         | 9162                        | 6866                             |

Ran on Ubuntu 21.04, Node 16.7.0 and AMD Ryzen 5900x.

## Persisted queries

Yes this plugin works fine with them.
