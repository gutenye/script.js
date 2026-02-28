import 'zx/globals'
import type { Command } from '@gutenye/commander-completion-carapace'

declare global {
  interface GlobalThis {
    app: Command
  }
}
