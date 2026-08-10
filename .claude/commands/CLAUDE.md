## Style

Prefer explicit branching over ternaries when either branch does real work.

Bad:
const label = card.state === 'new' ? formatNew(card) : formatDue(card, now);

Good:
let label;
if (card.state === 'new') {
  label = formatNew(card);
} else {
  label = formatDue(card, now);
}

Short value picks are fine: const cls = active ? 'on' : 'off';

Comments explain why, never what. Delete any comment that restates the line below it.
**DO NOT** use em dashses in your comments EVER NEVER 
Bad:
// increment the counter
count++;

Run `npm run dev` to start it.
Don't bump the version in package.json by hand, I have a script for that.
Stop writing so many comments.