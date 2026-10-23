import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('source archive contains committed files and excludes worktree metadata and credentials', () => {
  const root = mkdtempSync(join(tmpdir(), 'monaco-source-test-'));
  const repo = join(root, 'repo');
  const worktree = join(root, 'worktree');
  const run = (command, args, cwd = repo) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  try {
    mkdirSync(repo);
    run('git', ['init', '--quiet']);
    run('git', ['config', 'user.name', 'Source archive test']);
    run('git', ['config', 'user.email', 'test@example.invalid']);
    writeFileSync(join(repo, 'package.json'), '{"version":"9.9.9"}\n');
    writeFileSync(join(repo, '.gitignore'), '.amo-creds.env\nweb-ext-artifacts/\n');
    copyFileSync(new URL('../../tools/package-source.mjs', import.meta.url), join(repo, 'package-source.mjs'));
    run('git', ['add', '.']);
    run('git', ['commit', '--quiet', '-m', 'Release fixture']);
    run('git', ['worktree', 'add', '--quiet', '--detach', worktree]);
    assert.match(readFileSync(join(worktree, '.git'), 'utf8'), /^gitdir:/);
    writeFileSync(join(worktree, '.amo-creds.env'), 'FAKE_TEST_CREDENTIAL=not-a-secret\n');
    writeFileSync(join(worktree, 'local-note.txt'), 'untracked local file\n');

    run(process.execPath, ['package-source.mjs'], worktree);
    const entries = run('unzip', ['-Z1', 'web-ext-artifacts/monaco-vim-keys-9.9.9-source.zip'], worktree)
      .trim().split('\n').sort();
    assert.deepEqual(entries, ['.gitignore', 'package-source.mjs', 'package.json']);

    writeFileSync(join(worktree, 'package.json'), '{"version":"9.9.10"}\n');
    assert.throws(() => run(process.execPath, ['package-source.mjs'], worktree), /Commit tracked changes/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
