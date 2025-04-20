import { ComponentChildren } from "preact";
import { fill } from "./ui";

export type Puzzle = {
	name: string, blurb: ComponentChildren,
	generator: ()=>string, // generate an input
	solve: (inp: string)=>string, // encrypt an input
};

// Default generator
function randString(chars: string[], len: number) {
	return fill(len, ()=>chars[Math.floor(chars.length*Math.random())]).join("");
}

const alphaLen = 26;
// abcdefghijklmnopqrstuvwxyz
const alpha = fill(alphaLen, i=>String.fromCharCode("a".charCodeAt(0) + i)); 
const defaultGenLen: number = 10;
// Uniform random int
const randInt = (min: number, max: number)=>Math.floor(Math.random() * (max - min + 1)) + min;
const defaultGen = ()=>randString(alpha, defaultGenLen);

// Assumes we are working with lowercase alphabet forever!!
// Adds ct to c[0], wrapping around both directions
function charAdd(c: string, ct: number) {
	const cc = (c.charCodeAt(0) + ct % alphaLen + alphaLen) % alphaLen;
	if (cc < 0 || cc >= alphaLen) {
		throw new Error("Invalid character in charAdd");
	}
	return String.fromCharCode(cc);
}

// function charInc(c: string) {
// 	return charAdd(c, 1);
// }

// function charDec(c: string) {
// 	return charAdd(c, -1);
// }

export const puzzles = [
	{
		name: "Reverse",
		blurb: "Reverses string",
		generator: defaultGen,
		solve(inp) {
			return inp.split("").reverse().join("");
		}
	},
	{
		name: "Caesar",
		blurb: "Increments all letters by key",
		generator: defaultGen,
		solve(inp) {
			const key: number = 2;
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), key)).join("");
		}
	},
	{
		name: "Incremental Caesar",
		blurb: "Increments each letter by its index",
		generator: defaultGen,
		solve(inp) {
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), i)).join("");
		}
	},
	{
		name: "Xor",
		blurb: "a->b, b->a",
		generator: defaultGen,
		solve(inp) {
			const len: number = inp.length;
			return fill(len, i=>(inp.charCodeAt(i) % 2 == 1 ? charAdd(inp.charAt(i), 1) : charAdd(inp.charAt(i), -1))).join("");
		}
	},
	{
		name: "Segment Reverse",
		blurb: "Reverses each segment of plaintext, separated by 'x's",
		generator() {
			return fill(defaultGenLen, ()=>(Math.random() > 0.8 ? "x" : randString(alpha, 1))).join("");
		},
		solve(inp) {
			let result = "";
			let seg: string[] = [];
			for (const char of inp) {
				if (char == "x") {
					result += seg.reverse().join("") + "x";
					seg.length = 0;
				} else {
					seg.push(char);
				}
			}
			result += seg.reverse().join("");
			return result;
		}
	},
	{
		name: "Keyword Substitution",
		blurb: `Substitution cipher. Given key of distinct letters, 
				generate ciphertext alphabet by appending remaining letters 
				in alphabet to keyword.`,
		generator: defaultGen,
		solve(inp) {
			let key = "thomas"; // change
			let cipherAlphabet = key;
			for (const char of alpha) {
				if (!key.includes(char)) {
					cipherAlphabet += char;
				}
			}
			return fill(inp.length, i=>cipherAlphabet.charAt(inp.charCodeAt(i)-alpha[0].charCodeAt(0))).join("");
		}
	}
] as const satisfies Puzzle[];
