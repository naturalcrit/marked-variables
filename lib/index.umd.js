(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('expr-eval'), require('romans'), require('written-number')) :
	typeof define === 'function' && define.amd ? define(['exports', 'expr-eval', 'romans', 'written-number'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["hard-breaks"] = {}, global.exprEval, global.romans, global.writtenNumber));
})(this, (function (exports, exprEval, romans, writtenNumber) { 'use strict';

	let varsQueue       = [];
	const globalVarsList    = {};
	let globalPageNumber = 0;

	//Limit math features to simple items
	const mathParser = new exprEval.Parser({
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
		return romans.romanize(a);
	};
	mathParser.functions.toRomansUpper = function (a) {
		return romans.romanize(a).toUpperCase();
	};
	mathParser.functions.toRomansLower = function (a) {
		return romans.romanize(a).toLowerCase();
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

	const replaceVar = function(input, hoist=false, allowUnresolved=false) {
		const regex = /([!$]?)\[((?!\s*\])(?:\\.|[^\[\]\\])+)\]/g;
		const match = regex.exec(input);

		const prefix = match[1];
		const label  = normalizeVarNames(match[2]); // Ensure the label name is normalized as it should be in the var stack.

		//v=====--------------------< HANDLE MATH >-------------------=====v//
		const mathRegex = /[a-z]+\(|[+\-*/^(),]/g;
		const matches = label.split(mathRegex);
		const mathVars = matches.filter((match)=>isNaN(match))?.map((s)=>s.trim()); // Capture any variable names

		let replacedLabel = label;

		if(prefix[0] == '$' && mathVars?.[0] !== label.trim())  {// If there was mathy stuff not captured, let's do math!
			mathVars?.forEach((variable)=>{
				const foundVar = lookupVar(variable, globalPageNumber, hoist);
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

		const foundVar = lookupVar(label, globalPageNumber, hoist);

		if(!foundVar || (!foundVar.resolved && !allowUnresolved))
			return undefined;			// Return undefined if not found, or parially-resolved vars are not allowed

		//                    url or <url>            "title"    or   'title'     or  (title)
		const linkRegex =  /^([^<\s][^\s]*|<.*?>)(?: ("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\((?:\\\(|\\\)|[^()])*\)))?$/m;
		const linkMatch = linkRegex.exec(foundVar.content);

		const href  = linkMatch ? linkMatch[1]               : null; //TODO: TRIM OFF < > IF PRESENT
		const title = linkMatch ? linkMatch[2]?.slice(1, -1) : null;

		if(!prefix[0] && href)        // Link
			return `[${label}](${href}${title ? ` "${title}"` : ''})`;

		if(prefix[0] == '!' && href)  // Image
			return `![${label}](${href} ${title ? ` "${title}"` : ''})`;

		if(prefix[0] == '$')          // Variable
			return foundVar.content;
	};

	const lookupVar = function(label, index, hoist=false) {
		while (index >= 0) {
			if(globalVarsList[index]?.[label] !== undefined){
				return globalVarsList[index][label];
		    }
			index--;
		}

		if(hoist) {	//If normal lookup failed, attempt hoisting
			index = Object.keys(globalVarsList).length; // Move index to start from last page
			while (index >= 0) {
				if(globalVarsList[index]?.[label] !== undefined)
					return globalVarsList[index][label];
				index--;
			}
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
					const regex = /[!$]?\[((?!\s*\])(?:\\.|[^\[\]\\])+)\]/g;
					let match;
					let resolved = true;
					let tempContent = item.content;
					while (match = regex.exec(item.content)) { // regex to find variable calls
						const value = replaceVar(match[0], true);

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

				if(item.type == 'varCallBlock' || item.type == 'varCallInline') {
					const value = replaceVar(item.content, true, finalLoop); // final loop will just use the best value so far

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

	function setMarkedVariable(page, name, content) {
	  if (page < 0) {
		return;
	  }
	  if(!globalVarsList[ page ]) globalVarsList[ page ] = {};
	  globalVarsList[ page ][ name ] = {
			content   : content,
			resolved  : true
	  };
	}
	function getMarkedVariable(name, page) {
		const lookup = lookupVar(page, name, true);
		if(lookup?.resolved) {
			return lookup.content;
		}
		return undefined;
	}

	function clearMarkedVarsQueue() {
		varsQueue = [];
		globalVarsList[globalPageNumber] = {};
	}

	function setMarkedVarPage(pageNumber) {
		globalPageNumber = pageNumber;
	}

	function markedVariables() {
		return {
			hooks : {
				preprocess(src) {
					const codeBlockSkip   = /^(?: {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+|^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})(?:[^\n]*)(?:\n|$)(?:|(?:[\s\S]*?)(?:\n|$))(?: {0,3}\2[~`]* *(?=\n|$))|`[^`]*?`/;
					const blockDefRegex   = /^[!$]?\[((?!\s*\])(?:\\.|[^\[\]\\])+)\]:(?!\() *((?:\n? *[^\s].*)+)(?=\n+|$)/; //Matches 3, [4]:5
					const blockCallRegex  = /^[!$]?\[((?!\s*\])(?:\\.|[^\[\]\\])+)\](?=\n|$)/;                              //Matches 6, [7]
					const inlineDefRegex  = /([!$]?\[((?!\s*\])(?:\\.|[^\[\]\\])+)\])\(([^\n]+)\)/;                         //Matches 8, 9[10](11)
					const inlineCallRegex =  /[!$]?\[((?!\s*\])(?:\\.|[^\[\]\\])+)\](?!\()/;                                //Matches 12, [13]

					// Combine regexes and wrap in parens like so: (regex1)|(regex2)|(regex3)|(regex4)
					const combinedRegex = new RegExp([codeBlockSkip, blockDefRegex, blockCallRegex, inlineDefRegex, inlineCallRegex].map((s)=>`(${s.source})`).join('|'), 'gm');

					let lastIndex = 0;
					let match;
					while ((match = combinedRegex.exec(src)) !== null) {
						// Format any matches into tokens and store
						if(match.index > lastIndex) { // Any non-variable stuff
							varsQueue.push(
								{ type    : 'text',
									varName : null,
									content : src.slice(lastIndex, match.index)
								});
						}
						if(match[1]) {
							varsQueue.push(
								{ type    : 'text',
									varName : null,
									content : match[0]
								});
						}
						if(match[3]) { // Block Definition
							const label   = match[4] ? normalizeVarNames(match[4]) : null;
							const content = match[5] ? match[5].trim().replace(/[ \t]+/g, ' ') : null; // Normalize text content (except newlines for block-level content)

							varsQueue.push(
								{ type    : 'varDefBlock',
									varName : label,
									content : content
								});
						}
						if(match[6]) { // Block Call
							const label = match[7] ? normalizeVarNames(match[7]) : null;

							varsQueue.push(
								{ type    : 'varCallBlock',
									varName : label,
									content : match[0]
								});
						}
						if(match[8]) { // Inline Definition
							const label = match[10] ? normalizeVarNames(match[10]) : null;
							let content = match[11] || null;

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
									varName : label,
									content : content
								});
							varsQueue.push(
								{ type    : 'varCallInline',
									varName : label,
									content : match[9]
								});
						}
						if(match[12]) { // Inline Call
							const label = match[13] ? normalizeVarNames(match[13]) : null;

							varsQueue.push(
								{ type    : 'varCallInline',
									varName : label,
									content : match[0]
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
					varsQueue = []; // Must clear varsQueue because custom HTML renderer uses Marked.parse which will preprocess again without clearing the array
					return output;
				}
			}
		}
	}

	exports.clearMarkedVarsQueue = clearMarkedVarsQueue;
	exports.getMarkedVariable = getMarkedVariable;
	exports.markedVariables = markedVariables;
	exports.setMarkedVarPage = setMarkedVarPage;
	exports.setMarkedVariable = setMarkedVariable;

}));
