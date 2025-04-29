import { data, StageData } from "./data.ts";
import { Puzzle } from "./puzzles.ts";
import { fill, stringifyExtra } from "./util.ts";

export type Register = Readonly<({
	type: "value", value: number|string // initial values, determined by program state at runtime
} | {
	type: "param"
})&{
	name: string|null
}>;

export type WritableProcedure = {
	name: string,
	// similarly, guaranteed to exist in node map
	nodeList: number[],
	maxNode: number,
	// initial state of registers, which may be mapped to parameters
	// guaranteed to exist in register map
	registerList: number[]
	maxRegister: number,
	
	comment?: string,

	registers: Map<number,Register>,
	nodes: Map<number,Node>
};

export type Procedure = Readonly<WritableProcedure&{
	nodeList: readonly number[],
	registerList: readonly number[],
	registers: ReadonlyMap<number,Register>,
	nodes: ReadonlyMap<number,Node>
}>;

export type Node = Readonly<{
	op: "inc"|"dec", lhs: number
} | {
	op: "goto",
	conditional: number|null, // if positive
	ref: number|"unset"|"end" // undefined is return
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
} | {
	op: "breakpoint",
	conditional: number|null // if positive
}>;

export type RegisterRef = { current: number|string };

export type ProgramStats = {
	// measures exclude breakpoint nodes
	// raw # nodes processed
	time: number,
	// distinct # nodes processed
	nodes: number,
	registers: number
};

export type ProgramState = {
	procs: ReadonlyMap<number, Procedure>, //ehhh
	outputRegister: RegisterRef,
	stopOnBreakpoint: boolean,
	visitedNodes: Map<number,Set<number>>,
	activeRegisters: Set<RegisterRef>,
	stats: ProgramStats,
	stack: {
		proc: number,
		registers: ReadonlyMap<number,RegisterRef>,
		i: number
	}[];
};

export const makeProc = (name: string): Procedure => ({
	name, registerList: [], registers: new Map(),
	nodeList: [], nodes: new Map(), maxNode: 0, maxRegister: 0,
});

export function makeState({input, procs, entry, stopOnBreakpoint}: {
	input: readonly (string|number)[],
	procs: ReadonlyMap<number, Procedure>,
	entry: number,
	stopOnBreakpoint?: boolean
}): ProgramState {
	const pstate: ProgramState = {
		procs, outputRegister: {current: input[0]}, stack: [],
		visitedNodes: new Map(), activeRegisters: new Set(),
		stats: { nodes: 0, time: 0, registers: 0 },
		stopOnBreakpoint: stopOnBreakpoint==true
	};

	push(pstate, entry, [pstate.outputRegister, ...input.slice(1).map(v=>({current: v}))]);
	return pstate;
}

export type EditorState = Readonly<{
	procs: ReadonlyMap<number, Procedure>,
	undoHistory: readonly (readonly [number, Procedure])[],
	curNumUndo: number,
	userProcList: number[],
	maxProc: number,
	entryProc: number,
	stepsPerS: number,
	solved: boolean
}>;

export function makeEntryProc(puzzle: Puzzle): Procedure {
	const regs = fill(puzzle.kind=="decode" ? 1 : puzzle.schema.length, i=>{
		const inpName = puzzle.kind=="decode" ? "Input" : puzzle.schema[i].name;
		return [i, {
			name: i==0 ? `${inpName} and output` : inpName,
			type: "param"
		} satisfies Register] as const;
	});

	return {
		...makeProc("Main"),
		registerList: regs.map(([i])=>i),
		registers: new Map(regs),
		maxRegister: regs.length
	};
}

export type NodeSelection = Readonly<{
	nodes: Node[],
	registers: Register[],
	procRegisters: ReadonlyMap<number, number[]>
}>;

function remapNodes(
	nodes: Node[], getReg: (reg: number)=>number,
	getNode: (node: number)=>number|null
) {
	return nodes.map((x): Node => {
		if (x.op=="call") return { ...x, params: x.params.map(getReg) };
		else if (x.op=="goto") return {
			...x, conditional: x.conditional==null ? null : getReg(x.conditional),
			ref: typeof x.ref=="number" ? getNode(x.ref)??"unset" : x.ref
		};
		else if (x.op=="inc" || x.op=="dec") return { ...x, lhs: getReg(x.lhs) };
		else if (x.op=="add" || x.op=="sub" || x.op=="access" || x.op=="set") return {
			...x, lhs: getReg(x.lhs), rhs: getReg(x.rhs)
		};
		else if (x.op=="setIdx") return {
			...x, lhs: getReg(x.lhs), rhs: getReg(x.rhs), idx: getReg(x.idx)
		};
		else if (x.op=="breakpoint") return {
			...x, conditional: x.conditional==null ? null : getReg(x.conditional)
		}
		return x.op; // never
	});
}
	
export function toSelection(procI: number, proc: Procedure, nodes: number[]): NodeSelection {
	const regKeys = ["lhs", "rhs", "idx", "conditional"] as const;

	const regsUsed = new Set(nodes.flatMap(node=>{
		const x = proc.nodes.get(node)!;
		if (x.op=="call") return x.params;
		const x2 = x as Partial<Record<(typeof regKeys)[number], number>>;
		return regKeys.flatMap(k=>k in x2 && x2[k]!=null ? [x2[k]] : []);
	}));
	
	const newRegList = proc.registerList
		.filter(reg=>regsUsed.has(reg))
		.map(reg=>[reg, proc.registers.get(reg)!] as const);

	const newRegMap = new Map(newRegList.map(([v],i)=>[v,i]));
	const nodeMap = new Map(nodes.map((v,i)=>[v,i]));

	return {
		nodes: remapNodes(nodes.map(i=>proc.nodes.get(i)!), x=>newRegMap.get(x)!, x=>nodeMap.get(x)??null),
		registers: newRegList.map(([,b])=>b),
		procRegisters: new Map([ [ procI, newRegList.map(([a])=>a) ] ])
	};
}

export function fromSelection(
	sel: NodeSelection, remapNode: number[], remapRegister: number[]
): [number, Node][] {
	return remapNodes(sel.nodes, x=>remapRegister[x], x=>remapNode[x])
		.map((x,i)=>[remapNode[i], x]);
}

export class InterpreterError extends Error {
	constructor(public value: {
		type: "badParam", nParam: number, nProvided: number
	} | { type: "noRegister"|"noNodeToGoto"|"noProcedure"|"stringTooLong"|"stackOverflow" }) {
		super("Error interpreting program");
	}
	
	txt() {
		switch (this.value.type) {
			case "badParam":
				return `Expected at least ${this.value.nParam} parameters, but only ${this.value.nProvided} provided`;
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
export type RegisterRefClone = Readonly<RegisterRef>&{ mutable: RegisterRef };
export function clone(prog: ProgramState) {
	return {
		...prog,
		procs: undefined, visitedNodes: undefined, activeRegisters: undefined,
		stats: { ...prog.stats },
		outputRegister: {...prog.outputRegister, mutable: prog.outputRegister},
		stack: prog.stack.map(v=>({
			...v, registers: new Map([...v.registers.entries()].map(([k,v])=>[
				k, {...v, mutable: v}
			]))
		}))
	} as const;
}

export function push(prog: ProgramState, procI: number, params: RegisterRef[]) {
	if (prog.stack.length>=stackLimit) throw new InterpreterError({type: "stackOverflow"});

	const proc = prog.procs.get(procI);
	if (!proc) throw new InterpreterError({ type: "noProcedure" });

	const needed = [...proc.registers.values()].reduce((a,b)=>a+(b.type=="param" ? 1 : 0), 0);
	if (needed > params.length) {
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
export const charMod = charEnd-charStart+1;
export const charMap = [
	[" ", -1],
	...fill(charEnd-charStart+1, i=>[String.fromCharCode(charStart+i), i])
] as [string, number][];
export const charToNum = Object.fromEntries(charMap);
export const numToChar = Object.fromEntries(charMap.map(([a,b])=>[b,a])) as Record<number,string>;

const stackLimit = 1024;
export const strLenLimit = 1024;
const timeLimit = 64*stackLimit;

export function step(prog: ProgramState): "breakpoint"|boolean {
	if (prog.stack.length==0) return false;

	const last = prog.stack[prog.stack.length-1];
	const lastProc = prog.procs.get(last.proc);
	if (!lastProc) throw new InterpreterError({ type: "noProcedure" });

	const nodeI = lastProc.nodeList[last.i];
	if (nodeI==undefined) {
		if (prog.stack.length<=1) return false;

		for (const i of lastProc.registerList) {
			const r = lastProc.registers.get(i);
			const r2 = last.registers.get(i);
			if (r && r2 && r.type!="param") {
				prog.activeRegisters.delete(r2);
			}
		}

		prog.stack.pop();
		// increment to next node after call in previous frame
		// `i` should always track active node (either going to be evaluated
		// or caller waiting for procs to return)
		prog.stack[prog.stack.length-1].i++;
		return true;
	}
	
	const x = lastProc.nodes.get(nodeI);
	if (!x) throw new InterpreterError({ type: "noNodeToGoto" });
	if (x.op!="breakpoint") {
		prog.stats.time++;

		// ik this is inflated but its kind of more economical structure
		// i dont know why i did that
		const oldVis = prog.visitedNodes.get(last.proc);
		if (oldVis) {
			if (!oldVis.has(nodeI)) {
				oldVis.add(nodeI);
				prog.stats.nodes++; 
			}
		} else {
			prog.visitedNodes.set(last.proc, new Set([nodeI]));
			prog.stats.nodes++;
		}
	}
	
	const get = (r: number) => {
		const v = last.registers.get(r);
		if (!v) throw new InterpreterError({ type: "noRegister" })

		if (!prog.activeRegisters.has(v)) {
			prog.activeRegisters.add(v);
			if (prog.activeRegisters.size>prog.stats.registers) {
				prog.stats.registers = prog.activeRegisters.size;
			}
		}

		return v;
	};
	
	const castToNum = (r: number)=>{
		let v = get(r).current;
		if (typeof v=="string") v=v.length>0 ? charToNum[v]??-1 : 0;
		return v;
	};

	const castToStr = (r: number)=>{
		let v = get(r).current;
		if (typeof v=="number") v=numToChar[v%charMod] ?? "";
		return v;
	};
	
	const compute = (op: "add"|"sub", l: RegisterRef, r: RegisterRef) => {
		const swap = typeof l.current=="number" && typeof r.current=="string";
		if (swap) [r,l]=[l,r];
		
		const mod = (a: number, b: number) => {
			// truncate to 32 bit signed (no infinities)
			if (op=="add") return (a+b)|0;
			return (a-b)|0;
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
			out=l.current+r.current;
		} else if (typeof l.current=="number" && typeof r.current=="number") {
			out=mod(l.current, r.current);
		}	else {
			throw new Error("unreachable");
		}

		if (typeof out=="string") out=out.trimEnd();
		if (swap) r.current=out; else l.current=out;
	};

	const arrOp = (idx: number, lhs: number, rhs?: number) => {
		const l = get(lhs).current;
		const i = castToNum(idx);
		if (i<0) return;

		if (rhs==undefined) {
			get(idx).current = typeof l=="string" ? (i>=l.length ? -1 : charToNum[l[i]] ?? -1) : l;
		} else {
			const s = castToStr(rhs);
			let outS: string|null=null;
			if (typeof l=="string" && i>=l.length) {
				outS=[ ...l, " ".repeat(i-l.length), s ].join("");
			} else if (typeof l=="string") {
				outS=`${l.slice(0,i)}${s}${l.slice(i+1)}`;
			} else {
				get(lhs).current = get(rhs).current;
			}
			
			if (outS!=null) {
				if (outS.length>strLenLimit) throw new InterpreterError({type: "stringTooLong"});
				get(lhs).current=outS.trimEnd();
			}
		}
	};

	let next = last.i+1;
	if (x.op=="breakpoint" && prog.stopOnBreakpoint
		&& (x.conditional==null || castToNum(x.conditional)>0)) {

		return "breakpoint";
	} else if (x.op=="set") {
		get(x.lhs).current = get(x.rhs).current;
	} else if (x.op=="add" || x.op=="sub") {
		compute(x.op, get(x.lhs), get(x.rhs));
	} else if (x.op=="inc" || x.op=="dec") {
		compute(x.op=="inc" ? "add" : "sub", get(x.lhs), { current: 1 });
	} else if (x.op=="access") {
		arrOp(x.lhs, x.rhs);
	} else if (x.op=="setIdx") {
		arrOp(x.idx, x.lhs, x.rhs);
	} else if (x.op=="call") {
		push(prog, x.procRef, x.params.map(v=>get(v)));
		next=last.i; // increment on pop frame to record current node accurately
	} else if (x.op=="goto") {
		let to: number|undefined;
		if (x.ref=="end") to=lastProc.nodeList.length;
		// 🤡 do i optimize? everything is so slow
		else if (x.ref!="unset") to = lastProc.nodeList.indexOf(x.ref);

		if (to==-1 || to==undefined) throw new InterpreterError({ type: "noNodeToGoto" });

		if (x.conditional==null || castToNum(x.conditional)>0) {
			next=to;
		}
	}
	
	last.i = next;
	return true;
}

export type Verdict = Readonly<{
	type: "RE"|"WA"|"AC"|"TLE",
}&ProgramStats>;

export type TestParams = {
	puzzle: string, proc: number,
	procs: ReadonlyMap<number,Procedure>
};

// puzzle assumed to be valid key of puzzle stage
const numTests = 15;
export async function test({ puzzle, proc, procs }: TestParams): Promise<Verdict> {
	const pstateStats: ProgramStats[] = [];

	// median
	const getStats = ()=>{
		const out: ProgramStats = {nodes: 0, registers: 0, time: 0};

		if (pstateStats.length>0) {
			for (const k of ["nodes", "registers", "time"] as const) {
				pstateStats.sort((a,b)=>a[k]-b[k]);
				out[k] = Math.ceil((
					pstateStats[Math.floor(pstateStats.length/2)][k]
					+ pstateStats[Math.floor((pstateStats.length-1)/2)][k]
				)/2);
			}
		}

		return out;
	};

	try {
		// lmao now its deterministic, but supposedly impossible to game
		// (u cant succeed on client and fail on server)
		let seed = Number(new BigUint64Array(
			(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(
				stringifyExtra({ proc, procs })
			))).slice(0,8)
		)[0] % BigInt(Number.MAX_SAFE_INTEGER));

		for (let i=0; i<numTests; i++) {
			const stage = data.find(x=>x.key==puzzle) as StageData&{type: "puzzle"};

			let input: (string|number)[];
			let output: string|number;
			if (stage.kind=="decode") {
				const plaintxt = stage.generator(seed++);
				input = [stage.encode(plaintxt)];
				output = plaintxt;
			} else {
				const obj = stage.generator(seed++);
				input = stage.schema.map(v=>obj[v.key]);
				output = stage.solve(obj);
			}

			const pstate = makeState({ input, procs, entry: proc });
			pstateStats.push(pstate.stats);

			while (step(pstate)==true) {
				if (pstate.stats.time >= timeLimit) return {type: "TLE", ...getStats()};
			}

			if (pstate.outputRegister.current!=output) return {type: "WA", ...getStats()};
		}

		return {type: "AC", ...getStats()};
	} catch (e) {
		if (e instanceof InterpreterError) return {type: "RE", ...getStats()};
		throw e;
	}
}
