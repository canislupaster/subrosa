import { Dispatch, MutableRef, useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Procedure, Node, Register, EditorState, clone, step, ProgramState, InterpreterError, RegisterRefClone, strLenLimit, makeState, NodeSelection, toSelection, fromSelection, makeProc } from "../shared/eval";
import { Alert, Anchor, anchorStyle, AppTooltip, bgColor, borderColor, Button, ConfirmModal, containerDefault, debounce, Divider, HiddenInput, IconButton, Input, interactiveContainerDefault, LocalStorage, mapWith, Modal, Select, SetFn, setWith, Text, ThemeSpinner, toSearchString, useFnRef, useToast } from "./ui";
import { twMerge } from "tailwind-merge";
import { IconArrowsRightLeft, IconChartBar, IconChevronCompactDown, IconChevronLeft, IconCircleCheckFilled, IconCircleFilled, IconCircleOff, IconInfoCircle, IconPencil, IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipForwardFilled, IconPlayerStopFilled, IconPlayerTrackNextFilled, IconPlayerTrackPrevFilled, IconPlus, IconRotate, IconTrash, IconX } from "@tabler/icons-preact";
import { ComponentChild, ComponentChildren, Ref } from "preact";
import { dragAndDrop, useDragAndDrop } from "@formkit/drag-and-drop/react";
import { animations, DragState, handleNodePointerdown, remapNodes, setParentValues } from "@formkit/drag-and-drop";
import clsx from "clsx";
import { ChangeEvent, SetStateAction } from "preact/compat";
import { fill, strToInt, toPrecStat } from "../shared/util";
import { Messages, Stage } from "./story";
import { Submission, useSubmission } from "./api";
import { useGoto } from "./main";
import { Reference } from "./reference";
import { LogoBack } from "./logo";
import { addFromText, toText } from "../shared/text";
import { Puzzle } from "../shared/puzzles";

const nodeStyle = twMerge(containerDefault, `rounded-sm px-4 py-2 flex flex-row gap-2 items-center pl-1.5 text-sm relative`);
export const blankStyle = twMerge(nodeStyle, bgColor.secondary, "flex flex-col items-center justify-center py-4 px-2 nodrag");
const dropStyle = "[.drop,.drop_*]:theme:bg-amber-800";
const nameInputProps = {
	minLength: 1, maxLength: 20,
	pattern: "^[\\w\\-_\\[\\]\\{\\}!\\(\\) ]+$"
} as const;
// const validNameRe = /^[\\w ]{1,20}$/;
const validTextRe = new RegExp(`^[a-z ]{0,${strLenLimit}}$`);

const builtinNodes: Node[] = [
	...(["add", "sub", "set", "access"] as const).map(op=>(
		{op, lhs: -1, rhs: -1}
	)),
	...(["inc", "dec"] as const).map(op=>({ op, lhs: -1 })),
	{ op: "goto", ref: "unset", conditional: null },
	{ op: "setIdx", lhs: -1, rhs: -1, idx: -1 },
	{ op: "breakpoint", conditional: null }
];

const nodeName: Record<Node["op"], string> = {
	add: "Add", sub: "Subtract", set: "Assign",
	access: "Access", inc: "Increment", dec: "Decrement",
	goto: "Goto", setIdx: "Indexed assign", call: "Call",
	breakpoint: "Breakpoint"
};

function useValidity(value: string, callback: (v: string)=>void): {
	value: string,
	onBlur: (ev: FocusEvent)=>void,
	onChange: (ev: ChangeEvent<HTMLInputElement>)=>void
} {
	const db = useFnRef(()=>debounce(200), []);

	const [v, setV] = useState<{editing: boolean, value: string}>({editing: false, value});
	useEffect(()=>{
		if (!v.editing) setV({editing: false, value});
	}, [v.editing, value]);

	return {
		value: v.value,
		onBlur() { setV({editing: false, value}); },
		onChange(ev) {
			const elem = ev.currentTarget;
			if (elem.value!=value || v.editing) {
				setV({ editing: true, value: elem.value });
			}
			db.current?.call(()=>{
				if (elem.reportValidity()) callback(elem.value);
			});
		}
	};
}

type EditData = {
	i: number,
	proc: Procedure,
	procs: ReadonlyMap<number, Procedure>,
	nodeRefs: MutableRef<Map<number|"end", HTMLDivElement>>,
	regMap: ReadonlyMap<number, number>,
	regParam: ReadonlyMap<number, number>,
	nodeMap: ReadonlyMap<number|"end", number>,
	runRegisters: ReadonlyMap<number, RegisterRefClone>|null,

	// i dont like how i pass some state deeply
	// and then theres just this
	setSelectingGoto: (x: number|null)=>void,
	selectingGoto: number|null
};

const regLabel = (i: number, v: Register)=>`#${i+1}${v.name!=undefined ? `: ${v.name}` : ""}`;

function RegisterPicker<Create extends boolean = false>({p, x, setX, desc, create}: {
	p: EditData, x: Create extends true ? number|"create" : number,
	setX?: (x: Create extends true ? number|"create" : number)=>void,
	desc?: string, create?: Create
}) {
	return <div className="flex flex-col" >
		{desc!=undefined && <Text v="sm" >{desc}</Text>}
		<Select options={[
				...create==true ? [{ label: "(create)", value: "create" as unknown as number }] : [],
				{ label: "(unset)", value: -1 },
				...p.proc.registerList.map((r,i)=>{
					const v = p.proc.registers.get(r)!;
					return { label: regLabel(i,v), value: r };
				})
			]}
			searchable
			disabled={setX==undefined}
			placeholder={"(unset)"}
			value={x} setValue={setX} />
	</div>;
}

function iconURL(x: {op: "goto", conditional: number|null}|{op: Exclude<Node["op"], "goto">}) {
	if (x.op=="goto" && x.conditional!=undefined) return "/condgoto.svg";
	return `/${x.op.toLowerCase()}.svg`;
}

function GotoArrow({p, node, nodeI}: {p: EditData, node: Node&{op: "goto"}, nodeI: number}) {
	const rectRef = useRef<HTMLDivElement>(null);
	const arrowRef = useRef<HTMLDivElement>(null);

	useEffect(()=>{
		const r = node.ref;
		if (r=="unset" || (r!="end" && !p.proc.nodes.has(r))) {
			if (rectRef.current) rectRef.current.hidden=true;
			if (arrowRef.current) arrowRef.current.hidden=true;
			return;
		}

		// otherwise should always exist
		let timeout: number|undefined;
		let lastParams = fill(4, -1);
		const dispatch = ()=>{timeout=setTimeout(updateArrow, 50);}
		const updateArrow = ()=>{
			timeout=undefined;

			const el = p.nodeRefs.current.get(r);
			const el2 = p.nodeRefs.current.get(nodeI);
			const rect = rectRef.current, arrow=arrowRef.current
			if (!el || !el2 || !rect || !arrow) { dispatch(); return; }

			let a = el2.getBoundingClientRect()
			let b = el.getBoundingClientRect();

			rect.hidden=arrow.hidden=false;
			const parent = rect.offsetParent!;

			const c = parent.getBoundingClientRect();
			const yo = parent.scrollTop;
			const arrowHeight = arrow.getBoundingClientRect().height;
			
			// adjust for border...
			arrow.style.top = `${b.y + b.height/2 - c.top - arrowHeight/2 
				+ (a.y < b.y ? -1 : 1) + yo}px`;
			arrow.style.right = `${c.right - b.left - 1}px`;

			const params = [b.y + yo, b.height,a.y + yo, a.height];
			// schedule another update if still hot
			if (params.some((v,i)=>Math.abs(lastParams[i]-v) > 1)) dispatch();
			lastParams=params;

			if (a.y > b.y) [a,b] = [b,a];
			const depth = 0.7*(2.4*(b.y - a.y)/parent.scrollHeight + ((127.8234*nodeI)%1.2324)*1.1);
			const obj = {
				top: `${a.y + a.height/2 - c.top + yo}px`,
				bottom: `${c.bottom - (b.y + b.height/2) - yo}px`,
				right: `${c.right - Math.max(a.left, b.left)}px`,//`${c.right - Math.min(a.right, b.right)}px`,
				left: `calc(${Math.max(a.left, b.left) - c.left}px - ${12.5*(2*depth+1)}px)`
			} as const;
			
			type ObjKey = keyof typeof obj;
			for (const k in obj) {
				rect.style[k as ObjKey]=obj[k as ObjKey];
			}
		};

		updateArrow();
		window.addEventListener("resize", updateArrow);
		return ()=>{
			if (timeout!=undefined) clearTimeout(timeout);
			window.removeEventListener("resize", updateArrow);
		};
	}, [node, node.ref, nodeI, p.nodeRefs, p.proc.nodeList, p.proc.nodes]);

	return <>
		<div className="absolute w-4 nodrag" hidden ref={arrowRef} >
			<img src="/arrow.svg" />
		</div>
		<div className={clsx("absolute border-2 border-r-0 nodrag", borderColor.focus)} hidden ref={rectRef} />
	</>;
}

const getClickNode = (ev: MouseEvent, refs: EditData["nodeRefs"])=>{
	const candidates =  [...refs.current.entries()]
		.filter(([,y])=>y.contains(ev.target as globalThis.Node|null))
	return candidates.length==0 ? null : candidates[0][0];
}

function GotoInner({p, node, setNode, nodeI}: {
	p: EditData, node: Node&{op: "goto"}, nodeI?: number
	setNode?: (x: Node)=>void
}) {
	const selecting = nodeI!=undefined && p.selectingGoto==nodeI;

	useEffect(()=>{
		if (!selecting) return;
		const cb = (ev: MouseEvent)=>{
			const targetNode = getClickNode(ev, p.nodeRefs);
			if (targetNode!=null && targetNode!=nodeI) {
				ev.preventDefault();
				setNode?.({ ...node, ref: targetNode });
			}

			p.setSelectingGoto(null);
		};

		document.addEventListener("click", cb, true);
		return ()=>document.removeEventListener("click", cb, true);
	}, [node, nodeI, p, selecting, setNode]);
	
	const to = node.ref=="unset" ? null : p.nodeMap.get(node.ref);

	return <>
		<Button onClick={()=>{
			if (nodeI!=undefined) p.setSelectingGoto(selecting ? null : nodeI);
		}} className={
			selecting ? bgColor.highlight : node.ref=="unset" && setNode ? bgColor.red : ""
		} >
			{to==undefined ? "Jump to..." : `Jump: ${to+1}`}
		</Button>
		<RegisterPicker desc="cond" p={p} x={node.conditional ?? -1} setX={
			setNode ? v=>setNode({...node, conditional: v<0 ? null : v}) : undefined
		} />
	</>;
}

function CallInner({
	p, node, openProc, setNode
}: {
	p: EditData, node: Node&{op: "call"},
	nodeI?: number, setNode?: (x: Node)=>void,
	openProc: (i: number)=>void
}) {
	const v = p.procs.get(node.procRef);
	const params = v?.registerList.flatMap(r=>{
		const x = v?.registers.get(r);
		return x?.type=="param" ? [x] : [];
	}) ?? [];

	return v==undefined
		? <Alert bad title="Unknown procedure" txt="This procedure has been deleted." />
		: <>
			<div className="flex flex-col gap-0.5" >
				<Text v="sm" >{v.name}</Text>
				<Button className="py-1" onClick={()=>openProc(node.procRef)} >Open</Button>
			</div>
			<div className="flex flex-row flex-wrap gap-1.5" >
				{params.map((param, i)=>
					<RegisterPicker key={i} p={p} x={i>=node.params.length ? -1 : node.params[i]}
						desc={param.name!=undefined ? `#${i+1}: ${param.name}` : `#${i+1}`}
						setX={setNode==undefined ? undefined : (nx)=>setNode({
							...node, params: node.params.length<=i
								? [...node.params, ...fill(i-node.params.length,-1), nx]
								: node.params.with(i, nx)
						})} />
				)}
			</div>
		</>;
}

const nodeHint: Record<Node["op"], string> = {
	add: "Add the second register to the first.",
	sub: "Subtract the second register from the first.",
	set: "Set the value of the first register to the second.",
	access: "Take the element in the second register at the position indexed by the first register, and load it into the first register.",
	inc: "Increment the value of a register.",
	dec: "Decrement the value of a register.",
	goto: "Jump to another node, optionally conditional on whether the cond register contains a strictly positive value.",
	setIdx: "Set the element at idx in lhs to rhs.",
	call: "Call another procedure with parameters.",
	breakpoint: "Pause execution for debugging, optionally conditional on whether the cond register contains a strictly positive value."
};

function ProcNode({p, node, setNode: setNode2, openProc, nodeI, idx, status, refSetter}: {
	p: EditData, node: Node, nodeI?: number, idx?: number
	setNode: (x: Node|null, i: number)=>void
	openProc: (i: number)=>void,
	refSetter?: (ref: HTMLDivElement|null)=>void,
	status?: "active"|"selected"|"target"
}) {
	const setNode = nodeI==undefined ? undefined : (newNode: Node|null)=>setNode2(newNode, nodeI);

	let inner: ComponentChild;
	if (node.op=="goto") {
		inner=<GotoInner p={p} node={node} nodeI={nodeI} setNode={setNode} />;
	} else if (node.op=="call") {
		inner=<CallInner p={p} node={node} nodeI={nodeI} setNode={setNode} openProc={openProc} />
	} else if (node.op=="setIdx") {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode ? lhs=>setNode({...node, lhs}) : undefined} desc="a" />
			<RegisterPicker p={p} x={node.idx} setX={setNode ? idx=>setNode({...node, idx}) : undefined} desc="b" />
			<RegisterPicker p={p} x={node.rhs} setX={setNode ? rhs=>setNode({...node, rhs}) : undefined} desc="c" />
		</>;
	} else if (node.op=="breakpoint") {
		inner=<>
			<RegisterPicker p={p} x={node.conditional ?? -1} setX={setNode ? v=>
				setNode({...node, conditional: v<0 ? null : v}) : undefined} desc="cond" />
		</>;
	} else {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode ? lhs=>setNode({...node, lhs}) : undefined} desc="a" />
			{"rhs" in node && <RegisterPicker p={p} x={node.rhs}
				setX={setNode ? rhs=>setNode?.({...node, rhs}) : undefined} desc="b" />}
		</>;
	}
	
	const hint = useMemo(()=>{
		if (node.op=="call") {
			const v = p.procs.get(node.procRef);
			if (v && v.comment!=undefined) return v.comment;
		}

		return nodeHint[node.op];
	}, [node, p.procs]);

	return <div className={twMerge(nodeStyle, "transition-colors animate-expand",
			status=="active" ? bgColor.highlight : status=="selected" ? bgColor.highlight2
				: status=="target" ? bgColor.md : null, dropStyle)} ref={refSetter} >
		<img src={iconURL(node)} className="w-10 cursor-move draghandle mb-4" />
		{idx!=undefined && <Text v="dim" className="absolute left-1 bottom-1" >{idx}</Text>}
		{inner}
		{setNode ? <button onClick={()=>{ setNode(null); }}
			className="-mr-2 ml-auto float-end" ><IconX /></button>
			: <AppTooltip content={<p className="break-words" >{hint}</p>} >
				<button className="-mr-2 ml-auto float-end" ><IconInfoCircle /></button>
			</AppTooltip>}
	</div>;
}

type DragNode = { type: "proc"|"builtin"|"user", i: number};
const SelectRegisterType = Select<"param"|"string"|"number">;

function RegisterEditor({p, reg, setReg}: {
	p: EditData, reg: number, setReg: (x: Register|null, i: number)=>void,
}) {
	const regI = p.regMap.get(reg)!;
	const regV = p.proc.registers.get(reg)!;

	const regStr = regV.type=="value" ? regV.value.toString() : "";
	const [value, setValue] = useState(regStr);
	useEffect(()=>setValue(regStr), [regStr]);

	const [err, setErr] = useState<string|null>(null);
	const [err2, setErr2] = useState<boolean>(false);

	const regTy = regV.type=="param" ? null : typeof regV.value;
	const emptyReg = useMemo(()=>({type: "value", name: regV.name} as const), [regV.name]);
	const paramI = p.regParam.get(reg);

	const inputValueChange = (newValue: string)=>{
		setValue(newValue);

		let err: string|null = null;
		if (regTy=="string") {
			if (!validTextRe.test(newValue)) {
				err="Text registers must only contain lowercase alphabetic characters or spaces";
			}
			else setReg({...emptyReg, value: newValue}, reg);
		} else if (regTy=="number") {
			const v = strToInt(newValue);
			if (v==null) err="Invalid number";
			else setReg({...emptyReg, value: v}, reg);
		}

		setErr(err);
	};

	const regRef = p.runRegisters?.get(reg);

	const [runValue, setRunValue] = useState(regRef?.current);
	useEffect(()=>{
		setRunValue(regRef?.current);
		setErr2(false);
	}, [regRef])

	const setRunV = (x: string)=>{
		if (!regRef) return;
		const newV = validTextRe.test(x) ? x : strToInt(x);
		setErr2(newV==null);
		if (newV!=null) regRef.mutable.current=newV;
		setRunValue(newV ?? x);
	};

	return <div className={twMerge(nodeStyle, dropStyle, "flex flex-col pl-2 items-stretch gap-1 pr-1")} >
		<div className="flex flex-row gap-2 mb-1 items-center" >
			<Text v="bold" className="cursor-move draghandle" >{"#"}{regI+1}</Text>
			<HiddenInput
				placeholder={"(unnamed)"}
				{...useValidity(
					regV.name==null ? "" : regV.name,
					v=>setReg({ ...regV, name: v.length==0 ? null : v }, reg)
				)}
				{...nameInputProps} />
			<IconButton className="ml-auto" icon={<IconX />} onClick={()=>{
				setReg(null, reg);
			}} />
		</div>

		<Text v="dim" >Register type:</Text>
		<SelectRegisterType className="w-full" options={[
			{ label: "Parameter", value: "param" },
			{ label: "Text", value: "string" },
			{ label: "Number", value: "number" }
		] as const} value={regV.type=="param" ? "param"
			: typeof regV.value=="string" ? "string" : "number"}
			setValue={v=>{
				if (v=="param") setReg({...regV, type: "param"}, reg);
				else if (v=="number") {
					setReg({...regV, type: "value", value: 0}, reg);
					setValue("0");
				} else if (v=="string") {
					setReg({...regV, type: "value", value: value.toString()}, reg);
					setValue("");
				}
				
				setErr(null);
			}} />

		{regV.type=="value" && <>
			<Input className={clsx(err!=null && borderColor.red)}
				type={regTy=="number" ? "number" : "text"}
				step={1}
				value={value} valueChange={inputValueChange} />
			{err!=null && <Alert bad txt={err} />}
		</>}
		
		{paramI!=undefined && <>
			<Text v="smbold" className="self-center" >Parameter {"#"}{paramI+1}</Text>
		</>}
		
		{runValue!=null && <>
			<Divider className="my-1" />
			<Text v="dim" >Current value ({typeof runValue=="string" ? "text" : "numeric"}):</Text>

			<Input className={clsx(err2 && borderColor.red)} value={runValue} valueChange={setRunV} />
			{err2 && <Alert bad txt="Invalid register value" />}
		</>}
	</div>;
}

type ProcRunState = {
	activeNode: number|null,
	scrollNode: number|null,
	registers: ReadonlyMap<number, RegisterRefClone>
};

type UserProcs = {
	procs: ReadonlyMap<number, Procedure>,
	userProcList: number[],
	entryProc: number,

	back: boolean,
	addProc: ()=>void,
	delProc: ()=>void,
	openProc: (i?: number)=>void,
	setProcList: (vs: number[])=>void
};

const dragOpts = {
	draggable(child: HTMLElement) { return !child.classList.contains("nodrag"); },
	dropZoneClass: "drop",
	dragHandle: ".draghandle",
	plugins: [animations()]
};

const MAX_UNDO_STEPS = 100;

function ProcEditor({
	proc, i: procI, setProc, procs, userProcList, entryProc,
	addProc, setProcList, delProc, openProc, runState, stack,
	back, undo, input
}: {
	proc: Procedure, i: number, setProc: SetFn<Procedure>,
	runState: ProcRunState|null, stack?: ComponentChildren,
	undo: (redo: boolean)=>void, input: ComponentChildren
}&UserProcs) {
	const isUserProc = entryProc!=procI; // whether proc is editable
	const nodeRefs = useRef(new Map<number|"end",HTMLDivElement>());
	const [selectingGoto, setSelectingGoto] = useState<number|null>(null);
	const data: EditData = useMemo(()=>{
		return {
			i: procI, proc, procs,
			selectingGoto, setSelectingGoto,
			nodeRefs,
			regMap: new Map(proc.registerList.map((v,i)=>[v,i])),
			regParam: new Map(proc.registerList.filter(a=>proc.registers.get(a)?.type=="param")
				.map((x,i)=>[x,i])),
			nodeMap: new Map<number|"end", number>([
				...proc.nodeList.map((v,i)=>[v,i] satisfies [number|"end", number]),
				["end", proc.nodeList.length]
			]),
			runRegisters: runState?.registers ?? null
		} as const;
	}, [procI, proc, procs, selectingGoto, runState?.registers]);

	const nodeForUserProc = useCallback((i: number): Node => {
		const proc = procs.get(i)!;
		const nParam = proc.registerList.reduce((a,b)=>a+(proc.registers.get(b)?.type=="param" ? 1 : 0),0);
		return {
			op: "call", procRef: i,
			params: fill(nParam, -1)
		};
	}, [procs]);

	// cursed !!!
	const updateFromDrag = useCallback((xs: DragNode[])=>{
		let out: number[]=[];

		setProc(p=>{
			const newNodes = new Map(p.nodes);
			let maxNode = p.maxNode;

			out=xs.map(v=>{
				if (v.type=="proc") return v.i;
				newNodes.set(maxNode, v.type=="user" ? nodeForUserProc(v.i) : builtinNodes[v.i]);
				return maxNode++;
			});

			return { ...p, nodes: newNodes, maxNode };
		});

		return out;
	}, [nodeForUserProc, setProc]);

	// shitty stuff to accept builtin / procs
	const nodeListRef = useRef<HTMLUListElement>(null);
	const dragStateRef = useRef<DragState<number>>(null);
	useEffect(()=>{
		dragAndDrop<HTMLUListElement, number>({
			multiDrag: true,
			parent: nodeListRef.current, group: "proc",
			state: [
				proc.nodeList as number[],
				((xs: number[])=>setProc(p=>({...p, nodeList: xs }))) as Dispatch<SetStateAction<number[]>>
			],
			handleNodePointerdown(data,state) {
				dragStateRef.current = state;
				handleNodePointerdown(data,state);
			},
			performTransfer({ initialParent, targetParent, draggedNodes, targetNodes }) {
				remapNodes(initialParent.el);

				const newData = updateFromDrag(draggedNodes.map(v=>v.data.value as unknown as DragNode));
				draggedNodes.forEach((v,i)=>{ v.data.value=newData[i]; });

				const idx = targetNodes.length ? targetNodes[0].data.index : targetParent.data.enabledNodes.length;
				const up = proc.nodeList.toSpliced(idx, 0, ...draggedNodes.map(v=>v.data.value));
				setParentValues(targetParent.el, targetParent.data, up);
			},
			...dragOpts,
		});
	}, [proc.nodeList, setProc, updateFromDrag]);

	const builtinDragNodes = fill(builtinNodes.length, i=>({ type: "builtin", i } as const));

	const [builtinRef] = useDragAndDrop<HTMLUListElement, DragNode>(builtinDragNodes, {
		sortable: false, group: "proc", dropZone: false, plugins: [animations()],
	}) as unknown as [Ref<HTMLUListElement>, DragNode[]]; // preact compat

	const userProcListRef = useRef<HTMLUListElement>(null);
	useEffect(()=>{
		dragAndDrop<HTMLUListElement, DragNode>({
			parent: userProcListRef.current,
			dropZone: false,
			state: [
				userProcList.map(i=>({type: "user", i})),
				((nodes: DragNode[])=>setProcList(nodes.map(x=>x.i))) as Dispatch<SetStateAction<DragNode[]>>
			],
			group: "proc", 
			performTransfer() {},
			...dragOpts
		});
	}, [setProcList, userProcList]);

	const nodeRefSetter = (node: number|"end") => (el: HTMLDivElement|null) => {
		if (el==null) return;
		nodeRefs.current.set(node, el);
		return ()=>nodeRefs.current.delete(node);
	};

	const setReg = useCallback((newReg: Register|null, i: number)=>setProc(p=>({
		...p, registers: mapWith(p.registers,i,newReg ?? undefined),
		registerList: newReg==null ? p.registerList.filter(j=>j!=i) : p.registerList
	})), [setProc]);

	const setNode = useCallback((newNode: Node|null, i: number)=>{
		setProc(p=>({
			...p,
			nodes: mapWith(p.nodes, i, newNode ?? undefined),
			nodeList: newNode==null ? p.nodeList.filter(j=>j!=i) : p.nodeList
		}));
	}, [setProc]);
	
	const registerList = useRef<HTMLUListElement>(null);
	useEffect(()=>{
		dragAndDrop<HTMLUListElement, {type: "register", i: number}>({
			parent: registerList.current,
			dropZone: false,
			state: [
				proc.registerList.map(i=>({type: "register", i})), // mutability
				((vs: {type: "register", i: number}[])=>
					setProc(p=>({...p, registerList: vs.map(v=>v.i)}))
				) as Dispatch<SetStateAction<{type: "register", i: number}[]>>
			],
			...dragOpts
		});
	}, [proc.registerList, registerList, setProc])

	const procNameValidity = useValidity(proc.name, v=>setProc(p=>({...p, name: v})))
	const [procFilter, setProcFilter] = useState("");
	const showProcs = useMemo(()=>{
		const s = toSearchString(procFilter);
		return new Set([...data.procs.entries()].flatMap(([i,v])=>{
			return toSearchString(v.name).includes(s) ? [i] : [];
		}));
	}, [data.procs, procFilter])
	
	const [confirmClear, setConfirmClear] = useState(false);
	
	useEffect(()=>{
		const active = runState?.scrollNode;
		if (active==undefined) return;

		const ref = nodeRefs.current.get(active);
		ref?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [runState?.scrollNode]);
	
	// i have no idea why this library is so buggy, im just going
	// to have to work around this trash
	useEffect(()=>{
		let tm:number|null=null;
		const clearDrop = ()=>{
			tm=setTimeout(()=>{
				[...document.querySelectorAll(".drop")].forEach(x=>x.classList.remove("drop"));
			}, 100);
		};

		clearDrop();
		document.addEventListener("dragend", clearDrop, { capture: true });
		document.addEventListener("mouseup", clearDrop, { capture: true });
		return ()=>{
			document.removeEventListener("dragend", clearDrop, { capture: true });
			document.removeEventListener("mouseup", clearDrop, { capture: true });
			if (tm!=null) clearTimeout(tm);
		}
	}, []);
	
	const [selection, setSelection] = useState<ReadonlySet<number>>(new Set<number>());

	const highlightGotoSelection = useMemo(()=>
		new Set(proc.nodes.entries().flatMap(([k,v])=>{
			if (v.op=="goto" && typeof v.ref=="number" && (selection.has(k) || selection.has(v.ref)))
				return [k, v.ref];
			return [];
		})),
		[proc.nodes, selection]
	);

	type RemapClipboard = {
		sel: NodeSelection, open: boolean, remap: ("create"|number)[]
	};

	const noRemap = ()=>({
		sel: {nodes: [], registers: [], procRegisters: new Map()}, open: false, remap: []
	});

	const [remappingClipboard, setRemappingClipboard] = useState<RemapClipboard>(noRemap);

	useEffect(()=>{
		setSelection(new Set());
		setRemappingClipboard(noRemap());
		setSelectingGoto(null);
	}, [procI]);
	
	const pasteSel = useCallback((sel: NodeSelection, regMap: (number|"create")[])=>{
		setProc(p=>{
			let insBegin = proc.nodeList.findLastIndex(i=>selection.has(i));
			if (insBegin==-1) insBegin=proc.nodeList.length; else insBegin++;

			const newRegisters = regMap.flatMap((x,i)=>{
				if (x=="create") return [sel.registers[i]];
				return [];
			}).map((reg,i)=>[p.maxRegister+i, reg] as const);

			let createI=0;
			const regMap2 = regMap.map(v=>v=="create" ? newRegisters[createI++][0] : v);
			const newNodes = fromSelection(sel, fill(sel.nodes.length, i=>proc.maxNode+i), regMap2);

			LocalStorage.clipboard = {
				...sel, procRegisters: mapWith(sel.procRegisters, procI, regMap2)
			};

			const nlist = proc.nodeList.toSpliced(insBegin, 0, ...newNodes.map(([i])=>i));
			return {
				...p,
				maxRegister: p.maxRegister+newRegisters.length,
				registerList: [...p.registerList, ...newRegisters.map(([i])=>i)],
				registers: new Map([ ...p.registers.entries(), ...newRegisters ]),
				maxNode: p.maxNode+sel.nodes.length,
				nodeList: nlist,
				nodes: new Map([ ...p.nodes.entries(), ...newNodes ])
			};
		});

		setSelection(new Set());
		setRemappingClipboard(v=>({...v, open: false}));
	}, [proc.maxNode, proc.nodeList, procI, selection, setProc]);

	const toast = useToast();
	useEffect(()=>{
		// hacky af to sync selection with multidrag
		const dragState = dragStateRef.current;
		const dragState2 = dragState?.activeState ?? dragState?.pointerDown;
		if (dragState!=null && dragState2) {
			const nodes = dragState2.parent.data.enabledNodes
				.filter(x=>selection.has(x.data.value));
			dragState.pointerSelection = nodes.length>0;
			dragState.selectedState = { nodes, parent: dragState2.parent };
		}

		const docClick = (ev: MouseEvent)=>{
			const node = getClickNode(ev, data.nodeRefs);
			if (node==null || node=="end") {
				setSelection(new Set());
				return;
			}

			if (ev.shiftKey) {
				const minNode = proc.nodeList.findIndex(x=>selection.has(x) || x==node);
				const maxNode = proc.nodeList.findLastIndex(x=>selection.has(x) || x==node);
				setSelection(new Set(fill(maxNode-minNode+1, i=>proc.nodeList[i+minNode])));
			} else if (ev.ctrlKey || ev.metaKey) {
				setSelection(setWith(selection, node, selection.has(node)));
			} else {
				setSelection(new Set(selection.has(node) ? [] : [node]));
			}
		};
		
		const clipboardListener = (ev: KeyboardEvent)=>{
			if (!ev.metaKey && !ev.ctrlKey && ev.key!="Backspace"
				|| ev.target!=document.body) return;

			if (ev.key=="z") {
				undo(ev.shiftKey);
			} else if (ev.key=="c" || ev.key=="x" || ev.key=="Backspace") {
				if (selection.size==0) return;

				if (ev.key=="c" || ev.key=="x") {
					LocalStorage.clipboard = toSelection(procI, proc, [...selection.values()]);
				}

				if (ev.key=="x" || ev.key=="Backspace") {
					setProc(p=>({
						...p,
						nodes: new Map([...p.nodes.entries()].filter(([i])=>!selection.has(i))),
						nodeList: p.nodeList.filter(i=>!selection.has(i))
					}));
				}

				toast(ev.key=="c" ? "Copied" : ev.key=="x" ? "Cut" : "Deleted");
			} else if (ev.key=="v") {
				const data = LocalStorage.clipboard;
				if (!data || remappingClipboard.open) return;
				const regMap = data.registers.length==0 ? [] : data.procRegisters.get(procI);
				if (regMap==null) {
					setRemappingClipboard({
						sel: data, open: true, remap: fill(data.registers.length, i=>{
							return i>=proc.registerList.length ? "create" as const : proc.registerList[i];
						})
					});
				} else {
					pasteSel(data, regMap);
					toast("Pasted");
				}
			} else if (ev.key=="a") {
				setSelection(new Set(proc.nodeList));
			} else {
				return;
			}
			
			ev.preventDefault();
		};
		
		document.addEventListener("keydown", clipboardListener)
		document.addEventListener("click", docClick);
		return ()=>{
			document.removeEventListener("keydown", clipboardListener)
			document.removeEventListener("click", docClick);
		};
	}, [data.nodeRefs, pasteSel, proc, proc.nodeList, procI, remappingClipboard.open, selection, setProc, undo, toast]);

	const addNodeOptions: {
		label: ComponentChildren, key: string|number, value: DragNode, search: string
	}[] = useMemo(()=>[
		...builtinNodes.map((x,i)=>({
			label: <><img src={iconURL(x)} className="w-6" /> {nodeName[x.op]}</>,
			key: x.op, value: { type: "builtin" as const, i },
			search: nodeName[x.op]
		})),
		...userProcList.flatMap((proc)=>{
			const p = procs.get(proc);
			if (!p) return [];
			return [{
				label: <><img src={iconURL({op: "call"})} className="w-6" /> {p.name}</>,
				key: proc, search: p.name,
				value: { type: "user" as const, i: proc }
			}];
		})
	], [procs, userProcList]);
	
	const nodeAdder = (i: number, v: number)=><Select key={`sep${v}`} options={addNodeOptions} searchable
		setValue={(v)=>{
			const nv = updateFromDrag([v])[0];
			setProc(p=>({...p, nodeList: p.nodeList.toSpliced(i+1,0,nv)}));
		}} className="place-content-center flex w-full nodrag -mt-1 group" >

		<button className="relative w-full" >
			<IconChevronCompactDown className="mx-auto group-hover:opacity-0 transition-opacity" />
			<IconPlus className="group-hover:opacity-100 opacity-0 transition-opacity absolute top-0.5 left-0 right-0 mx-auto" />
		</button>
	</Select>;

	return <>
		<ConfirmModal open={confirmClear} onClose={()=>setConfirmClear(false)} msg={
			"Are you sure you want to delete all nodes in this procedure?"
		} confirm={()=>{
			setProc(p=>({ ...p, nodeList: [], nodes: new Map() }));
		}} />
		
		<Modal title="Remap registers from clipboard" open={remappingClipboard.open}
			onClose={()=>setRemappingClipboard(v=>({...v, open: false}))} >
			<Text>You're trying to paste something from a different procedure. Choose how registers should be remapped.</Text>

			<div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-2 self-center items-center" >
				{remappingClipboard.sel.registers.map((reg,i)=>
					<div key={i} className="contents" >
						<div className="flex flex-col" >
							<Text v="smbold" >{regLabel(i,reg)}</Text>
							<Text v="dim" >{reg.type=="value" ? (typeof reg.value=="string" ? "Text" : "Number") : "Parameter"}</Text>
						</div>
						
						<IconArrowsRightLeft />
						
						<RegisterPicker create p={data} x={remappingClipboard.remap[i]} setX={(nx)=>{
							setRemappingClipboard({
								...remappingClipboard,
								remap: remappingClipboard.remap.toSpliced(i, 1, nx)
							});
						}} />
					</div>
				)}
			</div>
			
			<div className="flex flex-row gap-2" >
				<Button className={bgColor.sky} autofocus onClick={()=>{
					pasteSel(remappingClipboard.sel, remappingClipboard.remap);
				}} >Paste</Button>
				<Button onClick={()=>setRemappingClipboard(v=>({...v, open: false}))} >Cancel</Button>
			</div>
		</Modal>

		<div className="flex flex-col items-stretch editor-left min-h-0" >
			<div className={clsx("flex flex-row gap-2 items-end pl-2 shrink-0 h-11", !isUserProc && "pl-4")} >
				{back && <Anchor className="items-center self-end mr-2" onClick={()=>openProc()} >
					<IconChevronLeft size={32} />
				</Anchor>}

				{!isUserProc ? <Text v="bold" >Procedure <Text v="code" >{proc.name}</Text></Text>
				: <>
					<Text v="bold" >Procedure</Text>
					<HiddenInput {...procNameValidity} required {...nameInputProps} className="w-fit" />
				</>}
				
				<Button className="ml-auto py-1" onClick={()=>{
					setConfirmClear(true);
				}} >Clear</Button>
				{isUserProc && <>
					<AppTooltip placement="right" className="px-2 pb-2" content={<>
						<Text v="dim" >Comment</Text>
						<Input maxLength={1024} value={proc.comment} valueChange={v=>setProc(p=>({
							...p, comment: v.length==0 ? undefined : v
						}))} />
					</>} >
						<div><IconButton icon={<IconInfoCircle size={20} />} /></div>
					</AppTooltip>
					<IconButton icon={<IconTrash size={20} />} onClick={()=>{delProc();}} />
				</>}
			</div>
			 
			<ul ref={nodeListRef} className="pl-[70px] flex flex-col gap-1 items-stretch overflow-y-auto relative pb-20" >
				{nodeAdder(-1,-1)}
				{proc.nodeList.flatMap((v,i)=>{
					const node = proc.nodes.get(v)!;
					return [
						<ProcNode key={v} p={data} node={node} idx={i+1} setNode={setNode}
							nodeI={v} openProc={openProc} refSetter={nodeRefSetter(v)}
							status={runState?.activeNode==v ? "active"
								: selection.has(v) ? "selected"
								: highlightGotoSelection.has(v) ? "target" : undefined} />,
						...node.op=="goto" ? [
							<GotoArrow key={`arrow${v}`} p={data} node={node} nodeI={v} />
						] : [],
						nodeAdder(i,v)
					];
				})}
			
				<div className={clsx(blankStyle, selectingGoto!=null && clsx(bgColor.hover, "cursor-pointer"))} ref={nodeRefSetter("end")} >
					{proc.nodeList.length==0 ? <>
						<IconInfoCircle />
						<Text v="sm" >Use the library on the right to add nodes</Text>
					</> : <>
						<img src="/end.svg" className="w-7" />
						<Text v="sm" >End of procedure{selectingGoto!=null && " (you can jump here)"}</Text>
						<Text v="dim" className="bottom-1 left-1 absolute" >{proc.nodeList.length+1}</Text>
					</>}
				</div>
			</ul>
		</div>
		
		<div className="flex flex-col gap-1 editor-mid min-h-0 max-h-full" >
			<div className="flex flex-col items-stretch gap-2" >
				{input}
			</div>

			<Divider className="my-1" />

			<div className="flex flex-row gap-4 pb-1 items-center" >
				<Text v="bold" >Builtins</Text>
				<ul className="flex flex-row flex-wrap gap-2" ref={builtinRef} >
					{builtinNodes.map(v=>
						<AppTooltip key={v.op} placement="bottom" content={nodeHint[v.op]} >
							<div className={twMerge(blankStyle, "py-1", bgColor.hover)} >
								<img src={iconURL(v)} className="w-8 cursor-move draghandle" />
							</div>
						</AppTooltip>
					)}
				</ul>
			</div>
			
			<Divider className="my-1" />

			<div className="flex flex-row gap-2 items-center flex-wrap gap-y-0 mb-0.5" >
				<Text v="bold" >My procedures</Text>
				<Button onClick={()=>openProc(entryProc)} className="ml-auto py-1" >Main</Button>
				<Input value={procFilter} valueChange={setProcFilter} className="py-1 basis-1/2 border-1" placeholder={"Search"} />
			</div>

			<ul className={clsx("flex flex-col overflow-y-auto gap-2 pb-5 shrink grow")} ref={userProcListRef} >

				{userProcList.map(i=>{
					if (!procs.has(i) || !showProcs.has(i)) return <div key={i} className="hidden" />;
					return <ProcNode key={i} p={data} node={nodeForUserProc(i)} setNode={setNode} openProc={openProc} />;
				})}

				<Button className={blankStyle} onClick={()=>addProc()} >
					<IconPlus />
					<Text v="sm" >Create procedure</Text>
				</Button>
			</ul>
		</div>
		
		<div className="flex flex-col gap-1 editor-right min-h-0 pr-3" >
			<Text v="bold" className="mt-2" >Registers</Text>
			<ul className={clsx("flex flex-col gap-2 overflow-y-auto pb-5", stack!=undefined && "basis-1/3 shrink-0 grow max-h-fit")}
				ref={registerList} >
				{proc.registerList.map(r=>
					<RegisterEditor key={`${procI} ${r}`} p={data} reg={r} setReg={setReg} />
				)}

				<Button className={blankStyle} onClick={()=>{
					setProc(p=>({
						...p, registerList: [...p.registerList, p.maxRegister],
						registers: mapWith(p.registers, p.maxRegister, { name: null, type: "value", value: 0 }),
						maxRegister: p.maxRegister+1
					}));
				}} >
					<IconPlus />				
					<Text v="sm" >Add register</Text>
				</Button>
			</ul>
			
			{stack}
		</div>
	</>;
}

export function TextEditor({edit, setEdit, back, value, setValue}: {
	edit: EditorState, setEdit: SetFn<EditorState>,
	value: string, setValue: (x: string)=>void,
	back: ()=>void
}) {
	const ref = useRef<HTMLPreElement>(null);
	// only set value on mount
	useEffect(()=>{
		ref.current!.innerText = value;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	
	const [err, setErr] = useState<string|null>(null);

	return <div className="flex flex-col gap-2" >
		<Text v="err" >Warning: applying will overwrite procedures with names that appear below. It is recommended that you back things up beforehand, if you care about anything at all.</Text>
		<pre contentEditable ref={ref} onInput={(ev)=>setValue(ev.currentTarget.innerText)}
			className={twMerge(interactiveContainerDefault, borderColor.focus, "w-full p-2 border-2 transition duration-300 rounded-none")} />
		{err!=null && <Alert title="Failed to convert from text" txt={err} bad />}
		<div className="flex flex-row justify-between" >
			<Button icon={<IconChevronLeft className="-ml-1" />} onClick={back} >Back</Button>
			<Button onClick={()=>{
				const res = addFromText(edit, value);
				if (res.type=="error") return setErr(res.error);

				setErr(null);
				setEdit(()=>res.value);
			}} >Apply</Button>
		</div>
	</div>;
}

type PuzzleIOState = Readonly<({
	type: "decode",
	puzzle: Puzzle&{kind: "decode"},
	decoded: string, decodedDirty: string,
	encoded: string
} | {
	type: "simple",
	puzzle: Puzzle&{kind: "simple"},
	input: readonly (string|number)[],
	dirtyInput: readonly string[],
	output: string|number
})&{
	err: string|null,
	programInput: readonly (number|string)[],
}>;

type PuzzleIO = PuzzleIOState&({
	type: "simple",
	inputs: (({type: "string", value: string}|{type: "number", value: string})&{name: string})[],
	setInput: (x: string, i: number)=>void
}|{
	type: "decode",
	setDecoded: (x: string)=>void
})&{
	randomize: ()=>void,
	programInputRef: React.RefObject<readonly (number|string)[]>,
	programOutput: number|string
};

function usePuzzleIO(puzzle: Puzzle): PuzzleIO {
	const stateFromPuzzle = (random?: boolean): PuzzleIOState=>{
		if (puzzle.kind=="decode") {
			if (random!=true) return {
				type: "decode", puzzle, decoded: "",
				decodedDirty: "", encoded: "", err: null,
				programInput: [""]
			};

			const decoded = puzzle.generator(), encoded=puzzle.encode(decoded);
			return {
				type: "decode", puzzle, decoded,
				decodedDirty: decoded, encoded,
				err: null, programInput: [encoded]
			};
		}

		const obj = puzzle.generator();
		const input = puzzle.schema.map(v=>obj[v.key]);
		return {
			type: "simple", puzzle, input,
			dirtyInput: input.map(x=>x?.toString()),
			output: puzzle.solve(obj), err: null,
			programInput: input
		}
	};

	const [state, setState] = useState<PuzzleIOState>(stateFromPuzzle);
	const upState = (s: PuzzleIOState)=>{
		let err: string|null=null;
		if (s.type=="decode") {
			err = s.puzzle.validator(s.decodedDirty)
			if (err==null) {
				const encoded = s.puzzle.encode(s.decodedDirty);
				s={ ...s, decoded: s.decodedDirty, encoded, programInput: [encoded] };
			}
		} else {
			const toNumStr = s.dirtyInput.map(x=>{
				const v = strToInt(x);
				return v==null ? x : v;
			});

			for (const [x,i] of toNumStr.map((x,i)=>[x,i] as const)) {
				if (typeof x=="string" && !validTextRe.test(x)) {
					err=`Input ${s.puzzle.schema[i].name} should be a valid register value (text should be lowercase alphabetic, all numbers must be integers)`;
					break;
				}

				if (typeof x!=s.puzzle.schema[i].type) {
					err=`Input ${s.puzzle.schema[i].name} has mismatched type ${typeof x=="string" ? "text" : "number"} instead of ${s.puzzle.schema[i].type=="string" ? "text" : "number"}`;
					break;
				}
			}

			const obj = Object.fromEntries(s.puzzle.schema.map((x,i)=>[x.key, toNumStr[i]]));
			err ??= s.puzzle.validator(obj);
			if (err==null) s={
				...s, input: toNumStr, programInput: toNumStr, output: s.puzzle.solve(obj)
			};
		}

		setState({...s, err});
	};
	
	// to be used from effect without updating (i.e. only when run starts)
	const programInputRef = useRef<readonly(string|number)[]>([]);
	useEffect(()=>{ programInputRef.current = state.programInput; }, [state.programInput]);

	return {
		...state.type=="decode" ? {
			...state,
			type: "decode", programOutput: state.decoded,
			setDecoded: v=>upState({...state, decodedDirty: v})
		} : {
			...state,
			type: "simple",
			inputs: state.puzzle.schema.map((v,i)=>({
				name: v.name, type: v.type, value: state.dirtyInput[i]
			} as (PuzzleIO&{type: "simple"})["inputs"][number])),
			setInput(v,i) {
				upState({...state, dirtyInput: state.dirtyInput.toSpliced(i,1,v)});
			},
			programOutput: state.output
		},
		programInputRef, randomize: ()=>setState(stateFromPuzzle(true))
	};
}

export function Editor({edit, setEdit, nextStage, puzzle}: {
	edit: EditorState, setEdit: SetFn<EditorState>,
	puzzle: Stage&{type: "puzzle"}, nextStage: ()=>void
}) {
	const [runState, setRunState] = useState<ReturnType<typeof clone>|null>();
	const [runStatus, setRunStatus] = useState<{ type: "done"|"stopped" }
		|{ type: "paused", breakpoint?: number }
		|{ type: "running", step: boolean, restart: boolean }>({type: "stopped"});
	const [runError, setRunError] = useState<InterpreterError|null>(null);
	const [output, setOutput] = useState<[readonly(string|number)[]|null, string|number]>([null, ""]);

	const [procHistory, setProcHistory] = useState<number[]>([]);
	const [active, setActive] = useState(edit.entryProc);
	const io = usePuzzleIO(puzzle);

	const toast = useToast();
	const activeProc = edit.procs.get(active);
	useEffect(()=>{
		if (!activeProc) setActive(edit.entryProc);
	}, [activeProc, edit.entryProc]);

	const setProc = useCallback((n: (x: Procedure)=>Procedure)=>{
		setEdit(v=>{
			const newUndo = [
				...v.undoHistory.slice(0,v.curNumUndo==0 ? v.undoHistory.length : -v.curNumUndo),
				[active, v.procs.get(active)!] as const
			];

			if (newUndo.length>MAX_UNDO_STEPS) newUndo.shift();

			return {
				...v, procs: mapWith(v.procs, active, n(v.procs.get(active)!)),
				undoHistory: newUndo, curNumUndo: 0
			};
		});
	}, [active, setEdit]);
	
	const undo = useCallback((redo: boolean)=>setEdit(v=>{
		if ((!redo && v.curNumUndo >= v.undoHistory.length)
			|| (redo && v.curNumUndo==0)) {
			toast(redo ? "Out of redoes" : "Out of undoes");
			return v;
		}

		const idx = redo ? v.undoHistory.length-v.curNumUndo : v.undoHistory.length-1-v.curNumUndo
		const step = v.undoHistory[idx];

		setActive(step[0]);
		return {
			...v,
			procs: mapWith(v.procs, step[0], step[1]),
			curNumUndo: redo ? v.curNumUndo-1 : v.curNumUndo+1,
			undoHistory: v.undoHistory.toSpliced(idx, 1, [step[0], v.procs.get(step[0])!])
		};
	}), [setEdit, toast]);
	
	const setProcList = useCallback((vs: number[])=>{
		setEdit(v=>({ ...v, userProcList: vs }));
	}, [setEdit])
	
	const [frameI, setFrameI] = useState<number|null>(null);
	const [frameScrollNode, setFrameScrollNode] = useState<number|null>(null);
	const frame = frameI==null ? undefined : runState?.stack[frameI];
	
	useEffect(()=>{
		if (runState && frame && frameI==runState.stack.length-1 && runStatus.type=="paused") {
			const p = edit.procs.get(frame.proc);
			setFrameScrollNode(p?.nodeList[runState.stack[frameI].i] ?? null);
		} else {
			setFrameScrollNode(null);
		}
	}, [edit.procs, frame, frameI, runState, runStatus.type]);

	// changing active procedure should sync frame
	// and set active node
	useEffect(()=>{
		if (runState==null) { setFrameI(null); return; }
		if (frame?.proc==active) return;
		const last = runState.stack.findLastIndex(x=>x.proc==active);
		setFrameI(last==-1 ? null : last);
	}, [active, frame?.proc, runState]);

	const openFrame = useCallback((fi: number, proc: number) => {
		setFrameI(fi);
		setActive(proc);
	}, []);

	useEffect(()=>{
		const inBreakpoint = runStatus.type=="paused" && runStatus.breakpoint!=undefined && runState
			&& runState.stack.length>0 ? runState.stack.length-1 : null;

		if (inBreakpoint!=null) {
			console.log(inBreakpoint, runStatus, runState);
			console.log(inBreakpoint);
			toast("Breakpoint hit");
			openFrame(inBreakpoint, runState!.stack[inBreakpoint].proc);
		}
	}, [openFrame, runState, runStatus, setEdit, toast]);
	
	const [newProc, setNewProc] = useState({open: false, name: ""});
	const activeProcRunState = useMemo((): ProcRunState|null => {
		if (!activeProc) return null;

		return frame==null ? null : {
			activeNode: activeProc.nodeList[frame.i] ?? null,
			registers: frame.registers,
			scrollNode: frameScrollNode
		};
	}, [activeProc, frame, frameScrollNode]);
	
	const [confirmDelete, setConfirmDelete] = useState<{proc: Procedure|null, open: boolean}>({
		open: false, proc: null
	});

	const runStateRef = useRef<ProgramState|null>(null);
	const originalInput = useRef<readonly(string|number)[]|null>(null);
	const [ignoreBreakpoint, setIgnoreBreakpoint] = useState(false);
	
	useEffect(()=>{
		if (runStatus.type=="stopped") {
			setRunState(null);
			setRunError(null);
			runStateRef.current=null;
		}

		if (runStatus.type!="running") return;

		setRunError(null);
	
		const handle = (f: ()=>void) => {
			let ret=true;
			try { f(); } catch (e) {
				ret=false;
				if (e instanceof InterpreterError) {
					setRunState(runStateRef.current ? clone(runStateRef.current) : null);
					setRunStatus({type: "paused"});
					setRunError(e);
				} else {
					throw e;
				}
			}

			return ret;
		};
		
		let initV = runStateRef.current;
		const doPush = initV==null || runStatus.restart;
		if (doPush) {
			originalInput.current = io.programInputRef.current;
			if (!handle(()=>{
				runStateRef.current=initV=makeState({
					input: originalInput.current ?? [],
					entry: edit.entryProc, procs: edit.procs
				});
			})) return;
		}
		
		// should be init by handle above, otherwise return
		if (initV==null) throw new Error("unreachable");
		const v = initV;
		v.procs = edit.procs;
		v.stopOnBreakpoint=doPush && !ignoreBreakpoint;

		let cont=true;
		const doStep = ()=>{
			const xd = handle(()=>{
				const ret = step(v);
				if (ret=="breakpoint") {
					cont=false;
					const top = v.stack[v.stack.length-1];
					// needs to be computed here since modifying
					const breakNode = edit.procs.get(top.proc)?.nodeList[top.i];
					setRunStatus({ type: "paused", breakpoint: breakNode });
				} else if (ret==false) {
					cont=false;
					setOutput([originalInput.current, v.outputRegister.current]);
					setRunStatus({type: "done"});
				}
			});

			cont&&=xd;

			// after first step, re-enable breakpoints
			v.stopOnBreakpoint = !ignoreBreakpoint;
		};
		
		if (runStatus.step) {
			if (!doPush) doStep();
			if (cont) setRunStatus({ type: "paused" });			
			setRunState(clone(v));
			return;
		}
		
		// wtf, i like defining stuff before they are used
		// eslint-disable-next-line prefer-const
		let int: number|null;

		const intervalDelay = Math.max(200, 1000/edit.stepsPerS);
		const stepsPerInterval = edit.stepsPerS / (1000/intervalDelay);
		const end = ()=>{ if (int!=null) clearInterval(int); int=null; };
		let nstep = 0;
		const cb = ()=>{
			for (nstep+=stepsPerInterval; nstep>0 && cont; nstep--)
				doStep();
			setRunState(clone(v));
			if (!cont) end();
		};
		
		int = setInterval(cb, intervalDelay);
		cb();
		return ()=>end();
	}, [edit.entryProc, edit.procs, edit.stepsPerS, ignoreBreakpoint, io.programInputRef, runStatus]);
	
	const mod = (m: number) => setEdit(v=>({
		...v,
		stepsPerS: Math.max(0.1, Math.min(5000, v.stepsPerS*m))
	}));

	const play = (opt: {step?: boolean, restart?: boolean})=>{
		setRunStatus({type: "running", step: opt.step ?? false, restart: opt.restart ?? false});
	};
	
	const [referenceOpen, setReferenceOpen] = useState(false);
	const [open, setOpen] = useState<{panel: "text"|"dashboard", open: boolean}>({panel: "dashboard", open: true});
	const doOpen = ()=>setOpen({panel: "dashboard", open: true});
	const [value, setValue] = useState("");
	useEffect(()=>{
		const txt = toText({ procs: edit.procs, entry: edit.entryProc })
		setValue(txt);
	}, [edit.entryProc, edit.procs, setValue]);

	useEffect(()=>{
		if (LocalStorage.seenReference!=true) {
			setReferenceOpen(true);
			LocalStorage.seenReference=true;
		} else {
			doOpen();
		}
	}, []);

	const setSolved = useCallback(()=>setEdit(e=>({...e, solved: true})), [setEdit]);

	const goto = useGoto();

	const openProc = (i?: number)=>{
		const newProcHistory = [...procHistory];
		if (i!=null) {
			if (i!=active) newProcHistory.push(active);
		} else {
			while (i==null || !edit.procs.has(i)) {
				i = newProcHistory.pop() ?? edit.entryProc;
			}
		}

		setActive(i);
		setProcHistory(newProcHistory);
	};

	const stack = runStatus.type=="stopped" ? undefined : <div className="flex flex-col editor-right-down gap-2 min-h-0 pb-4" >
		<Divider className="mb-0" />
		<Text v="bold" >Stack</Text>

		{runError && <Alert bad title="Runtime error" txt={runError.txt()} />}

		{!runState || runState.stack.length==0 ? <div className={blankStyle} >
			The stack is empty.
		</div> : <div className={`flex flex-col ${borderColor.default} border-1 overflow-y-auto`} >
			{runState.stack.flat().map((v,i)=>{
				const p = edit.procs.get(v.proc);
				return <button key={i}
					className={clsx("w-full py-0.5 px-1 not-last:border-b-1", bgColor.default, borderColor.default, bgColor.hover, !p || i==frameI && "dark:bg-zinc-700!")}
					disabled={!p || i==frameI}
					onClick={()=>openFrame(i, v.proc)} >
					{p?.name ?? "(deleted)"}: {"#"}{v.i+1}
				</button>;
			}).reverse()}
		</div>}
	</div>;

	const stats = <AppTooltip placement="bottom" content={runState && <>
		<p>{toPrecStat(runState.stats.time, "step")}</p>
		<p>{toPrecStat(runState.stats.nodes, "node")}</p>
		<p>{toPrecStat(runState.stats.registers, "register")}</p>
	</>} disabled={runState==null} ><div>
		<IconButton disabled={runState==null} icon={<IconChartBar />} />
	</div></AppTooltip>;

	const inputSection = <>
		{io.type=="decode" ? <Input value={io.decodedDirty} valueChange={io.setDecoded} />
		: <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center justify-stretch" >
			{io.inputs.map((inp,i)=><div key={i} className="contents" >
				{inp.name}: <Input value={inp.value} valueChange={(newV)=>io.setInput(newV, i)} />
			</div>)}
		</div>}
		
		{io.err!=null && <Alert bad title="Invalid input" txt={io.err} />}
		
		{io.type=="decode" && <div className={clsx(blankStyle, "items-stretch px-8")} >
			{io.decoded.length>0 ? <div className="flex flex-row flex-wrap gap-4 gap-y-1 items-center justify-center" >
					<Text v="code" >{io.decoded}</Text>
					<IconArrowsRightLeft />
					<Text v="code" >{io.encoded}</Text>
				</div>
			: <>
				<IconInfoCircle className="self-center" />
				After generating or entering a plaintext above, you will see the ciphertext here.
				<b>Your objective is to decrypt the ciphertext (i.e. perform the reverse operation).</b>
			</>}
		</div>}
				
		{output[0]==io.programInput && (
			output[1]==io.programOutput ? <Alert className={bgColor.green} title="Test passed"
				txt={<p>Your program correctly output: <Text v="code" >{output[1].toString()}</Text></p>} />
			: <Alert bad title="Test failed" txt={
				<div className="flex flex-col gap-1" >
					<p>{output[1]=="" ? "Your program didn't output anything!" : <>
						Your program output:{" "}
						<Text v="code" >{output[1].toString()}</Text>
					</>}</p>
					<p>Expected: <Text v="code" >{io.programOutput.toString()}</Text></p>
				</div>
			} />
		)}
	</>;

	const sub = useSubmission({ setSolved, puzzle, nextStage });
	const submitButton = (sm: boolean)=><Button onClick={()=>{
		sub.setSubmission({ procs: edit.procs, active });
		doOpen();
	}} className={clsx(sm && "py-1")}
		disabled={sub.loading} icon={ sub.loading && <ThemeSpinner size="sm" /> } >
		{sub.resubmitting ? "Res" : "S"}ubmit{sm ? "" : " solution"}
	</Button>;
				
	const procInput = <>
		<div className="flex flex-row justify-between gap-2 items-end mt-2 -mb-1" >
			<Text v="bold" >Plaintext</Text>
			<div className="flex flex-row gap-1" >
				<Button className="py-1" onClick={io.randomize} >Random</Button>
				{submitButton(true)}
			</div>
		</div>
		{inputSection}
	</>;

	return <div className="grid h-dvh gap-x-4 w-full editor" >
		<div className="editor-top flex flex-row gap-4 py-1 justify-between items-center pl-4" >
			<div className="flex flex-row gap-2 items-center h-full" >
				<button onClick={()=>goto("/menu")}
					className={twMerge("flex flex-row hover:scale-105 transition-transform h-full")} >
					<LogoBack />
				</button>

				<span className="w-2" />

				{stats}
				<IconButton icon={<IconPlayerStopFilled className="fill-red-500" />}
					disabled={runStatus.type=="stopped"}
					onClick={()=>{ setRunStatus({type: "stopped"}) }} />
				
				<IconButton icon={
					runStatus.type=="done" ? <IconRotate className={"stroke-green-400"} />
						: runStatus.type!="running" ? <IconPlayerPlayFilled className={"fill-green-400"} />
						: <IconPlayerPauseFilled />
					}
					onClick={()=>{
						if (runStatus.type=="running") setRunStatus({type: "paused"});
						else play({ restart: runStatus.type=="done" });
					}} />

				<IconButton icon={<IconPlayerSkipForwardFilled className="fill-green-400 group-disabled:fill-gray-400" />}
					className="group"
					disabled={runStatus.type=="running"}
					onClick={()=>play({ restart: runStatus.type=="done", step: true })} />

				<AppTooltip content={`${ignoreBreakpoint ? "En" : "Dis"}able breakpoints`} >
					<div>
						<IconButton icon={
							ignoreBreakpoint ? <IconCircleOff className="fill-gray-500" />
							: <IconCircleFilled className="fill-red-500" />
						} onClick={()=>{ setIgnoreBreakpoint(!ignoreBreakpoint) }} />
					</div>
				</AppTooltip>

				<span className="w-2" />

				<IconButton icon={<IconPlayerTrackPrevFilled />} disabled={edit.stepsPerS<0.2}
					onClick={()=>mod(0.5)} />

				<Button className="py-1 h-fit" onClick={()=>setEdit(e=>({...e, stepsPerS: 5}))} >
					Speed: {edit.stepsPerS.toFixed(2)}
				</Button>
				
				<IconButton disabled={edit.stepsPerS>2500} icon={<IconPlayerTrackNextFilled />}
					onClick={()=>mod(2)} />
				<span className="w-2" />

				<Text v="dim" className="relative" >
					<span className="absolute left-0" >{runStatus.type}</span>
					{/* use hidden long text to prevent resizing */}
					<span className="opacity-0 -z-10" >stopped</span>
				</Text>

				<span className="w-2" />
				<Reference referenceOpen={referenceOpen} setReferenceOpen={setReferenceOpen} />
				<Messages stage={puzzle} />
			</div>

			<button className={twMerge(anchorStyle, "flex flex-row p-1 grow items-center justify-center gap-4", open.open && bgColor.md)}
				onClick={()=>setOpen(o=>({...o, open: true}))} >
				<div className="flex flex-col items-center" >
					<Text v="md" >{puzzle.name}</Text>
					<Text v="dim" >Open puzzle dashboard</Text>
				</div>
				{edit.solved && <IconCircleCheckFilled className="fill-green-400" size={32} />}
			</button>
		</div>
		
		<Modal open={open.open} onClose={()=>setOpen({panel: open.panel, open: false})}
			title={open.panel=="dashboard" ? puzzle.name : "Text editor"} >
			{open.panel=="dashboard" ? <div className="flex flex-col items-stretch gap-2" >
				<Text className="mb-1" >{puzzle.blurb}</Text>
				{puzzle.extraDesc!=undefined && <Text className="mb-1" >{puzzle.extraDesc}</Text>}
				
				<div className="flex flex-row gap-2 -mb-1" >
					<Text v="dim" >
						Plaintext
						<Anchor onClick={io.randomize} className="ml-2" >(randomize)</Anchor>
					</Text>
				</div>

				{inputSection}
				
				<Text v="sm" >
					Submit when you're ready for your solution to be judged against a random testcase. You will need to match the plaintext exactly to pass this level.
				</Text>
						
				{submitButton(false)}

				<Submission sub={sub} />
				
				<Button icon={<IconPencil />} className="self-end"
					onClick={()=>setOpen({open: true, panel: "text"})} >Text editor</Button>
			</div> : <TextEditor value={value} setValue={setValue}
				edit={edit} setEdit={setEdit} back={()=>doOpen()} />}
		</Modal>
		
		<ConfirmModal open={confirmDelete.open}
			onClose={()=>setConfirmDelete(v=>({...v, open: false}))}
			title="Delete procedure?"
			msg={`Are you sure you want to delete ${confirmDelete.proc?.name}?`}
			confirm={()=>{
			setEdit(v=>({
				...v, procs: mapWith(v.procs, active, undefined),
				userProcList: v.userProcList.filter(x=>x!=active)
			}));
		}} />

		<Modal open={newProc.open} onClose={()=>setNewProc({...newProc, open: false})} title="Create procedure" >
			<form onSubmit={(ev)=>{
				ev.preventDefault();
				if (ev.currentTarget.reportValidity()) {
					setEdit(v=>({
						...v, procs: mapWith(v.procs, v.maxProc, makeProc(newProc.name)),
						userProcList: [...v.userProcList, v.maxProc],
						maxProc: v.maxProc+1
					}));

					setNewProc({...newProc, open: false});
				}
			}} className="flex flex-col gap-2" >
				<Text>Name</Text>
				<Input autofocus {...nameInputProps} required value={newProc.name} valueChange={(v)=>{
					setNewProc({...newProc, name: v});
				}} />
				<Button>Create</Button>
			</form>
		</Modal>

		{activeProc && <ProcEditor
			proc={activeProc}
			input={procInput}
			i={active}
			setProc={setProc}
			procs={edit.procs}
			userProcList={edit.userProcList}
			setProcList={setProcList} entryProc={edit.entryProc}
			addProc={()=>setNewProc({name: "", open: true})}
			delProc={()=>setConfirmDelete({proc: activeProc, open: true})}
			openProc={openProc} back={procHistory.length>0}
			runState={activeProcRunState}
			stack={stack} undo={undo} />}
	</div>;
}