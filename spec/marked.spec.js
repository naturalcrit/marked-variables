import { runAllMarkedSpecTests } from '@markedjs/testutils';
import variables from '../src/index.js';

runAllMarkedSpecTests({ addExtension: (marked) => { marked.use({ extensions: [variables] }); }, outputCompletionTables: true });
