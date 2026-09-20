import { runAllMarkedSpecTests } from '@markedjs/testutils';
import { markedVariables } from '../src/index.js';

runAllMarkedSpecTests({ addExtension: (marked)=>{ marked.use(markedVariables()) }, outputCompletionTables: true });
