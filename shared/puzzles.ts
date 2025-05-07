import { charToNum, numToChar } from "./eval.ts";
import { fill } from "./util.ts";

// https://github.com/bryc/code/blob/master/jshash/PRNGs.md
export class RNG {
	constructor(public a: number = Date.now()+Math.random()) { }
	// splitmix32
	next() {
		this.a |= 0; this.a = this.a + 0x9e3779b9 | 0;
		let t = this.a ^ this.a >>> 16; t = Math.imul(t, 0x21f0aaad);
				t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
		return (t = t ^ t >>> 15) >>> 0;
	}
	nextRange(min: number, max: number) {
		return min + (this.next()%(max - min + 1));
	}
	nextString(chars: string[], len: number) {
		return fill(len, ()=>chars[this.nextRange(0,chars.length-1)]).join("");
	}
	shuffle<T>(s: readonly T[]): T[] {
		const ns = [...s];
		for (let i = s.length-1; i >= 0; --i) {
			const ri = this.nextRange(0, i);
			[ns[i], ns[ri]] = [ns[ri], ns[i]];
		}
		return ns;
	}
}

// puzzle task is solve(generator) -> generated value
export type PuzzleInputSchema = readonly Readonly<{type: "number"|"string", name: string, key: string}>[];
export type PuzzleInput<T extends PuzzleInputSchema> = Readonly<{
	[K in T[number]["key"]]: "number"|"string" extends (T[number]&{key: K})["type"]
		? string|number
		: (T[number]&{key: K})["type"] extends "string" ? string : number
}>;

type SimplePuzzle<T extends PuzzleInputSchema> = {
	kind: "simple",
	schema: T,
	validator?: (x: PuzzleInput<T>)=>string|null, // null for valid, otherwise error
	generator: (seed?: number)=>PuzzleInput<T>,
	solve: (x: PuzzleInput<T>)=>string|number
};

export type PuzzleData = {
	name: string,
	key: string
}&({
	kind: "decode",
	generator: (seed?: number)=>string, // generate an input
	validator: (x: string)=>string|null, // null for valid, otherwise error
	encode: (inp: string)=>string, // encrypt an input
}|SimplePuzzle<PuzzleInputSchema>);
	
// Default generator

const alphaLen: number = 26;
// abcdefghijklmnopqrstuvwxyz
export const alpha = fill(alphaLen, i=>String.fromCharCode("a".charCodeAt(0) + i)); 
// const alpha = charMap.map(x=>x[0]);
// Uniform random int
function defaultGen(seed?: number) {
	const rng = new RNG(seed);
	return rng.nextString(alpha, rng.nextRange(5,50));
}

function defaultValidator(s: string) {
	if (/^[a-z]+$/.test(s)) return null;
	return "Plaintext should only consist of lowercase alphabetic characters.";
}

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

// relaxes puzzle by making validator/solve accept arbitrary records...
function simple<T extends PuzzleInputSchema>(t: T, x: Omit<SimplePuzzle<T>, "schema"|"kind">): SimplePuzzle<PuzzleInputSchema> {
	return {schema: t, kind: "simple", ...x} as const as unknown as SimplePuzzle<PuzzleInputSchema>;
}

export const puzzles = [
	{
		name: "Addition",
		key: "add",
		...simple([
			{type: "number", name: "x", key: "x"},
			{type: "number", name: "y", key: "y"}
		] as const, {
			generator(seed) {
				const r = new RNG(seed);
				return { x: r.nextRange(-200,200), y: r.nextRange(-200,200) };
			},
			solve(inp) {
				return inp.x+inp.y;
			},
			validator() {
				return null;
			}
		})
	},
	{
		name: "Division",
		key: "div",
		...simple([
			{type: "number", name: "x", key: "x"},
			{type: "number", name: "y", key: "y"}
		] as const, {
			generator(seed) {
				const r = new RNG(seed);
				const div = r.nextRange(1,200);
				return { x: div*r.nextRange(0,200) + r.nextRange(0,div-1), y: div };
			},
			solve(inp) {
				return Math.floor(inp.x/inp.y);
			},
			validator(inp) {
				return inp.x<0 || inp.y<1 ? "x should be nonnegative and y should be positive." : null;
			}
		})
	},
	{
		// Reverse
		name: "Reverse",
		key: "reverse",
		...simple([
			{type: "string", name: "Input", key: "input"}
		] as const, {
			generator: (seed)=>({ input: defaultGen(seed) }),
			solve: (inp)=>[...inp.input].reverse().join("")
		})
	},
	{
		name: "Next permutation",
		key: "permutation",
		...simple([
			{type: "string", name: "Input permutation", key: "input"}
		] as const, {
			generator(seed) {
				const r = new RNG(seed), vs=alpha.slice(0, r.nextRange(2,alpha.length));
				return { input: r.shuffle(vs).join("") };
			},
			solve({input: s}) {
				let i=s.length-1;
				while (i>0 && s[i-1]>s[i]) i--;

				const nxt = [...s];
				if (i>0) {
					let j=s.length-1;
					while (j>i && s[j]<s[i-1]) j--;
					[nxt[i-1], nxt[j]] = [s[j], s[i-1]];
				}
				
				return [...nxt.slice(0,i), ...nxt.slice(i).reverse()].join("");
			},
			validator({input}) {
				const sl = new Set(input);
				if (sl.size!=input.length) return "Input permutation must contain distinct values.";
				if (sl.size<1) return "Input permutation must be nonempty";
				return null;
			}
		})
	},
	{
		// Caesar
		name: "Decrypting your password.",
		key: "salad",
		generator: defaultGen,
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			const key: number = 2;
			const len: number = inp.length;
			return fill(len, i=>charAdd(inp.charAt(i), key)).join("");
		}
	},
	{
		// Atbash
		name: "bash",
		key: "shell",
		generator: defaultGen,
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			return fill(inp.length, i=>numToChar[alphaLen-1-charToNum[inp.charAt(i)]]).join("");
		}
	},
	{
		// Incremental Caesar
		name: "UHhh",
		key: "olive-oil",
		generator: defaultGen,
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
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
		// Vigenere
		name: "Secret 2",
		key: "vinegar",
		generator: defaultGen,
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			const key = "waas"; // change
			return fill(inp.length, i=>charAdd(inp.charAt(i), charToNum[key.charAt(i % key.length)])).join("");
		}
	},
	{
		// Segment Reverse
		name: "You gotta work for your promotions.",
		key: "implementation-challenge",
		validator: defaultValidator,
		kind: "decode",
		generator(seed?: number) {
			const rng = new RNG(seed);
			return fill(rng.nextRange(5,50), ()=>(rng.nextRange(0,9)>=8 ? "x" : rng.nextString(alpha, 1))).join("");
		},
		encode(inp) {
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
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			inp=[...inp].filter(x=>x!=" ").join("");

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

			const reverseCipher = fill(cipherAlphabet.length, i=>numToChar[cipherAlphabet.indexOf(numToChar[i])]).join("");
			return fill(inp.length, i=>reverseCipher[charToNum[inp[i]]]).join("");
		}
	},
	{
		// Base 13
		name: "Rot 13",
		key: "rot-13",
		validator: defaultValidator,
		kind: "decode",
		generator: (seed?: number)=>{
			const r = new RNG(seed);
			return r.nextString(alpha, r.nextRange(7,10));
		},
		encode(inp) {
			let sum = 0;
			const base = 13;
			for (let i = inp.length-1; i >= 0; --i) {
				sum *= alphaLen+1;
				sum += charToNum[inp.charAt(i)]+1;
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
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			return fill(inp.length, i=>inp.charAt(i % 2 == 0 ? Math.floor(i / 2) : 
				Math.floor(i / 2) + Math.floor((inp.length + 1) / 2))).join(""); // Start from halfway, rounded up if odd
		}
	},
	{
		// Alphabet Derangement
		name: "ABCs",
		key: "abcdefghijklmnopqrstuvwxyz",
		kind: "decode",
		generator(seed?: number) {
			const rng = new RNG(seed);
			return rng.nextString(alpha.filter(x=>x!="x"), rng.nextRange(5,50));
		},
		validator: s=>{
			if (![...s].some(x=>x=="x" || !alpha.includes(x))) return null;
			return "Plaintext should only consist of lowercase alphabetic characters, excluding x.";
		},
		encode(inp) {
			const rng = new RNG(123); // fixed seed
			const seg: string[] = [];
			let res = "";
			for (const char of inp) {
				if (seg.length != 0 && charToNum[seg[seg.length-1]] > charToNum[char]) {
					res += `${rng.shuffle(seg).join("")}x`;
					seg.length = 0;
				} 
				seg.push(char);
			}
			res += rng.shuffle(seg).join("");
			return res;
		}
	}
] as const satisfies PuzzleData[];
