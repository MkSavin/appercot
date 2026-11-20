import { existsSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'

const root = new URL('../', import.meta.url)
const read = async (path) => (await Bun.file(new URL(path, root)).text()).replaceAll('\r\n', '\n')
const errors = []
const fail = (where, message) => errors.push(`${where}: ${message}`)
const invariants = new Map()
const workarounds = new Map()
const docs = new Map()
const invariantPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+-[a-z0-9]+$/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const indexPath = '.agents/browser-workarounds.md'

const ignoredDirectories = new Set(['node_modules', 'dist', 'generated'])
const scan = (directory) =>
  readdirSync(new URL(`${directory}/`, root), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`
    if (entry.isFile()) return [path]
    if (entry.isDirectory() && !entry.name.startsWith('.') && !ignoredDirectories.has(entry.name)) {
      return scan(path)
    }
    return []
  })

for (const path of ['AGENTS.md', ...scan('.agents').sort()]) {
  if (path === indexPath) continue
  const body = await read(path)
  const resident = path === 'AGENTS.md'
  const limit = resident ? 3072 : 8192
  const bytes = Buffer.byteLength(body)
  if (bytes > limit) {
    fail(
      path,
      `${bytes} bytes exceeds ${limit}. ${resident ? 'Shorten the entry page.' : 'Split by topic.'}`,
    )
  }
  if (path.endsWith('.md')) docs.set(path, body)
}

const checkComment = (comment, where) => {
  if (/\p{Script=Cyrillic}/u.test(comment)) fail(where, 'Write source comments in English')
  if (
    /(?:\.agents[/\\]|\b(?:AGENTS|PLAN)\.md\b|§\s*\d|https?:\/\/\S+\/(?:issues|pull|browse)\/)/i.test(
      comment,
    )
  ) {
    fail(where, 'Move document and issue references out of comments')
  }
  if (/\bTODO\b/.test(comment) && !/\bRemove when\s+\S/.test(comment)) {
    fail(where, 'Give the TODO a removal condition using “Remove when …”')
  }
}

const checkAnchor = ({ comment, lines, index, path, where, jsdoc, declaration }) => {
  if (!comment.includes('@anchor')) {
    if (/\b(?:WORKAROUND|DOC|INV):/.test(comment)) fail(where, 'Use @anchor before an anchor ID')
    return
  }
  const marker = /@anchor\s+(INV|WORKAROUND|DOC):([\w/-]+)(?:\s+([^*]*?))?\s*(?:\*\/)?$/.exec(
    comment,
  )
  if (!marker) {
    fail(where, 'Invalid anchor or unknown namespace')
    return
  }
  const [, space, id, reason] = marker
  const spec = /(?:\.test|\.spec)\.[cm]?[jt]sx?$/.test(path)
  if (space === 'INV') {
    const area = posix.basename(path).replace(/\.(test|spec)\..+$/, '')
    if (!spec || !/^\s*(it|test)(\.each)?\(/.test(lines[index + 1] ?? '') || jsdoc) {
      fail(
        where,
        'INV must be a line comment immediately above it(...) or test(...) in a test file',
      )
    }
    if (!invariantPattern.test(id) || !id.startsWith(`${area}/`)) {
      fail(where, `Use an invariant ID of the form ${area}/two-words`)
    }
    if (invariants.has(id)) fail(where, `Duplicate INV:${id} (first at ${invariants.get(id)})`)
    invariants.set(id, where)
  } else if (space === 'WORKAROUND') {
    if (spec || !slugPattern.test(id) || !reason?.trim()) {
      fail(where, 'WORKAROUND needs a slug and a same-line reason in production code')
    }
    workarounds.set(id, [...(workarounds.get(id) ?? []), { path, where }])
  } else {
    const entryPoint =
      /^\s*(?:export\s+(?:default\s+)?)?(?:abstract\s+)?(?:class\s+\w|(?:const|(?:async\s+)?function)\s+(?:create|obtain|make)[A-Z]\w*)/
    if (spec || !jsdoc || !entryPoint.test(declaration ?? '')) {
      fail(where, 'DOC must be JSDoc on a production class or create*/obtain*/make* factory')
    }
    if (!docs.has(`.agents/${id}.md`)) fail(where, `Missing document for DOC:${id}`)
  }
}

const sourcePaths = ['apps', 'packages', 'examples'].flatMap(scan).sort()
for (const path of sourcePaths) {
  if (!/\.[cm]?[jt]sx?$/.test(path)) continue
  const body = await read(path)
  const lines = body.split('\n')
  // Match source comments while skipping literals, including URLs.
  const tokens =
    /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g
  let previousComment = -2
  let seriesLength = 0
  let offset = 0
  let index = 0
  for (const match of body.matchAll(tokens)) {
    const [token, comment] = match
    if (!comment) continue
    index += body.slice(offset, match.index).split('\n').length - 1
    offset = match.index
    const parts = comment.split('\n')
    const where = `${path}:${index + 1}`
    const lineComment = token.startsWith('//')
    if (lineComment) {
      const standalone = lines[index].trimStart().startsWith('//')
      seriesLength = standalone && previousComment === index - 1 ? seriesLength + 1 : 1
      if (seriesLength === 4) fail(where, 'Split or move line comments longer than three lines')
      previousComment = standalone ? index : -2
    } else if (parts.length > 10) {
      fail(where, 'Move block comments longer than ten lines into a document')
    }
    checkComment(comment, where)
    for (const [delta, part] of parts.entries()) {
      checkAnchor({
        comment: part,
        lines,
        index: index + delta,
        path,
        where: `${path}:${index + delta + 1}`,
        jsdoc: token.startsWith('/**'),
        declaration: lines[index + parts.length],
      })
    }
  }
}

const guidePaths = scan('docs/guide')
  .filter((path) => path.endsWith('.md'))
  .sort()
const publicDocs = new Map()
for (const path of ['README.md', ...guidePaths]) {
  const body = await read(path)
  publicDocs.set(path, body)
  if (/\p{Script=Cyrillic}/u.test(body)) fail(path, 'Write public documentation in English')
  for (const [, target] of body.matchAll(/\]\(([^\s)]+)\)/g)) {
    const relative = target.split('#')[0]
    if (!relative || /^[\w+-]+:/.test(target)) continue
    const resolved = posix.join(posix.dirname(path), relative)
    if (!existsSync(new URL(resolved, root))) fail(path, `Broken link: ${target}`)
  }
}

for (const directory of new Set(guidePaths.map((path) => posix.dirname(path)))) {
  const index = posix.join(directory, 'index.md')
  if (!publicDocs.has(index)) fail(index, 'Every public guide folder needs an index.md')
}

try {
  const context7 = JSON.parse(await read('context7.json'))
  if (context7.$schema !== 'https://context7.com/schema/context7.json') {
    fail('context7.json', 'Use the official Context7 schema URL')
  }
  if (typeof context7.projectTitle !== 'string' || !context7.projectTitle.trim()) {
    fail('context7.json', 'Set a non-empty projectTitle')
  }
  if (typeof context7.description !== 'string' || context7.description.length < 10) {
    fail('context7.json', 'Set a useful description')
  }
  if (!Array.isArray(context7.folders) || !context7.folders.includes('docs/guide')) {
    fail('context7.json', 'Index docs/guide as the public documentation folder')
  }
  if (
    !Array.isArray(context7.excludeFolders) ||
    !context7.excludeFolders.includes('docs/superpowers')
  ) {
    fail('context7.json', 'Exclude historical design documents from Context7')
  }
  if (
    !Array.isArray(context7.rules) ||
    context7.rules.some((rule) => typeof rule !== 'string' || !rule.trim() || rule.length > 255)
  ) {
    fail('context7.json', 'Rules must be non-empty strings of at most 255 characters')
  }
} catch (error) {
  fail('context7.json', error instanceof Error ? error.message : String(error))
}

const cited = new Set()
const rows = []
const documentedWorkarounds = new Set()
for (const [path, body] of docs) {
  for (const [, list] of body.replaceAll(/`[^`\n]+`/g, '').matchAll(/\bChecked: ([^\n]+)/g)) {
    if (!/^INV:[\w/-]+(?:,\s*INV:[\w/-]+)*\.?$/.test(list.trim())) {
      fail(path, 'Checked: must end with a comma-separated list of INV IDs')
      continue
    }
    for (const [, id] of list.matchAll(/INV:([\w/-]+)/g)) {
      cited.add(id)
      if (!invariants.has(id)) fail(path, `Missing INV:${id}`)
    }
  }
  for (const [, target] of body.matchAll(/\]\(([^\s)]+)\)/g)) {
    const relative = target.split('#')[0]
    if (relative && target !== indexPath && !/^[\w+-]+:/.test(target)) {
      const resolved = posix.join(posix.dirname(path), relative)
      if (
        (resolved !== indexPath || !process.argv.includes('--write-index')) &&
        !existsSync(new URL(resolved, root))
      ) {
        fail(path, `Broken link: ${target}`)
      }
    }
  }
  if (!path.startsWith('.agents/workarounds/')) continue
  const slug = posix.basename(path, '.md')
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(body)?.[1] ?? ''
  const fields = Object.fromEntries(
    [...frontmatter.matchAll(/^(anchor|rule|code|why):\s*(\S.*)$/gm)].map(([, name, value]) => [
      name,
      value,
    ]),
  )
  if (fields.anchor !== `WORKAROUND:${slug}` || !fields.rule || !slugPattern.test(slug)) {
    fail(path, 'Expected frontmatter with a matching WORKAROUND anchor and a rule')
    continue
  }
  if (documentedWorkarounds.has(slug)) fail(path, `Duplicate workaround ${slug}`)
  documentedWorkarounds.add(slug)
  const locations = workarounds.get(slug) ?? []
  if (fields.code === 'none') {
    if (!fields.why || locations.length > 0)
      fail(path, 'code: none requires why and zero code anchors')
  } else if (fields.code || locations.length === 0) {
    fail(path, `Expected a code anchor for WORKAROUND:${slug}`)
  }
  const links = [...new Set(locations.map(({ path }) => path))]
    .map((source) => `[${posix.basename(source)}](../${source})`)
    .join(', ')
  rows.push(
    `| [${slug}](workarounds/${slug}.md) | ${fields.rule.replaceAll('|', '\\|')} | ${links || '—'} |`,
  )
}

for (const [id, where] of invariants) if (!cited.has(id)) fail(where, `Uncited INV:${id}`)
for (const [id, locations] of workarounds) {
  if (!documentedWorkarounds.has(id))
    fail(locations[0].where, `Missing document for WORKAROUND:${id}`)
}

const index = [
  '# Platform workarounds',
  '',
  'Generated by `bun run docs:index`.',
  '',
  '| Workaround | Rule | Code |',
  '| --- | --- | --- |',
  ...rows,
  '',
].join('\n')

if (Buffer.byteLength(index) > 8192) fail(indexPath, 'Split the index into topic pages')
if (!errors.length && process.argv.includes('--write-index')) {
  await Bun.write(new URL(indexPath, root), index)
} else if (
  !process.argv.includes('--write-index') &&
  (!existsSync(new URL(indexPath, root)) || (await read(indexPath)) !== index)
) {
  fail(indexPath, 'Out of date. Run bun run docs:index')
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Documentation checks passed (${invariants.size} invariants, ${rows.length} workarounds)`,
  )
}
