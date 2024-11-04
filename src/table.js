import { getBorderCharacters, table } from 'table'
import invariant from 'tiny-invariant'

// Display table
// data: [{a: '1'}] | [['a'], ['1'], ..]
export function displayTable(data) {
  invariant(_.isArray(data), 'data should be array')
  let columns = []
  let rows = []
  if (_.isPlainObject(data[0])) {
    columns = Object.keys(data[0])
    rows = data.map((v) => Object.values(v))
  } else if (_.isArray(data[0])) {
    columns = data[0]
    rows = data.slice(1)
  } else {
    throw new Error('data should be array of object or array')
  }
  const newData = [data[0], ...data.slice(1)]
  const tableText = table([columns.map((v) => colors.green.bold(v)), ...rows], {
    drawHorizontalLine: (lineIndex, rowCount) => [0, 1, rowCount].includes(lineIndex),
    border: {
      ...getBorderCharacters('norc'),
      topLeft: '╭',
      topRight: '╮',
      bottomLeft: '╰',
      bottomRight: '╯',
    },
  })
  echo(tableText)
}
