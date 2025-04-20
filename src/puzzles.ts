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
const alpha = fill(alphaLen, i=>String.fromCharCode("a".charCodeAt(0)+i)); // I have no clue what this means
const defaultGenLen: number = 10;
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
		name: "Caesar",
		blurb: "",
		generator: defaultGen,
        // n^2 idc
		solve(inp) {
			const key: number = 2;
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), key)).join("");
		}
	}
] as const satisfies Puzzle[];
