import {test} from 'node:test';
import assert from 'node:assert/strict';
import {libraryGroups,libraryLevel,libraryRoutines} from '../production-domain.js';
import {createProduction} from '../production-ui.js';

const data = {
  students:[], workouts:[], instructions:[], production_cases:[],
  assignments:['AV1B', 'AV1', 'AV1C', 'AA8', 'NC', null, 'AV12'].map((original_phase, i) => ({
    id:'a'+i, number:i, original_phase, expected_vssam:80
  }))
};

test('Siglas oficiais aparecem mesmo sem rotinas e variantes ficam junto da base', () => {
  const groups = libraryGroups(data);
  assert.equal(groups.length, 25);
  assert.deepEqual(groups.slice(8, 12).map(x => x.phase), ['AV1','AV1B','AV1C','AV2']);
  assert.deepEqual(groups.at(-2), {phase:'AA8', range:'270–280', count:1});
  assert.deepEqual(groups.at(-1), {phase:'NC', range:'', count:3});
  assert.equal(libraryLevel('AA8'), 'Altamente avançada');
  for (const group of groups) {
    assert.equal(libraryRoutines(data, {phase:group.phase}).length, group.count);
  }
  assert.equal(libraryRoutines({...data, assignments:[{...data.assignments[0], archived:true}]}).length, 0);
});

test('Clique filtra pela sigla salva e exibe o resultado correspondente', async () => {
  const original = globalThis.document;
  globalThis.document = {querySelector:() => null};
  try {
    const production = createProduction({
      db:() => data, esc:v => String(v ?? ''), button:(label, action, attrs='') => `<button ${attrs}>${label}</button>`,
      tag:String, date:String, formField:() => '', safeLink:() => '', api:{}, render:() => {}
    });
    await production.action({dataset:{action:'wf-level', phase:'AV1B'}});
    const html = production.render('workouts');
    assert.match(html, /Rotinas — AV1B/);
    assert.match(html, /data-id="a0"/);
    assert.doesNotMatch(html, /data-id="a1"/);
  } finally {
    globalThis.document = original;
  }
});
