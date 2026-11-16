// Lists everything still to be supplied. Exits 1 if anything blocks
// publishing (the deploy workflow runs this unless ALLOW_PLACEHOLDERS=1).
// Usage: SITE_URL=https://karoofox.com npm run readiness
import { readinessGaps } from '../src/lib/readiness.ts';

const gaps = readinessGaps(undefined, undefined, process.env.SITE_URL ?? '');
const show = (title, list) => {
  console.log(`\n${title} (${list.length})`);
  for (const g of list) console.log(`  • [${g.area}] ${g.item}\n      ${g.why}`);
};
show('Blocks publishing', gaps.filter((g) => g.blocksPublish));
show('Blocks Apple organisation enrolment', gaps.filter((g) => !g.blocksPublish && g.blocksApple));
show('To confirm (not blocking)', gaps.filter((g) => !g.blocksPublish && !g.blocksApple));
const blocking = gaps.filter((g) => g.blocksPublish).length;
console.log(blocking ? `\nNot ready to publish: ${blocking} item(s).` : '\nReady to publish.');
process.exit(blocking && !process.env.ALLOW_PLACEHOLDERS ? 1 : 0);
