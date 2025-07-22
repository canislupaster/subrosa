import { EditorState, makeProc, Node, Procedure, Register, WritableProcedure } from "./eval.ts";

function quote(x: string) {
	return `"${x.replaceAll("\n", "\\n").replaceAll(`"`, `\\"`)}"`;
}

export function toText({procs, entry}: {
	procs: ReadonlyMap<number,Procedure>, entry: number
}) {
	const names = new Set<string>();
	const procToName = new Map<number, string>();

	const chooseName = (x: string)=>{
		let i=1, v=x;
		while (names.has(v)) v=`${x}${++i}`;
		names.add(v);
		return v;
	};
	
	let out = ``;
	const write = (i: number): string => {
		const p = procs.get(i);
		if (!p) return "unknown";

		const existing = procToName.get(i);
		if (existing!=undefined) return existing;

		const name = quote(chooseName(p.name));
		procToName.set(i, name);

		const inner: string[] = [];

		const regNames = new Map(p.registerList.map((x,i)=>{
			const reg = p.registers.get(x)!;
			const regName = chooseName(reg.name ?? `reg${i}`);

			inner.push(`\t${reg.type=="value" ? "register" : "parameter"} ${quote(regName)}${
				reg.type=="value" ? ` = ${typeof reg.value=="string" ? quote(reg.value) : reg.value}` : ""}`);

			return [x, regName];
		}));
		
		regNames.values().forEach(x=>names.delete(x));

		if (regNames.size>0) inner.push(""); // blank line
		
		const nodeI = new Map(p.nodeList.map((x,i)=>[x,i+1]));
		const get = (reg: number)=>{
			const v = regNames.get(reg);
			return v==undefined ? "unknown" : quote(v);
		};

		for (const [x, i] of p.nodeList.map((i,j)=>[p.nodes.get(i)!, j] as const)) {
			inner.push(`${i+1}\t${
				((x.op=="goto" ? [
					"goto",
					typeof x.ref=="number" ? nodeI.get(x.ref)?.toString() ?? "unknown" : x.ref,
					...x.conditional!=null ? [get(x.conditional)] : []
				]
				: x.op=="add" || x.op=="sub" || x.op=="access" || x.op=="set" ? [x.op, get(x.lhs), get(x.rhs)]
				: x.op=="inc" || x.op=="dec" ? [x.op, get(x.lhs)]
				: x.op=="setIdx" ? ["set_idx", get(x.lhs), get(x.idx), get(x.rhs)]
				: x.op=="breakpoint" ? ["breakpoint", ...x.conditional!=null ? [get(x.conditional)] : []]
				: x.op=="call" ? ["call", write(x.procRef), ...x.params.map(get)]
				: []) satisfies string[]).join(" ")
			}`);
		}

		out += `${i==entry ? "mainproc" : "proc"} ${name} {\n`
		if (p.comment!=undefined) out+=`\t// ${p.comment.replaceAll("\n", "\n\t// ")}\n`;

		out += inner.map(x=>`${x}\n`).join("");
		out += "}\n\n";
		
		return name;
	};
	
	write(entry);
	return out;
}

class TextParseError extends Error {
	constructor(what: string, public pos: { line: number, col: number }|null=null) {
		super(pos!=null ? `${what} (line ${pos.line}, col ${pos.col})` : what);
	}
}

function fromTextErr(txt: string, maxProc: number): {
	procs: Map<number, Procedure>, entry: number|null,
	maxProc: number, procList: number[]
} {
	const toks: Readonly<{
		type: "register", register: Register&{name: string}
	}|{
		type: "goto", num: number|"unset"|"end", cond: string|null
	}|{
		type: "op", op: Exclude<Node["op"], "goto">, params: (string|null)[]
	}|{
		type: "def", name: string, main: boolean
	}|{
		type: "comment", txt: string
	}|{
		type: "endDef"
	}>[] = [];
	
	let lineI=0;
	for (let line of txt.split("\n")) {
		lineI++;
		const len = line.length;

		line = line.trimStart();
		const peek = (x: string)=>line.startsWith(x);
		const take = (x: string)=>{
			if (peek(x)) { line=line.slice(x.length); return true; }
			return false;
		};
		const err = (what: string): never=>{
			throw new TextParseError(what, {line: lineI, col: len-line.length+1});
		};
		const takeErr = (x: string)=>{
			if (!take(x)) err(`expected ${quote(x)}, got ${quote(line)}`);
		};

		const parseStr = ()=>{
			takeErr("\"");
			let out="";
			let esc=false;
			while (esc || !take("\"")) {
				if (!esc && take("\\")) esc=true;
				else if (esc && peek("n")) { out+="\n"; esc=false; }
				else {
					if (line.length==0) err("no end of string");
					out+=line.slice(0,1); line=line.slice(1);
					esc=false;
				}
			}

			return out;
		};
		
		const parseNum = <Big extends boolean>(big: Big): (Big extends true ? bigint : number)|null =>{
			const m = line.match(/^-?\d+/);
			if (m) {
				line=line.slice(m[0].length);
				if (big) {
					try {
						return BigInt(m[0]) as Big extends true ? bigint : number;
					} catch {}
				} else {
					const num = Number.parseInt(m[0],10);
					if (isFinite(num)) return num as Big extends true ? bigint : number;
				}
				return err(`Invalid integer ${quote(m[0])}`);
			}
			return null;
		};

		if (take("// ")) { toks.push({type: "comment", txt: line}); line=""; }
		else if (take("mainproc ")) {
			toks.push({ type: "def", name: parseStr(), main: true });
			takeErr(" {");
		} else if (take("proc ")) {
			toks.push({ type: "def", name: parseStr(), main: false });
			takeErr(" {");
		} else if (take("register ")) {
			const name = parseStr();
			takeErr(" = ");
			const num = parseNum(true);
			toks.push({
				type: "register",
				register: {
					type: "value", name,
					value: num==null ? parseStr() : num
				}
			});
		} else if (take("parameter ")) {
			toks.push({type: "register", register: {
				type: "param", name: parseStr()
			}});
		} else if (take("}")) {
			toks.push({type: "endDef"});
		} else if (line.length) {
			if (parseNum(false)!=null) line=line.trimStart();

			if (take("goto ")) {
				const num = take("unset") ? "unset" as const
					: take("end") ? "end" as const
					: parseNum(false);
				if (num==null) return err("expected number to goto");
				toks.push({type: "goto", num, cond: take(" ") ? parseStr() : null});
			} else for (const op of [
				"access", "add", "breakpoint", "sub", "inc", "dec", "call", "setIdx", "set"
			] as const satisfies Node["op"][]) {
				if (take(op=="setIdx" ? "set_idx" : op)) {
					const params: (string|null)[] = [];
					while (take(" ")) params.push(take("unknown") ? null : parseStr());
					toks.push({ type: "op", op, params });
					break;
				}
			}
		}
		
		if (line.trim().length>0) err("expected newline");
	}

	let curProc: WritableProcedure|null=null;
	const regMap = new Map<string, number>();
	let entry: string|null=null;
	const procs = new Map<number, Procedure>();
	const procList: number[] = [];
	const procByName = new Map<string, number>();
	const getProcI = (x: string)=>{
		const i = procByName.get(x) ?? maxProc++;
		procByName.set(x,i);
		return i;
	};

	for (const tok of toks) {
		if (tok.type=="def") {
			const i = getProcI(tok.name);
			if (procs.has(i)) throw new TextParseError(`multiple declaration of ${quote(tok.name)}`);

			curProc=makeProc(tok.name);
			procs.set(i, curProc);
			regMap.clear();

			if (tok.main) {
				if (entry!=null) throw new TextParseError(`both ${quote(entry)} and ${quote(tok.name)} declared as main procedures`);
				entry=tok.name;
			} else {
				procList.push(i);
			}
		} else if (curProc==null) {
			throw new TextParseError("unexpected token outside procedure def");
		} else if (tok.type=="endDef") {
			curProc=null;
		} else if (tok.type=="register") {
			const ri = curProc.maxRegister++;
			curProc.registers.set(ri, tok.register);
			curProc.registerList.push(ri);
			regMap.set(tok.register.name, ri);
		} else if (tok.type=="comment") {
			curProc.comment = curProc.comment!=undefined ? `${curProc.comment}\n${tok.txt}` : tok.txt;
		} else {
			const nodeI = curProc.maxNode++;
			curProc.nodeList.push(nodeI);
			const get = (x: string|null|undefined) => {
				if (x==undefined) return -1;
				const v = regMap.get(x);
				if (v==undefined) throw new TextParseError(`register ${quote(x)} not found`);
				return v;
			};

			let node: Node;
			if (tok.type=="goto") node={
				op: "goto",
				conditional: tok.cond!=null ? get(tok.cond) : null,
				ref: typeof tok.num=="number" ? tok.num-1 : tok.num
			};
			else if (tok.op=="add" || tok.op=="sub" || tok.op=="access" || tok.op=="set") {
				node={op: tok.op, lhs: get(tok.params[0]), rhs: get(tok.params[1])};
			} else if (tok.op=="inc" || tok.op=="dec") {
				node={op: tok.op, lhs: get(tok.params[0])};
			} else if (tok.op=="setIdx") {
				node={op: "setIdx", lhs: get(tok.params[0]), idx: get(tok.params[1]), rhs: get(tok.params[2])};
			} else if (tok.op=="breakpoint") {
				node={op: "breakpoint", conditional: tok.params.length==0 ? null : get(tok.params[0])};
			} else if (tok.op=="call") {
				if (tok.params[0]==undefined) throw new TextParseError("expected proc name for call operation");
				node={op: "call", procRef: getProcI(tok.params[0]), params: tok.params.slice(1).map(get)};
			} else {
				throw new Error("unreachable");
			}

			curProc.nodes.set(nodeI, node);
		}
	}
	
	for (const [k,v] of procByName.entries()) {
		if (!procs.has(v)) throw new TextParseError(`${quote(k)} used but never declared`);
	}
	
	return {
		procs, maxProc, procList,
		entry: entry!=null ? procByName.get(entry)??null : null
	};
}

export function fromText(txt: string, maxProc: number): { type: "ok" }&ReturnType<typeof fromTextErr>
	| {type: "error", error: string} {

	try {
		return { type: "ok", ...fromTextErr(txt, maxProc) };
	} catch (err) {
		if (err instanceof TextParseError) return { type: "error", error: err.message };
		throw err;
	}
}

// overwrites procs with same name!!
export function addFromText(edit: EditorState, txt: string): {type: "ok", value: EditorState}
	| { type: "error", error: string } {
	const res = fromText(txt, edit.maxProc);
	if (res.type=="error") return res;

	const newNames = new Set(res.procs.values().map(x=>x.name));
	const newProcs = new Map([
		...edit.procs.entries().filter(([,v])=>!newNames.has(v.name)),
		...res.procs.entries()
	]);

	return {
		type: "ok",
		value: {
			...edit,
			procs: newProcs,
			userProcList: [
				...edit.userProcList.filter(x=>newProcs.has(x)),
				...res.procList
			],
			maxProc: res.maxProc,
			entryProc: res.entry ?? edit.entryProc
		}
	};
}
