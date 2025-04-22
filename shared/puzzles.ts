import { charToNum, numToChar } from "./eval.ts";
import { fill } from "./util.ts";

export type Puzzle = {
	name: string,
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
export const defaultGen = ()=>randString(alpha, defaultGenLen); // Don't generate spaces

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
		name: "Decrypting your password.",
		key: "salad",
		generator: defaultGen,
		solve(inp) {
			const key: number = 2;
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), key)).join("");
		}
	},
	{
		// Reverse
		name: "How much do they pay me, exactly?",
		key: "elzzup",
		generator: defaultGen,
		solve(inp) {
			return inp.split("").reverse().join("");
		}
	},
	{
		// Incremental Caesar
		name: "Team Puzzles are Just the Thing You Need.",
		key: "olive-oil",
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
		name: "You gotta work for your promotions.",
		key: "implementation-challenge",
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
		name: "Can you handle the truth?",
		key: "keyword",
		generator: defaultGen,
		solve(inp) {
			const key = "mikah"; // change
			let cipherAlphabet = "";
			for (const char of key) {
				if (!cipherAlphabet.includes(char)) {
					cipherAlphabet += char;
				}
			}
			for (const char of alpha) {
				if (!cipherAlphabet.includes(char)) {
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
		generator: defaultGen,
		solve(inp) {
			return fill(inp.length, i=>numToChar[alphaLen-1-charToNum[inp.charAt(i)]]).join("");
		}
	},
	{
		// Base 13
		name: "Rot 13",
		key: "rot-13",
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
