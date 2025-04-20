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

const alphaLen: number = 26;
// abcdefghijklmnopqrstuvwxyz
const alpha = fill(alphaLen, i=>String.fromCharCode("a".charCodeAt(0) + i)); 
// const alpha = charMap.map(x=>x[0]);
const defaultGenLen: number = 10;
// Uniform random int
const randInt = (min: number, max: number)=>Math.floor(Math.random() * (max - min + 1)) + min;
export const defaultGen = ()=>randString(alpha.splice(alpha.indexOf(" "), 1), defaultGenLen); // Don't generate spaces

// Adds ct to c[0], wrapping around both directions
// Skips space
function charAdd(c: string, ct: number) : string {
	if (charToNum[c.charAt(0)] == charToNum[" "]) return " ";
	const cc = (charToNum[c.charAt(0)] + ct % 26 + 26) % 26;
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

export const puzzles = [
	{
		// Caesar
		name: "Your first puzzle",
		key: "salad",
		blurb: "Can you learn the controls!?",
		generator: defaultGen,
		solve(inp) {
			const key: number = 2;
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), key)).join("");
		}
	},
	{
		// Reverse
		name: "Tutorial part 2",
		key: "elzzup",
		blurb: "You'll never figure out this one...",
		generator: defaultGen,
		solve(inp) {
			return inp.split("").reverse().join("");
		}
	},
	{
		// Incremental Caesar
		name: "Caesar but different",
		key: "olive-oil",
		blurb: `Caesar dressing is named after Caesar Cardini, who invented it at a Caesar's in Tijuana, Mexico,
		 when the kitchen was overwhelmed and short on ingredients. It was originally prepared tableside,
		 and it is still prepared tableside at the original venue. -Wikipedia`,
		generator: defaultGen,
		solve(inp) {
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), i)).join("");
		}
	},
	// assumes alphabet has even length...
	// {
	// 	name: "Xor",
	// 	blurb: "a->b, b->a",
	// 	generator: defaultGen,
	// 	solve(inp) {
	// 		const len: number = inp.length;
	// 		return fill(len, i=>(inp.charCodeAt(i) % 2 == 1 ? charAdd(inp.charAt(i), 1) : charAdd(inp.charAt(i), -1))).join("");
	// 	}
	// },
	{
		// Segment Reverse
		name: "This is actually the hardest one",
		key: "pain",
		blurb: "It's all downhill from here",
		generator() {
			return fill(defaultGenLen, ()=>(Math.random() > 0.8 ? "x" : randString(alpha, 1))).join("");
		},
		solve(inp) {
			let result = "";
			const seg: string[] = [];
			for (const char of inp) {
				if (char == "x") {
					result += `${seg.reverse().join("")}x`;
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
		// Keyword Substitution
		name: "Secret",
		key: "keyword",
		blurb: `Hope you read the story! It's essential to progression... (Kartavya spent so much time on it)`,
		generator: defaultGen,
		solve(inp) {
			const key = "mikah"; // change
			let cipherAlphabet = key;
			for (const char of alpha) {
				if (!key.includes(char)) {
					cipherAlphabet += char;
				}
			}
			return fill(inp.length, i=>cipherAlphabet.charAt(charToNum[inp.charAt(i)])).join("");
		}
	},
	{
		// Atbash
		name: "bash",
		key: "shell",
		blurb: "Originally used to encrypt Hebrew...",
		generator: defaultGen,
		solve(inp) {
			return fill(inp.length, i=>numToChar[alphaLen-1-charToNum[inp.charAt(i)]]).join("");
		}
	},
	{
		// Base 13
		name: "Rot 13",
		key: "rot-13",
		blurb: "Definitely not rot-13. Don't even try!",
		generator: defaultGen,
		solve(inp) {
			let sum = 0;
			const base = 13;
			for (let i = inp.length-1; i >= 0; --i) {
				sum *= alphaLen;
				sum += charToNum[inp.charAt(i)];
			}

			const res: string[] = [];
			while (sum) {
				res.push(numToChar[sum % base]);
				sum = Math.floor(sum / base);
			}
			return res.reverse().join("");
		}
	},
	// Probably boring with normal plaintext
	// {
	// 	name: "Run Length Encoding",
	// 	blurb: ""
	// }
	{
		// Half interleave
		name: "Tricky transposition",
		key: "leaf",
		blurb: "Puzzle invented by ChatGPT. Can you solve it!?",
		generator: defaultGen,
		solve(inp) {
			return fill(inp.length, i=>inp.charAt(i % 2 == 0 ? Math.floor(i / 2) : 
				Math.floor(i / 2) + Math.floor((inp.length + 1) / 2))).join(""); // Start from halfway, rounded up if odd
		}
	},
	{
		// Vigenere
		name: "Secret 2",
		key: "vinegar",
		blurb: "Since you love secret keywords so much, here's another...",
		generator: defaultGen,
		solve(inp) {
			const key = "waas"; // change
			return fill(inp.length, i=>charAdd(inp.charAt(i), charToNum[key.charAt(i % key.length)])).join("");
		}
	},
	{
		// Alphabet Derangement
		name: "ABCs",
		key: "abcdfghijklmnopqrstuvwxyz",
		blurb: "aeHv fnu!",
		generator: defaultGen,
		solve(inp) {
			const seg: string[] = [];
			let res = "";
			for (const char of inp) {
				if (seg.length != 0 && charToNum[seg[seg.length-1]] > charToNum[char]) {
					res += `${shuffle(seg).join("")}x`;
					seg.length = 0;
				} 
				seg.push(char);
			}
			res += shuffle(seg).join("");
			return res;
		}
	}
] as const satisfies Puzzle[];
