import { ComponentChildren } from "preact";
import { fill } from "./ui";
import { charMap, charMod, charToNum, numToChar } from "./eval";

export type Puzzle = {
	name: string, blurb: ComponentChildren,
	key: string,
	generator: ()=>string, // generate an input
	solve: (inp: string)=>string, // encrypt an input
};

// Default generator
function randString(chars: string[], len: number) {
	return fill(len, ()=>chars[Math.floor(chars.length*Math.random())]).join("");
}

const alphaLen: number = charMod;
// abcdefghijklmnopqrstuvwxyz
// const alpha = fill(alphaLen, i=>String.fromCharCode("a".charCodeAt(0) + i)); 
const alpha = charMap.map(x=>x[0]);
const defaultGenLen: number = 10;
// Uniform random int
const randInt = (min: number, max: number)=>Math.floor(Math.random() * (max - min + 1)) + min;
export const defaultGen = ()=>randString(alpha, defaultGenLen);

// Assumes we are working with lowercase alphabet forever!!
// Adds ct to c[0], wrapping around both directions
function charAdd(c: string, ct: number) {
	const cc = (charToNum[c.charAt(0)] + ct % alphaLen + alphaLen) % alphaLen;
	if (cc < 0 || cc >= alphaLen) {
		throw new Error("Invalid character in charAdd");
	}
	return numToChar[cc];
}

function shuffle<T>(s: T[]): T[] {
	for (let i = s.length-1; i >= 0; --i) {
		const ri = randInt(0, i);
		[s[i], s[ri]] = [s[ri], s[i]];
	}	
	return s;
}

// export const puzzles = [
// 	{
// 		name: "Reverse",
// 		blurb: "Reverses string",
// 		generator: defaultGen,
// 		solve(inp) {
// 			return inp.split("").reverse().join("");
// 		}
// 	},
// 	{
// 		name: "Caesar",
// 		blurb: "Increments all letters by key",
// 		generator: defaultGen,
// 		solve(inp) {
// 			const key: number = 2;
// 			const len: number = inp.length;
// 			return fill(len, i=>charAdd(inp.charAt(i), key)).join("");
// 		}
// 	},
// 	{
// 		name: "Incremental Caesar",
// 		blurb: "Increments each letter by its index",
// 		generator: defaultGen,
// 		solve(inp) {
// 			const len: number = inp.length;
// 			return fill(len, i=>charAdd(inp.charAt(i), i)).join("");
// 		}
// 	},
// 	// assumes alphabet has even length...
// 	// {
// 	// 	name: "Xor",
// 	// 	blurb: "a->b, b->a",
// 	// 	generator: defaultGen,
// 	// 	solve(inp) {
// 	// 		const len: number = inp.length;
// 	// 		return fill(len, i=>(inp.charCodeAt(i) % 2 == 1 ? charAdd(inp.charAt(i), 1) : charAdd(inp.charAt(i), -1))).join("");
// 	// 	}
// 	// },
// 	{
// 		name: "Segment Reverse",
// 		blurb: "Reverses each segment of plaintext, separated by 'x's",
// 		generator() {
// 			return fill(defaultGenLen, ()=>(Math.random() > 0.8 ? "x" : randString(alpha, 1))).join("");
// 		},
// 		solve(inp) {
// 			let result = "";
// 			const seg: string[] = [];
// 			for (const char of inp) {
// 				if (char == "x") {
// 					result += `${seg.reverse().join("")}x`;
// 					seg.length = 0;
// 				} else {
// 					seg.push(char);
// 				}
// 			}
// 			result += seg.reverse().join("");
// 			return result;
// 		}
// 	},
// 	{
// 		name: "Keyword Substitution",
// 		blurb: `Substitution cipher. Given key of distinct letters, 
// 				generate ciphertext alphabet by appending remaining letters 
// 				in alphabet to keyword.`,
// 		generator: defaultGen,
// 		solve(inp) {
// 			const key = "thomas"; // change
// 			let cipherAlphabet = key;
// 			for (const char of alpha) {
// 				if (!key.includes(char)) {
// 					cipherAlphabet += char;
// 				}
// 			}
// 			return fill(inp.length, i=>cipherAlphabet.charAt(charToNum[inp.charAt(i)])).join("");
// 		}
// 	},
// 	{
// 		name: "Atbash",
// 		blurb: "Replace each character with the opposite side of the alphabet.",
// 		generator: defaultGen,
// 		solve(inp) {
// 			return fill(inp.length, i=>numToChar[alphaLen-1-charToNum[inp.charAt(i)]]).join("");
// 		}
// 	},
// 	// Probably boring with normal plaintext
// 	// {
// 	// 	name: "Run Length Encoding",
// 	// 	blurb: ""
// 	// }
// 	{
// 		name: "Half Interleave",
// 		blurb: "Interleaves first and second half of the string",
// 		generator: defaultGen,
// 		solve(inp) {
// 			return fill(inp.length, i=>inp.charAt(i % 2 == 0 ? Math.floor(i / 2) : 
// 				Math.floor(i / 2) + Math.floor((inp.length + 1) / 2))).join(""); // Start from halfway, rounded up if odd
// 		}
// 	},
// 	{
// 		name: "Vigenere",
// 		blurb: "Caesar but keyed on a string",
// 		generator: defaultGen,
// 		solve(inp) {
// 			const key = "thomas"; // change
// 			return fill(inp.length, i=>charAdd(inp.charAt(i), charToNum[key.charAt(i % key.length)])).join("");
// 		}
// 	},
// 	{
// 		name: "Alphabet Derangement",
// 		blurb: "Split text into maximal segments of alphabetical order, shuffle each segment, separated by x",
// 		generator: defaultGen,
// 		solve(inp) {
// 			const seg: string[] = [];
// 			let res = "";
// 			for (const char of inp) {
// 				if (seg.length != 0 && charToNum[seg[seg.length-1]] > charToNum[char]) {
// 					res += `${shuffle(seg).join("")}x`;
// 					seg.length = 0;
// 				} 
// 				seg.push(char);
// 			}
// 			res += shuffle(seg).join("");
// 			return res;
// 		}
// 	}
// ] as const satisfies Puzzle[];
