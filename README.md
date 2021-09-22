# mercurius-apollo-tracing

Fastify plugin to be used with [Mercurius](https://mercurius.dev) to collect performance metrics from your Graphql resolvers and send them to apollo studio.

## Install

```sh
npm i mercurius-apollo-tracing -S
# yarn
yarn add mercurius-apollo-tracing -S
```

## Usage

plugin can be registered like this:

```ts
import mercuriusMetrics from 'mercurius-apollo-tracing'

app.register(require('fastify-cors')) // you need this if you want to be able to add the server to apollo studio and get introspection working in the modal for adding new graph
app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true
})

app.register(mercuriusMetrics, {
  apiKey: 'your:Api:Key', // replace 'your:Api:Key' with the one from apollo studio
  graphRef: 'yourGraph@ref' // replace 'yourGraph@ref'' with the one from apollo studio
})
```

If you are running in lambda, keep in mind to pass `sendReportsImmediately: true` flag.

## Manual flush

You can flush traces manually at any time by :

```js
await app.flushApolloTracing()
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

Plugin hooks into each resolver in your schema, so performance will be negatively affected.

## Persisted queries

Yes this plugin works fine with them.
