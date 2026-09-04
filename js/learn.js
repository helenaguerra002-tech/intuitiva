/* ================= learn: the ideas behind the urge flow, in plain words ================= */
const LEARN = [
  { id:'loop', eyebrow:'01 · Judson Brewer', title:'The habit loop',
    html: `<p>Every habit runs on the same three-step loop: <em>trigger → behaviour → reward</em>. A feeling shows up (stress, boredom, tiredness), you eat, and for a moment it feels better. The brain files that away as "this works" and next time the urge arrives faster and louder.</p>
      <p>The brain learns from the <em>perceived</em> reward, not the real outcome. It remembers the first bite, not how you felt half an hour later. That gap is the way out.</p>
      <p>Brewer's three "gears": first <em>map the loop</em> (what happened right before? what did I get?). Then bring <em>curiosity</em> to what the behaviour actually delivers: "What am I getting from this, right now? Is it as good as I thought?" Each honest look updates the reward value and the habit loosens on its own. Third, find the <em>bigger better offer</em>: awareness itself feels better than autopilot.</p>
      <p>This is why the flow asks about triggers first and about what you really felt afterwards. You are mapping the loop.</p>
      <div class="src">The Hunger Habit; drjud.com/what-is-the-habit-loop</div>` },
  { id:'brain', eyebrow:'02 · Kathryn Hansen', title:'Lower brain, higher brain',
    html: `<p><em>Brain over Binge</em> separates two parts of you. The lower brain (old, automatic, survival-driven) produces the urge. The higher brain (prefrontal cortex, the part reading this) decides whether to act.</p>
      <p>Hansen calls binge urges <em>neurological junk</em>: automatic signals with no meaning, left over from a habit that has been reinforced. An urge is not a sign that you need something. It is not a message about who you are. It is noise.</p>
      <p>The stance is <em>dismiss, don't fight</em>. Fighting an urge treats it as important. Analysing it feeds it. Simply noticing "that's the lower brain again" and not acting is enough. Urges that are not reinforced fade, because the brain stops predicting a payoff.</p>
      <p>Two goals, both needed: stop acting on urges, and <em>eat enough</em>. Restriction is the most reliable way to make the lower brain louder, which is why this app never shows calories unless you ask for them.</p>
      <div class="src">Brain over Binge; brainoverbinge.com/episode-3-lower-higher-brain</div>` },
  { id:'rain', eyebrow:'03 · The tool', title:'RAIN, step by step',
    html: `<p><em>Recognise.</em> Notice you are caught in a loop. Soften: drop the shoulders, unclench the jaw. "Ohhh, there it is."</p>
      <p><em>Allow.</em> Let it be here. Not pushing it away, not obeying it. The urge is a wave; you are watching it from the beach.</p>
      <p><em>Investigate.</em> Get curious about the body: "What does this feel like right now?" Where is it? Tight, hot, fluttery, empty? Curiosity and contraction can't coexist.</p>
      <p><em>Note.</em> Label what you find with short words: tightness, heat, restlessness, pressure, fading. Noting keeps you in the observer seat.</p>
      <p>Cravings peak and pass, usually within <em>sixty to ninety seconds</em> of direct attention. They feel endless only when you look away. The timer in the surf flow is there to give you a reason to stay.</p>
      <div class="src">drjud.com/anxiety/rain-exercise</div>` },
  { id:'after', eyebrow:'04 · Afterwards', title:'If you acted on it',
    html: `<p>Sometimes the wave wins. Log it as "I acted on it" and move on. There is no red mark, no streak reset shown in red, nothing to make up for.</p>
      <p>In Hansen's framing, a habit fired. That is all. The next urge is a fresh chance for the higher brain, and every urge you don't act on weakens the loop a little more. In Brewer's framing, the honest data point ("that wasn't as good as promised") is the disenchantment doing its work.</p>
      <p>Eat normally at the next meal. Not less. The map shows the day as logged either way.</p>` },
];
function learnHTML(){
  return `<div class="card">${LEARN.map(l => `<div class="learn" id="learn-${l.id}">
    <button onclick="this.parentElement.classList.toggle('on')"><span><span class="micro">${l.eyebrow}</span><b>${l.title}</b></span><span class="chev">${ICON.chev}</span></button>
    <div class="txt">${l.html}</div></div>`).join('')}</div>`;
}
