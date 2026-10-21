#!/usr/bin/env node
// PreToolUse hook: allow/deny Edit|Write by file path.
// Usage: node guard-paths.js [--allow <regex>]... [--deny <regex>]...
//   --allow: path must match at least one allow regex (if any given).
//   --deny : path must not match any deny regex.
// Exit 2 (with reason on stderr) to block, exit 0 to allow.
// If the path cannot be determined, the call is allowed.
'use strict';
const path = require('path');

function parseArgs(argv) {
  const allow = [];
  const deny = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--allow' || a === '--deny') && i + 1 < argv.length) {
      const re = new RegExp(argv[++i]);
      (a === '--allow' ? allow : deny).push(re);
    }
  }
  return { allow, deny };
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

const isWin = (p) => /^[A-Za-z]:[\\/]/.test(p) || p.includes('\\');

// Git Bash style "/d/foo" -> "D:/foo" when the project root is a Windows path.
function fromMsys(p) {
  const m = /^\/([A-Za-z])(\/.*)?$/.exec(p);
  return m ? `${m[1].toUpperCase()}:${m[2] || '/'}` : p;
}

function toRelative(filePath, root) {
  const win = isWin(root) || isWin(filePath);
  const P = win ? path.win32 : path.posix;
  const fp = win ? fromMsys(filePath) : filePath;
  const r = win ? fromMsys(root) : root;
  const abs = P.isAbsolute(fp) ? fp : P.resolve(r, fp);
  return P.relative(r, abs).split('\\').join('/');
}

(async () => {
  let allow, deny;
  try {
    ({ allow, deny } = parseArgs(process.argv.slice(2)));
  } catch (e) {
    // A broken rule must not silently open the guard.
    process.stderr.write(`guard-paths: invalid regex argument - ${e.message}\n`);
    process.exit(2);
  }
  let rel;
  try {
    const input = JSON.parse(await readStdin());
    const ti = input.tool_input || {};
    const filePath = ti.file_path || ti.notebook_path;
    if (!filePath || typeof filePath !== 'string') process.exit(0);
    const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    rel = toRelative(filePath, root);

    if (allow.length && !allow.some((re) => re.test(rel))) {
      process.stderr.write(
        `guard-paths: blocked "${rel}" - path is outside the allowed area (${allow.map(String).join(', ')}).\n`
      );
      process.exit(2);
    }
    const hit = deny.find((re) => re.test(rel));
    if (hit) {
      process.stderr.write(`guard-paths: blocked "${rel}" - path matches protected pattern ${hit}.\n`);
      process.exit(2);
    }
    process.exit(0);
  } catch (e) {
    // Unreadable input or path: let the call through.
    process.exit(0);
  }
})();
