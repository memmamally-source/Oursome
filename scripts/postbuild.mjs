// GitHub Pages serves 404.html for unknown paths; a copy of index.html lets deep links
// (e.g. /steps-ahead/review) load the app, which then routes client-side.
import { copyFileSync, writeFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
console.log('postbuild: 404.html and .nojekyll written');
