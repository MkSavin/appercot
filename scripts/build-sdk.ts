import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { $ } from 'bun'
import { version } from '../package.json'

const root = resolve(import.meta.dir, '..')
const output = join(root, 'dist', 'npm')
await mkdir(output, { recursive: true })
const staging = await mkdtemp(join(output, 'pack-'))
if (dirname(staging) !== output) throw new Error('Unexpected SDK packaging path')

try {
  for (const [name, description] of [
    ['protocol', 'Wire schemas and types for Appercot'],
    ['chat', 'TypeScript SDK for Appercot bots'],
  ]) {
    const workspace = join(root, 'packages', name)
    const source = join(workspace, 'src')
    const target = join(staging, name)
    const dist = join(target, 'dist')
    await mkdir(target)
    const options = [
      '--ignoreConfig',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--strict',
      '--skipLibCheck',
      '--verbatimModuleSyntax',
      '--declaration',
      '--rootDir',
      source,
      '--outDir',
      dist,
    ]
    await $`bun x --no-install tsc ${options} ${join(source, 'index.ts')}`.cwd(root)
    const manifest = await Bun.file(join(workspace, 'package.json')).json()
    const repository = process.env.GITHUB_REPOSITORY
    const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com'
    await Bun.write(
      join(target, 'package.json'),
      JSON.stringify(
        {
          name: manifest.name,
          version,
          description,
          type: 'module',
          ...(repository && {
            repository: {
              type: 'git',
              url: `git+${serverUrl}/${repository}.git`,
              directory: `packages/${name}`,
            },
          }),
          exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
          types: './dist/index.d.ts',
          files: ['dist'],
          dependencies: Object.fromEntries(
            Object.entries(manifest.dependencies as Record<string, string>).map(
              ([dependency, range]) => [dependency, range === 'workspace:*' ? version : range],
            ),
          ),
        },
        null,
        2,
      ),
    )
    await copyFile(join(workspace, 'README.md'), join(target, 'README.md'))
    const archive = (await $`npm pack --ignore-scripts --quiet`.cwd(target).text()).trim()
    await copyFile(join(target, archive), join(output, `appercot-${name}.tgz`))
  }
} finally {
  await rm(staging, { recursive: true, force: true })
}
