/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[
  `src/e2e.spec.ts TAP e2e metrics including "sample error" error are reported > must match snapshot 1`
] = `
Array [
  Object {
    "locations": Array [
      Object {
        "column": 9,
        "line": 3,
      },
    ],
    "message": "sample error",
    "path": Array [
      "throwErr",
    ],
  },
]
`

exports[
  `src/e2e.spec.ts TAP e2e metrics including "sample error" error are reported > must match snapshot 2`
] = `
Report {
  "endTime": Timestamp {
    nanos: 0,
    seconds: 0,
  },
  "tracesPerQuery": Object {
    "# -\\nquery testQuery{post{body}throwErr}": TracesAndStats {
      "internalTracesContributingToStats": Array [],
      "statsWithContext": Array [],
      "trace": Array [
        Trace {
          durationNs: 0,
          "endTime": Timestamp {
            nanos: 0,
            seconds: 0,
          },
          "http": HTTP {
            "method": 4,
            "requestHeaders": Object {},
            "responseHeaders": Object {},
          },
          "root": Node {
            "child": Array [
              Node {
                "child": Array [],
                "error": Array [
                  Error {
                    "json": "{\\"message\\":\\"sample error\\",\\"locations\\":[{\\"line\\":3,\\"column\\":9}],\\"path\\":[\\"throwErr\\"]}",
                    "location": Array [
                      Location {
                        "column": 9,
                        "line": 3,
                      },
                    ],
                    "message": "sample error",
                  },
                ],
                "parentType": "Query",
                "responseName": "throwErr",
                startTime: 0,
                "type": "String",
              },
              Node {
                "child": Array [],
                endTime: 0,
                "error": Array [],
                "parentType": "Query",
                "responseName": "post",
                startTime: 0,
                "type": "Post!",
              },
            ],
            "error": Array [],
          },
          "startTime": Timestamp {
            nanos: 0,
            seconds: 0,
          },
        },
      ],
    },
  },
}
`
