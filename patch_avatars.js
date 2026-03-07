const fs = require('fs');
const path = require('path');

const files = [
    'OrderManager.jsx',
    'ProductManager.jsx',
    'Analytics.jsx',
    'Chat.jsx',
    'ShopSettings.jsx',
    'Reviews.jsx',
    'ThreeDManager.jsx',
    'Sponsorships.jsx',
    'HR.jsx',
    'Procurement/Index.jsx',
    'StockRequest/Index.jsx'
];

const basePath = 'c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/';

for (const file of files) {
    const fullPath = path.join(basePath, file);
    if (!fs.existsSync(fullPath)) {
        console.log("File not found:", file);
        continue;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes('<UserAvatar ')) {
        console.log("Already updated", file);
        continue;
    }

    // Attempt to replace the literal text
    // The text differs slightly between tags, e.g. sometimes <ChevronDown > is below.
    const searchRegex = /<div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden[^>]*>\s*\{auth\.user\.avatar.*\s*<img[^>]*>\s*\)\s*:\s*\([^)]+\)\.charAt\([^)]+\)\s*\}\s*<\/div>/g;
    
    // Try to match the auth.user.avatar div exactly
    const targetDiv = /<div className="w-9 h-9 rounded-full[a-zA-Z0-9\s-]* bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden[a-zA-Z0-9\s-]*">\s*\{auth\.user\.avatar[\s\S]*?(?:alt=\{auth\.user\.name\}[\s\S]*?)?<\/div>/g;

    let modified = false;

    content = content.replace(targetDiv, (match) => {
        modified = true;
        return `<UserAvatar user={auth.user} />`;
    });

    if (modified) {
        // Find last import
        const importRegex = /import .*?['"];/g;
        let lastMatch;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            lastMatch = match;
        }

        if (lastMatch) {
            const insertPos = lastMatch.index + lastMatch[0].length;
            content = content.slice(0, insertPos) + "\nimport UserAvatar from '@/Components/UserAvatar';" + content.slice(insertPos);
        }

        fs.writeFileSync(fullPath, content);
        console.log("Updated", file);
    } else {
        console.log("Match not found in", file);
    }
}
