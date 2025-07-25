import { IconArrowsRightLeft, IconChartBar, IconChevronCompactDown, IconChevronLeft,
	IconCircleCheckFilled, IconCircleFilled, IconCircleOff, IconHelp, IconInfoCircle, IconLogin2,
	IconPencil, IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipForwardFilled,
	IconPlayerStopFilled, IconPlayerTrackNextFilled, IconPlayerTrackPrevFilled, IconPlus, IconRotate,
	IconTrash, IconX } from "@tabler/icons-preact";
import { ComponentChild, ComponentChildren, RefObject } from "preact";
import { ChangeEvent } from "preact/compat";
import { MutableRef, useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { twJoin, twMerge } from "tailwind-merge";
import { clone, EditorState, fromSelection, InterpreterError, makeProc, makeState, Node,
	NodeSelection, numTests, Procedure, ProgramState, Register, RegisterRefClone, step, strLenLimit,
	toSelection } from "../shared/eval";
import { addFromText, toText } from "../shared/text";
import { fill, statsArr, strToInt } from "../shared/util";
import { Submission, useSubmission } from "./api";
import { Puzzle } from "./data";
import { LogoBack } from "./logo";
import { Reference } from "./reference";
import { LocalStorage } from "./storage";
import { Messages } from "./story";
import { Alert, Anchor, anchorStyle, AppTooltip, bgColor, borderColor, Button, ConfirmModal,
	containerDefault, debounce, Divider, HiddenInput, IconButton, Input, interactiveContainerDefault,
	mapWith, Modal, Select, SetFn, setWith, Text, ThemeSpinner, toSearchString, useDragList, useFnRef,
	useGoto, useShortcuts, useToast } from "./ui";

const maxUndoSteps = 100;

const nodeStyle = twMerge(
	containerDefault,
	`rounded-sm px-4 py-2 flex flex-row gap-2 items-center pl-1.5 text-sm relative`,
);
export const blankStyle = twMerge(
	nodeStyle,
	bgColor.secondary,
	"flex flex-col items-center justify-center py-4 px-2",
);
const draggingStyle = "theme:bg-amber-800";
const nameInputProps = {
	minLength: 1,
	maxLength: 20,
	pattern: "^[\\w\\-_\\[\\]\\{\\}!\\(\\) ]+$",
} as const;
// const validNameRe = /^[\\w ]{1,20}$/;
const validTextRe = new RegExp(`^[a-z ]{0,${strLenLimit}}$`);

const builtinNodes: Node[] = [
	{ op: "goto", ref: "unset", conditional: null },
	{ op: "inc", lhs: -1 },
	{ op: "add", lhs: -1, rhs: -1 },
	{ op: "dec", lhs: -1 },
	{ op: "sub", lhs: -1, rhs: -1 },
	{ op: "set", lhs: -1, rhs: -1 },
	{ op: "setIdx", lhs: -1, rhs: -1, idx: -1 },
	{ op: "access", lhs: -1, rhs: -1 },
	{ op: "breakpoint", conditional: null },
];

const nodeName: Record<Node["op"], string> = {
	add: "Add",
	sub: "Subtract",
	set: "Assign",
	access: "Access",
	inc: "Increment",
	dec: "Decrement",
	goto: "Goto",
	setIdx: "Indexed assign",
	call: "Call",
	breakpoint: "Breakpoint",
};

function useValidity(
	value: string,
	callback: (v: string) => void,
): {
	value: string;
	onBlur: (ev: FocusEvent) => void;
	onChange: (ev: ChangeEvent<HTMLInputElement>) => void;
} {
	const db = useFnRef(() => debounce(200), []);

	const [v, setV] = useState<{ editing: boolean; value: string }>({ editing: false, value });
	useEffect(() => {
		if (!v.editing) setV({ editing: false, value });
	}, [v.editing, value]);

	const check = (elem: HTMLInputElement, editing: boolean) => {
		if (elem.value != value || v.editing) setV({ editing, value: elem.value });
		if (editing ? elem.reportValidity() : elem.checkValidity()) callback(elem.value);
	};

	return {
		value: v.value,
		onBlur(ev) {
			db.current?.cancel();
			check(ev.currentTarget as HTMLInputElement, false);
		},
		onChange(ev) {
			const el = ev.currentTarget;
			db.current?.call(() => check(el, true));
		},
	};
}

type EditData = {
	i: number;
	proc: Procedure;
	procs: ReadonlyMap<number, Procedure>;
	nodeRefs: MutableRef<Map<number | "end", HTMLDivElement>>;
	regMap: ReadonlyMap<number, number>;
	regParam: ReadonlyMap<number, number>;
	nodeMap: ReadonlyMap<number | "end", number>;
	runRegisters: ReadonlyMap<number, RegisterRefClone> | null;
	gotoToInfo: ReadonlyMap<number, { col: number; fromI?: number; toI?: number }>;

	setSelectingGoto: (x: number | null) => void;
	selectingGoto: number | null;

	setHighlightedRegister: (x: number | null) => void;
	highlightedRegister: number | null;
};

const regLabel = (i: number, v: Register) => `#${i+1}${v.name != undefined ? `: ${v.name}` : ""}`;

function RegisterPicker<Create extends boolean = false>(
	{ p, x, setX, desc, create, className }: {
		p: EditData;
		x: Create extends true ? number | "create" : number;
		setX?: (x: Create extends true ? number | "create" : number) => void;
		desc?: string;
		create?: Create;
		className?: string;
	},
) {
	const sel = x != -1 && p.highlightedRegister == x;
	return <div className="flex flex-col"
		onMouseEnter={x != "create" && x != -1 ? () => p.setHighlightedRegister(x) : undefined}
		onMouseLeave={sel ? () => p.setHighlightedRegister(null) : undefined}>
		{desc != undefined && <Text v="sm">{desc}</Text>}
		<Select
			options={[
				...create == true ? [{ label: "(create)", value: "create" as unknown as number }] : [],
				{ label: "(unset)", value: -1 },
				...p.proc.registerList.map((r, i) => {
					const v = p.proc.registers.get(r)!;
					return { label: regLabel(i, v), value: r };
				}),
			]}
			searchable
			disabled={setX == undefined}
			placeholder={"(unset)"}
			value={x}
			setValue={setX}
			className={twMerge(sel && bgColor.highlight2, "transition-colors", className)} />
	</div>;
}

function iconURL(
	x: { op: "goto"; conditional: number | null } | { op: Exclude<Node["op"], "goto"> },
) {
	if (x.op == "goto" && x.conditional != undefined) return "/condgoto.svg";
	return `/${x.op.toLowerCase()}.svg`;
}

function GotoArrow(
	{ p, node, nodeI }: { p: EditData; node: Node & { op: "goto" }; nodeI: number },
) {
	const rectRef = useRef<HTMLDivElement>(null);
	const arrowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const r = node.ref;
		if (r == "unset" || (r != "end" && !p.proc.nodes.has(r))) {
			if (rectRef.current) rectRef.current.hidden = true;
			if (arrowRef.current) arrowRef.current.hidden = true;
			return;
		}

		// otherwise should always exist
		let timeout: number | undefined;
		let lastParams = fill(4, -1);
		const dispatch = () => {
			timeout = setTimeout(updateArrow, 50);
		};
		const observer = new ResizeObserver(() => updateArrow());
		const updateArrow = () => {
			timeout = undefined;

			const el = p.nodeRefs.current.get(r);
			const el2 = p.nodeRefs.current.get(nodeI);
			const rect = rectRef.current, arrow = arrowRef.current;
			if (!el || !el2 || !rect || !arrow) {
				dispatch();
				return;
			}

			observer.disconnect();
			observer.observe(el);
			observer.observe(el2);

			let a = el2.getBoundingClientRect();
			let b = el.getBoundingClientRect();

			rect.hidden = arrow.hidden = false;
			const parent = rect.offsetParent!;

			const c = parent.getBoundingClientRect();
			const yo = parent.scrollTop;
			const arrowHeight = arrow.getBoundingClientRect().height;

			const info = p.gotoToInfo.get(nodeI)!;
			let { fromI, toI } = info;
			toI ??= .5;
			fromI ??= .5;

			arrow.style.top = `${b.y+b.height*toI-c.top-arrowHeight/2+(a.y < b.y ? -1 : 1)+yo}px`;
			arrow.style.right = `${c.right-b.left-1}px`;

			const params = [b.y+yo, b.height, a.y+yo, a.height];
			if (params.some((v, i) => Math.abs(lastParams[i]-v) > 1)) dispatch();
			lastParams = params;

			if (a.y > b.y) [a, b, fromI, toI] = [b, a, toI, fromI];
			const obj = {
				top: `${a.y+a.height*fromI-c.top+yo}px`,
				bottom: `${c.bottom-(b.y+b.height*toI)-yo}px`,
				right: `${c.right-Math.max(a.left, b.left)}px`,
				left: `calc(${Math.max(a.left, b.left)-c.left}px - ${20+info.col*55}px)`,
			} as const;

			type ObjKey = keyof typeof obj;
			for (const k in obj) {
				rect.style[k as ObjKey] = obj[k as ObjKey];
			}
		};

		updateArrow();
		window.addEventListener("resize", updateArrow);
		return () => {
			if (timeout != undefined) clearTimeout(timeout);
			observer.disconnect();
			window.removeEventListener("resize", updateArrow);
		};
	}, [node, node.ref, nodeI, p.gotoToInfo, p.nodeRefs, p.proc.nodeList, p.proc.nodes]);

	return <>
		<div className="absolute w-4" hidden ref={arrowRef}>
			<img src="/arrow.svg" />
		</div>
		<div className={twJoin("absolute border-2 border-r-0", borderColor.focus)} hidden
			ref={rectRef} />
	</>;
}

const selectionHandleClass = "selectable";
const getClickNode = (ev: MouseEvent, refs: EditData["nodeRefs"], strict: boolean) => {
	const candidates = [...refs.current.entries()].filter(([, y]) =>
		strict
			? (y == ev.target
				|| [...y.querySelectorAll(`.${selectionHandleClass}`)].some(z =>
					z.contains(ev.target as HTMLElement | null)
				))
			: y.contains(ev.target as HTMLElement | null)
	);
	return candidates.length == 0 ? null : candidates[0][0];
};

function GotoInner(
	{ p, node, setNode, nodeI }: {
		p: EditData;
		node: Node & { op: "goto" };
		nodeI: number;
		setNode?: (x: Node) => void;
	},
) {
	const selecting = setNode != undefined && p.selectingGoto == nodeI;

	useEffect(() => {
		if (!selecting) return;
		const cb = (ev: MouseEvent) => {
			const targetNode = getClickNode(ev, p.nodeRefs, false);
			if (targetNode != null && targetNode != nodeI) {
				ev.preventDefault();
				setNode?.({ ...node, ref: targetNode });
			}

			p.setSelectingGoto(null);
		};

		document.addEventListener("mousedown", cb, true);
		return () => document.removeEventListener("mousedown", cb, true);
	}, [node, nodeI, p, selecting, setNode]);

	return <>
		<Button onClick={setNode != undefined
			? () => {
				p.setSelectingGoto(selecting ? null : nodeI);
			}
			: undefined} tabIndex={0} onBlur={selecting
			? () => {
				p.setSelectingGoto(null);
			}
			: undefined} onKeyDown={ev => {
			if (ev.key == "Escape") ev.currentTarget.blur();
		}}
			className={selecting ? bgColor.highlight : node.ref == "unset" && setNode ? bgColor.red : ""}>
			{node.ref == "unset"
				? "Jump to..."
				: node.ref == "end"
				? "Jump to end"
				: `Jump: ${node.ref+1}`}
		</Button>
		<RegisterPicker desc="cond" p={p} x={node.conditional ?? -1}
			setX={setNode ? v => setNode({ ...node, conditional: v < 0 ? null : v }) : undefined} />
	</>;
}

function CallInner(
	{ p, node, openProc, setNode }: {
		p: EditData;
		node: Node & { op: "call" };
		setNode?: (x: Node) => void;
		openProc: (i: number) => void;
	},
) {
	const v = p.procs.get(node.procRef);
	const params = v?.registerList.flatMap(r => {
		const x = v?.registers.get(r);
		return x?.type == "param" ? [x] : [];
	}) ?? [];

	return v == undefined
		? <Alert bad title="Unknown procedure" txt="This procedure has been deleted." />
		: <>
			<div className="flex flex-col gap-0.5">
				<Text v="sm">{v.name}</Text>
				<Button className="py-1" onClick={() => openProc(node.procRef)}>Open</Button>
			</div>
			<div className="flex flex-row flex-wrap gap-1.5">
				{params.map((param, i) =>
					<RegisterPicker key={i} p={p} x={i >= node.params.length ? -1 : node.params[i]}
						desc={param.name != undefined ? `#${i+1}: ${param.name}` : `#${i+1}`}
						setX={setNode == undefined
							? undefined
							: nx =>
								setNode({
									...node,
									params: node.params.length <= i
										? [...node.params, ...fill(i-node.params.length, -1), nx]
										: node.params.with(i, nx),
								})} />
				)}
			</div>
		</>;
}

const nodeHint: Record<Node["op"], string> = {
	add: "Add the second register to the first.",
	sub: "Subtract the second register from the first.",
	set: "Set the value of the first register to the second.",
	access:
		"Take the element in the second register at the position indexed by the first register, and load it into the first register.",
	inc: "Increment the value of a register.",
	dec: "Decrement the value of a register.",
	goto:
		"Jump to another node, optionally conditional on whether the cond register contains a strictly positive value.",
	setIdx: "Set the element at idx in lhs to rhs.",
	call: "Call another procedure with parameters.",
	breakpoint:
		"Pause execution for debugging, optionally conditional on whether the cond register contains a strictly positive value.",
};

function ProcNode(
	{ p, node, setNode: setNode2, openProc, nodeI, idx, status, setRef }: {
		p: EditData;
		node: Node;
		nodeI: number;
		idx?: number;
		setNode?: (x: Node | null, i: number) => void;
		openProc: (i: number) => void;
		setRef?: (i: number, ref: HTMLDivElement | null) => void;
		status?: "active" | "selected" | "target";
	},
) {
	const setNode = setNode2 == undefined
		? undefined
		: (newNode: Node | null) => setNode2(newNode, nodeI);

	let inner: ComponentChild;
	if (node.op == "goto") {
		inner = <GotoInner p={p} node={node} nodeI={nodeI} setNode={setNode} />;
	} else if (node.op == "call") {
		inner = <CallInner p={p} node={node} setNode={setNode} openProc={openProc} />;
	} else if (node.op == "setIdx") {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode
				? lhs => setNode({ ...node, lhs })
				: undefined} desc="a" />
			<RegisterPicker p={p} x={node.idx}
				setX={setNode ? idx => setNode({ ...node, idx }) : undefined} desc="b" />
			<RegisterPicker p={p} x={node.rhs}
				setX={setNode ? rhs => setNode({ ...node, rhs }) : undefined} desc="c" />
		</>;
	} else if (node.op == "breakpoint") {
		inner = <>
			<RegisterPicker p={p} x={node.conditional ?? -1} setX={setNode
				? v => setNode({ ...node, conditional: v < 0 ? null : v })
				: undefined} desc="cond" />
		</>;
	} else {
		inner = <>
			<RegisterPicker p={p} x={node.lhs} setX={setNode
				? lhs => setNode({ ...node, lhs })
				: undefined} desc="a" />
			{"rhs" in node && <RegisterPicker p={p} x={node.rhs} setX={setNode
				? rhs => setNode?.({ ...node, rhs })
				: undefined} desc="b" />}
		</>;
	}

	const hint = useMemo(() => {
		if (node.op == "call") {
			const v = p.procs.get(node.procRef);
			if (v && v.comment != undefined) return v.comment;
		}

		return nodeHint[node.op];
	}, [node, p.procs]);

	return <div
		className={twMerge(
			nodeStyle,
			"transition-colors",
			status == "active"
				? bgColor.highlight
				: status == "selected"
				? bgColor.highlight2
				: status == "target"
				? bgColor.md
				: null,
		)}
		ref={useCallback((el: HTMLDivElement | null) => nodeI != undefined && setRef?.(nodeI, el), [
			nodeI,
			setRef,
		])}
		data-key={nodeI}>
		<img src={iconURL(node)}
			className={twJoin("w-10 cursor-move draghandle mb-4", selectionHandleClass)} />
		{idx != undefined && <Text v="dim" className="absolute left-1 bottom-1">{idx}</Text>}
		{inner}
		{setNode
			? <button onClick={() => {
				setNode(null);
			}} className="-mr-2 ml-auto float-end">
				<IconX />
			</button>
			: <AppTooltip content={<p className="break-words">{hint}</p>}>
				<button className="-mr-2 ml-auto float-end">
					<IconInfoCircle />
				</button>
			</AppTooltip>}
	</div>;
}

type DragNode = { type: "proc" | "builtin" | "user"; i: number };
const SelectRegisterType = Select<"param" | "string" | "number">;

function RegisterEditor(
	{ p, reg, setReg, drag }: {
		p: EditData;
		reg: number;
		setReg: (x: Register | null, i: number) => void;
		drag: boolean;
	},
) {
	const regI = p.regMap.get(reg)!;
	const regV = p.proc.registers.get(reg)!;

	const regStr = regV.type == "value" ? regV.value.toString() : "";
	const [value, setValue] = useState(regStr);
	useEffect(() => setValue(regStr), [regStr]);

	const [err, setErr] = useState<string | null>(null);
	const [err2, setErr2] = useState<boolean>(false);

	const regTy = regV.type == "param" ? null : typeof regV.value;
	const emptyReg = useMemo(() => ({ type: "value", name: regV.name } as const), [regV.name]);
	const paramI = p.regParam.get(reg);

	const inputValueChange = (newValue: string) => {
		setValue(newValue);

		let err: string | null = null;
		if (regTy == "string") {
			if (!validTextRe.test(newValue)) {
				err = "Text registers must only contain lowercase alphabetic characters or spaces";
			} else setReg({ ...emptyReg, value: newValue }, reg);
		} else if (regTy == "number") {
			const v = strToInt(newValue);
			if (v == null) err = "Invalid number";
			else setReg({ ...emptyReg, value: v }, reg);
		}

		setErr(err);
	};

	const regRef = p.runRegisters?.get(reg);

	const [runValue, setRunValue] = useState(regRef?.current);
	useEffect(() => {
		setRunValue(regRef?.current);
		setErr2(false);
	}, [regRef]);

	const setRunV = (x: string) => {
		if (!regRef) return;
		const newV = validTextRe.test(x) ? x : strToInt(x);
		setErr2(newV == null);
		if (newV != null) regRef.mutable.current = newV;
		setRunValue(newV ?? x);
	};

	const sel = p.highlightedRegister == reg;
	return <div
		className={twMerge(
			nodeStyle,
			drag && draggingStyle,
			"flex flex-col pl-2 items-stretch gap-1 pr-1",
		)}
		data-key={reg}>
		<div className="flex flex-row gap-2 mb-1 items-center">
			<Text v="bold" className="cursor-move draghandle">{"#"}{regI+1}</Text>
			<HiddenInput placeholder={"(unnamed)"} className={sel ? bgColor.highlight2 : ""}
				{...useValidity(
					regV.name == null ? "" : regV.name,
					v => setReg({ ...regV, name: v.length == 0 ? null : v }, reg),
				)} {...nameInputProps} />
			<IconButton className="ml-auto" icon={<IconX size={20} />} onClick={() => {
				setReg(null, reg);
			}} />
		</div>

		<Text v="dim">Register type:</Text>
		<SelectRegisterType className="w-full"
			options={[{ label: "Parameter", value: "param" }, { label: "Text", value: "string" }, {
				label: "Number",
				value: "number",
			}] as const}
			value={regV.type == "param" ? "param" : typeof regV.value == "string" ? "string" : "number"}
			setValue={v => {
				if (v == "param") setReg({ ...regV, type: "param" }, reg);
				else if (v == "number") {
					setReg({ ...regV, type: "value", value: 0n }, reg);
					setValue("0");
				} else if (v == "string") {
					setReg({ ...regV, type: "value", value: value.toString() }, reg);
					setValue("");
				}

				setErr(null);
			}} />

		{regV.type == "value" && <>
			<Input className={twJoin(err != null && borderColor.red)}
				type={regTy == "number" ? "number" : "text"} step={1} value={value}
				valueChange={inputValueChange} />
			{err != null && <Alert bad txt={err} />}
		</>}

		{paramI != undefined && <>
			<Text v="smbold" className="self-center">Parameter {"#"}{paramI+1}</Text>
		</>}

		{runValue != null && <>
			<Divider className="my-1" />
			<Text v="dim">Current value ({typeof runValue == "string" ? "text" : "numeric"}):</Text>

			<Input className={twJoin(err2 && borderColor.red)} value={runValue.toString()}
				valueChange={setRunV} />
			{err2 && <Alert bad txt="Invalid register value" />}
		</>}
	</div>;
}

type ProcRunState = {
	activeNode: number | null;
	scrollNode: number | null;
	registers: ReadonlyMap<number, RegisterRefClone>;
};

type UserProcs = {
	procs: ReadonlyMap<number, Procedure>;
	userProcList: number[];
	entryProc: number;

	back: boolean;
	addProc: () => void;
	delProc: () => void;
	openProc: (i?: number) => void;
	setProcList: (vs: number[]) => void;
};

function NodeAdder(
	{ add, procs, procList, i }: {
		add: (i: number, drag: DragNode) => void;
		i: number;
		procs: ReadonlyMap<number, Procedure>;
		procList: number[];
	},
) {
	const addNodeOptions: {
		label: ComponentChildren;
		key: string | number;
		value: DragNode;
		search: string;
	}[] = useMemo(() => {
		const makeLabel = (icon: Parameters<typeof iconURL>[0], name: string) =>
			<div className="flex flex-row justify-start gap-2 w-full">
				<img src={iconURL(icon)} className="w-6" /> {name}
			</div>;

		return [
			...builtinNodes.map((x, i) => ({
				label: makeLabel(x, nodeName[x.op]),
				key: x.op,
				value: { type: "builtin" as const, i },
				search: nodeName[x.op],
			})),
			...procList.flatMap(proc => {
				const p = procs.get(proc);
				if (!p) return [];
				return [{
					label: makeLabel({ op: "call" }, p.name),
					key: proc,
					search: p.name,
					value: { type: "user" as const, i: proc },
				}];
			}),
		];
	}, [procs, procList]);

	return <Select options={addNodeOptions} searchable
		setValue={useCallback((v: DragNode) => add(i, v), [i, add])}
		className="place-content-center flex w-full -mt-1 group">
		<button className="relative w-full">
			<IconChevronCompactDown className="mx-auto group-hover:opacity-0 transition-opacity" />
			<IconPlus className="group-hover:opacity-100 opacity-0 transition-opacity absolute top-0.5 left-0 right-0 mx-auto" />
		</button>
	</Select>;
}

function ProcEditor(
	{
		proc,
		i: procI,
		setProc,
		procs,
		userProcList,
		entryProc,
		addProc,
		setProcList,
		delProc,
		openProc,
		runState,
		stack,
		back,
		undo,
		input,
	}: {
		proc: Procedure;
		i: number;
		setProc: SetFn<Procedure>;
		runState: ProcRunState | null;
		stack?: ComponentChildren;
		undo: (redo: boolean) => void;
		input: ComponentChildren;
	} & UserProcs,
) {
	const isUserProc = entryProc != procI;
	const nodeRefs = useRef(new Map<number | "end", HTMLDivElement>());
	const [selectingGoto, setSelectingGoto] = useState<number | null>(null);
	const [highlightedRegister, setHighlightedRegister] = useState<number | null>(null);
	const nodeMap = useMemo(
		() =>
			new Map<number | "end", number>([
				...proc.nodeList.map((v, i) => [v, i] satisfies [number | "end", number]),
				["end", proc.nodeList.length],
			]),
		[proc.nodeList],
	);

	const gotoToInfo = useMemo(() => {
		const gotoIntervals = proc.nodeList.flatMap((v, i) => {
			const x = proc.nodes.get(v);
			if (!x || x.op != "goto" || x.ref == "unset") return null;
			const to = x.ref != "end" ? nodeMap.get(x.ref) : null;
			const dist = to == null ? Infinity : Math.abs(i-to);
			return (to != null ? [i, to].sort((a, b) => a-b) : [i]).map((x, j) =>
				[x, v, j == 0, dist] as const
			);
		}).filter(x => x != null).sort((a, b) =>
			a[0] < b[0] || (a[0] == b[0] && a[2] && !b[2])
				|| (a[0] == b[0] && a[2] == b[2] && a[3] > b[3])
				? -1
				: 1
		);

		let numGotoCols = 0;
		const nodeOrderedGotos = new Map<number, { node: number; col: number; starting: boolean }[]>();
		const gotoToColumn = new Map<number, number>();
		const unusedGotoCols = new Set<number>();
		for (const [i, nodeI, starting] of gotoIntervals) {
			let col;
			if (starting) {
				if (unusedGotoCols.size > 0) {
					col = Math.min(...unusedGotoCols.keys());
					unusedGotoCols.delete(col);
				} else {
					col = numGotoCols++;
				}
				gotoToColumn.set(nodeI, col);
			} else {
				col = gotoToColumn.get(nodeI)!;
				unusedGotoCols.add(col);
			}

			const gotos = nodeOrderedGotos.get(proc.nodeList[i]) ?? [];
			gotos.push({ node: nodeI, col, starting });
			nodeOrderedGotos.set(proc.nodeList[i], gotos);
		}

		const fromI = new Map<number, number>(), toI = new Map<number, number>();
		for (const [k, x] of nodeOrderedGotos) {
			for (
				const [node, i] of x.sort((a, b) =>
					b.starting && !a.starting
						|| (a.starting == b.starting && (a.starting ? a.col < b.col : a.col > b.col))
						? -1
						: 1
				).map(({ node }, i) => [node, (i+1)/(x.length+1)])
			) {
				if (node == k) fromI.set(node, i);
				else toI.set(node, i);
			}
		}

		return new Map(
			gotoToColumn.entries().map(([a, b]) =>
				[a, {
					col: numGotoCols == 1 ? 0.5 : (numGotoCols-1-b)/(numGotoCols-1),
					fromI: fromI.get(a),
					toI: toI.get(a),
				}] as const
			),
		);
	}, [nodeMap, proc.nodeList, proc.nodes]);

	const data: EditData = useMemo(() => {
		return {
			i: procI,
			proc,
			procs,
			selectingGoto,
			setSelectingGoto,
			highlightedRegister,
			setHighlightedRegister,
			nodeRefs,
			nodeMap,
			gotoToInfo,
			regMap: new Map(proc.registerList.map((v, i) => [v, i])),
			regParam: new Map(
				proc.registerList.filter(a => proc.registers.get(a)?.type == "param").map((x, i) => [x, i]),
			),
			runRegisters: runState?.registers ?? null,
		} as const;
	}, [
		procI,
		proc,
		procs,
		selectingGoto,
		highlightedRegister,
		nodeMap,
		gotoToInfo,
		runState?.registers,
	]);

	const nodeForUserProc = useCallback((i: number): Node => {
		const proc = procs.get(i)!;
		const nParam = proc.registerList.reduce(
			(a, b) => a+(proc.registers.get(b)?.type == "param" ? 1 : 0),
			0,
		);
		return { op: "call", procRef: i, params: fill(nParam, -1) };
	}, [procs]);

	const [selection, setSelection] = useState<ReadonlySet<number>>(new Set<number>());

	// cursed !!!
	const makeDragNode = useCallback((v: DragNode) => {
		if (v.type == "proc") return v.i;

		let nodeI = null;
		setProc(p => {
			const node = v.type == "user" ? nodeForUserProc(v.i) : builtinNodes[v.i];
			const newNodes = mapWith(p.nodes, nodeI = p.maxNode, node);
			return { ...p, nodes: newNodes, maxNode: p.maxNode+1 };
		});

		return nodeI;
	}, [nodeForUserProc, setProc]);

	const { ref: nodeListRef, draggingKeys: draggingNodes, clearAnims: clearNodeAnims } = useDragList<
		number,
		HTMLUListElement
	>({
		values: proc.nodeList,
		group: "proc",
		setValues: useCallback((xs: number[]) => setProc(p => ({ ...p, nodeList: xs })), [setProc]),
		dataKey: v => v,
		selection,
		acceptData: useCallback((data: unknown) => makeDragNode(data as DragNode), [makeDragNode]),
	});

	const builtinDragNodes = fill(builtinNodes.length, i => ({ type: "builtin", i } as const));
	const { ref: builtinRef } = useDragList<DragNode, HTMLUListElement>({
		group: "proc",
		values: builtinDragNodes,
		dataKey: v => v.i,
	});

	const { ref: userProcListRef, draggingKeys: draggingUserProcs } = useDragList<
		DragNode,
		HTMLUListElement
	>({
		values: useMemo(() => userProcList.map(i => ({ type: "user", i })), [userProcList]),
		setValues: useCallback((nodes: DragNode[]) => setProcList(nodes.map(x => x.i)), [setProcList]),
		dataKey: x => x.i,
		group: "proc",
	});

	// ensure stability, otherwise arrows flicker on update
	// bc refs are being deleted constantly...
	const setNodeRef = useCallback((node: number | "end", el: HTMLDivElement | null) => {
		if (el == null) return;
		nodeRefs.current.set(node, el);
		return () => nodeRefs.current.delete(node);
	}, []);
	const endNodeRef = useCallback((el: HTMLDivElement | null) => setNodeRef("end", el), [
		setNodeRef,
	]);

	const setReg = useCallback(
		(newReg: Register | null, i: number) =>
			setProc(p => ({
				...p,
				registers: mapWith(p.registers, i, newReg ?? undefined),
				registerList: newReg == null
					? p.registerList.filter(j => j != i)
					: p.registerList,
			})),
		[setProc],
	);

	const setNode = useCallback((newNode: Node | null, i: number) => {
		setProc(p => ({
			...p,
			nodes: mapWith(p.nodes, i, newNode ?? undefined),
			nodeList: newNode == null ? p.nodeList.filter(j => j != i) : p.nodeList,
		}));
	}, [setProc]);

	const { ref: registerListRef, draggingKeys: draggingRegisters } = useDragList<
		number,
		HTMLUListElement
	>({
		values: proc.registerList,
		setValues: (registerList: number[]) => setProc(p => ({ ...p, registerList })),
		dataKey: x => x,
	});

	const procNameValidity = useValidity(proc.name, v => setProc(p => ({ ...p, name: v })));
	const [procFilter, setProcFilter] = useState("");
	const showProcs = useMemo(() => {
		const s = toSearchString(procFilter);
		return new Set([...data.procs.entries()].flatMap(([i, v]) => {
			return toSearchString(v.name).includes(s) ? [i] : [];
		}));
	}, [data.procs, procFilter]);

	const [confirmClear, setConfirmClear] = useState(false);

	useEffect(() => {
		const active = runState?.scrollNode;
		if (active == undefined) return;

		clearNodeAnims();
		const ref = nodeRefs.current.get(active);
		const tm = setTimeout(() => {
			ref?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 100);
		return () => clearTimeout(tm);
	}, [clearNodeAnims, runState?.scrollNode]);

	const highlightGotoSelection = useMemo(() =>
		new Set(
			proc.nodes.entries().flatMap(([k, v]) => {
				if (
					v.op == "goto" && v.ref != "unset"
					&& (selection.has(k) || (v.ref != "end" && selection.has(v.ref)))
				) {
					return [k, v.ref];
				}
				return [];
			}),
		), [proc.nodes, selection]);

	type RemapClipboard = { sel: NodeSelection; open: boolean; remap: ("create" | number)[] };

	const noRemap = () => ({
		sel: { nodes: [], registers: [], procRegisters: new Map() },
		open: false,
		remap: [],
	});

	const [remappingClipboard, setRemappingClipboard] = useState<RemapClipboard>(noRemap);

	useEffect(() => {
		setSelection(new Set());
		setRemappingClipboard(noRemap());
		setSelectingGoto(null);
	}, [procI]);

	const pasteSel = useCallback((sel: NodeSelection, regMap: (number | "create")[]) => {
		setProc(p => {
			let insBegin = proc.nodeList.findLastIndex(i => selection.has(i));
			if (insBegin == -1) insBegin = proc.nodeList.length;
			else insBegin++;

			const newRegisters = regMap.flatMap((x, i) => {
				if (x == "create") return [sel.registers[i]];
				return [];
			}).map((reg, i) => [p.maxRegister+i, reg] as const);

			let createI = 0;
			const regMap2 = regMap.map(v => v == "create" ? newRegisters[createI++][0] : v);
			const newNodes = fromSelection(sel, fill(sel.nodes.length, i => proc.maxNode+i), regMap2);

			LocalStorage.clipboard = {
				...sel,
				procRegisters: mapWith(sel.procRegisters, procI, regMap2),
			};

			const addedI = newNodes.map(([i]) => i);
			const nlist = proc.nodeList.toSpliced(insBegin, 0, ...addedI);
			// probably illegal
			setSelection(new Set(addedI));
			return {
				...p,
				maxRegister: p.maxRegister+newRegisters.length,
				registerList: [...p.registerList, ...newRegisters.map(([i]) => i)],
				registers: new Map([...p.registers.entries(), ...newRegisters]),
				maxNode: p.maxNode+sel.nodes.length,
				nodeList: nlist,
				nodes: new Map([...p.nodes.entries(), ...newNodes]),
			};
		});

		setRemappingClipboard(v => ({ ...v, open: false }));
	}, [proc.maxNode, proc.nodeList, procI, selection, setProc]);

	const toast = useToast();
	useEffect(() => {
		const down = (ev: MouseEvent) => {
			const node = getClickNode(ev, data.nodeRefs, true);
			if (node == null || node == "end") {
				setSelection(new Set());
				return;
			}

			if (ev.shiftKey) {
				const minNode = proc.nodeList.findIndex(x => selection.has(x) || x == node);
				const maxNode = proc.nodeList.findLastIndex(x => selection.has(x) || x == node);
				setSelection(new Set(fill(maxNode-minNode+1, i => proc.nodeList[i+minNode])));
			} else if (ev.ctrlKey || ev.metaKey) {
				setSelection(setWith(selection, node, selection.has(node)));
			} else {
				setSelection(new Set(selection.has(node) ? [] : [node]));
			}

			ev.preventDefault();
		};

		const key = (ev: KeyboardEvent) => {
			if (ev.target != document.body) return;

			const mod = ev.metaKey || ev.ctrlKey;
			const up = ev.key == "ArrowUp", down = ev.key == "ArrowDown";
			const upDown = up || down;
			const off = up ? -1 : 1;
			if (mod && ev.key == "z") {
				undo(ev.shiftKey);
			} else if (mod && ev.key == "c" || mod && ev.key == "x" || ev.key == "Backspace") {
				if (selection.size == 0) return;

				if (ev.key == "c" || ev.key == "x") {
					LocalStorage.clipboard = toSelection(procI, proc, [...selection.values()]);
				}

				if (ev.key == "x" || ev.key == "Backspace") {
					setProc(p => ({
						...p,
						nodes: new Map([...p.nodes.entries()].filter(([i]) => !selection.has(i))),
						nodeList: p.nodeList.filter(i => !selection.has(i)),
					}));
				}

				toast(
					`${ev.key == "c" ? "Copied" : ev.key == "x" ? "Cut" : "Deleted"} ${selection.size} node${
						selection.size == 1 ? "" : "s"
					}`,
				);
			} else if (mod && ev.key == "v") {
				const data = LocalStorage.clipboard;
				if (!data || remappingClipboard.open) return;
				const regMap = data.registers.length == 0 ? [] : data.procRegisters.get(procI);
				if (regMap == null) {
					setRemappingClipboard({
						sel: data,
						open: true,
						remap: fill(data.registers.length, i => {
							return i >= proc.registerList.length ? "create" as const : proc.registerList[i];
						}),
					});
				} else {
					pasteSel(data, regMap);
					toast(`Pasted ${data.nodes.length} node${data.nodes.length == 1 ? "" : "s"}`);
				}
			} else if (mod && ev.key == "a") {
				setSelection(new Set(proc.nodeList));
			} else if (ev.key == "Escape" && selection.size > 0) {
				setSelection(new Set());
			} else if (upDown && ev.altKey && selection.size > 0) {
				const idx = proc.nodeList.findIndex(x => selection.has(x))+off;
				setProc(p => ({
					...p,
					nodeList: p.nodeList.filter(x => !selection.has(x)).toSpliced(
						Math.max(0, idx),
						0,
						...selection,
					),
				}));
			} else if (upDown && proc.nodeList.length > 0) {
				setSelection(s => {
					const ns = s.size > 0
						? s.keys().map(x => data.nodeMap.get(x)).filter(x => x != undefined).map(v =>
							proc.nodeList[(v+proc.nodeList.length+off)%proc.nodeList.length]
						)
						: [proc.nodeList[up ? proc.nodeList.length-1 : 0]];
					return new Set(ev.shiftKey ? [...ns, ...s] : ns);
				});
			} else {
				return;
			}

			ev.preventDefault();
		};

		document.addEventListener("keydown", key);
		document.addEventListener("mousedown", down);
		return () => {
			document.removeEventListener("keydown", key);
			document.removeEventListener("mousedown", down);
		};
	}, [
		data,
		pasteSel,
		proc,
		proc.nodeList,
		procI,
		remappingClipboard.open,
		selection,
		setProc,
		undo,
		toast,
	]);

	const addNode = useCallback((i: number, v: DragNode) => {
		const nv = makeDragNode(v)!;
		setProc(p => ({ ...p, nodeList: p.nodeList.toSpliced(i+1, 0, nv) }));
	}, [setProc, makeDragNode]);

	return <>
		<ConfirmModal open={confirmClear} onClose={() => setConfirmClear(false)}
			msg={"Are you sure you want to delete all nodes in this procedure?"} confirm={() => {
			setProc(p => ({ ...p, nodeList: [], nodes: new Map() }));
		}} />

		<Modal title="Remap registers from clipboard" open={remappingClipboard.open}
			onClose={() => setRemappingClipboard(v => ({ ...v, open: false }))}>
			<Text>
				You're trying to paste something from a different procedure. Choose how registers should be
				remapped.
			</Text>

			<div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-2 self-center items-center">
				{remappingClipboard.sel.registers.map((reg, i) =>
					<div key={i} className="contents">
						<div className="flex flex-col">
							<Text v="smbold">{regLabel(i, reg)}</Text>
							<Text v="dim">
								{reg.type == "value"
									? (typeof reg.value == "string" ? "Text" : "Number")
									: "Parameter"}
							</Text>
						</div>

						<IconArrowsRightLeft />

						<RegisterPicker create p={data} x={remappingClipboard.remap[i]} className="w-full"
							setX={nx => {
								setRemappingClipboard({
									...remappingClipboard,
									remap: remappingClipboard.remap.toSpliced(i, 1, nx),
								});
							}} />
					</div>
				)}
			</div>

			<div className="flex flex-row gap-2">
				<Button className={bgColor.sky} autofocus onClick={() => {
					pasteSel(remappingClipboard.sel, remappingClipboard.remap);
				}}>
					Paste
				</Button>
				<Button onClick={() => setRemappingClipboard(v => ({ ...v, open: false }))}>Cancel</Button>
			</div>
		</Modal>

		<div className="flex flex-col items-stretch editor-left overflow-y-auto overflow-x-hidden min-h-0 gap-2">
			<div
				className={twJoin(
					"flex flex-row gap-2 items-end pl-2 shrink-0 h-11",
					!isUserProc && "pl-4",
				)}>
				{back && <Anchor className="items-center self-end -mr-1" onClick={() => openProc()}>
					<IconChevronLeft size={32} />
				</Anchor>}

				{!isUserProc
					? <>
						<IconLogin2 size={32} />
						<Text v="bold">Entrypoint</Text>
					</>
					: <>
						<Text v="bold">Procedure</Text>
						<HiddenInput {...procNameValidity} required {...nameInputProps} size={1}
							className="grow" />
					</>}

				<Button className="ml-auto py-1" onClick={() => {
					setConfirmClear(true);
				}}>
					Clear
				</Button>
				{isUserProc && <>
					<AppTooltip placement="bottom" className="px-2 pb-2" content={
						<>
							<Text v="dim">Comment</Text>
							<Input maxLength={1024} value={proc.comment} valueChange={v =>
								setProc(p => ({ ...p, comment: v.length == 0 ? undefined : v }))} />
						</>
					}>
						<div>
							<IconButton icon={<IconInfoCircle size={20} />} />
						</div>
					</AppTooltip>
					<IconButton icon={<IconTrash size={20} />} onClick={() => {
						delProc();
					}} />
				</>}
			</div>

			<div className="relative">
				{proc.nodeList.map(x => [proc.nodes.get(x), x] as const).filter((
					v,
				): v is [Node & { op: "goto" }, number] => v[0]?.op == "goto").map(([v, i]) =>
					<GotoArrow key={`arrow${i}`} p={data} node={v} nodeI={i} />
				)}
				<ul ref={nodeListRef} className="pl-[80px] flex flex-col gap-1 items-stretch pb-20">
					<NodeAdder i={-1} add={addNode} procs={procs} procList={userProcList} />
					{proc.nodeList.flatMap((v, i) => {
						const node = proc.nodes.get(v)!;
						return [
							<ProcNode key={v} p={data} node={node} idx={i+1} setNode={setNode} nodeI={v}
								openProc={openProc} setRef={setNodeRef} status={draggingNodes.has(v)
								? "active"
								: runState?.activeNode == v
								? "active"
								: selection.has(v)
								? "selected"
								: highlightGotoSelection.has(v)
								? "target"
								: undefined} />,
							<NodeAdder key={`sep${v}`} i={i} add={addNode} procs={procs}
								procList={userProcList} />,
						];
					})}

					<div
						className={twMerge(
							blankStyle,
							highlightGotoSelection.has("end") && bgColor.md,
							selectingGoto != null && twJoin(bgColor.hover, "cursor-pointer"),
						)}
						ref={endNodeRef}>
						{proc.nodeList.length == 0
							? <>
								<IconHelp />
								<Text v="sm">Use the library on the right to add nodes</Text>
							</>
							: <>
								<img src="/end.svg" className="w-7" />
								<Text v="sm">
									End of procedure{selectingGoto != null && " (you can jump here)"}
								</Text>
								<Text v="dim" className="bottom-1 left-1 absolute">{proc.nodeList.length+1}</Text>
							</>}
					</div>
				</ul>
			</div>
		</div>

		<ul className="flex flex-col flex-wrap gap-2 mt-2 editor-nodebar" ref={builtinRef}>
			<AppTooltip placement="right" content={"Drag the built-in instructions below to the left."}>
				<div className={twMerge(blankStyle, "aspect-square py-1", bgColor.hover)}>
					<IconHelp size={30} />
				</div>
			</AppTooltip>
			{builtinNodes.map((v, i) =>
				<div key={v.op} data-key={i}>
					<AppTooltip placement="right" content={nodeHint[v.op]}>
						<div className={twMerge(blankStyle, "py-1", bgColor.hover)}>
							<img src={iconURL(v)} className="w-10 cursor-move draghandle" />
						</div>
					</AppTooltip>
				</div>
			)}
		</ul>

		<div className="flex flex-col gap-1 editor-mid min-h-0 max-h-full">
			<div className="flex flex-col items-stretch gap-2">{input}</div>

			<Divider />

			<div className="flex flex-row gap-2 items-center flex-wrap gap-y-0 mb-0.5">
				<Text v="bold">My procedures</Text>
				<Button onClick={() => openProc(entryProc)} className="ml-auto py-1">Main</Button>
				<Input value={procFilter} valueChange={setProcFilter} className="py-1 basis-1/3 border-1"
					placeholder={"Search"} />
			</div>

			<ul className={twJoin("flex flex-col overflow-y-auto gap-2 pb-5 shrink grow")}
				ref={userProcListRef}>
				{userProcList.map(i => {
					if (!procs.has(i) || !showProcs.has(i)) return <div key={i} className="hidden" />;
					return <ProcNode key={i} p={data} node={nodeForUserProc(i)} openProc={openProc} nodeI={i}
						status={draggingUserProcs.has(i) ? "active" : undefined} />;
				})}

				<Button className={blankStyle} onClick={() => addProc()}>
					<IconPlus />
					<Text v="sm">Create procedure</Text>
				</Button>
			</ul>
		</div>

		<div className="flex flex-col gap-1 editor-right min-h-0 pr-3">
			<Text v="bold" className="mt-2">Registers</Text>
			<ul
				className={twJoin(
					"flex flex-col gap-2 overflow-y-auto pb-5",
					stack != undefined && "basis-1/3 shrink-0 grow max-h-fit",
				)}
				ref={registerListRef}>
				{proc.registerList.map(r =>
					<RegisterEditor key={`${procI} ${r}`} p={data} reg={r} setReg={setReg}
						drag={draggingRegisters.has(r)} />
				)}

				<Button className={blankStyle} onClick={() => {
					setProc(p => ({
						...p,
						registerList: [...p.registerList, p.maxRegister],
						registers: mapWith(p.registers, p.maxRegister, {
							name: null,
							type: "value",
							value: 0n,
						}),
						maxRegister: p.maxRegister+1,
					}));
				}}>
					<IconPlus />
					<Text v="sm">Add register</Text>
				</Button>
			</ul>

			{stack}
		</div>
	</>;
}

export function TextEditor(
	{ edit, setEdit, back, value, setValue }: {
		edit: EditorState;
		setEdit: SetFn<EditorState>;
		value: string;
		setValue: (x: string) => void;
		back: () => void;
	},
) {
	const ref = useRef<HTMLPreElement>(null);
	// only set value on mount
	useEffect(() => {
		ref.current!.innerText = value;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [err, setErr] = useState<string | null>(null);

	return <div className="flex flex-col gap-2">
		<Text v="err">
			Warning: applying will overwrite procedures with names that appear below. It is recommended
			that you back things up beforehand, if you care about anything at all.
		</Text>
		<pre contentEditable ref={ref} onInput={ev => setValue(ev.currentTarget.innerText)}
			className={twMerge(
				interactiveContainerDefault,
				borderColor.focus,
				"w-full p-2 border-2 transition duration-300 rounded-none",
			)} />
		{err != null && <Alert title="Failed to convert from text" txt={err} bad />}
		<div className="flex flex-row justify-between">
			<Button icon={<IconChevronLeft className="-ml-1" />} onClick={back}>Back</Button>
			<Button onClick={() => {
				const res = addFromText(edit, value);
				if (res.type == "error") return setErr(res.error);

				setErr(null);
				setEdit(() => res.value);
			}}>
				Apply
			</Button>
		</div>
	</div>;
}

type PuzzleIOState = Readonly<
	({
		type: "decode";
		puzzle: Puzzle & { kind: "decode" };
		decoded: string;
		decodedDirty: string;
		encoded: string;
	} | {
		type: "simple";
		puzzle: Puzzle & { kind: "simple" };
		input: readonly (string | bigint)[];
		dirtyInput: readonly string[];
		output: string | bigint;
	}) & { err: string | null; programInput: readonly (bigint | string)[] }
>;

type PuzzleIO = PuzzleIOState
	& ({
		type: "simple";
		inputs:
			(({ type: "string"; value: string } | { type: "number"; value: string }) & {
				name: string;
			})[];
		setInput: (x: string, i: number) => void;
	} | { type: "decode"; setDecoded: (x: string) => void }) & {
	randomize: () => void;
	programInputRef: RefObject<readonly (bigint | string)[]>;
	programOutput: bigint | string;
};

function usePuzzleIO(puzzle: Puzzle): PuzzleIO {
	const stateFromPuzzle = (random?: boolean): PuzzleIOState => {
		if (puzzle.kind == "decode") {
			if (random != true) {
				return {
					type: "decode",
					puzzle,
					decoded: "",
					decodedDirty: "",
					encoded: "",
					err: null,
					programInput: [""],
				};
			}

			const decoded = puzzle.generator(), encoded = puzzle.encode(decoded);
			return {
				type: "decode",
				puzzle,
				decoded,
				decodedDirty: decoded,
				encoded,
				err: null,
				programInput: [encoded],
			};
		}

		const obj = puzzle.generator();
		const input = puzzle.schema.map(v => obj[v.key]);
		return {
			type: "simple",
			puzzle,
			input,
			dirtyInput: input.map(x => x?.toString()),
			output: puzzle.solve(obj),
			err: null,
			programInput: input,
		};
	};

	const [state, setState] = useState<PuzzleIOState>(stateFromPuzzle);
	const upState = (s: PuzzleIOState) => {
		let err: string | null = null;
		if (s.type == "decode") {
			err = s.puzzle.validator(s.decodedDirty);
			if (err == null) {
				const encoded = s.puzzle.encode(s.decodedDirty);
				s = { ...s, decoded: s.decodedDirty, encoded, programInput: [encoded] };
			}
		} else {
			const toNumStr = s.dirtyInput.map(x => {
				const v = strToInt(x);
				return v == null ? x : v;
			});

			for (const [x, i] of toNumStr.map((x, i) => [x, i] as const)) {
				if (typeof x == "string" && !validTextRe.test(x)) {
					err = `Input ${
						s.puzzle.schema[i].name
					} should be a valid register value (text should be lowercase alphabetic, all numbers must be integers)`;
					break;
				}

				if (typeof x != s.puzzle.schema[i].type) {
					err = `Input ${s.puzzle.schema[i].name} has mismatched type ${
						typeof x == "string" ? "text" : "number"
					} instead of ${s.puzzle.schema[i].type == "string" ? "text" : "number"}`;
					break;
				}
			}

			const obj = Object.fromEntries(s.puzzle.schema.map((x, i) => [x.key, toNumStr[i]]));
			err ??= s.puzzle.validator?.(obj) ?? null;
			if (err == null) {
				s = { ...s, input: toNumStr, programInput: toNumStr, output: s.puzzle.solve(obj) };
			}
		}

		setState({ ...s, err });
	};

	// to be used from effect without updating (i.e. only when run starts)
	const programInputRef = useRef<readonly (string | bigint)[]>([]);
	useEffect(() => {
		programInputRef.current = state.programInput;
	}, [state.programInput]);

	return {
		...state.type == "decode"
			? {
				...state,
				type: "decode",
				programOutput: state.decoded,
				setDecoded: v => upState({ ...state, decodedDirty: v }),
			}
			: {
				...state,
				type: "simple",
				inputs: state.puzzle.schema.map((
					v,
					i,
				) => ({
					name: v.name,
					type: v.type,
					value: state.dirtyInput[i],
				} as (PuzzleIO & { type: "simple" })["inputs"][number])),
				setInput(v, i) {
					upState({ ...state, dirtyInput: state.dirtyInput.toSpliced(i, 1, v) });
				},
				programOutput: state.output,
			},
		programInputRef,
		randomize: () => setState(stateFromPuzzle(true)),
	};
}

export function Editor(
	{ edit, setEdit, nextStage, puzzle }: {
		edit: EditorState;
		setEdit: SetFn<EditorState>;
		puzzle: Puzzle;
		nextStage: () => void;
	},
) {
	const [runState, setRunState] = useState<ReturnType<typeof clone> | null>();
	const [runStatus, setRunStatus] = useState<
		{ type: "done" | "stopped" } | { type: "paused"; breakpoint?: number } | {
			type: "running";
			step: boolean;
			restart: boolean;
		}
	>({ type: "stopped" });
	const [runError, setRunError] = useState<InterpreterError | null>(null);
	const [output, setOutput] = useState<[readonly (string | bigint)[] | null, string | bigint]>([
		null,
		"",
	]);

	const [procHistory, setProcHistory] = useState<number[]>([]);
	const [active, setActive] = useState(edit.entryProc);
	const io = usePuzzleIO(puzzle);

	const toast = useToast();
	const activeProc = edit.procs.get(active);

	const openProc = useCallback((i?: number) => {
		const newProcHistory = [...procHistory];
		if (i != null) {
			if (i != active) newProcHistory.push(active);
		} else {
			while (i == null || !edit.procs.has(i)) {
				i = newProcHistory.pop() ?? edit.entryProc;
			}
		}

		setActive(i);
		setProcHistory(newProcHistory);
	}, [active, edit.entryProc, edit.procs, procHistory]);

	useEffect(() => {
		if (!activeProc) openProc();
	}, [activeProc, edit.entryProc, openProc]);

	const setProc = useCallback((n: (x: Procedure) => Procedure) => {
		setEdit(v => {
			const newUndo = [
				...v.undoHistory.slice(0, v.curNumUndo == 0 ? v.undoHistory.length : -v.curNumUndo),
				[active, v.procs.get(active)!] as const,
			];

			if (newUndo.length > maxUndoSteps) newUndo.shift();

			return {
				...v,
				procs: mapWith(v.procs, active, n(v.procs.get(active)!)),
				undoHistory: newUndo,
				curNumUndo: 0,
			};
		});
	}, [active, setEdit]);

	const undo = useCallback((redo: boolean) =>
		setEdit(v => {
			if ((!redo && v.curNumUndo >= v.undoHistory.length) || (redo && v.curNumUndo == 0)) {
				toast(redo ? "Out of redoes" : "Out of undoes");
				return v;
			}

			const idx = redo ? v.undoHistory.length-v.curNumUndo : v.undoHistory.length-1-v.curNumUndo;
			const step = v.undoHistory[idx];

			setActive(step[0]);
			return {
				...v,
				procs: mapWith(v.procs, step[0], step[1]),
				curNumUndo: redo ? v.curNumUndo-1 : v.curNumUndo+1,
				undoHistory: v.undoHistory.toSpliced(idx, 1, [step[0], v.procs.get(step[0])!]),
			};
		}), [setEdit, toast]);

	const setProcList = useCallback((vs: number[]) => {
		setEdit(v => ({ ...v, userProcList: vs }));
	}, [setEdit]);

	const [frameI, setFrameI] = useState<number | null>(null);
	const [frameScrollNode, setFrameScrollNode] = useState<number | null>(null);
	const frame = frameI == null ? undefined : runState?.stack[frameI];

	const lastProcAndNodeI = useRef<[number, number]>();
	useEffect(() => {
		if (runState && frame && runStatus.type == "paused") {
			if (frame.proc == lastProcAndNodeI.current?.[0] && frame.i == lastProcAndNodeI.current?.[1]) {
				return;
			}

			lastProcAndNodeI.current = [frame.proc, frame.i];
			const p = edit.procs.get(frame.proc);
			setFrameScrollNode(p?.nodeList[frame.i] ?? null);
		} else {
			setFrameScrollNode(null);
		}
	}, [edit.procs, frame, frameI, runState, runStatus.type]);

	// changing active procedure should sync frame
	// and set active node
	useEffect(() => {
		if (runState == null) {
			setFrameI(null);
			return;
		}
		if (frame?.proc == active) return;
		const last = runState.stack.findLastIndex(x => x.proc == active);
		setFrameI(last == -1 ? null : last);
	}, [active, frame?.proc, runState]);

	const openFrame = useCallback((fi: number, proc: number) => {
		setFrameI(fi);
		setActive(proc);
	}, []);

	useEffect(() => {
		const inBreakpoint =
			runStatus.type == "paused" && runStatus.breakpoint != undefined && runState
				&& runState.stack.length > 0
				? runState.stack.length-1
				: null;

		if (inBreakpoint != null) {
			toast("Breakpoint hit");
			openFrame(inBreakpoint, runState!.stack[inBreakpoint].proc);
		}
	}, [openFrame, runState, runStatus, setEdit, toast]);

	const [newProc, setNewProc] = useState({ open: false, name: "" });
	const activeProcRunState = useMemo((): ProcRunState | null => {
		if (!activeProc) return null;

		return frame == null
			? null
			: {
				activeNode: activeProc.nodeList[frame.i] ?? null,
				registers: frame.registers,
				scrollNode: frameScrollNode,
			};
	}, [activeProc, frame, frameScrollNode]);

	const [confirmDelete, setConfirmDelete] = useState<{ proc: Procedure | null; open: boolean }>({
		open: false,
		proc: null,
	});

	const runStateRef = useRef<ProgramState | null>(null);
	const originalInput = useRef<readonly (string | bigint)[] | null>(null);
	const [ignoreBreakpoint, setIgnoreBreakpoint] = useState(false);

	useEffect(() => {
		if (runStatus.type == "stopped") {
			setRunState(null);
			setRunError(null);
			runStateRef.current = null;
		}

		if (runStatus.type != "running") return;

		setRunError(null);

		const handle = (f: () => void) => {
			let ret = true;
			try {
				f();
			} catch (e) {
				ret = false;
				if (e instanceof InterpreterError) {
					setRunState(runStateRef.current ? clone(runStateRef.current) : null);
					setRunStatus({ type: "paused" });
					setRunError(e);
				} else {
					throw e;
				}
			}

			return ret;
		};

		let initV = runStateRef.current;
		const doPush = initV == null || runStatus.restart;
		if (doPush) {
			originalInput.current = io.programInputRef.current;
			if (
				!handle(() => {
					runStateRef.current = initV = makeState({
						input: originalInput.current ?? [],
						entry: edit.entryProc,
						procs: edit.procs,
					});
				})
			) return;
		}

		// should be init by handle above, otherwise return
		if (initV == null) throw new Error("unreachable");
		const v = initV;
		v.procs = edit.procs;
		v.stopOnBreakpoint = doPush && !ignoreBreakpoint;

		let cont = true;
		const doStep = () => {
			const xd = handle(() => {
				const ret = step(v);
				if (ret == "breakpoint") {
					cont = false;
					const top = v.stack[v.stack.length-1];
					// needs to be computed here since modifying
					const breakNode = edit.procs.get(top.proc)?.nodeList[top.i];
					setRunStatus({ type: "paused", breakpoint: breakNode });
				} else if (ret == false) {
					cont = false;
					setOutput([originalInput.current, v.outputRegister.current]);
					setRunStatus({ type: "done" });
				}
			});

			cont &&= xd;

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
		let int: number | null;

		const intervalDelay = Math.max(200, 1000/edit.stepsPerS);
		const stepsPerInterval = edit.stepsPerS/(1000/intervalDelay);
		const end = () => {
			if (int != null) clearInterval(int);
			int = null;
		};
		let nstep = 0;
		const cb = () => {
			for (nstep += stepsPerInterval; nstep > 0 && cont; nstep--) {
				doStep();
			}
			setRunState(clone(v));
			if (!cont) end();
		};

		int = setInterval(cb, intervalDelay);
		cb();
		return () => end();
	}, [edit.entryProc, edit.procs, edit.stepsPerS, ignoreBreakpoint, io.programInputRef, runStatus]);

	const mod = (m: number) =>
		setEdit(v => ({ ...v, stepsPerS: Math.max(0.1, Math.min(5000, v.stepsPerS*m)) }));

	const play = (opt: { step?: boolean; restart?: boolean }) => {
		setRunStatus({ type: "running", step: opt.step ?? false, restart: opt.restart ?? false });
	};

	const [referenceOpen, setReferenceOpen] = useState(false);
	const [open, setOpen] = useState<{ panel: "text" | "dashboard"; open: boolean }>({
		panel: "dashboard",
		open: false,
	});

	const doOpen = () => setOpen({ panel: "dashboard", open: true });
	const [value, setValue] = useState("");
	useEffect(() => {
		const txt = toText({ procs: edit.procs, entry: edit.entryProc });
		setValue(txt);
	}, [edit.entryProc, edit.procs, setValue]);

	useEffect(() => {
		if (LocalStorage.seenReference != true) {
			setReferenceOpen(true);
			LocalStorage.seenReference = true;
		} else if (import.meta.env["VITE_OPEN_DASHBOARD"] != "0") {
			doOpen();
		}
	}, []);

	const setSolved = useCallback(() => setEdit(e => ({ ...e, solved: true })), [setEdit]);

	const goto = useGoto();

	const stack = runStatus.type == "stopped"
		? undefined
		: <div className="flex flex-col editor-right-down gap-2 min-h-0 pb-4">
			<Divider className="mb-0" />
			<Text v="bold">Stack</Text>

			{runError && <Alert bad title="Runtime error" txt={runError.txt()} />}

			{!runState || runState.stack.length == 0
				? <div className={blankStyle}>The stack is empty.</div>
				: <div className={`flex flex-col ${borderColor.default} border-1 overflow-y-auto`}>
					{runState.stack.flat().map((v, i) => {
						const p = edit.procs.get(v.proc);
						return <button key={i}
							className={twJoin(
								"w-full py-0.5 px-1 not-last:border-b-1",
								bgColor.default,
								borderColor.divider,
								bgColor.hover,
								i == frameI && "dark:bg-zinc-700!",
							)} disabled={!p || i == frameI} onClick={() => openFrame(i, v.proc)}>
							{p?.name ?? "(deleted)"}: {"#"}
							{v.i+1}
						</button>;
					}).reverse()}
				</div>}
		</div>;

	const stats = <AppTooltip placement="bottom"
		content={runState && statsArr(runState.stats).map((x, i) => <p key={i}>{x}</p>)}
		disabled={runState == null}>
		<div>
			<IconButton disabled={runState == null} icon={<IconChartBar />} />
		</div>
	</AppTooltip>;

	const inputSection = <>
		{io.type == "decode"
			? <Input value={io.decodedDirty} valueChange={io.setDecoded} />
			: <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center justify-stretch">
				{io.inputs.map((inp, i) =>
					<div key={i} className="contents">
						<Text v="smbold">{inp.name}:</Text> <Input value={inp.value} valueChange={newV =>
							io.setInput(newV, i)} />
					</div>
				)}
			</div>}

		{io.err != null && <Alert bad title="Invalid input" txt={io.err} />}

		{io.type == "decode"
			&& <div className={twJoin(blankStyle, "items-stretch px-8")}>
				{io.decoded.length > 0
					? <div
						className={twJoin(
							"flex flex-wrap gap-4 gap-y-1 items-center justify-center",
							io.decoded.length+io.encoded.length > 30 ? "flex-col" : "flex-row",
						)}>
						<Text v="code">{io.decoded}</Text>
						<IconArrowsRightLeft />
						<Text v="code">{io.encoded}</Text>
					</div>
					: <>
						<IconHelp className="self-center" />
						After entering a plaintext above, you will see the ciphertext here.
						<b>Your objective is to decrypt the ciphertext (i.e. perform the reverse operation).</b>
					</>}
			</div>}

		{output[0] == io.programInput && (output[1] == io.programOutput
			? <Alert className={bgColor.green} title="Test passed"
				txt={output[1] == "" ? "Your program correctly output nothing." : <>
					<p>Your program correctly output:</p>
					<Text v="code">{output[1].toString()}</Text>
				</>} />
			: <Alert bad title="Test failed" txt={
				<div className="flex flex-col gap-1">
					<p>
						{output[1] == "" ? "Your program didn't output anything!" : <>
							Your program output: <Text v="code">{output[1].toString()}</Text>
						</>}
					</p>
					<p>
						Expected: <Text v="code">{io.programOutput.toString()}</Text>
					</p>
				</div>
			} />)}
	</>;

	const sub = useSubmission({ setSolved, puzzle, nextStage });
	const submitButton = (sm: boolean) =>
		<Button onClick={() => {
			sub.setSubmission({ procs: edit.procs, active });
			doOpen();
		}} className={twJoin(sm && "py-1")} disabled={sub.loading}
			icon={sub.loading && <ThemeSpinner size="sm" />}>
			{sub.resubmitting ? "Res" : "S"}ubmit{sm ? "" : " solution"}
		</Button>;

	const makeInput = (withSubmit: boolean) =>
		<div className="flex flex-row justify-between gap-2 items-end mt-2 -mb-1">
			<Text v="bold">{puzzle.kind == "decode" ? "Plaintext" : "Input"}</Text>
			<div className="flex flex-row gap-1">
				<Button className="py-1" onClick={io.randomize} shortcut="r">Random</Button>
				{withSubmit && submitButton(true)}
			</div>
		</div>;

	const procInput = <>{makeInput(true)}{inputSection}</>;

	useShortcuts({ shortcut: "enter", onClick: () => setOpen(o => ({ ...o, open: true })) });

	return <div className="grid h-dvh gap-x-4 w-full editor">
		<div className="editor-top flex flex-row gap-4 py-1 justify-between items-center pl-4">
			<div className="flex flex-row gap-2 items-center h-full">
				<button onClick={() => goto("/menu")}
					className={twMerge("flex flex-row hover:scale-105 transition-transform h-full")}>
					<LogoBack />
				</button>

				<span className="w-2" />

				{stats}
				<IconButton icon={<IconPlayerStopFilled className="fill-red-500" />}
					disabled={runStatus.type == "stopped"} onClick={() => {
					setRunStatus({ type: "stopped" });
				}} shortcut={runStatus.type != "stopped" ? "escape" : undefined} />

				<IconButton
					icon={runStatus.type == "done"
						? <IconRotate className={"stroke-green-400"} />
						: runStatus.type != "running"
						? <IconPlayerPlayFilled className={"fill-green-400"} />
						: <IconPlayerPauseFilled />}
					onClick={() => {
						if (runStatus.type == "running") setRunStatus({ type: "paused" });
						else play({ restart: runStatus.type == "done" });
					}}
					shortcut=" " />

				<IconButton
					icon={
						<IconPlayerSkipForwardFilled className="fill-green-400 group-disabled:fill-gray-400" />
					}
					className="group"
					disabled={runStatus.type == "running"}
					onClick={() => play({ restart: runStatus.type == "done", step: true })}
					shortcut="s" />

				<AppTooltip content={`${ignoreBreakpoint ? "En" : "Dis"}able breakpoints`}>
					<div>
						<IconButton
							icon={ignoreBreakpoint
								? <IconCircleOff className="fill-gray-500" />
								: <IconCircleFilled className="fill-red-500" />}
							onClick={() => {
								setIgnoreBreakpoint(!ignoreBreakpoint);
							}}
							shortcut="b" />
					</div>
				</AppTooltip>

				<span className="w-2" />

				<IconButton icon={<IconPlayerTrackPrevFilled />} disabled={edit.stepsPerS < 0.2}
					onClick={() => mod(0.5)} shortcut="arrowleft" />

				<Button className="py-1 h-fit" onClick={() => setEdit(e => ({ ...e, stepsPerS: 5 }))}>
					Speed: {edit.stepsPerS.toFixed(2)}
				</Button>

				<IconButton disabled={edit.stepsPerS > 2500} icon={<IconPlayerTrackNextFilled />}
					onClick={() => mod(2)} shortcut="arrowright" />
				<span className="w-2" />

				<Text v="dim" className="relative">
					<span className="absolute left-0">{runStatus.type}</span>
					{/* use hidden long text to prevent resizing */}
					<span className="opacity-0 -z-10">stopped</span>
				</Text>

				<span className="w-2" />
				<Reference referenceOpen={referenceOpen} setReferenceOpen={setReferenceOpen} />
				<Messages stage={puzzle} />
			</div>

			<button
				className={twMerge(
					anchorStyle,
					"flex flex-row p-1 grow items-center justify-center gap-4",
					open.open && bgColor.md,
				)}
				onClick={() => setOpen(o => ({ ...o, open: true }))}>
				<div className="flex flex-col items-center">
					<Text v="md">{puzzle.name}</Text>
					<Text v="dim">Open puzzle dashboard</Text>
				</div>
				{edit.solved && <IconCircleCheckFilled className="fill-green-400" size={32} />}
			</button>
		</div>

		<Modal open={open.open} onClose={() => setOpen({ panel: open.panel, open: false })}
			title={open.panel == "dashboard" ? puzzle.name : "SUBTXT editor"}>
			{open.panel == "dashboard"
				? <div className="flex flex-col items-stretch gap-2">
					<Text className="mb-1 italic">{puzzle.blurb}</Text>
					{puzzle.extraDesc != undefined && <Text className="mb-1">{puzzle.extraDesc}</Text>}

					{puzzle.kind == "simple" ? makeInput(false) : <div className="flex flex-row gap-2 -mb-1">
						<Text v="dim">
							Plaintext
							<Anchor onClick={io.randomize} className="ml-2">(randomize)</Anchor>
						</Text>
					</div>}

					{inputSection}

					<Text v="sm">
						Submit when you're ready for your solution to be judged. You will need to solve{" "}
						{numTests} tests to pass this level.
					</Text>

					{submitButton(false)}

					<Submission sub={sub} />

					<Button icon={<IconPencil />} className="self-end" onClick={() =>
						setOpen({ open: true, panel: "text" })}>
						SUBTXT editor
					</Button>
				</div>
				: <TextEditor value={value} setValue={setValue} edit={edit} setEdit={setEdit}
					back={() => doOpen()} />}
		</Modal>

		<ConfirmModal open={confirmDelete.open}
			onClose={() => setConfirmDelete(v => ({ ...v, open: false }))} title="Delete procedure?"
			msg={`Are you sure you want to delete ${confirmDelete.proc?.name}?`} confirm={() => {
			setEdit(v => ({
				...v,
				procs: mapWith(v.procs, active, undefined),
				userProcList: v.userProcList.filter(x => x != active),
			}));
		}} />

		<Modal open={newProc.open} onClose={() => setNewProc({ ...newProc, open: false })}
			title="Create procedure">
			<form onSubmit={ev => {
				ev.preventDefault();
				if (ev.currentTarget.reportValidity()) {
					setEdit(v => {
						openProc(v.maxProc);
						return {
							...v,
							procs: mapWith(v.procs, v.maxProc, makeProc(newProc.name)),
							userProcList: [...v.userProcList, v.maxProc],
							maxProc: v.maxProc+1,
						};
					});

					setNewProc({ ...newProc, open: false });
				}
			}} className="flex flex-col gap-2">
				<Text>Name</Text>
				<Input autofocus {...nameInputProps} required value={newProc.name} valueChange={v => {
					setNewProc({ ...newProc, name: v });
				}} />
				<Button>Create</Button>
			</form>
		</Modal>

		{activeProc
			&& <ProcEditor proc={activeProc} input={procInput} i={active} setProc={setProc}
				procs={edit.procs} userProcList={edit.userProcList} setProcList={setProcList}
				entryProc={edit.entryProc} addProc={() => setNewProc({ name: "", open: true })}
				delProc={() => setConfirmDelete({ proc: activeProc, open: true })} openProc={openProc}
				back={procHistory.length > 0} runState={activeProcRunState} stack={stack} undo={undo} />}
	</div>;
}
