const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath, results);
        } else if (fullPath.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('c:/laragon/www/LikhangKamay/resources/js/Pages/Seller');

let replacedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('<UserAvatar ')) continue;

    let modified = false;
    
    const targetStart = '<div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">';
    
    let startIndex = content.indexOf(targetStart);
    while (startIndex !== -1) {
        let endIndex = -1;
        let depth = 0;
        for (let i = startIndex; i < content.length; i++) {
            if (content.substring(i, i + 4) === '<div') {
                depth++;
            } else if (content.substring(i, i + 5) === '</div') {
                depth--;
                if (depth === 0) {
                    endIndex = i + 6;
                    break;
                }
            }
        }
        
        if (endIndex !== -1) {
            content = content.substring(0, startIndex) + '<UserAvatar user={auth.user} />' + content.substring(endIndex);
            modified = true;
            startIndex = content.indexOf(targetStart, startIndex + '<UserAvatar user={auth.user} />'.length);
        } else {
            break;
        }
    }

    if (modified) {
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const endOfLine = content.indexOf(';', lastImportIndex);
            if (endOfLine !== -1) {
                content = content.substring(0, endOfLine + 1) + "\nimport UserAvatar from '@/Components/UserAvatar';" + content.substring(endOfLine + 1);
            }
        } else {
            content = "import UserAvatar from '@/Components/UserAvatar';\n" + content;
        }
        fs.writeFileSync(file, content);
        replacedCount++;
        console.log("Updated", file);
    }
}
console.log("Total updated:", replacedCount);
