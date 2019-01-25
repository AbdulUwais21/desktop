import { GitProcess } from 'dugite'
import * as FSE from 'fs-extra'
import * as Path from 'path'

import { Repository } from '../../src/models/repository'
import { mkdirSync } from './temp'

type TreeEntry = {
  readonly path: string
  readonly value: Buffer
}

type Tree = {
  readonly commitMessage: string
  readonly entries: ReadonlyArray<TreeEntry>
}

/**
 * Clone a local Git repository to a new temporary directory, so that
 * push/pull/fetch operations can be tested without requiring the network.
 */
export async function cloneRepository(
  repository: Repository
): Promise<Repository> {
  const newDirectory = mkdirSync('desktop-git-clone-')

  await GitProcess.exec(
    ['clone', repository.path, '--', newDirectory],
    __dirname
  )

  return new Repository(newDirectory, -2, null, false)
}

/**
 * Make a commit tot he repository by creating the specified files in the
 * working directory, staging all changes, and then committing with the
 * specified message.
 */
export async function makeCommit(repository: Repository, tree: Tree) {
  for (const entry of tree.entries) {
    const fullPath = Path.join(repository.path, entry.path)
    await FSE.writeFile(fullPath, entry.value)
  }

  await GitProcess.exec(['add', '.'], repository.path)
  await GitProcess.exec(['commit', '-m', tree.commitMessage], repository.path)
}

export async function switchTo(repository: Repository, branch: string) {
  const result = await GitProcess.exec(
    ['rev-parse', '--verify', branch],
    repository.path
  )

  if (result.exitCode === 128) {
    // ref does not exists, checkout and create the branch
    await GitProcess.exec(['checkout', '-b', branch], repository.path)
  } else {
    // just switch to the branch
    await GitProcess.exec(['checkout', branch], repository.path)
  }
}
