import { marked as Markdown} from 'marked';
import { markedVariables,
	    setMarkedVarPage,
		setMarkedVariable,
		getMarkedVariable,
		clearMarkedVarsQueue }  from 'marked-variables';
import dedent from 'dedent-tabs';

/* eslint-disable max-lines */

setupVars = function(){
		Markdown.use(markedVariables());

		setMarkedVarPage(0);
		clearMarkedVarsQueue();
		setMarkedVariable(0, 'pageNumber', 1);

};

// Marked.js adds line returns after closing tags on some default tokens.
// This removes those line returns for comparison sake.
String.prototype.trimReturns = function(){
	return this.replace(/\r?\n|\r/g, '').trim();
};

renderAllPages = function(pages){
	const outputs = [];
	pages.forEach((page, index)=>{
		const output = Markdown(page, index);
		outputs.push(output);
	});

	return outputs;
};

// Adding `.failing()` method to `describe` or `it` will make failing tests "pass" as long as they continue to fail.
// Remove the `.failing()` method once you have fixed the issue.

describe('Block-level variables', ()=>{
	it('Handles variable assignment and recall with simple text', function() {
		const source = dedent`
			[var]: string

			$[var]
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles variable assignment and recall with multiline string', function() {
		const source = dedent`
			[var]: string
			across multiple
			lines

			$[var]`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles variable assignment and recall with tables', function() {
		const source = dedent`
			[var]:
			##### Title
			| H1 | H2 | 
			|:---|:--:|
			| A  | B  |
			| C  | D  |
			
			$[var]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Hoists undefined variables', function() {
		const source = dedent`
			$[var]

			[var]: string`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Hoists last instance of variable', function() {
		const source = dedent`
			$[var]

			[var]: string

			[var]: new string`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles complex hoisting', function() {
		const source = dedent`
			$[titleAndName]: $[title] $[fullName]

			$[title]: Mr.

			$[fullName]: $[firstName] $[lastName]

			[firstName]: Bob

			Welcome, $[titleAndName]!

			[lastName]: Jacob

			[lastName]: $[lastName]son
			`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles variable reassignment', function() {
		const source = dedent`
			[var]: one

			$[var]

			[var]: two

			$[var]
			`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles variable reassignment with hoisting', function() {
		const source = dedent`
			$[var]
		
			[var]: one

			$[var]

			[var]: two

			$[var]
			`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Ignores undefined variables that can\'t be hoisted', function() {
		const source = dedent`
			$[var](My name is $[first] $[last])

			$[last]: Jones
			`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Inline-level variables', ()=>{
	it('Handles variable assignment and recall with simple text', function() {
		const source = dedent`
			$[var](string)

			$[var]
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Hoists undefined variables when possible', function() {
		const source = dedent`
			$[var](My name is $[name] Jones)

			[name]: Bob`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Hoists last instance of variable', function() {
		const source = dedent`
			$[var](My name is $[name] Jones)

			$[name](Bob)

			[name]: Bill`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Only captures nested parens if balanced', function() {
		const source = dedent`
			$[var1](A variable (with nested parens) inside)

			$[var1]

			$[var2](A variable ) with unbalanced parens)

			$[var2]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Math', ()=>{
	it('Handles simple math using numbers only', function() {
		const source = dedent`
			$[1 + 3 * 5 - (1 / 4)]
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles round function', function() {
		const source = dedent`
			$[round(1/4)]`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles floor function', function() {
		const source = dedent`
			$[floor(0.6)]`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles ceil function', function() {
		const source = dedent`
			$[ceil(0.2)]`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles nested functions', function() {
		const source = dedent`
			$[ceil(floor(round(0.6)))]`;
		setupVars();
        const rendered = Markdown(source).replace(/\s/g, ' ').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles simple math with variables', function() {
		const source = dedent`
			$[num1]: 5

			$[num2]: 4

			Answer is $[answer]($[1 + 3 * num1 - (1 / num2)]).
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles variable incrementing', function() {
		const source = dedent`
			$[num1]: 5

			Increment num1 to get $[num1]($[num1 + 1]) and again to $[num1]($[num1 + 1]).
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Code blocks', ()=>{
	it('Ignores all variables in fenced code blocks', function() {
		const source = dedent`
		  \`\`\`
			[var]: string

			$[var]

			$[var](new string)
			\`\`\`
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Ignores all variables in indented code blocks', function() {
		const source = dedent`
			test

			    [var]: string

			    $[var]

			    $[var](new string)
		`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Ignores all variables in inline code blocks', function() {
		const source = '[var](Hello) `[link](url)`. This `[var] does not work`';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Normal Links and Images', ()=>{
	it('Renders normal images', function() {
		const source = `![alt text](url)`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Renders normal images with a title', function() {
		const source = 'An image ![alt text](url "and title")!';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Applies curly injectors to images', function() {
		const source = `![alt text](url){width:100px}`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Renders normal links', function() {
		const source = 'A Link to my [website](url)!';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Renders normal links with a title', function() {
		const source = 'A Link to my [website](url "and title")!';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Cross-page variables', ()=>{
	it('Handles variable assignment and recall across pages', function() {
		const source0 = `[var]: string`;
		const source1 = `$[var]`;
		setupVars();
        const rendered = renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles hoisting across pages', function() {
		const source0 = `$[var]`;
		const source1 = `[var]: string`;
		renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();	//Requires one full render of document before hoisting is picked up
		setupVars();
        const rendered = renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handles reassignment and hoisting across pages', function() {
		const source0 = `$[var]\n\n[var]: one\n\n$[var]`;
		const source1 = `[var]: two\n\n$[var]`;
		renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();	//Requires one full render of document before hoisting is picked up
		setupVars();
        const rendered = renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Page numbering across pages : default', function() {
		const source0 = `$[HB_pageNumber]\n\n`;
		const source1 = `$[HB_pageNumber]\n\n`;
		renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();	//Requires one full render of document before hoisting is picked up
		setupVars();
        const rendered = renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Page numbering across pages : custom page number (Number)', function() {
		const source0 = `[HB_pageNumber]:100\n\n$[HB_pageNumber]\n\n`;
		const source1 = `$[HB_pageNumber]\n\n`;
		renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();	//Requires one full render of document before hoisting is picked up
		setupVars();
        const rendered = renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Page numbering across pages : custom page number (NaN)', function() {
		const source0 = `[HB_pageNumber]:a\n\n$[HB_pageNumber]\n\n`;
		const source1 = `$[HB_pageNumber]\n\n`;
		renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();	//Requires one full render of document before hoisting is picked up
		setupVars();
        const rendered = renderAllPages([source0, source1]).join('\n\\page\n').trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Math function parameter handling', ()=>{
	it('allows variables in single-parameter functions', function() {
		const source = '[var]:4.1\n\n$[floor(var)]';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
	it('allows one variable and a number in two-parameter functions', function() {
		const source = '[var]:4\n\n$[min(1,var)]';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
	it('allows two variables in two-parameter functions', function() {
		const source = '[var1]:4\n\n[var2]:8\n\n$[min(var1,var2)]';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Variable names that are subsets of other names', ()=>{
	it('do not conflict with function names', function() {
		const source = `[a]: -1\n\n$[abs(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('do not conflict with other variable names', function() {
		const source = `[ab]: 2\n\n[aba]: 8\n\n[ba]: 4\n\n$[ab + aba + ba]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Regression Tests', ()=>{
	it('Don\'t Eat all the parentheticals!', function() {
		const source='\n|  title 1  | title 2 | title 3 | title 4|\n|-----------|---------|---------|--------|\n|[foo](bar) |  Ipsum  |    )    |   )    |\n';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handle Extra spaces in image alt-text 1', function(){
		const source='![ where is my image??](http://i.imgur.com/hMna6G0.png)';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handle Extra spaces in image alt-text 2', function(){
		const source='![where  is my image??](http://i.imgur.com/hMna6G0.png)';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handle Extra spaces in image alt-text 3', function(){
		const source='![where is my image?? ](http://i.imgur.com/hMna6G0.png)';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Handle Extra spaces in image alt-text 4', function(){
		const source='![where is my image??](http://i.imgur.com/hMna6G0.png){height=20%,width=20%}';
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});

describe('Custom Math Function Tests', ()=>{
	it('Sign Test', function() {
		const source = `[a]: 13\n\n[b]: -11\n\nPositive: $[sign(a)]\n\nNegative: $[sign(b)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Signed Test', function() {
		const source = `[a]: 13\n\n[b]: -11\n\nPositive: $[signed(a)]\n\nNegative: $[signed(b)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Roman Numerals Test', function() {
		const source = `[a]: 18\n\nRoman Numeral: $[toRomans(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Roman Numerals Test - Uppercase', function() {
		const source = `[a]: 18\n\nRoman Numeral: $[toRomansUpper(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Roman Numerals Test - Lowercase', function() {
		const source = `[a]: 18\n\nRoman Numeral: $[toRomansLower(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Characters Test', function() {
		const source = `[a]: 18\n\n[b]: 39\n\nCharacters: $[toChar(a)] $[toChar(b)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Characters Test - Uppercase', function() {
		const source = `[a]: 18\n\n[b]: 39\n\nCharacters: $[toCharUpper(a)] $[toCharUpper(b)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Characters Test - Lowercase', function() {
		const source = `[a]: 18\n\n[b]: 39\n\nCharacters: $[toCharLower(a)] $[toCharLower(b)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Words Test', function() {
		const source = `[a]: 80085\n\nWords: $[toWords(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Words Test - Uppercase', function() {
		const source = `[a]: 80085\n\nWords: $[toWordsUpper(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Words Test - Lowercase', function() {
		const source = `[a]: 80085\n\nWords: $[toWordsLower(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});

	it('Number to Words Test - Capitalized', function() {
		const source = `[a]: 80085\n\nWords: $[toWordsCaps(a)]`;
		setupVars();
        const rendered = Markdown(source).trimReturns();
        expect(rendered).toMatchSnapshot();
	});
});
