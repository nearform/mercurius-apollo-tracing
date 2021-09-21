import React, { useState } from 'react'

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries'
import { sha256 } from 'crypto-hash'

const linkChain = createPersistedQueryLink({ sha256 }).concat(
  new HttpLink({ uri: 'http://localhost:4000/graphql' })
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
        <p>Hello Vite + React!</p>
        <p>
          <button type="button" onClick={() => setCount((count) => count + 1)}>
            count is: {count}
          </button>
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
      </header>
    </div>
  )
}

export default App
