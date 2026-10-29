import {readFile} from 'node:fs/promises';
const paths=['.gitignore','package.json','index.html','config.example.js','netlify.toml','app.js','production-domain.js','production-ui.js','student-domain.js','student-ui.js','api.js','domain.js','style.css','student-style.css','README.md','scripts/build.mjs','scripts/serve.mjs','supabase/migrations/001_divafit.sql','supabase/migrations/20261027170541_divafit_team_activation.sql','supabase/migrations/20261027231525_divafit_allow_provisional_imports.sql','supabase/tests/access.sql','supabase/migrations/20261028171251_divafit_copy_original_expected_volume.sql','supabase/migrations/20261028171646_divafit_independent_method_level.sql','supabase/migrations/20261028171806_divafit_preserve_copy_metadata.sql','supabase/migrations/20261028191240_divafit_student_header_and_routines.sql','supabase/migrations/20261028192125_divafit_copied_routine_originality.sql','tests/student.test.mjs','tests/production.test.mjs','supabase/migrations/20261028170014_divafit_production_workspace.sql','tests/domain.test.mjs','tests/api.test.mjs'];
paths.push('manifest.webmanifest','mobile.js','mobile.css','sw.js','offline.html','offline.css','scripts/icons.mjs','scripts/preview-build.mjs','scripts/publish-source.mjs','tests/mobile.test.mjs','assets/README.md','assets/imagens/.gitkeep','assets/videos/.gitkeep');
const entries=[];for(const p of paths)entries.push({path:'divafit/'+p,mode:'100644',type:'blob',content:await readFile(p,'utf8')});
entries.push({path:'.github/workflows/divafit.yml',mode:'100644',type:'blob',content:`name: DivaFit checks
on:
  pull_request:
    paths: ['divafit/**', '.github/workflows/divafit.yml']
  push:
    branches: ['codex/divafit-gestao-inicial']
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: divafit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm test
      - run: node --check app.js && node --check api.js
      - run: node scripts/build.mjs
`});
console.log(JSON.stringify(entries));
