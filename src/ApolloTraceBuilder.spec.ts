import { DocumentNode, SelectionNode } from 'graphql'
import tap from 'tap'

import { ApolloTraceBuilder } from './ApolloTraceBuilder'

tap.test('builds the query signature', async (t) => {
  const testSelectionNode: SelectionNode = {
    kind: 'Field',
    name: { kind: 'Name', value: 'test', loc: { start: 1, end: 5 } },
    arguments: [],
    directives: [],
    loc: { start: 1, end: 5 }
  } as any

  const document: DocumentNode = {
    kind: 'Document',
    definitions: [
      {
        kind: 'OperationDefinition',
        operation: 'query',
        selectionSet: {
          kind: 'SelectionSet',
          selections: [testSelectionNode]
        }
      }
    ]
  }
  const traceBuilder = new ApolloTraceBuilder(document, {})
  t.equal(traceBuilder.querySignature, '# -\n{test}')
})
