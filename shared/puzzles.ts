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
		? string|bigint
		: (T[number]&{key: K})["type"] extends "string" ? string : bigint
}>;

type SimplePuzzle<T extends PuzzleInputSchema> = {
	kind: "simple",
	schema: T,
	validator?: (x: PuzzleInput<T>)=>string|null, // null for valid, otherwise error
	generator: (seed?: number)=>PuzzleInput<T>,
	solve: (x: PuzzleInput<T>)=>string|bigint
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
	if (/^[a-z]*$/.test(s)) return null;
	return "Plaintext should only consist of lowercase alphabetic characters.";
}

function deriveSeed(s: string) {
	return [...s].reduce((a,b)=>(a * 13 + charToNum[b]) % 1069,123);
}

// Adds ct to c[0], wrapping around both directions
// Skips space
function charAdd(c: string, ct: number) : string {
	if (c==" ") return c;
	const cc = (charToNum[c.charAt(0)] + ct % alphaLen + alphaLen) % alphaLen;
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
				return {
					x: BigInt(r.nextRange(-200,200)),
					y: BigInt(r.nextRange(-200,200))
				};
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
				return {
					x: BigInt(div*r.nextRange(0,200) + r.nextRange(0,div-1)),
					y: BigInt(div)
				};
			},
			solve(inp) {
				return inp.x/inp.y;
			},
			validator(inp) {
				return inp.x<0 || inp.y<1 ? "x should be nonnegative and y should be positive." : null;
			}
		})
	},
	{
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
		name: "Impact",
		key: "impact",
		generator: defaultGen,
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			const key = "wang";
			return fill(inp.length, i=>charAdd(
				inp.charAt(i), charToNum[key.charAt(i % key.length)]+i
			)).join("");
		}
	},
	{
		name: "Impact (x2)",
		key: "impact-x2",
		generator(seed?: number) {
			const rng = new RNG(seed);
			return fill(rng.nextRange(5,50), ()=>rng.nextRange(0,5)==0 ? "x" : rng.nextString(alpha, 1)).join("");
		},
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			const rng = new RNG(deriveSeed(inp));
			return inp.split("x").flatMap(s=>{
				let i = rng.nextRange(0,s.length);
				let j = rng.nextRange(0,s.length);
				if (j<i) [i,j] = [j,i];
				return [s.slice(0,i), s.slice(i,j), s.slice(j)];
			}).toReversed().join("x");
		}
	},
	{
		name: "ABCs",
		key: "abc",
		kind: "decode",
		generator(seed?: number) {
			const rng = new RNG(seed);
			return rng.nextString(alpha.filter(x=>x!="x"), rng.nextRange(5,50));
		},
		validator: s=>{
			if (/^[a-wy-z]*$/.test(s)) return null;
			return "Plaintext should only consist of lowercase alphabetic characters excluding x.";
		},
		encode(inp) {
			const rng = new RNG(deriveSeed(inp));
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
	},
	{
		name: "Arithmetic",
		key: "arithmetic",
		generator(seed?: number) {
			const rng = new RNG(seed);
			const l = rng.nextRange(5,50);
			const c = 1-1/rng.nextRange(1,10)
			let s = "";
			for (let i=0; i<l; i++) {
				if (rng.next()<c && s.length>1) {
					s+=numToChar[(2*charToNum[s[i-1]] + alphaLen - charToNum[s[i-2]])%alphaLen];
				} else {
					s+=rng.nextString(alpha,1);
				}
			}
			return s;
		},
		validator: defaultValidator,
		kind: "decode",
		encode(inp) {
			const rng = new RNG(deriveSeed(inp));

			let s = "", i=0;
			for (; i+1<inp.length; i++) {
				const j = i;
				const d = (charToNum[inp[j+1]] + alphaLen - charToNum[inp[j]])%alphaLen;
				while (i+1-j<alphaLen && i+1<inp.length && (charToNum[inp[i+1]] - charToNum[inp[i]] - d)%alphaLen == 0) {
					i++;
				}
				s+=numToChar[i-j]+numToChar[d]+charAdd(inp[j], -d);
			}

			if (i+1==inp.length) {
				const d = rng.nextRange(0,alphaLen-1);
				s+=numToChar[0]+numToChar[d]+charAdd(inp[i], -d);
			}

			return s;
		},
	},
	{
		name: "Rot 13",
		key: "rot-13",
		validator: defaultValidator,
		kind: "decode",
		generator: defaultGen,
		encode(inp) {
			let sum = 0n;
			const base = 13n;
			for (const c of inp) {
				sum *= BigInt(alphaLen+1);
				sum += BigInt(charToNum[c]+1);
			}

			const res: string[] = [];
			while (sum>0) {
				res.push(numToChar[Number(sum % base)]);
				sum /= base;
			}
			return res.reverse().join("");
		}
	},
	{
		name: "Taylor Series",
		key: "taylor-series",
		validator: defaultValidator,
		generator: defaultGen,
		kind: "decode",
		encode(inp) {
			let d = [...inp].map(x=>charToNum[x]);
			let s = "";
			while (d.length > 0) {
				s+=numToChar[d[0]];
				d = fill(d.length-1, i=>(d[i+1]+alphaLen-d[i])%alphaLen);
			}
			return s;
		}
	}
] as const satisfies PuzzleData[];
