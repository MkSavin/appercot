import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const serverDir = resolve(import.meta.dir, '..')
const outputDir = resolve(serverDir, 'dist')
const webOutputDir = resolve(serverDir, '../web/dist')

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })

const build = Bun.spawnSync({
  cmd: ['bun', 'build', 'src/index.ts', '--compile', '--target=bun', '--outfile', 'dist/appercot'],
  cwd: serverDir,
  stdout: 'inherit',
  stderr: 'inherit',
})
if (build.exitCode !== 0) throw new Error(`Server build failed with exit code ${build.exitCode}`)

await cp(webOutputDir, resolve(outputDir, 'public'), { recursive: true })
await cp(resolve(serverDir, 'drizzle'), resolve(outputDir, 'drizzle'), { recursive: true })
