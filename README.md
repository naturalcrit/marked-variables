# marked-variables

This module provides the capability of embedding variable strings in markdown for use elsewhere in the document. There are additional facilities for math operations.

## Notes:
* Imperative definition works (i.e. variables can hold different values at different points in the document).
* Double interpolation is not possible (i.e., composing variable names out of other variables).
* Variable assignments inside of other variable assignments is not possible.
* Variables are hoisted if not yet defined when called. Uses the latest possible contents of that variable.

# Markdown Usage
<!-- Show most examples of how to use this extension -->

### Three syntaxes:
|Syntax|Description|
|------------------|-----------------------------------|
|\[var\]:content   | Assigns a variable                |
|\[var\]\(content\)| Assigns a variable and outputs it |
|\[var\]           | Outputs a variable                |

### Examples
|Syntax	|Output|
|-------|------|
|[var]: Variable Contents|Assigns "Variable Contents" to var|
|[var]: Variable Contents<br>on two<br>or three<br>or more lines	|Assigns "Variable Contents\non two\nor three\nor more lines" to var|
|[var]:<br>\| h1 \| h2 \|<br>\|----\|----\|<br>\| c1 \| c2 \||	Assigns "\| h1 \| h2 \|\n\|----\|----\|\n\| c1 \| c2 \| to var (and can later be rendered as a table)|
|$[var](Variable Contents)|	Assigns "Variable Contents" to var and outputs that value|
|$[var](I love \$[var2] and \$[var3])|	Assigns "I love var2 contents and var3 contents" to var and outputs that value|
|\$[var]|	Outputs var contents|
|[var]|	outputs the variable contents as a link, if formatted as a valid link|
|![var]|	outputs as an image, if formatted as a valid image|
|\$[var]: Variable Contents<br>or<br>![var]: Variable Contents|	Identical to [var]: Variable Contents . Links, images, and variables all share the same global list. The ! or \$ prefix only matters when the variable is being expressed|
|[var](Variable Contents)<br>or<br>![var](Variable Contents)	|Identical to assignment via \$[var](Variable Contents), but outputs as a link or image if contents are a valid link format|
|\$[num1 + num2 * (num3 - round(5.5))]	|If +, -, *,/,^,(, or ) are found in the variable name, the whole variable is parsed mathematically with correct order of operations. Only parses if every variable is defined (hoisting works), and evaluate to a number, and the expression is valid. Supports round(x).|

### Math
Math currently supports the following function names: round(), floor(), ceil().
It also allows for () nesting operations.

So yes, you can do incrementing tables like this:

```
There are $[TableNum] tables in this document. // Final value of $[TableNum] gets hoisted up:    //"There are 2 tables in this document."

$[TableNum]: 0 // Initialize to 0

$[TableNum]: $[TableNum + 1] // TableNum = 1

##### $[TableRefKnights](Table $[TableNum]: Horse Type and Quality)

...

$[TableNum]: $[TableNum + 1] // TableNum = 2

##### $[TableRefDragons](Table $[TableNum]: Dragons of the Realm)
```

#### Math Functions

|Function|Output|
|--------|------|
|abs(n) | returns the absolute value of the content of n|
|sign(n) | returns the sign of n: + for positive numbers (including zero), - for negative numbers|
|signed(n) | returns the value of n with its sign. In this function, 0 is treated as a positive number, returning +0.|

#### Number conversions

These use the number 4 as an example value.

|Function|Output|
|--------|------|
|toRomans(4) | display the value of 4 in Roman Numerals (IV)|
|toRomansUpper(4) | display the value of 4 in forced uppercase Roman Numerals (IV)|
|toRomansLower(4) | display the value of 4 in forced lowercase Roman Numerals (iv)|
|toChar(4) | display the value of 4 as its position in the English alphabet (D)|
|toCharUpper(4) | display the value of 4 as its forced uppercase position in the English alphabet (D)|
|toCharLower(4) |display the value of 4 as its forced lowercase position in the English alphabet (d) |
|toWords(4) | display the value of 4 as a word (four)|
|toWordsUpper(4) | display the value of 4 as a word in uppercase (FOUR)|
|toWordsLower(4) | display the value of 4 as a word in lowercase (four)|
|toWordsCaps(4) | display the value of 4 as a word in word capitalization (Four)|


# Project Usage

```js
import { marked as Marked }     from 'marked';
import { markedVariables,
	    setMarkedVarPage,
		setMarkedVariable,
		getMarkedVariable,
		clearMarkedVarsQueue }  from 'marked-variables';

		// We're only going to use one page
		// in this example, so we'll hardcode the
		// values.

		Marked.use(markedVariables());

		setMarkedVarPage(0);
		clearMarkedVarsQueue();
		setMarkedVariable(0, 'pageNumber', 1);
		);

		const html = Marked.parse("[varName]:foo\n\nHello, my name is $[varName].\n\n");
		console.log(html);
		//<p>Hello, my name is foo.</p>\n<p>&nbsp;</p>\n
```
