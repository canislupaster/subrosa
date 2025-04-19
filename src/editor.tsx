import { MutableRef, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Procedure, Node, Register } from "./eval";
import { bgColor, Button, containerDefault, Dropdown, DropdownPart, HiddenInput, Text, throttle } from "./ui";
import { twMerge } from "tailwind-merge";
import { IconCaretRightFilled, IconChevronCompactDown, IconCircleMinus, IconCirclePlus, IconCirclePlusFilled, IconPlus } from "@tabler/icons-preact";
import { ComponentChild, Ref } from "preact";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";
import { animations, parentValues, performSort, remapNodes, setParentValues } from "@formkit/drag-and-drop";

const nodeStyle = twMerge(containerDefault, `rounded-sm px-4 py-2 flex flex-row gap-4 items-center pl-1 text-sm`);
const nameInputProps = { minLength: 5, maxLength: 20, pattern: "^\w+$" } as const;
const placeholder: Register = { type: "placeholder", name: "(unset)" };

let nodeId: number = 0;
const builtinNodes: Node[] = [
	...(["add", "sub", "set"] as const).map(op=>(
		{op, lhs: placeholder, rhs: placeholder}
	)),
	...(["inc", "dec"] as const).map(op=>({op, lhs: placeholder})),
	{ op: "goto", ref: "unset", conditional: placeholder },
];

type ProcData = {
	proc: Procedure,
	nodes: Node[],
	nodeRefs: MutableRef<Map<Node|undefined, HTMLDivElement>>,
	regMap: Map<Register, number>,
	nodeMap: Map<Node|undefined, number>
};

function RegisterPicker({p, x, setX, desc}: {
	p: ProcData, x: Register, setX?: (x: Register)=>void, desc: string
}) {
	const regI = p.regMap.get(x);
	const trigger = <div>
		<div className="flex flex-col" >
			<Text v="sm" >{desc}</Text>
			<Button>{regI!=undefined ? `#${regI+1}${x.name ? `: ${x.name}` : ""}` : "(unset)"}</Button>
		</div>
	</div>;

	if (!setX) return trigger;

	return <Dropdown parts={[
		{ type: "act", name: "(unset)", act() { setX(placeholder); } },
		...p.proc.registers.map((r,i)=>({
			type: "act", act() { setX(r) },
			name: `#${i+1}${r.name ? `: ${r.name}` : ""}`
		} satisfies DropdownPart))
	]} trigger={trigger} />;
}

function iconURL(x: Node) {
	if (x.op=="goto" && x.conditional!=undefined) return "condgoto.svg";
	return `${x.op}.svg`;
}

function GotoInner({p, node, setNode}: {p: ProcData, node: Node&{op: "goto"}, setNode?: (x: Node)=>void}) {
	const [selecting, setSelecting] = useState(false);
	useEffect(()=>{
		if (!selecting) return;
		const cb = (ev: MouseEvent)=>{
			const el = ev.target;
			const targetNode = [...p.nodeRefs.current.entries()]
				.filter(([,y])=>y.contains(el as globalThis.Node|null)).map(v=>v[0]);
			setNode?.({ ...node, ref: targetNode.length && targetNode[0]!=node ? targetNode[0] : "unset" });
			setSelecting(false);
		};

		document.addEventListener("click", cb);
		return ()=>document.removeEventListener("click", cb);
	}, [node, p.nodeRefs, selecting, setNode]);
	
	const rectRef = useRef<HTMLDivElement>(null);
	const arrowRef = useRef<HTMLDivElement>(null);

	useEffect(()=>{
		if (node.ref=="unset") return;
		const el = p.nodeRefs.current.get(node.ref);
		const el2 = p.nodeRefs.current.get(node);
		const rect = rectRef.current, arrow=arrowRef.current
		if (!el || !el2 || !rect || !arrow) return;
		
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
		const depth = (b.y - a.y)/c.height + (Math.sin(a.y/150)+1)/3;
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

		return ()=>rect.hidden=arrow.hidden=true;
	}, [node, p]);

	return <>
		<Button onClick={()=>{
			setSelecting(true);
		}} className={
			selecting ? bgColor.highlight : node.ref=="unset" && setNode ? bgColor.red : ""
		} >Jump to...</Button>
		<RegisterPicker desc="cond" p={p} x={node.conditional ?? placeholder} setX={
			setNode ? v=>setNode({...node, conditional: v==placeholder ? undefined : v}) : undefined
		} />

		<div className="absolute w-4" hidden ref={arrowRef} >
			<img src="/arrow.svg" />
		</div>
		<div className="absolute border-2 border-r-0 border-white" hidden ref={rectRef} />
	</>;
}

function ProcNode({p, node, setNode}: {p: ProcData, node: Node, setNode?: (x: Node)=>void}) {
	let inner: ComponentChild;
	if (node.op=="goto") {
		inner=<GotoInner p={p} node={node} setNode={setNode} />;
	} else if (node.op=="call") {
		inner = <></>;
	} else {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode ? lhs=>setNode({...node, lhs}) : undefined} desc="a" />
			{"rhs" in node && <RegisterPicker p={p} x={node.rhs} setX={setNode ? rhs=>setNode?.({...node, rhs}) : undefined} desc="b" />}
		</>;
	}
	
	return <div className={nodeStyle} >
		<img src={`/${iconURL(node)}`} className="w-10 cursor-move" />
		{inner}
	</div>;
}

type DragNode = { type: "proc"|"builtin", i: number};

function RegisterEditor({p, reg, setReg}: {p: ProcData, reg: Register, setReg: (x: Register)=>void}) {
	const regI = p.regMap.get(reg)!;
	return <div className={nodeStyle} >
		<Text v="bold" >{"#"}{regI+1}</Text>
		<HiddenInput value={reg.name==undefined ? "(unnamed)" : reg.name}
			onChange={(ev)=>{
				if (ev.currentTarget.checkValidity()) setReg({
					...reg, name: ev.currentTarget.value
				});
			}} {...nameInputProps} />
	</div>;
}

function ProcEditor({proc, setProc, noRename}: {
	proc: Procedure, setProc: (x: Procedure)=>void, noRename?: boolean
}) {
	const nodeRefs = useRef(new Map<Node|undefined,HTMLDivElement>());
	const procData: ProcData = useMemo(()=>{
		const out: Node[] = [];
		let v = proc.first;
		while (v!=undefined) {
			out.push(v);
			v=v.next;
		}
		
		const nodeMap = new Map<Node|undefined,number>(out.map((v,i)=>[v,i]));
		nodeMap.set(undefined, out.length);

		return {
			proc,
			nodes: out,
			nodeRefs,
			regMap: new Map(proc.registers.map((v,i)=>[v,i])),
			nodeMap
		} as const;
	}, [proc]);

	const setNodes = (nodes: Node[], modify?: {i: number, up: Node})=>{
		const oldToNew = new Map<Node,Node>();
		let cur: Node|undefined;
		for (let i=nodes.length-1; i>=0; i--) {
			cur = {...modify?.i==i ? modify.up : nodes[i], next: cur};
			oldToNew.set(nodes[i], cur);
		}

		// bro why its circular
		for (const v of oldToNew.values()) {
			if (v.op=="goto" && v.ref!="unset" && v.ref!=undefined) {
				let nref: Node|undefined|"unset" = oldToNew.get(v.ref);
				if (!nref) nref="unset";
				(v as unknown as {ref: typeof nref}).ref = nref;
			}
		}

		setProc({...proc, first: cur});
	};
	
	const initDragNodes = [ ...new Array(procData.nodes.length) as unknown[] ]
		.map((_,i): DragNode=>({i, type: "proc"}));
	const nodesRef = useRef<Node[]>(procData.nodes);
	const [nodeRef, dragNodes, setDragNodes] = useDragAndDrop<HTMLUListElement, DragNode>(initDragNodes, {
		group: "proc", plugins: [animations()],
		performTransfer({ initialParent, targetParent, draggedNodes, targetNodes }) {
			remapNodes(initialParent.el);
			remapNodes(targetParent.el);

			const idx = targetNodes.length ? targetNodes[0].data.index : targetParent.data.enabledNodes.length;
			const vs = parentValues(targetParent.el, targetParent.data);
			const up = vs.toSpliced(idx, 0, ...draggedNodes.map(v=>v.data.value));
			setParentValues(targetParent.el, targetParent.data, up);
			setNodes(up.map(get));
		},
		performSort(obj) {
			// can only sort nodes in proc (i dare u to remove this)
			if (obj.draggedNodes.some(v=>v.data.value.type=="builtin")) return;
			performSort(obj);
		},
		onDragend(data) {
			setNodes(parentValues(data.parent.el, data.parent.data).map(x=>get(x as DragNode)));
		},
		draggable(child) {
			return !child.classList.contains("nodrag");
		},
	}) as unknown as [Ref<HTMLUListElement>, DragNode[], (x: DragNode[])=>void]; // preact compat
	
	const get = (v: DragNode)=>v.type=="builtin" ? builtinNodes[v.i] : nodesRef.current[v.i];

	useEffect(()=>{
		setDragNodes(initDragNodes);
		nodesRef.current=procData.nodes;
	}, [procData.nodes, setDragNodes]);

	const builtinDragNodes = [...new Array(builtinNodes.length) as unknown[]]
		.map((_,i): DragNode => ({ type: "builtin", i }))

	const [builtinRef] = useDragAndDrop<HTMLUListElement, DragNode>(builtinDragNodes, {
		sortable: false, group: "proc", plugins: [animations()],
		dropZone: false
	}) as unknown as [Ref<HTMLUListElement>, DragNode[]]; // preact compat

	const nodeRefSetter = (node: Node|undefined) => (el: HTMLDivElement|null) => {
		if (el==null) return;
		nodeRefs.current.set(node, el);
		return ()=>nodeRefs.current.delete(node);
	};

	return <div className="flex flex-row gap-4" >
		<div className="flex flex-col items-stretch gap-4 ml-[4rem]" >
			<div className="mb-4" >
				{noRename ? <Text v="bold" >Procedure {proc.name}</Text>
				: <div className="flex flex-row gap-2" >
					<Text v="bold" >Procedure</Text>
					<HiddenInput value={proc.name} onChange={(ev)=>{
						if (ev.currentTarget.checkValidity())
							setProc({...proc, name: ev.currentTarget.value})
					}} className="w-fit" {...nameInputProps} />
				</div>}
			</div>
			 
			<ul ref={nodeRef} className="flex flex-col gap-1 items-stretch relative" >
				{dragNodes.flatMap((v,i)=>{
					const node = get(v);
					return [
						...node==undefined ? [] : [<div key={`${v.type}${v.i}${i}`} ref={nodeRefSetter(node)} >
							<ProcNode p={procData} node={get(v)} setNode={v.type=="proc" ? (node)=>{
								setNodes(procData.nodes, {i: v.i, up: node});
							} : undefined} />
						</div>],
						<IconChevronCompactDown className="self-center nodrag" key={`sep${i}`} />
					];
				})}
			
				<div className={twMerge(nodeStyle, bgColor.secondary, "flex flex-col items-center justify-center py-4 nodrag")} ref={nodeRefSetter(undefined)} >
					{procData.nodes.length==0 ? <>
						<IconPlus />
						<Text v="sm" >Use the library on the right to add nodes</Text>
					</> : <>
						<img src="/end.svg" className="w-7" />
						<Text v="sm" >End of procedure</Text>
					</>}
				</div>
			</ul>
		</div>
		
		<div className="flex flex-col gap-4" >
			<Text v="bold" className="mb-4" >Built-in</Text>
			<ul className="flex flex-col gap-2" ref={builtinRef} >
				{builtinNodes.map(v=><ProcNode key={v.op} p={procData} node={v} />)}
			</ul>
		</div>
		
		<div className="flex flex-col gap-4" >
			<Text v="bold" className="mb-4" >Registers</Text>
			<ul className="flex flex-col gap-2" >
				{proc.registers.map((r,i)=><RegisterEditor key={i} p={procData} reg={r} />)}
			</ul>
		</div>
	</div>
}

export function Editor() {
	const [test, setTest] = useState<Procedure>({
		name: "hello",
		first: undefined,
		registers: [
			{name: "hi", type: "value", value: "abc"}
		]
	});

	return <div>
		<ProcEditor proc={test} setProc={setTest} />
	</div>;
}