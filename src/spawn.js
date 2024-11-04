export const $$ = $({ stdio: 'inherit', nothrow: true })

// Returns text
export async function $t(...args) {
  const result = await $(...args).text()
  return result.trim()
}

// Returns lines
export async function $l(...args) {
  const lines = await $(...args)
    .nothrow()
    .lines()
  // fix [''] issue
  if (lines.length === 1 && lines[0] === '') {
    return []
  } else {
    // fix '  a\n  b\n' with space issue
    return lines.map((v) => v.trim())
  }
}
