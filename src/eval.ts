import { Puzzle } from "./puzzles";
import { fill } from "./ui";

export type Register = Readonly<({
	type: "value", value: number|string // initial values, determined by program state at runtime
} | {
	type: "param"
})&{
	name?: string
}>;

export type Procedure = Readonly<{
	name: string,
	// similarly, guaranteed to exist in node map
	nodeList: readonly number[],
	maxNode: number,
	// initial state of registers, which may be mapped to parameters
	// guaranteed to exist in register map
	registerList: readonly number[]
	maxRegister: number,

	registers: ReadonlyMap<number,Register>,
	nodes: ReadonlyMap<number,Node>
}>;

export type Node = Readonly<{
	op: "inc"|"dec", lhs: number
} | {
	op: "goto",
	conditional?: number, // if positive
	ref?: number|"unset" // undefined is return
} | {	
	op: "call",
	procRef: number,
	params: readonly number[] // maps to procedure params in order
} | {
	op: "add"|"sub"|"set"|"access",
	lhs: number, rhs: number // lhs +=,-=,= rhs, lhs = rhs[lhs]
} | {
	op: "setIdx", // lhs[idx] = rhs
	lhs: number, rhs: number, idx: number
}>;

export type RegisterRef = { current: number|string };


export type ProgramState<T=RegisterRef> = Readonly<{
	procs: ReadonlyMap<number, Procedure>, //ehhh
	outputRegister: T,
	stack: {
		proc: number,
		registers: ReadonlyMap<number,T>,
		i: number,
	}[];
}>;

export type EditorState = Readonly<{
	procs: ReadonlyMap<number, Procedure>,
	userProcList: number[],
	maxProc: number,

	entryProc: number,
	active: number,
	
	input: string,
	stepsPerS: number,

	puzzle?: Puzzle
}>;

export class InterpreterError extends Error {
	constructor(public value: {
		type: "badParam", nParam: number, nProvided: number
	} | { type: "noRegister"|"noNodeToGoto"|"noProcedure"|"stringTooLong"|"stackOverflow" }) {
		super("Error interpreting program");
	}
	
	txt() {
		switch (this.value.type) {
			case "badParam":
				return `Expected ${this.value.nParam} parameters, but got ${this.value.nProvided}`;
			case "noRegister":
				return "Register not found";
			case "noNodeToGoto":
				return "No node to go to";
			case "noProcedure":
				return "Procedure not found";
			case "stringTooLong":
				return "String too long";
			case "stackOverflow":
				return "Stack overflow";
			default:
				return "Unknown interpreter error";
		}
	}
}

// creates an non-runnable (register refs are broken) but accurate copy
export type RegisterRefClone = RegisterRef&{ mutable: RegisterRef };
export function clone(prog: ProgramState): ProgramState<RegisterRefClone> {
	return {
		...prog,
		outputRegister: {...prog.outputRegister, mutable: prog.outputRegister},
		stack: prog.stack.map(v=>({
			...v, registers: new Map(v.registers.entries().map(([k,v])=>[
				k, {...v, mutable: v}
			]))
		}))
	};
}

export function push(prog: ProgramState, procI: number, params: RegisterRef[]) {
	if (prog.stack.length>=stackLimit) throw new InterpreterError({type: "stackOverflow"});

	const proc = prog.procs.get(procI);
	if (!proc) throw new InterpreterError({ type: "noProcedure" });

	const needed = proc.registers.values().reduce((a,b)=>a+(b.type=="param" ? 1 : 0), 0);
	if (needed != params.length) {
		throw new InterpreterError({
			type: "badParam", nParam: needed, nProvided: params.length
		});
	}

	let paramI=0;
	prog.stack.push({
		proc: procI, i: 0,
		registers: new Map(proc.registerList.map((i): [number, RegisterRef]=>{
			const x = proc.registers.get(i);
			if (!x) throw new InterpreterError({ type: "noRegister"  });
			return x.type=="value" ? [i, {current: x.value}] : [i, params[paramI++]];
		}))
	});
}

const [charStart, charEnd] = ["a", "z"].map(x=>x.charCodeAt(0));
export const charMod = charEnd-charStart+2;
export const charMap = [
	[" ", 0],
	...fill(charEnd-charStart+1, i=>[String.fromCharCode(charStart+i), i+1])
] as [string, number][];
export const charToNum = Object.fromEntries(charMap);
export const numToChar = charMap.map(x=>x[0]);

export const stackLimit = 1024;
export const strLenLimit = 1024;
export const timeLimit = 64*stackLimit;

export function step(prog: ProgramState) {
	if (prog.stack.length==0) return false;

	const last = prog.stack[prog.stack.length-1];
	const lastProc = prog.procs.get(last.proc);
	if (!lastProc) throw new InterpreterError({ type: "noProcedure" });

	const nodeI = lastProc.nodeList[last.i];
	if (nodeI==undefined) {
		prog.stack.pop();
		return prog.stack.length>0;
	}
	
	const x = lastProc.nodes.get(nodeI);
	if (!x) throw new InterpreterError({ type: "noNodeToGoto" });

	const get = (r: number) => {
		const v = last.registers.get(r);
		if (!v) throw new InterpreterError({ type: "noRegister" })
		return v;
	};
	
	const castToNum = (r: number)=>{
		let v = get(r).current;
		if (typeof v=="string") v=v.length>0 ? charToNum[v]??0 : 0;
		return v;
	};

	const castToStr = (r: number)=>{
		let v = get(r).current;
		if (typeof v=="number") v=numToChar[v%charMod] ?? "";
		return v;
	};

	const compute = (op: "add"|"sub"|"set", l: RegisterRef, r: RegisterRef) => {
		const swap = typeof l=="number" && typeof r=="string";
		if (swap) [r,l]=[l,r];
		
		const mod = (a: number, b: number) => {
			if (op=="add") return a+b;
			else if (op=="sub") return a-b;
			return b;
		};

		let out: string|number;
		if (typeof l.current=="string" && typeof r.current=="number")	{
			out="";
			for (let i=0; i<l.current.length; i++) {
				out+=numToChar[
					(charMod+mod(charToNum[l.current[i]]??0, r.current)%charMod)%charMod
				];
			}
		} else if (typeof l.current=="string" && typeof r.current=="string") {
			out="";
			for (let i=0; i<Math.min(l.current.length, r.current.length); i++) {
				out+=numToChar[
					(charMod+mod(charToNum[l.current[i]]??0, charToNum[r.current[i]]??0)%charMod)%charMod
				];
			}
		} else if (typeof l.current=="number" && typeof r.current=="number") {
			out=mod(l.current, r.current);
		}	else {
			throw new Error("unreachable");
		}

		if (swap) r.current=out;
		else l.current=out;
	};

	const arrOp = (idx: number, lhs: number, rhs?: number) => {
		const l = get(lhs).current;
		const i = castToNum(idx);
		if (rhs==undefined) {
			get(lhs).current = typeof l=="string" ? (l.length>=i ? 0 : l[i]) : l;
		} else {
			const s = castToStr(rhs);
			let outS: string|null=null;
			if (typeof l=="string" && l.length>=i) {
				outS=[ ...l, fill(i-l.length, 0), s ].join("");
			} else if (typeof l=="string") {
				outS=`${l.slice(0,i)}${s}${l.slice(i+1)}`;
			} else {
				get(lhs).current = get(rhs).current;
			}
			
			if (outS!=null) {
				if (outS.length>strLenLimit) throw new InterpreterError({type: "stringTooLong"});
				get(lhs).current=outS;
			}
		}
	};

	let next = last.i+1;
	if (x.op=="add" || x.op=="sub" || x.op=="set") {
		compute(x.op, get(x.lhs), get(x.rhs));
	} else if (x.op=="inc" || x.op=="dec") {
		compute(x.op=="inc" ? "add" : "sub", get(x.lhs), { current: 1 });
	} else if (x.op=="access") {
		arrOp(x.lhs, x.rhs);
	} else if (x.op=="setIdx") {
		arrOp(x.idx, x.lhs, x.rhs);
	} else if (x.op=="call") {
		push(prog, x.procRef, x.params.map(v=>get(v)));
	} else if (x.op=="goto") {
		let to: number|undefined;
		if (x.ref==undefined) to=lastProc.nodeList.length;
		else to = lastProc.nodeList.indexOf(x.ref as number);

		if (to==-1 || to==undefined) throw new InterpreterError({ type: "noNodeToGoto" });

		if (x.conditional!=undefined) {
			const num = castToNum(x.conditional);
			if (num>0) next=to;
		} else {
			next=to;
		}
	}
	
	last.i = next;
	return true;
}

export type Verdict = { type: "RE"|"WA"|"AC"|"TLE" };

export function test({ input, output, proc, procs }: {
	input: string, output: string,
	proc: number, procs: ReadonlyMap<number,Procedure>
}): Verdict {
	const reg = {current: input};
	try {
		const pstate: ProgramState = { procs, outputRegister: reg, stack: [] };
		push(pstate, proc, [reg]);
		let count = timeLimit;
		while (step(pstate)) {
			if (--count<=0) return {type: "TLE"};
		}
		if (reg.current!=output) return {type: "WA"};
		return {type: "AC"};
	} catch (e) {
		if (e instanceof InterpreterError) return {type: "RE"};
		throw e;
	}
}
