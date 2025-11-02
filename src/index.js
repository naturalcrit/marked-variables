import { Parser as MathParser } from 'expr-eval';
import { romanize } from 'romans';
import writtenNumber from 'written-number';

let varsQueue        = [];
const globalVarsList = {};
let globalPageNumber = 0;

// Regex
//                    url or <url>            "title"    or   'title'     or  (title)
const linkRegex =  /^([^<\s][^\s]*|<.*?>)(?: ("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\((?:\\\(|\\\)|[^()])*\)))?$/m;
const varCallRegex = /([!$]?)\[((?!\s*\])(?:\\.|[^\[\]\\])+)\]/g; // Matches [var] or ![var] or $[var]

//Limit math features to simple items
const mathParser = new MathParser({
	operators : {
		// These default to true, but are included to be explicit
		add      : true,
		subtract : true,
		multiply : true,
		divide   : true,
		power    : true,
		round    : true,
		floor    : true,
		ceil     : true,
		abs      : true,

		sin     : false, cos     : false, tan     : false, asin    : false, acos    : false,
		atan    : false, sinh    : false, cosh    : false, tanh    : false, asinh   : false,
		acosh   : false, atanh   : false, sqrt    : false, cbrt    : false, log     : false,
		log2    : false, ln      : false, lg      : false, log10   : false, expm1   : false,
		log1p   : false, trunc   : false, join    : false, sum     : false, indexOf : false,
		'-'     : false, '+'     : false, exp     : false, not     : false, length  : false,
		'!'     : false, sign    : false, random  : false, fac     : false, min     : false,
		max     : false, hypot   : false, pyt     : false, pow     : false, atan2   : false,
		'if'    : false, gamma   : false, roundTo : false, map     : false, fold    : false,
		filter  : false,

		remainder   : false, factorial   : false,
		comparison  : false, concatenate : false,
		logical     : false, assignment  : false,
		array       : false, fndef       : false
	}
});
// Add sign function
mathParser.functions.sign = function (a) {
	if(a >= 0) return '+';
	return '-';
};
// Add signed function
mathParser.functions.signed = function (a) {
	if(a >= 0) return `+${a}`;
	return `${a}`;
};
// Add Roman numeral functions
mathParser.functions.toRomans = function (a) {
	return romanize(a);
};
mathParser.functions.toRomansUpper = function (a) {
	return romanize(a).toUpperCase();
};
mathParser.functions.toRomansLower = function (a) {
	return romanize(a).toLowerCase();
};
// Add character functions
mathParser.functions.toChar = function (a) {
	if(a <= 0) return a;
	const genChars = function (i) {
		return (i > 26 ? genChars(Math.floor((i - 1) / 26)) : '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(i - 1) % 26];
	};
	return genChars(a);
};
mathParser.functions.toCharUpper = function (a) {
	return mathParser.functions.toChar(a).toUpperCase();
};
mathParser.functions.toCharLower = function (a) {
	return mathParser.functions.toChar(a).toLowerCase();
};
// Add word functions
mathParser.functions.toWords = function (a) {
	return writtenNumber(a);
};
mathParser.functions.toWordsUpper = function (a) {
	return mathParser.functions.toWords(a).toUpperCase();
};
mathParser.functions.toWordsLower = function (a) {
	return mathParser.functions.toWords(a).toLowerCase();
};
mathParser.functions.toWordsCaps = function (a) {
	const words = mathParser.functions.toWords(a).split(' ');
	return words.map((word)=>{
		return word.replace(/(?:^|\b|\s)(\w)/g, function(w, index) {
			return index === 0 ? w.toLowerCase() : w.toUpperCase();
		  });
	}).join(' ');
};

// Normalize variable names; trim edge spaces and shorten blocks of whitespace to 1 space
const normalizeVarNames = (label)=>{
	return label.trim().replace(/\s+/g, ' ');
};

const replaceVar = function(prefix, label, allowUnresolved=false) {
	//v=====--------------------< HANDLE MATH >-------------------=====v//
	const mathRegex = /[a-z]+\(|[+\-*/^(),]/g;
	const matches = label.split(mathRegex);
	const mathVars = matches.filter((match)=>isNaN(match))?.map((s)=>s.trim()); // Capture any variable names

	let replacedLabel = label;

	if(prefix[0] == '$' && mathVars?.[0] !== label.trim())  {// If there was mathy stuff not captured, let's do math!
		mathVars?.forEach((variable)=>{
			const foundVar = lookupVar(variable, globalPageNumber);
			if(foundVar && foundVar.resolved && foundVar.content && !isNaN(foundVar.content)) // Only subsitute math values if fully resolved, not empty strings, and numbers
				replacedLabel = replacedLabel.replaceAll(new RegExp(`(?<!\\w)(${variable})(?!\\w)`, 'g'), foundVar.content);
		});

		try {
			return mathParser.evaluate(replacedLabel);
		} catch (error) {
			return undefined;		// Return undefined if invalid math result
		}
	}
	//^=====--------------------< HANDLE MATH >-------------------=====^//

	const foundVar = lookupVar(label, globalPageNumber);

	if(!foundVar || (!foundVar.resolved && !allowUnresolved))
		return undefined;			// Return undefined if not found, or parially-resolved vars are not allowed

	if(prefix[0] == '$')          // Variable <================================
		return foundVar.content;

	const linkMatch = foundVar.content.match(linkRegex);
	const href      = linkMatch ? linkMatch[1]               : null; //TODO: TRIM OFF < > IF PRESENT
	const title     = linkMatch ? linkMatch[2]?.slice(1, -1) : null;

	if(!prefix[0] && href)        // Link     <================================
		return `[${label}](${href}${title ? ` "${title}"` : ''})`;

	if(prefix[0] == '!' && href)  // Image    <================================
		return `![${label}](${href} ${title ? ` "${title}"` : ''})`;
};

const lookupVar = function(label, index) {
	while (index >= 0) {
		if(globalVarsList[index]?.[label] !== undefined)
			return globalVarsList[index][label];
		index--;
	}

	//If normal lookup failed, attempt hoisting from later
	index = Object.keys(globalVarsList).length; // Move index to start from last page
	while (index >= 0) {
		if(globalVarsList[index]?.[label] !== undefined)
			return globalVarsList[index][label];
		index--;
	}

	return undefined;
};

const processVariableQueue = function() {
	let resolvedOne = true;
	let finalLoop   = false;
	while (resolvedOne || finalLoop) { // Loop through queue until no more variable calls can be resolved
		resolvedOne = false;
		for (const item of varsQueue) {
			if(item.type == 'text')
				continue;

			if(item.type == 'varDefBlock') {
				let match;
				let resolved = true;
				let tempContent = item.content;
				while (match = varCallRegex.exec(item.content)) { // Check for any variable calls within this definition (i.e. [var]: $[nestedVar])
					const value = replaceVar(match[1], match[2]);

					if(value == undefined)
						resolved = false;
					else
						tempContent = tempContent.replaceAll(match[0], value);
				}

				if(resolved == true || item.content != tempContent) {
					resolvedOne = true;
					item.content = tempContent;
				}

				globalVarsList[globalPageNumber][item.varName] = {
					content  : item.content,
					resolved : resolved
				};

				if(resolved)
					item.type = 'resolved';
			}

			if(item.type == 'varCall') {
				const value = replaceVar(item.prefix, item.varName, finalLoop); // final loop will just use the best value so far

				if(value == undefined)
					continue;

				resolvedOne  = true;
				item.content = value;
				item.type    = 'text';
			}
		}
		varsQueue = varsQueue.filter((item)=>item.type !== 'resolved'); // Remove any fully-resolved variable definitions

		if(finalLoop)
			break;
		if(!resolvedOne)
			finalLoop   = true;
	}
	varsQueue = varsQueue.filter((item)=>item.type !== 'varDefBlock');
};

export function markedVariables() {
	return {
		hooks : {
			preprocess(src) {
				const existing = globalVarsList[globalPageNumber] || {};	// Clear variables for current page (except externally-injected) before processing
				globalVarsList[globalPageNumber] = Object.fromEntries(
					Object.entries(existing)
						.filter(([_, value]) => value?.external)
						.map(([key, value]) => [key, { ...value, external: undefined }])
				);
				varsQueue = []; // Start with an empty queue of variables to parse

				const codeBlockSkip  = /^(?: {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+|^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})(?:[^\n]*)(?:\n|$)(?:|(?:[\s\S]*?)(?:\n|$))(?: {0,3}\2[~`]* *(?=\n|$))|`[^`]*?`/;
				const varLabelRegex  = /([!$]?)\[((?!\s*\])(?:\\.|[^\[\]\\])+)\]/; // Matches [var] or ![var] or $[var], 3[4]
				const blockDefRegex  = /:((?:\n? *[^\s].*)+)(?=\n+|$)/;            // Matches : block definitions,       3[4]: 5
				const inlineDefRegex = /\(([^\n]+)\)/;                             // Matches (inline definitions),      3[4](6)

				const combinedRegex = new RegExp(`(${codeBlockSkip.source})|${varLabelRegex.source}(?:${blockDefRegex.source}|${inlineDefRegex.source})?`, 'gm');

				let lastIndex = 0;
				let match;
				while ((match = combinedRegex.exec(src)) !== null) {
					const isLineStart = match.index === 0 || src[match.index - 1] === '\n';
					const prefix = match[3];
					const label  = match[4] ? normalizeVarNames(match[4]) : null;

					// Format any matches into tokens and store
					if(match.index > lastIndex) { // Any non-variable stuff
						varsQueue.push(
							{ type    : 'text',
								content : src.slice(lastIndex, match.index)
							});
					}
					if(match[1]) {
						varsQueue.push(
							{ type    : 'text',
								content : match[0]
							});
					}
					else if(isLineStart && match[5]) { // Block Definition
						const content = match[5].trim().replace(/[ \t]+/g, ' '); // Normalize text content (except newlines for block-level content)

						varsQueue.push(
							{ type    : 'varDefBlock',
								prefix  : prefix,
								varName : label,
								content : content
							});
					}
					else if(match[6]) { // Inline Definition
						let content = match[6] || null;

						// In case of nested (), find the correct matching end )
						let level = 0;
						let i;
						for (i = 0; i < content.length; i++) {
							if(content[i] === '\\') {
								i++;
							} else if(content[i] === '(') {
								level++;
							} else if(content[i] === ')') {
								level--;
								if(level < 0)
									break;
							}
						}
						combinedRegex.lastIndex = combinedRegex.lastIndex - (content.length - i);
						content = content.slice(0, i).trim().replace(/\s+/g, ' ');

						varsQueue.push(
							{ type    : 'varDefBlock',
								prefix  : prefix,
								varName : label,
								content : content
							});
						varsQueue.push(
							{ type    : 'varCall',
								prefix  : prefix,
								varName : label
							});
					}
					else if(match[4]) { // Variable Call
						varsQueue.push(
							{ type    : 'varCall',
								prefix  : prefix,
								varName : label,
								content : `${prefix}[${label}]`	// Keep original `$[var]` in case not defined anywhere
							});
					}
					lastIndex = combinedRegex.lastIndex;
				}

				if(lastIndex < src.length) {
					varsQueue.push(
						{ type    : 'text',
							varName : null,
							content : src.slice(lastIndex)
						});
				}

				processVariableQueue();

				const output = varsQueue.map((item)=>item.content).join('');
				return output;
			}
		}
	}
};

export function setMarkedVariable(name, content, page=0) {
	if (page < 0) return;
	if(!globalVarsList[ page ]) globalVarsList[ page ] = {};
	globalVarsList[ page ][ name ] = {
		content  : content,
		resolved : true,
		external : true
	};
};

export function getMarkedVariable(name, page=0) {
	const lookup = lookupVar(name, page);
	if(lookup?.resolved) {	// Not sure if it can ever be unresolved here, something to check later
		return lookup.content;
	}
	return undefined;
}

export function setMarkedVariablePage(pageNumber) {
	globalPageNumber = pageNumber;
}
