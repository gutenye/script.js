import * as csv from 'csv-parse/sync'

// csv.parse(text, { delimiter: ','*, columns: true* })
//   columns: true -> [{column: value}]
//   columns: false -> [[column], [value]]
export function parse(text, options = {}) {
  const newOptions = {
    columns: true,
    ...options,
  }
  return csv.parse(text, newOptions)
}
