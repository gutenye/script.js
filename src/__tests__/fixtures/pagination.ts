const { format } = app
const { SCRIPTJS_PAGINATION_MARKER } = process.env
if (SCRIPTJS_PAGINATION_MARKER) {
  await Bun.write(SCRIPTJS_PAGINATION_MARKER, 'loaded')
}

app.name('pagination-fixture')

app
  .cmd('rows')
  .add(() =>
    Array.from({ length: 123 }, (_, index) => ({
      name: `row-${String(index + 1).padStart(3, '0')}`,
      ...(index === 122 ? { extra: 'last' } : {}),
    })),
  )
  .render((rows) => {
    return [
      format.record({ Summary: 'only on first page' }),
      format.section('Inventory:', format.table(rows)),
      format.table([{ small: 'small-table' }]),
      'Totals: 123',
    ]
  })

app
  .cmd('grouped')
  .add(() => ({
    One: [['alpha'], ['beta'], ['gamma']],
    Two: [['delta'], ['epsilon']],
  }))
  .render((groups) => {
    return [format.table(groups, { headers: ['name'], limit: 2, color: false })]
  })

app
  .cmd('matrix')
  .add(() => [['name'], ['alpha'], ['beta'], ['gamma']])
  .render((rows) => {
    return [format.table(rows, { limit: 2 })]
  })

app
  .cmd('short')
  .add(() => [{ name: 'short' }])
  .render((rows) => {
    return [format.table(rows)]
  })

app
  .cmd('multiple')
  .add(() => ({
    left: Array.from({ length: 3 }, (_, index) => ({ left: `left-${index}` })),
    right: Array.from({ length: 4 }, (_, index) => ({
      right: `right-${index}`,
    })),
  }))
  .render(({ left, right }) => {
    return [
      format.table(left, { limit: 2, color: true }),
      format.table(right, { limit: 1, color: false }),
    ]
  })

app
  .cmd('values')
  .add(() => [['value'], [0], [false], [42n], [{ ok: true }]])
  .render((rows) => {
    return [format.table(rows, { limit: 2 })]
  })

app
  .cmd('discarded')
  .add(() => Array.from({ length: 60 }, (_, index) => ({ value: index })))
  .render((rows) => {
    format.table(rows)
    return ['not a table']
  })

app.cmd('printed').add(() => 'ordinary text')
app.cmd('forward').add(({ argv }) => argv)
await app.run()
