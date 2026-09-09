import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const targetDir = path.resolve(rootDir, 'resources/js');

const REACT_HOOKS = new Set([
    'useState',
    'useEffect',
    'useCallback',
    'useMemo',
    'useRef',
    'useContext',
    'useReducer',
    'useId',
    'useTransition',
    'useDeferredValue',
    'useImperativeHandle',
    'useLayoutEffect',
    'useDebugValue',
    'useSyncExternalStore',
    'useForm',
    'usePage',
    'useRemember',
]);

const REACT_PRIMITIVES = new Set([
    'Suspense',
    'lazy',
    'createContext',
    'forwardRef',
    'memo',
]);

const BROWSER_GLOBALS = new Set([
    'window', 'document', 'console', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'fetch', 'FormData', 'URL',
    'URLSearchParams', 'File', 'FileReader', 'Blob', 'navigator',
    'location', 'history', 'localStorage', 'sessionStorage', 'alert',
    'confirm', 'prompt', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
    'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number',
    'Boolean', 'RegExp', 'Error', 'TypeError', 'RangeError', 'ReferenceError',
    'Intl', 'requestAnimationFrame', 'cancelAnimationFrame',
    'IntersectionObserver', 'ResizeObserver', 'MutationObserver',
    'Audio', 'Image', 'Event', 'CustomEvent', 'AbortController',
    'process', 'globalThis', 'self', 'NaN', 'Infinity', 'undefined',
    'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Symbol', 'Proxy', 'Reflect',
    'route', // Ziggy global helper commonly used in Inertia apps
]);

function collectFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'vendor', 'dist', 'build', '.git'].includes(entry.name)) continue;
            files = files.concat(collectFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
            if (entry.name === 'ziggy.js') continue; // auto-generated
            files.push(fullPath);
        }
    }
    return files;
}

export function auditReferences(filesToScan = null) {
    const files = filesToScan || collectFiles(targetDir);
    const issues = [];
    const startTime = Date.now();

    for (const filePath of files) {
        const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        const code = fs.readFileSync(filePath, 'utf8');

        let ast;
        try {
            ast = parser.parse(code, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'classProperties',
                    'dynamicImport',
                    'exportDefaultFrom',
                    'optionalChaining',
                    'nullishCoalescingOperator',
                ],
            });
        } catch (err) {
            issues.push({
                file: relativePath,
                type: 'PARSE_ERROR',
                message: err.message,
                line: err.loc?.line || 1,
                column: err.loc?.column || 1,
            });
            continue;
        }

        traverse(ast, {
            Identifier(pathNode) {
                const name = pathNode.node.name;

                // Only inspect referenced identifiers (not declaration names, object keys, or property accesses)
                if (!pathNode.isReferencedIdentifier()) {
                    return;
                }

                // Check React hooks and primitives specifically
                if (REACT_HOOKS.has(name) || REACT_PRIMITIVES.has(name)) {
                    if (!pathNode.scope.hasBinding(name)) {
                        issues.push({
                            file: relativePath,
                            type: 'UNDEFINED_HOOK',
                            name,
                            line: pathNode.node.loc?.start.line,
                            column: pathNode.node.loc?.start.column,
                            message: `Missing import for hook or React primitive '${name}'`,
                        });
                    }
                }
            },
            JSXIdentifier(pathNode) {
                const name = pathNode.node.name;
                // Check if a JSX tag is a capitalized component or React primitive that is unimported
                if (REACT_PRIMITIVES.has(name) && !pathNode.scope.hasBinding(name)) {
                    issues.push({
                        file: relativePath,
                        type: 'UNDEFINED_PRIMITIVE',
                        name,
                        line: pathNode.node.loc?.start.line,
                        column: pathNode.node.loc?.start.column,
                        message: `Missing import for React component/primitive '<${name} />'`,
                    });
                }
            },
        });
    }

    const duration = Date.now() - startTime;
    return { filesCount: files.length, issues, duration };
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log('\n[LikhangKamay] Verifying React imports, hook references, and JSX bindings...');
    const result = auditReferences();

    if (result.issues.length === 0) {
        console.log(`[PASS] Scanned ${result.filesCount} files in ${result.duration}ms. Zero broken references or undefined hooks found!\n`);
        process.exit(0);
    } else {
        console.error(`\n[FAIL] Found ${result.issues.length} reference issue(s) across ${result.filesCount} files in ${result.duration}ms:\n`);
        for (const issue of result.issues) {
            console.error(`  - ${issue.file}:${issue.line}:${issue.column} -> ${issue.message}`);
        }
        console.error('\nEnsure all React hooks and components are explicitly imported to prevent ReferenceError runtime crashes.\n');
        process.exit(1);
    }
}
