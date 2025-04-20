import { Dispatch, MutableRef, useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Procedure, Node, Register, RegisterRef, EditorState, push, clone, step, ProgramState, InterpreterError, RegisterRefClone, strLenLimit, Verdict, test } from "./eval";
import { Alert, Anchor, anchorStyle, AppTooltip, bgColor, borderColor, Button, containerDefault, debounce, Divider, Dropdown, DropdownPart, fill, HiddenInput, IconButton, Input, Loading, LocalStorage, mapSetFn, mapWith, Modal, parseExtra, Select, SetFn, setWith, stringifyExtra, Text, textColor, ThemeSpinner, throttle, useDebounce, useFnRef, useGoto } from "./ui";
import { twMerge } from "tailwind-merge";
import { IconArrowRight, IconCaretRightFilled, IconChevronCompactDown, IconChevronLeft, IconChevronRight, IconCircleCheckFilled, IconCircleMinus, IconCirclePlus, IconCirclePlusFilled, IconInfoCircle, IconMenu2, IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipForwardFilled, IconPlayerStopFilled, IconPlayerTrackNextFilled, IconPlayerTrackPrevFilled, IconPlus, IconTrash, IconX } from "@tabler/icons-preact";
import { ComponentChild, ComponentChildren, Ref } from "preact";
import { dragAndDrop, useDragAndDrop } from "@formkit/drag-and-drop/react";
import { animations, parentValues, performSort, remapNodes, setParentValues } from "@formkit/drag-and-drop";
import clsx from "clsx";
import { ChangeEvent, SetStateAction } from "preact/compat";
import { Puzzle } from "./puzzles";
import testWorker from "./testworker?worker";
import { Logo } from "./main";

const nodeStyle = twMerge(containerDefault, `rounded-sm px-4 py-2 flex flex-row gap-2 items-center pl-1.5 text-sm relative`);
const blankStyle = twMerge(nodeStyle, bgColor.secondary, "flex flex-col items-center justify-center py-4 px-2 nodrag");
const nameInputProps = { minLength: 1, maxLength: 20, pattern: "^[\\w ]+$" } as const;
const validNameRe = /^[\\w ]{1,20}$/;
const validTextRe = new RegExp(`^[a-z ]{0,${strLenLimit}}$`);

const builtinNodes: Node[] = [
	...(["add", "sub", "set", "access"] as const).map(op=>(
		{op, lhs: -1, rhs: -1}
	)),
	...(["inc", "dec"] as const).map(op=>({ op, lhs: -1 })),
	{ op: "goto", ref: "unset", conditional: null },
	{ op: "setIdx", lhs: -1, rhs: -1, idx: -1 }
];

function useValidity(callback: (v: string)=>void): {
	onChange: (ev: ChangeEvent<HTMLInputElement>)=>void
} {
	const db = useFnRef(()=>debounce(200), []);
	return {
		onChange(ev) {
			const elem = ev.currentTarget;
			if (elem!=null) db.current?.call(()=>{
				console.log(ev);
				if (elem.reportValidity())
					callback(elem.value);
			});
		}
	};
}

type EditData = {
	proc: Procedure,
	procs: ReadonlyMap<number, Procedure>,
	nodeRefs: MutableRef<Map<number|null, HTMLDivElement>>,
	regMap: ReadonlyMap<number, number>,
	regParam: ReadonlyMap<number, number>,
	nodeMap: ReadonlyMap<number|null, number>,
	disableArrows: boolean,
	runRegisters: ReadonlyMap<number, RegisterRefClone>|null
};

function RegisterPicker({p, x, setX, desc}: {
	p: EditData, x: number, setX?: (x: number)=>void, desc: string
}) {
	return <div className="flex flex-col" >
		<Text v="sm" >{desc}</Text>
		<Select options={[
				{ label: "(unset)", value: -1 },
				...p.proc.registerList.map((r,i)=>{
					const v = p.proc.registers.get(r)!;
					return {
						label: `#${i+1}${v.name!=undefined ? `: ${v.name}` : ""}`,
						value: r
					};
				})
			]}
			disabled={setX==undefined}
			placeholder={"(unset)"}
			value={x} setValue={setX} />
	</div>;
}

function iconURL(x: Node) {
	if (x.op=="goto" && x.conditional!=undefined) return "condgoto.svg";
	return `${x.op.toLowerCase()}.svg`;
}

function GotoArrow({p, node, nodeI}: {p: EditData, node: Node&{op: "goto"}, nodeI: number}) {
	const rectRef = useRef<HTMLDivElement>(null);
	const arrowRef = useRef<HTMLDivElement>(null);

	useEffect(()=>{
		if (node.ref=="unset" || p.disableArrows
			|| (node.ref!=undefined && !p.proc.nodes.has(node.ref))) return;
		const el = p.nodeRefs.current.get(node.ref);
		const el2 = p.nodeRefs.current.get(nodeI);
		const rect = rectRef.current, arrow=arrowRef.current
		if (!el || !el2 || !rect || !arrow) return;

		const updateArrow = ()=>{
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

			if (a.y > b.y) [a,b] = [b,a];
			const depth = 0.7*(2*(b.y - a.y)/parent.scrollHeight + (Math.sin((a.y+yo)/50)+1)/4);
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
		const ts = setTimeout(()=>updateArrow(), 200);

		return ()=>{
			clearTimeout(ts);
			rect.hidden=arrow.hidden=true;
		};
	}, [node, node.ref, nodeI, p]);

	return <>
		<div className="absolute w-4 nodrag" hidden ref={arrowRef} >
			<img src="/arrow.svg" />
		</div>
		<div className="absolute border-2 border-r-0 border-white nodrag" hidden ref={rectRef} />
	</>;
}

function GotoInner({p, node, setNode, nodeI}: {
	p: EditData, node: Node&{op: "goto"}, nodeI?: number
	setNode?: (x: Node)=>void
}) {
	const [selecting, setSelecting] = useState(false);

	useEffect(()=>{
		if (!selecting) return;
		const cb = (ev: MouseEvent)=>{
			const el = ev.target;
			const targetNode = [...p.nodeRefs.current.entries()]
				.filter(([,y])=>y.contains(el as globalThis.Node|null)).map(v=>v[0]);
			setNode?.({
				...node,
				ref: targetNode.length && targetNode[0]!=nodeI ? targetNode[0] : "unset"
			});
			setSelecting(false);
		};

		document.addEventListener("click", cb);
		return ()=>document.removeEventListener("click", cb);
	}, [node, nodeI, p.nodeRefs, p.proc.nodes, selecting, setNode]);
	
	const to = p.nodeMap.get(node.ref as number|null);

	return <>
		<Button onClick={()=>{
			setSelecting(true);
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
			<div className="flex flex-col gap-1" >
				<Text v="sm" >{v.name}</Text>
				<Button onClick={()=>openProc(node.procRef)} >Open</Button>
			</div>
			<div className="flex flex-row flex-wrap gap-1" >
				{params.map((param, i)=>
					<RegisterPicker key={i} p={p} x={i>=node.params.length ? -1 : node.params[i]}
						desc={param.name!=undefined ? `#${i}: ${param.name}` : `#${i}`}
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
	call: "Call another procedure with parameters."
};

function ProcNode({p, node, setNode: setNode2, openProc, nodeI, idx, active}: {
	p: EditData, node: Node, nodeI?: number, idx?: number
	setNode: (x: Node|null, i: number)=>void
	openProc: (i: number)=>void, active?: boolean
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
	} else {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode ? lhs=>setNode({...node, lhs}) : undefined} desc="a" />
			{"rhs" in node && <RegisterPicker p={p} x={node.rhs}
				setX={setNode ? rhs=>setNode?.({...node, rhs}) : undefined} desc="b" />}
		</>;
	}
	
	return <div className={twMerge(nodeStyle, "transition-colors", (active ?? false) && bgColor.highlight)} >
		<img src={`/${iconURL(node)}`} className="w-10 cursor-move mb-4" />
		{idx!=undefined && <Text v="dim" className="absolute left-1 bottom-1" >{idx}</Text>}
		{inner}
		{setNode ? <button onClick={()=>{ setNode(null); }}
			className="-mr-2 ml-auto float-end" ><IconX /></button>
			: <AppTooltip content={nodeHint[node.op]} >
				<button className="-mr-2 ml-auto float-end" ><IconInfoCircle /></button>
			</AppTooltip>}
	</div>;
}

type DragNode = { type: "proc"|"builtin"|"user", i: number};
const SelectRegisterType = Select<"param"|"string"|"number">;

const getNum = (s: string)=>{
	const v = Number.parseInt(s,10);
	if (!/^\d+$/.test(s) || isNaN(v)) return null;
	return v;
};

function RegisterEditor({p, reg, setReg}: {
	p: EditData, reg: number, setReg: (x: Register|null, i: number)=>void,
}) {
	const regI = p.regMap.get(reg)!;
	const regV = p.proc.registers.get(reg)!;

	const [value, setValue] = useState<string>(regV.type=="value" ? regV.value.toString() : "");
	const [err, setErr] = useState<string|null>(null);
	const [err2, setErr2] = useState<boolean>(false);

	const regTy = regV.type=="param" ? null : typeof regV.value;
	const emptyReg = useMemo(()=>({type: "value", name: regV.name} as const), [regV.name]);
	const paramI = p.regParam.get(reg);

	useEffect(()=>{
		let err: string|null = null;
		if (regTy=="string") {
			if (!validTextRe.test(value)) err="Text registers must only contain lowercase alphabetic characters or spaces";
			else setReg({...emptyReg, value}, reg);
		} else if (regTy=="number") {
			const v = getNum(value);
			if (v==null) err="Invalid number";
			else setReg({...emptyReg, value: v}, reg);
		}

		setErr(err);
	}, [value, regTy, setReg, emptyReg, reg]);

	const regRef = p.runRegisters?.get(reg);
	const regCurV = regRef?.current?.toString();

	const [runValue, setRunValue] = useState(regCurV);
	useEffect(()=>{
		setRunValue(regCurV);
		setErr2(false);
	}, [regCurV])

	const setRunV = (x: string)=>{
		if (!regRef) return;
		if (validTextRe.test(x)) regRef.mutable.current=x;
		else {
			const num = getNum(x);
			if (num!=null) regRef.mutable.current=x;
			else setErr2(true);
		}

		setRunValue(x);
	};

	return <div className={twMerge(nodeStyle, "flex flex-col pl-2 items-stretch gap-1 pr-1")} >
		<div className="flex flex-row gap-2 mb-1 items-center" >
			<Text v="bold" >{"#"}{regI+1}</Text>
			<HiddenInput defaultValue={regV.name==null ? "" : regV.name}
				placeholder={"(unnamed)"}
				{...useValidity(v=>setReg({ ...regV, name: v.length==0 ? null : v }, reg))}
				{...nameInputProps} />
			<IconButton className="ml-auto" icon={<IconX />} onClick={()=>{
				setReg(null, reg);
			}} />
		</div>

		<Text v="dim" >Register type:</Text>
		<SelectRegisterType className="w-full" options={[
			{ label: "Parameter", value: "param" },
			{ label: "String", value: "string" },
			{ label: "Number", value: "number" }
		] as const} value={regV.type=="param" ? "param"
			: typeof regV.value=="string" ? "string" : "number"}
			setValue={v=>{
				if (v=="param") setReg({...regV, type: "param"}, reg);
				else if (v=="number") setReg({...regV, type: "value", value: 0}, reg);
				else if (v=="string") setReg({...regV, type: "value", value: value.toString()}, reg);
			}} />

		{regV.type=="value" && <>
			<Input className={clsx(err!=null && borderColor.red)} value={value} onChange={ev=>setValue(ev.currentTarget.value)} />
			{err!=null && <Alert bad txt={err} />}
		</>}
		
		{paramI!=undefined && <>
			<Text v="smbold" className="self-center" >Parameter {"#"}{paramI+1}</Text>
		</>}
		
		{runValue!=undefined && <>
			<Divider className="my-1" />
			<Text v="dim" >Current value ({typeof runValue=="string" ? "text" : "numeric"}):</Text>

			<Input className={clsx(err2!=null && borderColor.red)} value={runValue}
				onChange={ev=>setRunV(ev.currentTarget.value)} />
			{err2 && <Alert bad txt="Invalid register value" />}
		</>}
	</div>;
}

type ProcRunState = {
	activeNode?: number,
	registers: ReadonlyMap<number, RegisterRefClone>
};

type UserProcs = {
	procs: ReadonlyMap<number, Procedure>,
	userProcList: number[],
	isUserProc: boolean,

	addProc: ()=>void,
	delProc: ()=>void,
	openProc: (i?: number)=>void,
	setProcList: (vs: number[])=>void
};

const dragOpts = {
	draggable(child: HTMLElement) { return !child.classList.contains("nodrag"); },
	plugins: [animations()]
};

function ProcEditor({
	proc, setProc, procs, userProcList, isUserProc,
	addProc, setProcList, delProc, openProc, runState, stack
}: {
	proc: Procedure, setProc: SetFn<Procedure>,
	runState: ProcRunState|null, stack?: ComponentChildren
}&UserProcs) {
	const nodeRefs = useRef(new Map<number|null,HTMLDivElement>());
	const [disableArrows, setDisableArrows] = useState(false);
	const data: EditData = useMemo(()=>{
		return {
			proc, procs,
			nodeRefs,
			regMap: new Map(proc.registerList.map((v,i)=>[v,i])),
			regParam: new Map(proc.registerList.filter(a=>proc.registers.get(a)?.type=="param")
				.map((x,i)=>[x,i])),
			nodeMap: new Map([
				...proc.nodeList.map((v,i)=>[v,i] satisfies [number|null, number]),
				[null, proc.nodeList.length]
			]),
			disableArrows,
			runRegisters: runState?.registers ?? null
		} as const;
	}, [proc, procs, disableArrows, runState?.registers]);

	const nodeForUserProc = useCallback((i: number): Node => {
		const proc = procs.get(i)!;
		const nParam = proc.registerList.reduce((a,b)=>a+(proc.registers.get(b)?.type=="param" ? 1 : 0),0);
		return {
			op: "call", procRef: i,
			params: fill(nParam, -1)
		};
	}, [procs]);

	const updateFromDrag = useCallback((xs: DragNode[]) => setProc(p=>{
		const newNodes = new Map(p.nodes);
		let maxNode = p.maxNode;
		const nodeList = xs.map(v=>{
			if (v.type=="proc") return v.i;
			newNodes.set(maxNode, v.type=="user" ? nodeForUserProc(v.i) : builtinNodes[v.i]);
			return maxNode++;
		});

		return { ...p, nodeList, nodes: newNodes, maxNode };
	}), [nodeForUserProc, setProc]);

	// shitty stuff to accept builtin / procs
	const nodeRef = useRef<HTMLUListElement>(null);
	useEffect(()=>{
		const initDragNodes = proc.nodeList.map(i=>({i, type: "proc"} satisfies DragNode));

		dragAndDrop<HTMLUListElement, DragNode>({
			parent: nodeRef.current, group: "proc",
			state: [ initDragNodes, updateFromDrag as Dispatch<SetStateAction<DragNode[]>> ],
			performTransfer({ initialParent, targetParent, draggedNodes, targetNodes }) {
				remapNodes(initialParent.el);
				remapNodes(targetParent.el);

				const idx = targetNodes.length ? targetNodes[0].data.index : targetParent.data.enabledNodes.length;
				const vs = parentValues(targetParent.el, targetParent.data);
				const up = vs.toSpliced(idx, 0, ...draggedNodes.map(v=>v.data.value));
				setParentValues(targetParent.el, targetParent.data, up);
			},
			performSort(obj) {
				// can only sort nodes in proc (i dare u to remove this)
				if (obj.draggedNodes.some(v=>v.data.value.type!="proc")) return;
					performSort(obj);
			},
			onDragstart() { setDisableArrows(true); },
			onDragend() { setDisableArrows(false); },
			...dragOpts
		});
	}, [proc.nodeList, updateFromDrag]);

	const builtinDragNodes = fill(builtinNodes.length, i=>({ type: "builtin", i } as const));

	const [builtinRef] = useDragAndDrop<HTMLUListElement, DragNode>(builtinDragNodes, {
		sortable: false, group: "proc", dropZone: false, plugins: [animations()],
	}) as unknown as [Ref<HTMLUListElement>, DragNode[]]; // preact compat

	const userProcListRef = useRef<HTMLUListElement>(null);
	useEffect(()=>{
		dragAndDrop<HTMLUListElement, DragNode>({
			parent: userProcListRef.current,
			state: [
				userProcList.map(i=>({type: "user", i})),
				((nodes: DragNode[])=>setProcList(nodes.map(x=>x.i))) as Dispatch<SetStateAction<DragNode[]>>
			],
			group: "proc", 
			performTransfer() {},
			...dragOpts
		}) as unknown as [Ref<HTMLUListElement>, DragNode[]]; // preact compat
	}, [setProcList, userProcList]);

	const nodeRefSetter = (node: number|null) => (el: HTMLDivElement|null) => {
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
		dragAndDrop({
			parent: registerList.current,
			state: [
				proc.registerList as number[], // mutability
				(
					(registerList: number[])=>setProc(p=>({...p, registerList}))
				) as Dispatch<SetStateAction<number[]>>
			],
			...dragOpts
		});
	}, [proc.registerList, registerList, setProc])

	const procNameValidity = useValidity(v=>setProc(p=>({...p, name: v})))

	return <>
		<div className="flex flex-col items-stretch gap-2 editor-left min-h-0" >
			<div className={clsx("mb-2 flex flex-row gap-3 items-end pl-1 h-11", !isUserProc && "pl-2")} >
				{isUserProc && <Anchor className="items-center self-end mr-2" onClick={()=>openProc()} >
					<IconChevronLeft size={32} />
				</Anchor>}

				{!isUserProc ? <Text v="bold" >Procedure <Text v="code" >{proc.name}</Text></Text>
				: <>
					<Text v="bold" >Procedure</Text>
					<HiddenInput defaultValue={proc.name} {...procNameValidity} className="w-fit -mb-1" />
				</>}
				
				{isUserProc && <IconButton className="ml-auto" icon={<IconTrash />} onClick={()=>{delProc();}} />}
			</div>
			 
			<ul ref={nodeRef} className="pl-[50px] flex flex-col gap-1 items-stretch overflow-y-auto relative" >
				{proc.nodeList.flatMap((v,i)=>{
					const node = proc.nodes.get(v)!;
					return [
						<div key={v} ref={nodeRefSetter(v)} >
							{node!=undefined && <ProcNode p={data} node={node} idx={i+1} setNode={setNode}
								nodeI={v} openProc={openProc} active={runState?.activeNode==v} />}
						</div>,
						...node.op=="goto" ? [
							<GotoArrow key={`arrow${v}`} p={data} node={node} nodeI={v} />
						] : [],
						<IconChevronCompactDown className="self-center nodrag" key={`sep${v}`} />
					];
				})}
			
				<div className={blankStyle} ref={nodeRefSetter(null)} >
					{proc.nodeList.length==0 ? <>
						<IconInfoCircle />
						<Text v="sm" >Use the library on the right to add nodes</Text>
					</> : <>
						<img src="/end.svg" className="w-7" />
						<Text v="sm" >End of procedure</Text>
						<Text v="dim" className="bottom-1 left-1 absolute" >{proc.nodeList.length+1}</Text>
					</>}
				</div>
			</ul>
		</div>
		
		<div className="flex flex-col gap-2 editor-mid-up min-h-0" >
			<Text v="bold" className="mb-2" >Built-in</Text>
			<ul className="flex flex-col gap-2 overflow-y-auto" ref={builtinRef} >
				{builtinNodes.map(v=><ProcNode key={v.op} p={data} node={v} setNode={setNode} openProc={openProc} />)}
			</ul>
			
			<Divider className="mt-auto" />
		</div>

		<div className="flex flex-col gap-2 editor-mid-down min-h-0" >
			<Text v="bold" className="mb-2" >My procedures</Text>
			<ul className="flex flex-col gap-2 overflow-y-auto" ref={userProcListRef} >
				{userProcList.map(i=>{
					if (!procs.has(i)) return <div key={i} />;
					return <ProcNode key={i} p={data} node={nodeForUserProc(i)} setNode={setNode} openProc={openProc} />;
				})}

				<Button className={blankStyle} onClick={()=>addProc()} >
					<IconPlus />
					<Text v="sm" >Create procedure</Text>
				</Button>
			</ul>
		</div>
		
		<div className="flex flex-col gap-2 editor-right min-h-0" >
			<Text v="bold" className="mb-2" >Registers</Text>
			<ul className={clsx("flex flex-col gap-2 overflow-y-auto", stack!=undefined && "max-h-1/3")}
				ref={registerList} >
				{proc.registerList.map(r=>
					<RegisterEditor key={r} p={data} reg={r} setReg={setReg} />
				)}

				<Button className={blankStyle} onClick={()=>{
					setProc(p=>({
						...p, registerList: [...p.registerList, p.maxRegister],
						registers: mapWith(p.registers, p.maxRegister, { name: null, type: "value", value: "" }),
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

export const makeProc = (name: string): Procedure => ({
	name, registerList: [], registers: new Map(),
	nodeList: [], nodes: new Map(), maxNode: 0, maxRegister: 0,
});

export function PuzzleInput({puzzle, edit, output, setInput, setSolved, nextStage}: {
	puzzle: Puzzle, edit: EditorState, output: string|null,
	setInput: (x: string)=>void, setSolved: ()=>void,
	nextStage: ()=>void
}) {
	const input = edit.input;
	const [input2, setInput2] = useState(input);
	useEffect(()=>setInput2(input), [input]);
	const [err, setErr] = useState(false);

	const up = useCallback((v: string) => {
		const err=!validTextRe.test(v);
		setErr(err);
		if (!err) setInput(v);
		setInput2(v);
	}, [setInput]);
	
	const solution = useMemo(()=>puzzle.solve(input), [input, puzzle]);

	const [submission, setSubmission] = useState<{type: "judging"}|{
		type: "done", verdict: Verdict
	}|null>(null);

	useEffect(()=>{
		if (submission?.type=="judging") {
			const worker = new testWorker();

			const tc = puzzle.generator();
			worker.postMessage(stringifyExtra({
				input: tc, output: puzzle.solve(tc),
				proc: edit.active, procs: edit.procs
			} satisfies Parameters<typeof test>[0]))
			
			worker.onmessage = (msg)=>{
				const v = parseExtra(msg.data as string) as ReturnType<typeof test>;
				setSubmission({type: "done", verdict: v});
				up(tc);
				
				if (v.type=="AC") {
					LocalStorage.solvedPuzzles = setWith(LocalStorage.solvedPuzzles??null, puzzle.key);
					setSolved();
				}
			};
			
			worker.onerror = (err)=>{
				console.error("worker error", err);
				setSubmission(null);

				if (err instanceof Error) throw err;
				else throw new Error("unknown worker error");
			};
			
			return ()=>worker.terminate();
		}
	}, [edit.active, edit.procs, input, puzzle, setSolved, solution, submission?.type, up])

	return <div className="flex flex-col items-stretch gap-2" >
		<Text className="mb-1" >{puzzle.blurb}</Text>
		
		<div className="flex flex-row gap-2 -mb-1" >
			<Text v="dim" >
				Input
				<Anchor onClick={()=>up(puzzle.generator())} className="ml-2" >(randomize)</Anchor>
			</Text>
		</div>

		<Input value={input2} onChange={(ev)=>up(ev.currentTarget.value)} />
		
		{err && <Alert bad title="Invalid input"
			txt="Your input should only contain lowercase alphabetical characters and spaces" />}
		
		<div className={blankStyle} >
			{input.length>0 ? <>
				<div className="flex flex-row flex-wrap gap-4 items-center justify-center" >
					<Text v="code" >{input}</Text>
					<IconArrowRight />
					<Text v="code" >{solution}</Text>
				</div>
				
				{output==input ? <Alert className={bgColor.green} title="Test passed"
					txt="Your program output the same text." /> : output!=null && <>
					<Alert bad title="Test failed" txt={<div className="flex flex-col gap-1" >
						{output.length==0 ? "Your program didn't output anything!" : <>
							Your program output:
							<Text v="code" >{output}</Text>
						</>}
					</div>} />
				</>}
			</> : <>
				<IconInfoCircle />
				After generating or entering an input above, you will see the target output here.
			</>}
		</div>
		
		<Text v="sm" >
			Submit when you're ready for your solution to be judged against a random testcase. You will need to match the output exactly to pass this level.
		</Text>

		<Button onClick={()=>{
			setSubmission({type: "judging"});
		}} disabled={submission?.type=="judging"} icon={
			submission?.type=="judging" && <ThemeSpinner size="sm" />		
		} >
			Submit solution
		</Button>
		
		{submission?.type=="done" && (submission.verdict.type=="AC"
			? <Alert className={bgColor.green} title="You passed" txt={<>
				Congratulations -- onwards!
				<Button onClick={()=>nextStage()} >Continue</Button>
			</>} />
			: <Alert bad title="Test failed" txt={
				`Verdict: ${({
					WA: "wrong answer",
					RE: "runtime error",
					TLE: "time limit exceeded"
				} as const)[submission.verdict.type]}`
			} />
		)}
	</div>;
}

export function Editor({edit, setEdit, nextStage}: {
	edit: EditorState, setEdit: SetFn<EditorState>, nextStage: ()=>void
}) {
	const [runState, setRunState] = useState<ProgramState<RegisterRefClone>|null>();
	const [runStatus, setRunStatus] = useState<{ type: "done"|"paused"|"stopped" }
		|{ type: "running", step: boolean }>({type: "stopped"});
	const [runError, setRunError] = useState<InterpreterError|null>(null);
	const [output, setOutput] = useState<string|null>(null);

	const activeProc = edit.procs.get(edit.active);
	useEffect(()=>{
		if (!activeProc) setEdit(v=>({...v, active: v.entryProc}));
	}, [activeProc, setEdit]);

	const setProc = useCallback((n: (x: Procedure)=>Procedure)=>{
		setEdit(v=>({
			...v, procs: mapWith(v.procs, edit.active, n(v.procs.get(edit.active)!))
		}));
	}, [edit.active, setEdit]);
	
	const setProcList = useCallback((vs: number[])=>{
		setEdit(v=>({ ...v, userProcList: vs }));
	}, [setEdit])
	
	const [newProc, setNewProc] = useState({open: false, name: ""});
	const activeProcRunState = useMemo((): ProcRunState|null => {
		if (!activeProc) return null;
		const frame = runState?.stack.find(x=>x.proc==edit.active);

		return frame==undefined ? null : {
			activeNode: activeProc.nodeList[frame.i],
			registers: frame.registers
		};
	}, [activeProc, edit.active, runState?.stack]);
	
	const [confirmDelete, setConfirmDelete] = useState(false);
	const runStateRef = useRef<ProgramState|null>(null);
	
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
		
		let v = runStateRef.current;
		const doPush = v==null;
		if (v==null) {
			const newV ={
				stack: [], procs: edit.procs,
				outputRegister: {current: edit.input}
			};

			runStateRef.current=v=newV;
			if (!handle(()=>push(newV, edit.entryProc, [newV.outputRegister]))) return;
		}

		let cont=true;
		const doStep = ()=>{
			const xd = handle(()=>{
				const ret = step(v);
				if (!ret) {
					cont=false;
					setOutput(v.outputRegister.current.toString());
					setRunStatus({type: "done"});
				}
			});
			cont&&=xd;
		};
		
		if (runStatus.step) {
			if (!doPush) doStep();
			if (cont) setRunStatus({ type: "paused" });			
			setRunState(clone(v));
			return;
		}
		
		const rl = throttle(200);

		// wtf, i like defining stuff before they are used
		// eslint-disable-next-line prefer-const
		let int: number|undefined;
		const cb = ()=>{
			doStep();
			rl.call(()=>setRunState(clone(v)));
			if (!cont) clearInterval(int);
		};
		
		cb();
		int = setInterval(cb, 1000/edit.stepsPerS);

		return ()=>{
			clearInterval(int);
			setRunState(clone(v));
			rl[Symbol.dispose]();
		};
	}, [edit.entryProc, edit.input, edit.procs, edit.stepsPerS, runStatus]);
	
	const mod = (m: number) => setEdit(v=>({
		...v,
		stepsPerS: Math.max(0.1, Math.min(1000, v.stepsPerS*m))
	}));

	const play = (step?: boolean)=>{
		setRunStatus({type: "running", step: step ?? false});
	};
	
	const [open, setOpen] = useState(true);

	const setInput = useCallback((inp: string)=>setEdit(e=>({...e, input: inp})), [setEdit]);
	const markSolved = useCallback(()=>setEdit(e=>({...e, solved: true})), [setEdit]);
	useEffect(()=>setOutput(null), [edit.input, setOutput]);
	const goto = useGoto();

	const stack = runState && <div className="flex flex-col editor-right-down gap-2 min-h-0" >
		<Divider className="mb-0" />
		<Text v="bold" >Stack</Text>

		{runError && <Alert bad title="Runtime error" txt={runError.txt()} />}

		{runState.stack.length==0 ? <div className={blankStyle} >
			The stack is empty.
		</div> : <div className={`flex flex-col ${borderColor.default} border-1 overflow-y-auto`} >
			{runState.stack.flat().map((v,i)=>{
				const p = edit.procs.get(v.proc);
				return <button key={i}
					className={clsx("w-full py-0.5 px-1 not-last:border-b-1", bgColor.default, borderColor.default, bgColor.hover, !p || edit.active==v.proc && "dark:bg-zinc-700!")}
					disabled={!p || edit.active==v.proc}
					onClick={()=>setEdit(e=>({...e, active: v.proc}))} >
					{p?.name ?? "(deleted)"}: {"#"}{v.i+1}
				</button>;
			}).reverse()}
		</div>}
	</div>;

	return <div className="grid h-dvh gap-x-4 pl-3 px-5 w-full editor" >
		<div className="editor-top flex flex-row gap-4 py-1 justify-between items-center pb-1" >
			<div className="flex flex-row gap-2 items-center h-full" >
				<button onClick={()=>goto("/menu")}
					className={twMerge("flex flex-row hover:scale-105 transition-transform h-full")} >
					<img src="/logo.svg" className="max-h-full" />
				</button>

				<span className="w-2" />
				
				{runStatus.type!="stopped" && <IconButton icon={<IconPlayerStopFilled className="fill-red-500" />}
					onClick={()=>{ setRunStatus({type: "stopped"}) }} />}

				
				<IconButton icon={runStatus.type!="running" ? <IconPlayerPlayFilled className="fill-green-400" /> : <IconPlayerPauseFilled />}
					disabled={runStatus.type=="done"} onClick={()=>play()} />

				{runStatus.type!="running" && <IconButton icon={<IconPlayerSkipForwardFilled className="fill-green-400" />}
					disabled={runStatus.type=="done"} onClick={()=>play(true)} />}
					
				<span className="w-2" />

				<IconButton icon={<IconPlayerTrackPrevFilled />} disabled={edit.stepsPerS<0.2}
					onClick={()=>mod(0.5)} />

				<Button className="py-1 h-fit" onClick={()=>setEdit(e=>({...e, stepsPerS: 5}))} >
					Speed: {edit.stepsPerS}
				</Button>
				
				<IconButton disabled={edit.stepsPerS>500} icon={<IconPlayerTrackNextFilled />}
					onClick={()=>mod(2)} />
				<span className="w-2" />

				<Text v="dim" >{runStatus.type}</Text>
			</div>

			{edit.puzzle ? <button className={twMerge(anchorStyle, "flex flex-row p-1 grow items-center justify-center gap-4")}
				onClick={()=>setOpen(true)} >
				<div className="flex flex-col items-center" >
					<Text v="md" >{edit.puzzle.name}</Text>
					<Text v="dim" >Puzzle info and input</Text>
				</div>
				{edit.solved && <IconCircleCheckFilled className="fill-green-400" size={32} />}
			</button> : <Text v="md" className={textColor.dim} >
				No puzzle
			</Text>}
		</div>
		
		{edit.puzzle && <Modal open={open} onClose={()=>setOpen(false)} title={edit.puzzle.name} >
			<PuzzleInput puzzle={edit.puzzle} edit={edit} output={output}
				setInput={setInput} setSolved={markSolved} nextStage={nextStage} />
		</Modal>}
		
		<Modal open={confirmDelete} onClose={()=>setConfirmDelete(false)} title="Delete procedure?" className="flex flex-col gap-2" >
			<Text>Are you sure you want to delete {activeProc?.name}?</Text>
			<div className="flex flex-row gap-2" >
				<Button className={bgColor.red} onClick={()=>{
					setEdit(v=>({
						...v, procs: mapWith(v.procs, edit.active, undefined),
						userProcList: v.userProcList.filter(x=>x!=edit.active)
					}));
					setConfirmDelete(false);
				}} >Delete</Button>
				<Button onClick={()=>setConfirmDelete(false)} >Cancel</Button>
			</div>
		</Modal>

		<Modal open={newProc.open} onClose={()=>setNewProc({...newProc, open: false})} title="Create procedure" >
			<form onSubmit={(ev)=>{
				ev.preventDefault();
				if (ev.currentTarget.reportValidity()) {
					setEdit(v=>({
						...v, procs: mapWith(v.procs, v.maxProc, makeProc(newProc.name)),
						userProcList: [...v.userProcList, v.maxProc],
						maxProc: v.maxProc+1
					}));

					setNewProc({open: false, name: ""});
				}
			}} className="flex flex-col gap-2" >
				<Text>Name</Text>
				<Input {...nameInputProps} value={newProc.name} onChange={(ev)=>{
					setNewProc({...newProc, name: ev.currentTarget.value});
				}} />
				<Button>Create</Button>
			</form>
		</Modal>

		{activeProc && <ProcEditor proc={activeProc}
			setProc={setProc}
			procs={edit.procs}
			userProcList={edit.userProcList}
			setProcList={setProcList} isUserProc={edit.entryProc!=edit.active}
			addProc={()=>setNewProc({...newProc, open: true})}
			delProc={()=>setConfirmDelete(true)}
			openProc={(i)=>setEdit(v=>({...v, active: i ?? v.entryProc}))}
			runState={activeProcRunState}
			stack={stack} />}
	</div>;
}