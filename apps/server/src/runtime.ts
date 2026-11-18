import { dirname } from 'node:path'

export const resolveRuntimeDirectory = (
  moduleDir = import.meta.dir,
  executablePath = process.execPath,
) =>
  moduleDir.includes('~BUN') || moduleDir.includes('$bunfs') ? dirname(executablePath) : moduleDir
