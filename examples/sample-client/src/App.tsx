import React, { useState } from 'react'

import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client'
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries'
import { sha256 } from 'crypto-hash'

const linkChain = createPersistedQueryLink({ sha256 }).concat(
  new HttpLink({ uri: 'http://localhost:3434/graphql' })
)

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: linkChain
})

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <p>Click to call a persisted query</p>
        <p>
          <button
            type="button"
            onClick={() => {
              client
                .query({
                  query: gql`
                    query testPersistedQuery {
                      throwErr
                      post {
                        body
                      }
                    }
                  `
                })
                .then((result) => console.log(result))
              setCount(count + 1)
            }}
          >
            clicked {count} times
          </button>
        </p>
      </header>
    </div>
  )
}

export default App
