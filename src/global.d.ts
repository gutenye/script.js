import 'zx/globals'
import type { Command } from 'commander'

declare global {
  interface GlobalThis {
    app: Command
  }
}
