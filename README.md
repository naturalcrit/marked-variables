# marked-variables

Extends the standard [CommonMark Reference Links](https://spec.commonmark.org/0.31.2/#link-reference-definitions) feature which allows reusing links and images from a single definition, into a more general "variables" feature to also support:

- Storing and reusing Markdown text and numbers
- Math operations on number variables
- Redefining variable contents

### Background

Standard [CommonMark Reference Links](https://spec.commonmark.org/0.31.2/#link-reference-definitions) let you write:

```
[HomePage]: https://myWebsite.com
```

and reuse it anywhere in the document like:

```
[HomePage]
```

or, if the link is a valid image:

```
[Logo]: https://myWebsite.com/logo.png

![Logo]
```

**Marked-Variables** extends this idea to support plain Markdown strings:

```
[Greeting]: Hello *world*!

$[Greeting]
```

## General Variable Assignment and Output Syntax
Variable assignment and output is very similar to the existing reflink behavior. The key difference is that `[var](content)` now also assigns a variable, where in standard Markdown it only produces output.

|Syntax              |Description                        | Details                                                                                     |
|:-------------------|:----------------------------------|:--------------------------------------------------------------------------------------------|
| `[var]: content`   | Assigns a variable                | Also supports multiline text, in which case the text is captured until the next blank line  |
| `[var](content)`   | Assigns a variable and outputs it |                                                                                             |
| `[var]`            | Outputs a variable                | Supports math operations on variable contents using operational symbols or function keywords |

## Variable Output Format
Prefixing the variable with a symbol affects how its contents are rendered.

| Syntax     | Description                                                                     | Details                                       |
|:-----------|:--------------------------------------------------------------------------------|:----------------------------------------------|
| `[var]`    | Output the variable contents as a link, if the contents are a valid link        |                                               |
| `![var]`   | Output the variable contents as an image, if the contents are a valid image URL |                                               |
| `$[var]`   | Output the variable contents as parsed Markdown text                            | Supports math operations on variable contents |

## Notes:
- Variables are hoisted if not yet defined when called. Uses the latest possible contents of that variable.
- Imperative definition works (i.e. variables can be reassigned new values at different points in the document).
- Composing a variable name out of another variable is not possible (e.g., `$[$[varName]]: Content` is invalid).
- Variable assignments inside of other variable assignments is not possible (e.g., `$[var1]: $[var2] : Content`)

## Examples
| Syntax                                                                              | Output                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <pre>[var]: Variable Contents</pre>                                                 | Assigns "Variable Contents" to var                                                                                                                                                                                                                                              |
| <pre>[var]: Variable Contents<br>on two<br>or three<br>or more lines</pre>          | Assigns "Variable Contents\non two\nor three\nor more lines" to var                                                                                                                                                                                                             |
| <pre>[var]:<br>\| h1 \| h2 \|<br>\|----\|----\|<br>\| c1 \| c2 \|</pre>             | Assigns "\| h1 \| h2 \|\n\|----\|----\|\n\| c1 \| c2 \|" to var (and can later be rendered as a table)                                                                                                                                                                          |
| <pre>$[var](Variable Contents)</pre>                                                | Assigns "Variable Contents" to var and outputs that value as parsed Markdown                                                                                                                                                                                                    |
| <pre>$[var](I love \$[mom] and \$[dad])</pre>                                       | Assigns "I love (`[mom] contents`) and (`[dad]` contents)" to var and outputs that value as parsed Markdown                                                                                                                                                                     |
| <pre>\$[var]</pre>                                                                  | Outputs var contents as parsed Markdown                                                                                                                                                                                                                                         |
| <pre>[myLink]</pre>                                                                 | Outputs the variable contents as a link, if formatted as a valid link                                                                                                                                                                                                           |
| <pre>![myImage]</pre>                                                               | Outputs as an image, if formatted as a valid image URL                                                                                                                                                                                                                          |
| <pre>\$[var]: Variable Contents</pre><br>or<br><pre>![var]: Variable Contents</pre> | Assigns "Variable Contents" to var, identical to `[var]: Variable Contents`. Links, images, and variables all share the same global list. The `!` or `$` prefix only matters when the variable is being expressed                                                               |
| <pre>\$[var](Variable Contents)</pre><br>or<br><pre>![var](Variable Contents)</pre> | Assigns "Variable Contents" to var and outputs that value. Identical to assignment via `[var](Variable Contents)`, but outputs as parsed Markdown or image depending on the `!` or `$` prefix.                                                                                  |
| <pre>\$[num1 + 5.5 * (num2 - round(num3))]</pre>                                    | Parses and evaluates the expression using defined variables `num1`, `num1`, `num3`, and math functions. |

## Math Functions
If `+`, `-`, `*`, `/`, `^`, `(`, or `)` are found in the variable name, the whole variable is parsed mathematically with correct order of operations. Only parses if every variable is defined (hoisting works), the expression is valid, and the result evaluates to a number.

The following functions are also available:

| Function      | Output                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| round(n)      | Returns the nearest integer to n. If n is halfway between two integers, it rounds away from zero.        |
| floor(n)      | Returns the greatest integer less than or equal to n (rounds down).                                      |
| ceil(n)       | Returns the smallest integer greater than or equal to n (rounds up).                                     |
| abs(n)        | Returns the absolute value of the content of n.                                                          |
| sign(n)       | Returns the sign of n: + for positive numbers (including zero), - for negative numbers.                  |
| signed(n)     | Returns the value of n with its sign. In this function, 0 is treated as a positive number, returning +0. |

### Number Formatting
The format of the output number can also be set via these functions, if the value in the parentheses evaluates to a number. For example, `$[toRomans(myNumber)]` will output the contents of the `[myNumber]` variable in roman numerals 

| Function         | Output                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| toRomans(4)      | Displays the value of 4 in Roman Numerals (IV)                                       |
| toRomansUpper(4) | Displays the value of 4 in forced uppercase Roman Numerals (IV)                      |
| toRomansLower(4) | Displays the value of 4 in forced lowercase Roman Numerals (iv)                      |
| toChar(4)        | Displays the value of 4 as its position in the English alphabet (D)                  |
| toCharUpper(4)   | Displays the value of 4 as its forced uppercase position in the English alphabet (D) |
| toCharLower(4)   | Displays the value of 4 as its forced lowercase position in the English alphabet (d) |
| toWords(4)       | Displays the value of 4 as a word (four)                                             |
| toWordsUpper(4)  | Displays the value of 4 as a word in uppercase (FOUR)                                |
| toWordsLower(4)  | Displays the value of 4 as a word in lowercase (four)                                |
| toWordsCaps(4)   | Displays the value of 4 as a word in word capitalization (Four)                      |

## Helper Functions

While not requried for basic use, there are also three helper functions for more advanced cases:

### setMarkedVariablePage(pageNumber)
To support multi-part documents parsed in separate chunks, this extension organizes variable definitions into logical sections called “pages.” Variables defined in one page can be accessed from another, once both have been parsed.

`setMarkedVariablePage(pageNumber)`

Sets the current working page index before parsing a chunk. Re-parsing a page will clear and re-calculate its variable definitions and lookups.

- `pageNumber`: The page index to set as current (non-negative integer).

```
setMarkedVariablePage(2);
```

### setMarkedVariable(name, content, page = 0)
In some cases, it may be useful to manually inject a resolved variable into a specific page—either to preload known values, or support external processes. The variable will be marked as resolved and immediately available for use during parsing or lookup, as if it had been defined at the top of the page. Note that variable contents for a given page are cleared on re-parse, so injected values persist only for a single pass and must be re-injected before the page is parsed again.

`setMarkedVariable(name, content, page = 0)`

Defines a resolved variable for a given page. If the page does not yet exist, it will be initialized automatically.

- `name`: The variable name to define (string).
- `content`: The resolved content to associate with the variable.
- `page`: (optional) The page index to assign the variable to. Defaults to 0 if not using page "chunks".

```
setMarkedVariable('total', '42', 1);
```

### getMarkedVariable(name, page = 0)
To retrieve the resolved content of a variable from a specific page, use getMarkedVariable(name, page). This is useful for programmatic access to parsed values or for verifying resolution status across pages.

`getMarkedVariable(name, page = 0)`

Returns the resolved content of a variable from the specified page, or undefined if the variable is not found or not yet resolved.

- `name`: The variable name to look up (string).
- `page`: (optional) The page index to search. Defaults to 0 if not using page "chunks".

```
const value = getMarkedVariable('total', 1); // → '42'
```

# Project Usage

### Basic usage:
```js
import { marked as Marked }     from 'marked';
import { markedVariables }  from 'marked-variables';

		Marked.use(markedVariables());

		const html = Marked.parse("[varName]:foo\n\nHello, my name is $[varName].");
		console.log(html);
		//<p>Hello, my name is foo.</p>
```

### Multi-page usage:
```js
import { marked as Marked }     from 'marked';
import { markedVariables
				setMarkedVariablesPage }  from 'marked-variables';

		Marked.use(markedVariables());

		setMarkedVariablesPage(0);
		const html0 = Marked.parse("Page 0:\n\n[varName]:foo\n\nHello, my name is $[varName].");

		setMarkedVariablesPage(1);
		const html1 = Marked.parse("Page 1:\n\nHello again. My name is still $[varName].");
		
		console.log(html0);
		console.log(html1);

		//<p>Page 0:</p><p>Hello, my name is foo.</p>
		//<p>Page 1:</p><p>Hello again. My name is still foo.</p>
```

### External variable usage:
```js
import { marked as Marked }     from 'marked';
import { markedVariables
				setMarkedVariable
				getMarkedVariable }  from 'marked-variables';

		Marked.use(markedVariables());

		setMarkedVariable('appName', 'Fancy App')
		const html = Marked.parse("Welcome to $[appName]! My name is $[varName](foo).");
		const myName = getMarkedVariable('varName');
	
		console.log(html);
		console.log(myName);

		//<p>Welcome to Fancy App! My name is foo.</p>
		//foo
```