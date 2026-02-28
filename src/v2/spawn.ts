export function $(command: string) {
  Bun.spawnSync(['/bin/sh', '-c', command], {
    stdio: ['inherit', 'inherit', 'inherit'],
  })
}
