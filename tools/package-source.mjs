// Create the AMO source-code submission zip from a clean release commit.
// Never include ignored credentials, Git worktree metadata, or local artifacts.
// Output: web-ext-artifacts/monaco-vim-keys-<version>-source.zip
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const outDir = 'web-ext-artifacts';
const out = `${outDir}/monaco-vim-keys-${version}-source.zip`;

mkdirSync(outDir, { recursive: true });

try {
  execFileSync('git', ['diff', '--quiet', 'HEAD', '--'], { stdio: 'inherit' });
} catch {
  throw new Error('Commit tracked changes before packaging the release source.');
}

execFileSync('git', ['archive', '--format=zip', `--output=${out}`, 'HEAD'], {
  stdio: 'inherit',
});

console.log(`source submission zip: ${out}`);
