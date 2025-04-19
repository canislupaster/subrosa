export type Register = Readonly<({
	type: "value", value: number|string // initial values, determined by program state at runtime
} | {
	type: "param"
} | {
	type: "placeholder"
})&{
	name?: string
}>;

export type Procedure = Readonly<{
	name: string,
	first?: Node,
	registers: Register[] // initial state of registers, which may be mapped to parameters
}>;

export type Node = Readonly<({
	op: "inc"|"dec", lhs: Register
} | {
	op: "goto",
	conditional?: Register, // if positive
	ref?: Node|"unset" // undefined is return
} | {	
	op: "call",
	ref: Procedure,
	params: readonly Register[] // maps to procedure params in order
} | {
	op: "add"|"sub"|"set",
	lhs: Register, rhs: Register // lhs +=,-=,= rhs
})&{
	next?: Node,
}>;

export type RegisterRef = { current: number|string };
export type ProgramState = Readonly<{
	stack: {
		proc: Procedure,
		node?: Node,
		registers: Map<Register,RegisterRef>
	}[];
}>;

export class InterpreterError extends Error {
	constructor(public value: {
		type: "badParam", nParam: number, nProvided: number
	} | {
		type: "noRegister", needed: Register
	} | {
		type: "noNodeToGoto"
	}) {
		super("Error interpreting program");
	}
}

export function push(prog: ProgramState, proc: Procedure, params: RegisterRef[]) {
	const needed = proc.registers.reduce((a,b)=>a+(b.type=="param" ? 1 : 0), 0);
	if (needed != params.length) {
		throw new InterpreterError({
			type: "badParam", nParam: needed, nProvided: params.length
		});
	}
	
	let paramI=0;
	if (proc.first) prog.stack.push({
		proc,
		node: proc.first,
		registers: new Map(proc.registers.map((x): [Register, RegisterRef]=>
			x.type=="value" ? [x, {current: x.value}] : [x, params[paramI++]]
		))
	});
}

export function step(prog: ProgramState) {
	if (prog.stack.length==0) return false;
	const last = prog.stack[prog.stack.length-1];
	const x = last.node;
	if (x==undefined) {
		prog.stack.pop();
		return true;
	}

	const get = (r: Register) => {
		const v = last.registers.get(r);
		if (!v) {
			throw new InterpreterError({ type: "noRegister", needed: r })
		}

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

	let next = x.next;
	if (x.op=="add" || x.op=="sub" || x.op=="set") {
		compute(x.op, get(x.lhs), get(x.rhs));
	} else if (x.op=="inc" || x.op=="dec") {
		compute(x.op=="inc" ? "add" : "sub", get(x.lhs), { current: 1 });
	} else if (x.op=="call") {
		push(prog, x.ref, x.params.map(v=>get(v)));
	} else if (x.op=="goto") {
		if (x.ref=="unset") throw new InterpreterError({ type: "noNodeToGoto" });

		if (x.conditional) {
			const c = get(x.conditional);
			if (typeof c.current=="string" && c.current.length>0) {
				const v = c.current.charCodeAt(0);
				if (v!=0 && (v&32768) == 0) next=x.ref;
			} else if (typeof c.current=="number" && c.current>0) {
				next=x.ref;
			}
		} else {
			next=x.ref;
		}
	}
	
	last.node = next;

	return true;
}
