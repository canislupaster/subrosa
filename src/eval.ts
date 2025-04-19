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
	nodeList: number[],
	// initial state of registers, which may be mapped to parameters
	// guaranteed to exist in register map
	registerList: number[]

	registers: Readonly<Map<number,Register>>,
	nodes: Readonly<Map<number,Node>>
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
	lhs: number, rhs: number // lhs +=,-=,= rhs, lhs[rhs]
} | {
	op: "setIdx",
	lhs: number, rhs: number, idx: number
}>;

export type RegisterRef = { current: number|string };

export type Procedures = Readonly<{
	userProc: Map<number, Procedure>,
	mainProc: Procedure
}>;

export type ProgramState = Readonly<{
	procs: Procedures,
	stack: {
		proc: Procedure,
		toList: Map<number, number>,
		i: number,
		registers: Map<number,RegisterRef>
	}[];
}>;

export class InterpreterError extends Error {
	constructor(public value: {
		type: "badParam", nParam: number, nProvided: number
	} | { type: "noRegister"|"noNodeToGoto"|"noProcedure" }) {
		super("Error interpreting program");
	}
}

export function push(prog: ProgramState, proc: Procedure, params: RegisterRef[]) {
	const needed = proc.registers.values().reduce((a,b)=>a+(b.type=="param" ? 1 : 0), 0);
	if (needed != params.length) {
		throw new InterpreterError({
			type: "badParam", nParam: needed, nProvided: params.length
		});
	}
	
	const toList = new Map<number,number>();
	for (const [v,i] of proc.nodeList.map((v,i)=>[v,i])) {
		toList.set(v, i);
	}

	let paramI=0;
	prog.stack.push({
		proc, toList, i: 0,
		registers: new Map(proc.registerList.map((i): [number, RegisterRef]=>{
			const x = proc.registers.get(i);
			if (!x) throw new InterpreterError({ type: "noRegister"  });
			return x.type=="value" ? [i, {current: x.value}] : [i, params[paramI++]];
		}))
	});
}

export function step(prog: ProgramState) {
	if (prog.stack.length==0) return false;
	const last = prog.stack[prog.stack.length-1];
	const nodeI = last.proc.nodeList[last.i];
	if (nodeI==undefined) {
		prog.stack.pop();
		return true;
	}
	
	const x = last.proc.nodes.get(nodeI);
	if (!x) throw new InterpreterError({ type: "noNodeToGoto" });

	const get = (r: number) => {
		const v = last.registers.get(r);
		if (!v) throw new InterpreterError({ type: "noRegister" })
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
				out+=String.fromCharCode(mod(l.current.charCodeAt(i), r.current));
			}
		} else if (typeof l.current=="string" && typeof r.current=="string") {
			out="";
			for (let i=0; i<Math.min(l.current.length, r.current.length); i++) {
				out+=String.fromCharCode(mod(l.current.charCodeAt(i), r.current.charCodeAt(i)));
			}
		} else if (typeof l.current=="number" && typeof r.current=="number") {
			out=mod(l.current, r.current);
		}	else {
			throw new Error("unreachable");
		}

		if (swap) r.current=out;
		else l.current=out;
	};

	let next = last.i+1;
	if (x.op=="add" || x.op=="sub" || x.op=="set") {
		compute(x.op, get(x.lhs), get(x.rhs));
	} else if (x.op=="inc" || x.op=="dec") {
		compute(x.op=="inc" ? "add" : "sub", get(x.lhs), { current: 1 });
	} else if (x.op=="call") {
		const v = prog.procs.userProc.get(x.procRef);
		if (!v) throw new InterpreterError({ type: "noProcedure" });
		push(prog, v, x.params.map(v=>get(v)));
	} else if (x.op=="goto") {
		const to = last.toList.get(x.ref as number);
		if (!to) throw new InterpreterError({ type: "noNodeToGoto" });

		if (x.conditional) {
			const c = get(x.conditional);
			if (typeof c.current=="string" && c.current.length>0) {
				const v = c.current.charCodeAt(0);
				if (v!=0 && (v&32768) == 0) next=to;
			} else if (typeof c.current=="number" && c.current>0) {
				next=to;
			}
		} else {
			next=to;
		}
	}
	
	last.i = next;
	return true;
}
