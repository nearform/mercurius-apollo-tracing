import { DocumentNode, SelectionNode, Kind, OperationTypeNode } from 'graphql'
import tap from 'tap'
import sinon from 'sinon'

import { ApolloTraceBuilder } from './ApolloTraceBuilder'

const testSelectionNode: SelectionNode = {
  kind: 'Field',
  name: { kind: 'Name', value: 'test', loc: { start: 1, end: 5 } },
  arguments: [],
  directives: [],
  loc: { start: 1, end: 5 }
} as any

const document: DocumentNode = {
  kind: Kind.DOCUMENT,
  definitions: [
    {
      kind: Kind.OPERATION_DEFINITION,
      operation: OperationTypeNode.QUERY,
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [testSelectionNode]
      }
    }
  ]
}

tap.test('builds the query signature', async (t) => {
  const traceBuilder = new ApolloTraceBuilder(document, {})
  t.equal(traceBuilder.querySignature, '# -\n{test}')
})

tap.test('timers', async (t) => {
  let clock
  t.afterEach(() => {
    clock.restore()
  })
  t.test('start and end times match time change', async (tt) => {
    const startTime = 1483228800000
    const tickTime = 10000
    clock = sinon.useFakeTimers({ now: startTime })
    const traceBuilder = new ApolloTraceBuilder(document, {})
    traceBuilder.startTiming()

    clock.tick(tickTime)

    traceBuilder.stopTiming()

    tt.same(traceBuilder.trace.startTime, {
      seconds: startTime / 1000,
      nanos: 0
    })
    tt.same(traceBuilder.trace.endTime, {
      seconds: (startTime + tickTime) / 1000,
      nanos: 0
    })
  })
})
