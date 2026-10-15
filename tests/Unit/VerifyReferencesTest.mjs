import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { auditReferences } from '../../scripts/verify-references.js';

console.log('[LikhangKamay] Running AST Reference & JSX Scope Verification Suite...');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-refs-test-'));

try {
    // 1. Verify detection of undeclared JSX component
    const undeclaredComponentFile = path.join(tmpDir, 'UndeclaredComponentTest.jsx');
    fs.writeFileSync(undeclaredComponentFile, `
        import React from 'react';
        export default function Test() {
            return <div><UndeclaredIcon size={24} /></div>;
        }
    `, 'utf8');

    const result1 = auditReferences([undeclaredComponentFile]);
    assert.equal(result1.issues.length, 1, 'Must catch undeclared JSX component');
    assert.equal(result1.issues[0].name, 'UndeclaredIcon');
    assert.equal(result1.issues[0].type, 'UNDEFINED_COMPONENT');
    console.log('  ✓ Undeclared JSX component detection (<UndeclaredIcon />) verified');

    // 2. Verify detection of undeclared member expression root
    const undeclaredMemberFile = path.join(tmpDir, 'UndeclaredMemberTest.jsx');
    fs.writeFileSync(undeclaredMemberFile, `
        import React from 'react';
        export default function Test() {
            return <div><UndeclaredLib.Item /></div>;
        }
    `, 'utf8');

    const result2 = auditReferences([undeclaredMemberFile]);
    assert.equal(result2.issues.length, 1, 'Must catch undeclared JSX member expression root');
    assert.equal(result2.issues[0].name, 'UndeclaredLib');
    console.log('  ✓ Undeclared member expression root (<UndeclaredLib.Item />) verified');

    // 3. Verify detection of undeclared React hook
    const undeclaredHookFile = path.join(tmpDir, 'UndeclaredHookTest.jsx');
    fs.writeFileSync(undeclaredHookFile, `
        export default function Test() {
            const [val, setVal] = useState(0);
            return <div>{val}</div>;
        }
    `, 'utf8');

    const result3 = auditReferences([undeclaredHookFile]);
    assert.equal(result3.issues.length, 1, 'Must catch undeclared React hook');
    assert.equal(result3.issues[0].name, 'useState');
    assert.equal(result3.issues[0].type, 'UNDEFINED_HOOK');
    console.log('  ✓ Undeclared React hook detection (useState) verified');

    // 4. Verify detection of undeclared Fragment tag
    const undeclaredFragmentFile = path.join(tmpDir, 'UndeclaredFragmentTest.jsx');
    fs.writeFileSync(undeclaredFragmentFile, `
        export default function Test() {
            return <Fragment><span>Test</span></Fragment>;
        }
    `, 'utf8');

    const result4 = auditReferences([undeclaredFragmentFile]);
    assert.equal(result4.issues.length, 1, 'Must catch unimported <Fragment>');
    assert.equal(result4.issues[0].name, 'Fragment');
    console.log('  ✓ Unimported <Fragment> primitive tag detection verified');

    // 5. Verify valid components and patterns pass without false positives
    const validPatternsFile = path.join(tmpDir, 'ValidPatternsTest.jsx');
    fs.writeFileSync(validPatternsFile, `
        import React, { useState, Fragment } from 'react';
        import { Box } from 'lucide-react';

        function LocalSubComponent() {
            return <span>Local</span>;
        }

        const obj = { Card: () => <div>Card</div> };

        export default function TestContainer({ DynamicComponent }) {
            const [active] = useState(false);
            const LocalConstComp = () => <div>Const</div>;

            return (
                <div className="container">
                    <svg viewBox="0 0 100 100">
                        <linearGradient id="g" />
                        <clipPath id="c" />
                    </svg>
                    <Box size={16} />
                    <LocalSubComponent />
                    <LocalConstComp />
                    <DynamicComponent />
                    <obj.Card />
                    <React.Fragment>
                        <Fragment>
                            <span>Nested</span>
                        </Fragment>
                    </React.Fragment>
                </div>
            );
        }
    `, 'utf8');

    const result5 = auditReferences([validPatternsFile]);
    assert.equal(result5.issues.length, 0, `Valid patterns should produce 0 issues, got: ${JSON.stringify(result5.issues)}`);
    console.log('  ✓ Permitted patterns (local, imported, member exprs, SVG, React.Fragment) produce 0 false positives');

    // 6. Verify entire project codebase produces zero reference issues
    const fullProjectResult = auditReferences();
    assert.equal(fullProjectResult.issues.length, 0, 'Full codebase must have zero reference issues');
    assert.ok(fullProjectResult.filesCount >= 590, 'Must scan the full codebase (>= 590 files)');
    console.log(`  ✓ Full codebase audit verified (${fullProjectResult.filesCount} files scanned with 0 issues)`);

    console.log('\n[PASS] ALL AST REFERENCE & JSX SCOPE TESTS PASSED DETERMINISTICALLY!\n');
} finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
}
