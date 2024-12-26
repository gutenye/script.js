import * as zx from 'zx'

// wait for release fix: handle nullable stdout/stderr https://github.com/google/zx/commits/main/
// export const $ = zx.$.sync({ stdio: 'inherit' })
export const $ = zx.$({ stdio: 'inherit' })

// Returns text
export function $t(...args) {
  const result = zx.$.sync(...args).text()
  return result.trim()
}

// Returns lines
export function $l(...args) {
  const lines = zx.$.sync(...args).lines()
  // fix [''] issue
  if (lines.length === 1 && lines[0] === '') {
    return []
  } else {
    // fix '  a\n  b\n' with space issue
    return lines.map((v) => v.trim())
  }
}
