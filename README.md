# mercurius-apollo-tracing

Experimental fastify plugin to gather performance metrics from your Graphql resolvers.

## Install

```sh
npm i mercurius-apollo-tracing -S
# yarn
yarn add mercurius-apollo-tracing -S
```

## Usage

plugin can be registered like this:

```ts
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

## All options

- `endpointUrl?: string`
- `graphRef: string`
- `apiKey: string`
- `sendReportsImmediately?: true`
  - useful for lambda-like environment where the whole process exits right after serving the GQL request
- `flushInterval?: number`
  - 20000 is the default value

## Performance

Plugin hooks into each resolver in your schema, so performance will be negatively affected.

## alternative approach

One alternative way worth considering would be to write a generic adapter to allow any arbitrary apollo-server plugin to be used inside fastify.
This should be doable and it could be less effort to maintain onwards than having a separate fastify apollo metrics plugin.
