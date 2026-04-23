const fs = require('fs');
const file = 'c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Analytics.jsx';
let content = fs.readFileSync(file, 'utf8');

const listsStart = content.indexOf('<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">');
const chartsStartMatch = content.indexOf('<div className="flex flex-wrap items-center gap-2">', listsStart);
const chartsEndMatch = content.indexOf('{canViewSponsoredPerformance && (', chartsStartMatch);

const listsBlock = content.substring(listsStart, chartsStartMatch);
const chartsBlock = content.substring(chartsStartMatch, chartsEndMatch);

content = content.substring(0, listsStart) + chartsBlock + listsBlock + content.substring(chartsEndMatch);
fs.writeFileSync(file, content);
console.log('Reordered successfully');
