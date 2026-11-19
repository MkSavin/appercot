import { dirname } from 'node:path'

export const resolveRuntimeDirectory = (
  moduleDir = import.meta.dir,
  executablePath = process.execPath,
) =>
  // @anchor WORKAROUND:bun-compiled-path Bundle metadata points into a virtual filesystem after compilation.
  moduleDir.includes('~BUN') || moduleDir.includes('$bunfs') ? dirname(executablePath) : moduleDir
