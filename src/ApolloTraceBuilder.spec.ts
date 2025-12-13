import { afterEach, describe, test, TestContext } from 'node:test'

import { DocumentNode, Kind, OperationTypeNode, SelectionNode } from 'graphql'
import { type SinonFakeTimers, useFakeTimers } from 'sinon'

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

test('builds the query signature', async (t) => {
  const traceBuilder = new ApolloTraceBuilder(document, {})
  t.assert.equal(traceBuilder.querySignature, '# -\n{test}')
})

describe('timers', async () => {
  let clock: SinonFakeTimers
  afterEach(() => {
    clock.restore()
  })
  test('start and end times match time change', async (t: TestContext) => {
    const startTime = 1483228800000
    const tickTime = 10000
    clock = useFakeTimers({ now: startTime })
    const traceBuilder = new ApolloTraceBuilder(document, {})
    traceBuilder.startTiming()

    clock.tick(tickTime)

    traceBuilder.stopTiming()

    t.assert.deepEqual(traceBuilder.trace.startTime, {
      seconds: startTime / 1000,
      nanos: 0
    })
    t.assert.deepEqual(traceBuilder.trace.endTime, {
      seconds: (startTime + tickTime) / 1000,
      nanos: 0
    })
  })
})
