const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('resources/js/Pages/Seller/**/*.jsx', { cwd: 'c:/laragon/www/LikhangKamay', absolute: true });

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('<UserAvatar ')) continue;

    // Use a simpler approach: replace the block containing the avatar
    // Find the starting div for the avatar:
    // <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">
    let modified = false;
    
    const divStart = /<div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">/g;
    
    let match;
    let newContent = content;
    let offset = 0;
    while ((match = divStart.exec(content)) !== null) {
        let startIndex = match.index;
        // find matching closing div
        let depth = 0;
        let endIndex = -1;
        for (let i = startIndex; i < content.length; i++) {
            if (content.substring(i, i + 4) === '<div') depth++;
            if (content.substring(i, i + 5) === '</div') {
                depth--;
                if (depth === 0) {
                    endIndex = i + 6; // include closing >
                    break;
                }
            }
        }
        
        if (endIndex !== -1) {
            const before = newContent.substring(0, startIndex + offset);
            const after = newContent.substring(endIndex + offset);
            const replacement = '<UserAvatar user={auth.user} />';
            newContent = before + replacement + after;
            offset += replacement.length - (endIndex - startIndex);
            modified = true;
        }
    }

    if (modified) {
        // Find last import
        const importRegex = /import .*?['"];/g;
        let lastMatch;
        let m;
        while ((m = importRegex.exec(newContent)) !== null) {
            lastMatch = m;
        }

        if (lastMatch) {
            const insertPos = lastMatch.index + lastMatch[0].length;
            newContent = newContent.slice(0, insertPos) + "\nimport UserAvatar from '@/Components/UserAvatar';" + newContent.slice(insertPos);
        }

        fs.writeFileSync(file, newContent);
        console.log("Updated", file);
    }
}
