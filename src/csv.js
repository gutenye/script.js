import { parse as csvParse } from 'csv-parse/sync'

// CSV utils
export const csv = {
  // csv.parse(text, { delimiter: ','* }) -> [[column], [value]]
  //   { columns: true } -> [{column: value}]
  parse: csvParse,
}
