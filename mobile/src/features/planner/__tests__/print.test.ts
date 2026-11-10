import { it } from '@jest/globals';

import { scan, withProfile } from '../__fixtures__';
import { defaultSettings, generatePlan } from '../engine';
import { getExercise } from '../exercises';
import { MUSCLES } from '../muscles';

// Prints sample plans for eyeballing: PRINT_PLANS=1 npx jest print
const run = process.env.PRINT_PLANS ? it : it.skip;

run('prints sample plans', () => {
  const samples = [
    ['Efficient 3-day, full gym, lagging back, strong chest', withProfile({}), scan({ muscles: { back: 'lagging', chest: 'strong' } })],
    ['Full 4-day, 60-90 min', withProfile({ availability: 'medium', sessionLength: 'medium' }), null],
    ['Beginner, dumbbells + bench, 2 days', withProfile({ experience: 'none', equipment: { access: 'limited', items: ['dumbbells', 'bench'] } }), null],
  ] as const;
  for (const [name, profile, s] of samples) {
    const settings = defaultSettings(profile);
    const plan = generatePlan(profile, name.includes('2 days') ? { ...settings, daysPerWeek: 2 } : settings, s);
    const lines = [`\n=== ${name} (${plan.settings.style}) ===`, ...plan.why.map((w) => `why: ${w}`), ...plan.warnings.map((w) => `WARN: ${w}`)];
    for (const d of plan.days) {
      lines.push(`-- ${d.label} (~${d.estMinutes} min)`);
      for (const x of d.exercises)
        lines.push(`   ${getExercise(x.exerciseId).name}: ${x.sets}x${x.repMin}-${x.repMax} @RIR ${x.rir} rest ${x.restSec}s${x.supersetGroup ? ' [SS]' : ''} (${x.role})${x.notes.length ? ' — ' + x.notes.join(' ') : ''}`);
    }
    lines.push('volume: ' + MUSCLES.map((m) => `${m}=${plan.volume[m].sets}/${plan.volume[m].target}(${plan.volume[m].tier[0]})`).join(' '));
    console.log(lines.join('\n'));
  }
});
