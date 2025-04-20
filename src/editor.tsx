import { Dispatch, MutableRef, useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Procedure, Node, Register } from "./eval";
import { Alert, bgColor, borderColor, Button, containerDefault, Divider, Dropdown, DropdownPart, HiddenInput, IconButton, Input, mapWith, Select, SetFn, Text, throttle } from "./ui";
import { twMerge } from "tailwind-merge";
import { IconCaretRightFilled, IconChevronCompactDown, IconCircleMinus, IconCirclePlus, IconCirclePlusFilled, IconPlus, IconX } from "@tabler/icons-preact";
import { ComponentChild, Ref } from "preact";
import { dragAndDrop, useDragAndDrop } from "@formkit/drag-and-drop/react";
import { animations, parentValues, performSort, remapNodes, setParentValues } from "@formkit/drag-and-drop";
import clsx from "clsx";
import { SetStateAction } from "preact/compat";

const nodeStyle = twMerge(containerDefault, `rounded-sm px-4 py-2 flex flex-row gap-4 items-center pl-1 text-sm relative`);
const nameInputProps = { minLength: 5, maxLength: 20, pattern: "^\w+$" } as const;

const builtinNodes: Node[] = [
	...(["add", "sub", "set"] as const).map(op=>(
		{op, lhs: -1, rhs: -1}
	)),
	...(["inc", "dec"] as const).map(op=>({ op, lhs: -1 })),
	{ op: "goto", ref: "unset", conditional: -1 },
];

type ProcData = {
	proc: Procedure,
	nodeRefs: MutableRef<Map<number|undefined, HTMLDivElement>>,
	regMap: Map<number, number>,
	regParam: Map<number, number>,
	nodeMap: Map<number|undefined, number>,
	disableArrows: boolean
};

function RegisterPicker({p, x, setX, desc}: {
	p: ProcData, x: number, setX?: (x: number)=>void, desc: string
}) {
	return <div className="flex flex-col" >
		<Text v="sm" >{desc}</Text>
		<Select options={[
			{ label: "(unset)", value: -1 },
			...p.proc.registerList.map((r,i)=>{
				const v = p.proc.registers.get(r)!;
				return {
					label: `#${i+1}${v.name ? `: ${v.name}` : ""}`,
					value: r
				};
			})
		]}
		value={x} setValue={setX} />
	</div>;
}

function iconURL(x: Node) {
	if (x.op=="goto" && x.conditional!=undefined) return "condgoto.svg";
	return `${x.op}.svg`;
}

function GotoArrow({p, node, nodeI}: {p: ProcData, node: Node&{op: "goto"}, nodeI: number}) {
	const rectRef = useRef<HTMLDivElement>(null);
	const arrowRef = useRef<HTMLDivElement>(null);

	useEffect(()=>{
		if (node.ref=="unset" || p.disableArrows) return;
		const el = p.nodeRefs.current.get(node.ref);
		const el2 = p.nodeRefs.current.get(nodeI);
		const rect = rectRef.current, arrow=arrowRef.current
		if (!el || !el2 || !rect || !arrow) return;

		const updateArrow = ()=>{
			let a = el2.getBoundingClientRect()
			let b = el.getBoundingClientRect();

			rect.hidden=arrow.hidden=false;
			const c = rect.offsetParent!.getBoundingClientRect();
			const arrowHeight = arrow.getBoundingClientRect().height;
			
			// adjust for border...
			arrow.style.top = `${b.y + b.height/2 - c.top - arrowHeight/2 
				+ (a.y < b.y ? -1 : 1)}px`;
			arrow.style.right = `${c.right - b.left - 1}px`;

			if (a.y > b.y) [a,b] = [b,a];
			const depth = 2*(b.y - a.y)/c.height + (Math.sin(a.y/50)+1)/3;
			const obj = {
				top: `${a.y + a.height/2 - c.top}px`,
				bottom: `${c.bottom - (b.y + b.height/2)}px`,
				right: `${c.right - Math.max(a.left, b.left)}px`,//`${c.right - Math.min(a.right, b.right)}px`,
				left: `calc(${Math.max(a.left, b.left) - c.left}px - ${depth*3+1}rem)`
			} as const;
			
			type ObjKey = keyof typeof obj;
			for (const k in obj) {
				rect.style[k as ObjKey]=obj[k as ObjKey];
			}
		};

		updateArrow();
		const ts = setTimeout(()=>updateArrow(), 100);

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
	p: ProcData, node: Node&{op: "goto"}, nodeI?: number
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
	
	const to = p.nodeMap.get(node.ref as number|undefined);

	return <>
		<Button onClick={()=>{
			setSelecting(true);
		}} className={
			selecting ? bgColor.highlight : node.ref=="unset" && setNode ? bgColor.red : ""
		} >
			{to==undefined ? "Jump to..." : `Jump: ${to+1}`}
		</Button>
		<RegisterPicker desc="cond" p={p} x={node.conditional ?? -1} setX={
			setNode ? v=>setNode({...node, conditional: v<0 ? undefined : v}) : undefined
		} />
	</>;
}

function ProcNode({p, node, setNode: setNode2, nodeI, idx}: {
	p: ProcData, node: Node, nodeI?: number, idx?: number
	setNode: (x: Node|null, i: number)=>void
}) {
	const setNode = nodeI==undefined ? undefined : (newNode: Node|null)=>setNode2(newNode, nodeI);

	let inner: ComponentChild;
	if (node.op=="goto") {
		inner=<GotoInner p={p} node={node} nodeI={nodeI} setNode={setNode} />;
	} else if (node.op=="call") {
		inner = <></>;
	} else {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode ? lhs=>setNode({...node, lhs}) : undefined} desc="a" />
			{"rhs" in node && <RegisterPicker p={p} x={node.rhs}
				setX={setNode ? rhs=>setNode?.({...node, rhs}) : undefined} desc="b" />}
		</>;
	}
	
	return <div className={nodeStyle} >
		<img src={`/${iconURL(node)}`} className="w-10 cursor-move mb-4" />
		{idx && <Text v="dim" className="absolute left-1 bottom-1" >{idx}</Text>}
		{inner}
		{setNode && <IconButton icon={<IconX />} onClick={()=>{ setNode(null); }}
			className="-mr-2 ml-auto float-end" />}
	</div>;
}

type DragNode = { type: "proc"|"builtin", i: number};
const SelectRegisterType = Select<"param"|"string"|"number">;

function RegisterEditor({p, reg, setReg}: {
	p: ProcData, reg: number, setReg: (x: Register|null, i: number)=>void,
}) {
	const regI = p.regMap.get(reg)!;
	const regV = p.proc.registers.get(reg)!;

	const [value, setValue] = useState<string>("");
	const [err, setErr] = useState<string|null>(null);

	const regTy = regV.type=="param" ? null : typeof regV.value;
	const emptyReg = useMemo(()=>({type: "value", name: regV.name} as const), [regV.name]);
	const paramI = p.regParam.get(reg);

	useEffect(()=>{
		if (regTy=="string") {
			setReg({...emptyReg, value}, reg);
			setErr(null);
		} else if (regTy=="number") {
			const numV = Number.parseInt(value, 10);
			if (!/^\d+$/.test(value) || isNaN(numV)) setErr("Invalid number");
			else { setReg({...emptyReg, value: numV}, reg); setErr(null); }
		}
	}, [value, regTy, setReg, emptyReg, reg]);

	return <div className={twMerge(nodeStyle, "flex flex-col pl-2 items-stretch gap-1 pr-1")} >
		<div className="flex flex-row gap-2 mb-1 items-center" >
			<Text v="bold" >{"#"}{regI+1}</Text>
			<HiddenInput value={regV.name==undefined ? "(unnamed)" : regV.name}
				onChange={(ev)=>{
					if (ev.currentTarget.checkValidity()) setReg({
						...regV, name: ev.currentTarget.value
					}, reg);
				}} {...nameInputProps} />
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
			<Input className={clsx(err && borderColor.red)} value={value} onChange={ev=>setValue(ev.currentTarget.value)} />
			{err && <Alert bad txt={err} />}
		</>}
		
		{paramI!=undefined && <>
			<Text v="smbold" className="self-center pt-2" >Parameter {"#"}{paramI+1}</Text>
		</>}
	</div>;
}

function ProcEditor({proc, setProc}: {
	proc: Procedure, setProc: SetFn<Procedure>
}) {
	const nodeRefs = useRef(new Map<number|undefined,HTMLDivElement>());
	const [disableArrows, setDisableArrows] = useState(false);
	const procData: ProcData = useMemo(()=>{
		return {
			proc,
			nodeRefs,
			regMap: new Map(proc.registerList.map((v,i)=>[v,i])),
			regParam: new Map(proc.registerList.filter(a=>proc.registers.get(a)?.type=="param")
				.map((x,i)=>[x,i])),
			nodeMap: new Map([
				...proc.nodeList.map((v,i)=>[v,i] satisfies [number|undefined, number]),
				[undefined, proc.nodeList.length]
			]),
			disableArrows
		} as const;
	}, [proc, disableArrows]);

	const initDragNodes = proc.nodeList.map(i=>({i, type: "proc"} satisfies DragNode));

	const updateFromDrag = useCallback((xs: DragNode[]) => setProc(p=>{
		const newNodes = new Map(p.nodes);
		const nodeList = xs.map(v=>{
			if (v.type=="proc") return v.i;
			newNodes.set(newNodes.size, builtinNodes[v.i]);
			return newNodes.size-1;
		});

		return { ...p, nodeList, nodes: newNodes };
	}), [setProc]);

	// shitty stuff to accept builtin / procs
	const [nodeRef, dragNodes, setDragNodes] = useDragAndDrop<HTMLUListElement, DragNode>(initDragNodes, {
		group: "proc", plugins: [animations()],
		performTransfer({ initialParent, targetParent, draggedNodes, targetNodes }) {
			remapNodes(initialParent.el);
			remapNodes(targetParent.el);

			const idx = targetNodes.length ? targetNodes[0].data.index : targetParent.data.enabledNodes.length;
			const vs = parentValues(targetParent.el, targetParent.data);
			const up = vs.toSpliced(idx, 0, ...draggedNodes.map(v=>v.data.value));
			setParentValues(targetParent.el, targetParent.data, up);
			updateFromDrag(up);
		},
		performSort(obj) {
			// can only sort nodes in proc (i dare u to remove this)
			if (obj.draggedNodes.some(v=>v.data.value.type=="builtin")) return;
				performSort(obj);
		},
		onDragstart() { setDisableArrows(true); },
		onDragend(data) {
			updateFromDrag(parentValues(data.parent.el, data.parent.data) as DragNode[]);
			setDisableArrows(false);
		},
		draggable(child) {
			return !child.classList.contains("nodrag");
		},
	}) as unknown as [Ref<HTMLUListElement>, DragNode[], (x: DragNode[])=>void]; // preact compat
	
	const get = (v: DragNode)=>v.type=="builtin" ? builtinNodes[v.i] : proc.nodes.get(v.i)!;

	// init drag nodes depends only on proc nodes but not memoed
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(()=>setDragNodes(initDragNodes), [proc.nodes]);

	const builtinDragNodes = [...new Array(builtinNodes.length) as unknown[]]
		.map((_,i): DragNode => ({ type: "builtin", i }))

	const [builtinRef] = useDragAndDrop<HTMLUListElement, DragNode>(builtinDragNodes, {
		sortable: false, group: "proc", plugins: [animations()],
		dropZone: false
	}) as unknown as [Ref<HTMLUListElement>, DragNode[]]; // preact compat

	const nodeRefSetter = (node: number|undefined) => (el: HTMLDivElement|null) => {
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
	const setRegisterList: Dispatch<SetStateAction<number[]>> = useCallback((nv)=>{
		if (typeof nv=="function") setProc(p=>({...p, registerList: nv(p.registerList)}));
		else setProc(p=>({...p, registerList: nv}));
	}, [setProc]);

	useEffect(()=>{
		dragAndDrop({
			parent: registerList.current,
			state: [ proc.registerList, setRegisterList]
		});
	}, [proc.registerList, setRegisterList])

	return <div className="grid grid-cols-[1.2fr_1fr_0.7fr] gap-4 pl-3" >
		<div className="flex flex-col items-stretch gap-2 ml-[4rem]" >
			<div className="mb-4" >
				{noRename ? <Text v="bold" >Procedure {proc.name}</Text>
				: <div className="flex flex-row gap-2" >
					<Text v="bold" >Procedure</Text>
					<HiddenInput value={proc.name} onChange={(ev)=>{
						if (ev.currentTarget.checkValidity())
							setProc(p=>({...p, name: ev.currentTarget.value}))
					}} className="w-fit" {...nameInputProps} />
				</div>}
			</div>
			 
			<ul ref={nodeRef} className="flex flex-col gap-1 items-stretch relative" >
				{dragNodes.flatMap((v,i)=>{
					const node = get(v);
					return [
						<div key={`${v.type}${v.i}${i}`}
							ref={v.type=="proc" ? nodeRefSetter(v.i) : undefined} >

							{node!=undefined && <ProcNode p={procData} node={node} idx={i+1} setNode={setNode} nodeI={v.type=="proc" ? v.i : undefined} />}
						</div>,
						...node && node.op=="goto" && v.type=="proc" ? [
							<GotoArrow key={`arrow${v.i}`} p={procData} node={node} nodeI={v.i} />
						] : [],
						<IconChevronCompactDown className="self-center nodrag" key={`sep${i}`} />
					];
				})}
			
				<div className={twMerge(nodeStyle, bgColor.secondary, "flex flex-col items-center justify-center py-4 nodrag px-2")} ref={nodeRefSetter(undefined)} >
					{proc.nodeList.length==0 ? <>
						<IconPlus />
						<Text v="sm" >Use the library on the right to add nodes</Text>
					</> : <>
						<img src="/end.svg" className="w-7" />
						<Text v="sm" >End of procedure</Text>
						<Text v="dim" className="bottom-1 left-1 absolute" >{proc.nodeList.length+1}</Text>
					</>}
				</div>
			</ul>
		</div>
		
		<div className="flex flex-col gap-2" >
			<Text v="bold" className="mb-4" >Built-in</Text>
			<ul className="flex flex-col gap-2 overflow-y-auto max-h-56" ref={builtinRef} >
				{builtinNodes.map(v=><ProcNode key={v.op} p={procData} node={v} setNode={setNode} />)}
			</ul>
			
			<Divider />

			<Text v="bold" className="mb-4" >Built-in</Text>
			<ul className="flex flex-col gap-2 overflow-y-auto max-h-56" ref={builtinRef} >
				{builtinNodes.map(v=><ProcNode key={v.op} p={procData} node={v} setNode={setNode} />)}
			</ul>
		</div>
		
		<div className="flex flex-col gap-2" >
			<Text v="bold" className="mb-4" >Registers</Text>
			<ul className="flex flex-col gap-2" ref={registerList} >
				{proc.registerList.map(r=>
					<RegisterEditor key={r} p={procData} reg={r} setReg={setReg} />
				)}
			</ul>
			<Button className={twMerge(nodeStyle, bgColor.secondary, "flex flex-col items-center justify-center py-4 nodrag px-2 w-full")} onClick={()=>{
				setProc(p=>({
					...p, registerList: [...p.registerList, p.registers.size],
					registers: mapWith(p.registers, p.registers.size, { type: "value", value: "" })
				}))
			}} >
				<IconPlus />
				<Text v="sm" >Add register</Text>
			</Button>
		</div>
	</div>
}

export function Editor() {
	const [test, setTest] = useState<Procedure>({
		name: "hello",
		nodeList: [],
		nodes: new Map(),
		registerList: [0],
		registers: new Map([
			[0, { name: "hi", type: "value", value: "a" } satisfies Register]
		])
	});

	return <div>
		<ProcEditor proc={test} setProc={useCallback((n: (x: Procedure)=>Procedure)=>{
			setTest((old)=>{
				const xd = n(old);
				console.log(xd);
				return xd;
			});
		}, [setTest])} />
	</div>;
}