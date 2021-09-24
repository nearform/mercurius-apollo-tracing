# mercurius-apollo-tracing

Fastify plugin to be used with [Mercurius](https://mercurius.dev) to collect performance metrics from your Graphql resolvers and send them to apollo studio.

## Install

```sh
npm i mercurius-apollo-tracing
# yarn
yarn add mercurius-apollo-tracing
```

## Usage

plugin can be registered like this:

```ts
import mercuriusMetrics from 'mercurius-apollo-tracing'
const app = fastify()
app.register(require('fastify-cors')) // you need this if you want to be able to add the server to apollo studio and get introspection working in the modal for adding new graph

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true
}) // must be done before registering mercuriusMetrics

app.register(mercuriusMetrics, {
  apiKey: 'your:Api:Key', // replace 'your:Api:Key' with the one from apollo studio
  graphRef: 'yourGraph@ref' // replace 'yourGraph@ref'' with the one from apollo studio
})
```

If you are running in lambda, keep in mind to pass `sendReportsImmediately: true` flag to registration options.

## Manual flush

You can flush traces manually at any time by :

```js
app.flushApolloTracing()
```

## All options

- `endpointUrl?: string`
- `graphRef: string`
- `apiKey: string`
- `sendReportsImmediately?: true`
  - useful for lambda-like environment where the whole process exits right after serving the GQL request
- `reportIntervalMs?: number`
  - 10000 is the default value

## Performance

Plugin hooks into each resolver in your schema, so performance will be negatively affected. Performance will be impacted more if you have many fast/small resolvers. If you have less resolvers and it takes more time to resolve them, perf difference is lower.
We've measured it in the benchmark [here](https://github.com/benawad/node-graphql-benchmarks/blob/4cc68bcf3134056da0ca0ae6af4ef860e948d887/benchmarks/mercurius+graphql-jit.js) and observed slow down of roughly 25 percent. In real world API where resolvers actually do something the difference will be much smaller though. These were actual results:

| Run | Without this plugin(Requests/s) | With the plugin(Requests/s) |
| --- | ------------------------------- | --------------------------- |
| 1   | 9125                            | 6861                        |
| 2   | 9162                            | 6866                        |

Ran on Ubuntu 21.04, Node 16.7.0 and AMD Ryzen 5900x.

## Persisted queries

Yes this plugin works fine with them.

## License

Copyright NearForm Ltd 2021. Licensed under the [Apache-2.0 license](http://www.apache.org/licenses/LICENSE-2.0).
