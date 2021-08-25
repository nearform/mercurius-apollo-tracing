/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`src/sendReport.spec.ts TAP sendReport sends > must match snapshot 1`] = `
Report {
  "header": ReportHeader {
    "graphRef": "alskncka384u1923e8uino1289jncvo019n",
    "hostname": "www.example.com",
  },
  "tracesPerQuery": Object {
    "# Foo\\nquery Foo { user { email pets { name } } }": TracesAndStats {
      "internalTracesContributingToStats": Array [],
      "statsWithContext": Array [],
      "trace": Array [],
    },
  },
}
`
