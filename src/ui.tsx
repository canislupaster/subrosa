import { ComponentChildren, JSX, ComponentProps, createContext, ComponentChild, Ref, RefObject, cloneElement, VNode } from "preact";
import { Dispatch, useCallback, useContext, useEffect, useErrorBoundary, useMemo, useRef, useState } from "preact/hooks";
import { IconChevronDown, IconChevronUp, IconInfoCircleFilled, IconInfoTriangleFilled, IconLoader2, IconX } from "@tabler/icons-preact";
import { twMerge } from "tailwind-merge";
import { ArrowContainer, Popover, PopoverState } from "react-tiny-popover";
import { forwardRef, SetStateAction } from "preact/compat";
import clsx from "clsx";
import { useLocation } from "preact-iso";
import { Procedure } from "../shared/eval";
import { parseExtra, stringifyExtra } from "../shared/util";

// dump of a bunch of UI & utility stuff ive written...

export const textColor = {
	contrast: "dark:text-white text-black",
	sky: "dark:text-sky-400 text-sky-700",
	green: "dark:text-green-500 text-green-700",
	red: "dark:text-red-500 text-red-700",
	default: "dark:text-zinc-100 text-zinc-800 dark:disabled:text-gray-400 disabled:text-gray-500",
	link: "text-gray-700 dark:text-gray-200 underline-offset-2 transition-all hover:text-black dark:hover:text-gray-50 hover:bg-cyan-800/5 dark:hover:bg-cyan-100/5 cursor-pointer underline decoration-dashed decoration-1",
	blueLink: "dark:text-blue-200 text-sky-800",
	star: "dark:text-amber-400 text-amber-600",
	gray: "dark:text-gray-200 text-gray-700",
	dim: "dark:text-gray-400 text-gray-500"
};

export const bgColor = {
	default: "dark:bg-zinc-800 bg-zinc-200 dark:disabled:bg-zinc-600",
	md: "dark:bg-zinc-850 bg-zinc-150 dark:disabled:bg-zinc-600",
	hover: "dark:hover:bg-zinc-700 hover:bg-zinc-150",
	secondary: "dark:bg-zinc-900 bg-zinc-150",
	green: "dark:enabled:bg-green-800 enabled:bg-green-400",
	sky: "dark:enabled:bg-sky-700 enabled:bg-sky-300",
	red: "dark:enabled:bg-red-800 enabled:bg-red-300",
	rose: "dark:enabled:bg-rose-900 enabled:bg-rose-300",
	highlight: "dark:bg-yellow-800 bg-amber-200",
	restriction: "dark:bg-amber-900 bg-amber-100",
	divider: "dark:bg-zinc-500 bg-zinc-400",
	contrast: "dark:bg-white bg-black"
}

export const borderColor = {
	default: "border-zinc-300 dark:border-zinc-600 disabled:bg-zinc-300 aria-expanded:border-blue-500 data-[selected=true]:border-blue-500",
	red: "border-red-400 dark:border-red-600",
	defaultInteractive: "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500 disabled:bg-zinc-300 aria-expanded:border-blue-500 active:border-blue-500 dark:active:border-blue-500 data-[selected=true]:border-blue-500",
	blue: `hover:border-blue-500 dark:hover:border-blue-500 border-blue-500 dark:border-blue-500`,
	focus: `focus:border-blue-500 dark:focus:border-blue-500`
};

export const outlineColor = {
	default: "active:outline focus:outline focus:theme:outline-blue-500 active:theme:outline-blue-500 outline-offset-[-1px]"
};

export const containerDefault = `${textColor.default} ${bgColor.default} ${borderColor.default} border-1`;
export const invalidInputStyle = `invalid:dark:bg-rose-900 invalid:bg-rose-400 invalid:dark:border-red-500 invalid:theme:border-red-700`;
export const interactiveContainerDefault = `${textColor.default} ${bgColor.default} ${borderColor.defaultInteractive} ${outlineColor.default} ${invalidInputStyle} border-1`;

export type InputProps = {icon?: ComponentChildren, className?: string, valueChange?: (x: string)=>void}&JSX.InputHTMLAttributes<HTMLInputElement>;
export const Input = forwardRef<HTMLInputElement, InputProps>((
	{className, icon, onInput, valueChange, ...props}, ref
)=>{
	const input = <input type="text" className={clsx("w-full p-2 border-2 transition duration-300 rounded-none", icon!=undefined && "pl-11", interactiveContainerDefault, borderColor.focus, className)} onInput={
		onInput ?? (valueChange!=undefined ? (ev: InputEvent)=>{
			valueChange((ev.currentTarget as HTMLInputElement).value);
		} : undefined)
	} ref={ref} {...props} />

	if (icon!=undefined) {
		return <div className="relative" >
			{input}
			{icon!=undefined && <div className="absolute left-0 my-auto pl-3 top-0 bottom-0 flex flex-row items-center" >
				{icon}
			</div>}
		</div>;
	}

	return input;
});

export function HiddenInput({className, ...props}: JSX.InputHTMLAttributes<HTMLInputElement>&{className?: string}) {
	return <input className={twMerge(clsx("bg-transparent border-0 outline-none border-b-2 focus:outline-none focus:theme:border-blue-500 transition duration-300 px-1 py-px pb-0.5 h-fit", borderColor.default, className))}
		{...props} />;
}

export function Textarea({className, children, ...props}: JSX.IntrinsicElements["textarea"]&{className?: string}) {
	return <textarea className={twMerge(clsx(interactiveContainerDefault, borderColor.focus, "w-full p-2 border-2 transition duration-300 rounded-none resize-y max-h-60 min-h-24", className))}
		rows={6} tabIndex={100} {...props} >
		{children}
	</textarea>
}

export type ButtonProps = JSX.IntrinsicElements["button"]&{
	icon?: ComponentChildren, iconRight?: ComponentChildren, disabled?: boolean, className?: string
};

export function Button({className, disabled, icon, iconRight, ...props}: ButtonProps) {
	return <button disabled={disabled} className={twMerge(clsx("flex flex-row justify-center gap-1.5 px-2 py-1.5 items-center group", interactiveContainerDefault), className)} {...props} >
		{icon}
		{props.children}
		{iconRight}
	</button>;
}

export const IconButton = ({className, icon, disabled, ...props}: {icon?: ComponentChildren, disabled?: boolean, className?: string}&JSX.IntrinsicElements["button"]) =>
	<button className={twMerge(clsx("rounded-sm p-1.5 flex items-center justify-center h-fit aspect-square", interactiveContainerDefault, className))} disabled={disabled} {...props} >
		{icon}
	</button>;

type AnchorProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement>;
export const anchorStyle = "text-gray-600 dark:text-gray-300 inline-flex flex-row align-baseline items-baseline gap-1 underline decoration-dashed decoration-1 underline-offset-2 transition-all hover:text-black dark:hover:text-gray-50 hover:bg-cyan-100/5 cursor-pointer";

export const Anchor = forwardRef<HTMLAnchorElement, AnchorProps>((
	{className,children,...props}: AnchorProps, ref
) => {
	const classN = twMerge(clsx(anchorStyle, className));
	return <a ref={ref} className={classN} {...props} >{children}</a>;
});

export const LinkButton = ({className, icon, ...props}:
	JSX.AnchorHTMLAttributes<HTMLAnchorElement>&{icon?: ComponentChildren, className?: string}
) =>
	<a className={twMerge(clsx("flex flex-row gap-2 px-3 py-1.5 items-center rounded-xl text-sm", interactiveContainerDefault, className))} rel="noopener noreferrer" {...props} >
		{icon!=undefined &&
			<span className="inline-block h-4 w-auto" >{icon}</span> }
		{props.children}
	</a>;

export const ThemeSpinner = ({className,size}: {className?: string, size?: "sm"|"md"|"lg"}) =>
	<IconLoader2 size={{sm: 24, md: 36, lg: 72}[size ?? "md"]}
		className={twMerge(clsx(`animate-spin stroke-${{sm: 1, md: 2, lg: 3}[size ?? "md"]} dark:stroke-white stroke-blue-600`, className))} />;

export const Loading = (props: ComponentProps<typeof ThemeSpinner>) =>
	<div className="h-full w-full flex item-center justify-center py-16 px-20" >
		<ThemeSpinner size="lg" {...props} />
	</div>;

export const chipColors = {
	red: "dark:bg-red-600 dark:border-red-400 bg-red-400 border-red-200",
	green: "dark:bg-green-600 dark:border-green-400 bg-green-400 border-green-200",
	blue: "dark:border-cyan-400 dark:bg-sky-600 border-cyan-200 bg-sky-400",
	gray: "dark:border-gray-300 dark:bg-gray-600 border-gray-100 bg-gray-300",
	purple: "dark:bg-purple-600 dark:border-purple-300 bg-purple-400 border-purple-300",
	teal: "dark:bg-[#64919b] dark:border-[#67cce0] bg-[#aedbe8] border-[#95e6fc]",
};

export const chipColorKeys = Object.keys(chipColors) as (keyof typeof chipColors)[];

export const Chip = ({className, color, ...props}: JSX.HTMLAttributes<HTMLSpanElement>&{
	color?: keyof typeof chipColors, className?: string
}) =>
	<span className={twMerge(clsx("inline-block text-xs px-2 py-1 rounded-lg border-solid border whitespace-nowrap", chipColors[color ?? "gray"], className))}
		{...props} >{props.children}</span>;

export function capitalize(s: string) {
	const noCap = ["of", "a", "an", "the", "in"];
	return s.split(/\s+/g).filter(x=>x.length>0).map((x,i)=>{
		if (i>0 && noCap.includes(x)) return x;
		return `${x[0].toUpperCase()}${x.slice(1)}`;
	}).join(" ");
}

export const Alert = ({title, txt, bad, className}: {
	title?: ComponentChildren, txt: ComponentChildren,
	bad?: boolean, className?: string
}) =>
	<div className={twMerge(clsx("border", bad??false ? `${bgColor.red} ${borderColor.red}` : `${bgColor.default} ${borderColor.default}`, "p-2 px-4 rounded-sm flex flex-row gap-2", className))} >
		<div className={clsx("flex-shrink-0", title!=undefined && "mt-1")} >
			{bad??false ? <IconInfoTriangleFilled /> : <IconInfoCircleFilled />}
		</div>
		<div>
			{title!=undefined && <h2 className="font-bold font-display text-lg" >{title}</h2>}
			<div className="flex flex-col gap-2" >{txt}</div>
		</div>
	</div>;

export const Divider = ({className, contrast}: {className?: string, contrast?: boolean}) =>
	<span className={twMerge(clsx("w-full h-px shrink-0", contrast??false ? "dark:bg-zinc-400 bg-zinc-500" : "dark:bg-zinc-600 bg-zinc-300", "my-2", className))} />;

export const Card = ({className, children, ...props}:
	JSX.HTMLAttributes<HTMLDivElement>&{className?: string}
) =>
	<div className={twMerge(clsx("flex flex-col gap-1 rounded-md p-2 border-1 dark:border-zinc-600 shadow-md dark:shadow-black shadow-white/20 border-zinc-300", bgColor.md, className))} {...props} >
		{children}
	</div>;

export function MoreButton({children, className, act: hide, down}: {
	act: ()=>void, children?: ComponentChildren, className?: string, down?: boolean
}) {
	return <div className={twMerge(clsx("flex flex-col w-full items-center", className))} >
		<button onClick={hide} className={clsx("flex flex-col items-center cursor-pointer transition", down??false ? "hover:translate-y-1" : "hover:-translate-y-1")} >
			{down??false ? <>{children}<IconChevronDown /></>
				: <><IconChevronUp />{children}</>}
		</button>
	</div>
}

export const fadeGradient = {
	default: "from-transparent dark:to-neutral-950 to-zinc-100",
	primary: "from-transparent dark:to-zinc-800 to-zinc-200",
	secondary: "from-transparent dark:to-zinc-900 to-zinc-150"
};

type ShowTransitionProps = {
	children: ComponentChild, open: boolean,
	openClassName?: string, closedClassName?: string,
	update?: (show: boolean, element: HTMLElement)=>void
};

export const ShowTransition = forwardRef<HTMLElement, ShowTransitionProps>(({
	children, open, openClassName, closedClassName, update
}, ref) => {
	const myRef = useRef<HTMLElement>(null);
	const [show, setShow] = useState(false);

	const cls = open ? openClassName : closedClassName;
	const removeCls = open ? closedClassName : openClassName;
	useEffect(()=>{
		const el = myRef.current;
		if (!open && !show) return;
		if (!show) { setShow(true); return; }
		if (!el) {
			console.warn("transition element not mounted despite shown");
			return;
		}

		update?.(true, el);

		// wait for animations to begin, and then wait for all to end
		let enabled=true;
		const wait = ()=>setTimeout(()=>{
			const anims = el.getAnimations({subtree: true});
			if (!enabled || anims.length==0) {
				update?.(false, el);
				setShow(false);
				return;
			}

			void Promise.all(anims.map(x=>x.finished)).then(()=>{
				tm=wait();
			});
		}, 50);

		let tm = open ? null : wait();
		
		el.classList.remove(...removeCls?.split(" ") ?? []);
		el.classList.add(...cls?.split(" ") ?? []);

		return () => {
			if (tm!=null) clearTimeout(tm);
			enabled=false;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, show]);

	if (children==undefined || !show) return <></>;
	return cloneElement(children as VNode, { ref: cloneRef(ref, myRef) });
});

export const Collapse = forwardRef<HTMLDivElement, JSX.IntrinsicElements["div"]&{
	open?: boolean
}>((
	{children, open, className, style, ...props}, ref
)=>{
	const myRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [showInner, setShowInner] = useState(false);

	useEffect(()=>{
		const main=myRef.current, inner = innerRef.current
		if (!main || !inner) return;

		let frame: number|null;
		setShowInner(main.clientHeight>0 || open!=false);
		let lt = performance.now();
		const cb = ()=>requestAnimationFrame((t)=>{
			const dt = t-lt;
			const style = getComputedStyle(main);
			const mainInnerHeight = main.clientHeight - parseFloat(style.paddingBottom) - parseFloat(style.paddingTop);
			const d = (open==false ? 0 : inner.clientHeight) - mainInnerHeight;
			const done = Math.abs(d) < 5;
			let newH = (done ? d : d*dt*10/1000) + parseFloat(style.height);
			if (d<0) newH=Math.floor(newH); else newH=Math.ceil(newH);
			
			// do not allow collapse if open is not false
			if (mainInnerHeight<1 && newH>0) setShowInner(true);
			else if (mainInnerHeight>0 && newH<1 && open==false) setShowInner(false);
			main.style.height = `${newH}px`;

			lt=t;
			if (done) frame=null; else frame = cb();
		});
		
		const observer = new ResizeObserver(()=>{
			if (frame==null) frame=cb();
		});

		observer.observe(inner);

		frame = cb();
		return ()=>{
			observer.disconnect();
			if (frame!=null) cancelAnimationFrame(frame);
		};
	}, [open]);

	return <div ref={cloneRef(ref, myRef)} className={twMerge("overflow-hidden", className as string)}
		style={{height: 0, ...style as JSX.CSSProperties}} {...props} >
		<div ref={innerRef} >
			{showInner && children}
		</div>
	</div>;
});

export function ShowMore({children, className, maxh, forceShowMore, inContainer}: {
	children: ComponentChildren, className?: string, maxh?: string,
	forceShowMore?: boolean, inContainer?: "primary"|"secondary"
}) {
	const [showMore, setShowMore] = useState<boolean|null>(false);
	const inner = useRef<HTMLDivElement>(null), ref=useRef<HTMLDivElement>(null);

	useEffect(()=>{
		const a=inner.current!, b=ref.current!;
		const check = () => {
			const disableShowMore = forceShowMore!=true && a.scrollHeight<=b.clientHeight+100;
			setShowMore(showMore=>disableShowMore ? null : (showMore ?? false));
		};

		const observer = new ResizeObserver(check);
		observer.observe(a); observer.observe(b);
		return ()=>observer.disconnect();
	}, [forceShowMore]);

	const expanded = showMore==null || showMore==true || forceShowMore==true;

	return <div className={className} >
		<Collapse>
			<div ref={ref} className={`relative ${expanded ? "" : "max-h-52 overflow-y-hidden"}`} style={{maxHeight: expanded ? undefined : maxh}}>
				<div ref={inner} className={expanded ? "overflow-y-auto max-h-dvh" : ""} >
					{children}
				</div>

				{!expanded && <div className="absolute bottom-0 left-0 right-0 z-40" >
					<MoreButton act={()=>setShowMore(true)} down >
						Show more
					</MoreButton>
				</div>}

				{!expanded &&
					<div className={`absolute bottom-0 h-14 max-h-full bg-gradient-to-b z-20 left-0 right-0 ${fadeGradient[inContainer ?? "default"]}`} />}
			</div>

			{showMore==true && <MoreButton act={()=>{
				ref.current?.scrollIntoView({block: "start", behavior: "smooth"});
				setShowMore(false)
			}} className="pt-2" >
				Show less
			</MoreButton>}
		</Collapse>
	</div>;
}

type TextVariants = "big"|"lg"|"md"|"dim"|"bold"|"normal"|"err"|"sm"|"smbold"|"code";
export function Text({className, children, v, ...props}:
	JSX.HTMLAttributes<HTMLSpanElement>&JSX.HTMLAttributes<HTMLHeadingElement>
	&JSX.HTMLAttributes<HTMLParagraphElement>&{v?: TextVariants, className?: string}
) {
	switch (v) {
		case "big": return <h1 className={twMerge(clsx("md:text-3xl text-2xl font-display font-black", textColor.contrast, className))} {...props} >{children}</h1>;
		case "bold": return <b className={twMerge(clsx("text-lg font-display font-extrabold", textColor.contrast, className))} {...props} >{children}</b>;
		case "smbold": return <b className={twMerge(clsx("text-sm font-display font-bold text-gray-700 dark:text-gray-300", className))} {...props} >{children}</b>;
		case "md": return <h3 className={twMerge(clsx("text-xl font-display font-bold", textColor.contrast, className))} {...props} >{children}</h3>;
		case "lg": return <h3 className={twMerge(clsx("text-xl font-display font-extrabold", textColor.contrast, className))} {...props} >{children}</h3>;
		case "dim": return <span className={twMerge(clsx("text-sm text-gray-500 dark:text-gray-400", className))} {...props} >{children}</span>;
		case "sm": return <p className={twMerge(clsx("text-sm text-gray-800 dark:text-gray-200", className))} {...props} >{children}</p>;
		case "code": return <code className={twMerge(clsx("break-all text-gray-800 dark:text-gray-200 font-semibold rounded-sm p-0.5", bgColor.md, className))} {...props} >{children}</code>;
		case "err": return <span className={twMerge(clsx("text-red-500", className))} {...props} >{children}</span>;
		default: return <p className={className} {...props} >{children}</p>;
	}
}

const ModalContext = createContext<null|RefObject<HTMLDialogElement>>(null);

//not very accessible 🤡
export function Modal({bad, open, onClose, title, children, className, ...props}: {
	bad?: boolean, open: boolean, onClose?: ()=>void, title?: ComponentChildren,
	children?: ComponentChildren, className?: string
}&JSX.HTMLAttributes<HTMLDialogElement>) {
	const modalRef = useRef<HTMLDialogElement>(null);

	return <ShowTransition open={open} openClassName="show" update={(show)=>{
		if (show) modalRef.current?.showModal();
		else modalRef.current?.close();
	}} ref={modalRef} >
		<dialog className={twMerge(clsx(bad??false ? `${bgColor.red} ${borderColor.red}` : `${bgColor.md} ${borderColor.default}`, "[:not(.show)]:opacity-0 [:not(.show)]:pointer-events-none transition-opacity duration-500 mx-auto md:mt-[15dvh] mt-10 text-inherit outline-none rounded-md z-50 p-5 pt-4 container flex items-stretch flex-col max-h-[calc(min(50rem,70dvh))] overflow-auto fixed left-0 top-0 md:max-w-2xl right-0 gap-2 group [.show]:opacity-100 [.show]:pointer-events-auto", className))}
			onClose={(ev)=>{
				ev.preventDefault();
				onClose?.();
			}} {...props} ><ModalContext.Provider value={modalRef} >

			{onClose && <IconButton icon={<IconX />}
				className={clsx("absolute top-3 right-2 z-30 [:not(:hover)]:theme:bg-transparent [:not(:hover)]:border-transparent")}
				onClick={()=>onClose()} />}

			{title!=undefined && <>
				<Text v="big">{title}</Text>
				<div className="my-0" >
					<Divider className="absolute left-0 right-0 my-auto" contrast={bad} />
				</div>
			</>}

			{children}

			<div className="fixed bg-black/30 left-0 right-0 top-0 bottom-0 -z-10"
				onClick={()=>onClose?.()} />
	</ModalContext.Provider></dialog></ShowTransition>;
}

const PopupCountCtx = createContext({count: 0, incCount(this: void): number {return 0;}});

export function cloneRef<T>(...refs: (Ref<T>|undefined)[]): (x: T|null)=>void {
	return x=>{
		for (const r of refs) {
			if (typeof r == "function") r(x);
			else if (r!=null) r.current=x;
		}
	};
}

//opens in modal if already in tooltip...
export const AppTooltip = forwardRef(({
	content, children, placement, className, onOpenChange,
	noClick, noHover, disabled, ...props
}: {
	content: ComponentChild,
	placement?: ComponentProps<typeof Popover>["positions"],
	onOpenChange?: (x: boolean)=>void,
	noClick?: boolean, noHover?: boolean,
	disabled?: boolean,
	className?: string
}&Omit<JSX.HTMLAttributes<HTMLDivElement>,"content">, ref)=>{
	const [open, setOpen] = useState<number>(0);
	const [reallyOpen, setReallyOpen] = useState<number|null>(null);
	const {count, incCount} = useContext(PopupCountCtx);
	
	const unInteract = useCallback((p: PointerEvent) => {
		if (p.pointerType=="mouse") setOpen(0);
	}, [setOpen]);

	const isOpen = disabled!=true && reallyOpen==count;

	const interact = useCallback((p: PointerEvent) => {
		if (p.pointerType=="mouse") setOpen(i=>i+1);
	}, [setOpen]);

	useEffect(()=>{
		let tm: number;
		if (open>0) tm = setTimeout(()=>setReallyOpen(incCount()), 200);
		else tm = setTimeout(() => setReallyOpen(null), 500);
		return ()=>clearTimeout(tm);
	}, [incCount, open]);

	useEffect(()=>{
		onOpenChange?.(isOpen);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, setOpen])

	const targetRef = useRef<HTMLDivElement>(null);
	
	useEffect(()=>{
		const noCb = ()=>{};
		const cbs = [
			["pointerenter", noHover??false ? noCb : interact],
			["pointerleave", noHover??false ? noCb : unInteract],
			["click", noClick??false ? noCb : (ev: PointerEvent)=>{
				if (!isOpen) { setOpen(i=>i+1); setReallyOpen(incCount()); }
				else { setOpen(0); setReallyOpen(null); }
				ev.stopPropagation();
			}]
		] as const;
		
		const elem = targetRef.current!;
		for (const [k,v] of cbs) elem.addEventListener(k, v as ()=>void);
		return ()=>{
			for (const [k,v] of cbs) elem.removeEventListener(k, v as ()=>void);
		};
	}, [incCount, interact, isOpen, noClick, noHover, reallyOpen, unInteract]);

	return <Popover
		ref={cloneRef(targetRef, ref)}
		onClickOutside={()=>incCount()}
		positions={placement ?? ['top', 'right', 'left', 'bottom']}
		containerStyle={{ zIndex: "100000" }}
		padding={5}
		parentElement={useContext(ModalContext)?.current ?? undefined}
		content={({position, childRect, popoverRect}: PopoverState) => {
			if (!position) return <></>;
			const c = position[0];
			const borderClass = {
				r: "border-r-zinc-300! dark:border-r-zinc-600!",
				l: "border-l-zinc-300! dark:border-l-zinc-600!",
				t: "border-t-zinc-300! dark:border-t-zinc-600!",
				b: "border-b-zinc-300! dark:border-b-zinc-600!"
			}[c];

			return <ArrowContainer position={position}
				childRect={childRect}
				popoverRect={popoverRect}
				arrowClassName={borderClass}
				arrowSize={7} arrowColor="" >
				<Collapse className={twMerge(clsx(containerDefault, "p-2 py-1", className))}
					onPointerEnter={interact} onPointerLeave={unInteract} open={isOpen} {...props} >
					{content}
				</Collapse>
			</ArrowContainer>;
		}}
		containerClassName="max-w-96"
		isOpen={isOpen} >
		{children}
	</Popover>;
});

export type DropdownPart = ({type: "txt", txt?: ComponentChildren}
	| {type: "big", txt?: ComponentChildren}
	| { type: "act", name?: ComponentChildren, act: ()=>void,
			disabled?: boolean, active?: boolean })&{key?: string|number};

export function Dropdown({parts, trigger, ...props}: {
	trigger?: ComponentChildren, parts: DropdownPart[],
}&Partial<ComponentProps<typeof AppTooltip>>) {
	const [keySel, setKeySel] = useState<string|number|null>(null);
	const [focusSel, setFocusSel] = useState<boolean>(false);

	const acts = parts.map((v,i)=>({key: v.key ?? i, type: v.type})).filter(v=>v.type=="act");
	const idx = keySel!=null ? acts.findIndex(p=>p.key==keySel) : -1;

	const [open, setOpen] = useState(false);
	const ctx = useContext(PopupCountCtx);
	return <AppTooltip placement="bottom"
		onOpenChange={setOpen}
		className="px-0 py-0 max-w-60 overflow-y-auto justify-start max-h-[min(90dvh,30rem)]"
		content={parts.map((x,i) => {
			if (x.type=="act")
				return <Button key={x.key ?? i} disabled={x.disabled}
					className={`m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t dark:hover:bg-zinc-700 hover:bg-zinc-300 w-full hover:outline hover:theme:border-b-transparent [&:not(:focus)]:hover:dark:outline-zinc-600 [&:not(:focus)]:hover:outline-zinc-400 ${
						x.active==true ? "dark:bg-zinc-950 bg-zinc-200" : ""
					} ${outlineColor.default}`}
					onBlur={(x.key??i)==keySel ? ()=>setFocusSel(false) : undefined}
					ref={(el)=>{
						if ((x.key??i)==keySel && el!=null && focusSel) {
							el.focus();
						}
					}}
					onClick={() => {
						x.act(); ctx.incCount();
					}} >{x.name}</Button>;
			else if (x.type=="txt") return <div key={x.key ?? i}
				className="flex flex-row justify-center gap-4 dark:bg-zinc-900 bg-zinc-100 items-center border m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t rounded-none w-full" >
				{x.txt}
			</div>;
			
			return <div key={x.key ?? i}
				className="flex flex-row justify-start gap-4 p-2 dark:bg-zinc-900 bg-zinc-100 items-center border m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t rounded-none w-full" >
				{x.txt}
			</div>;
		})} 
		onKeyDown={(ev)=>{
			if (acts.length==0 || !open) return;

			if (ev.key=="ArrowDown") {
				const nidx = idx==-1 ? 0 : (idx+1)%acts.length;
				setKeySel(acts[nidx].key);
				setFocusSel(true);
				ev.preventDefault();
			} else if (ev.key=="ArrowUp") {
				const pidx = idx==-1 ? acts.length-1 : (idx+acts.length-1)%acts.length;
				setKeySel(acts[pidx].key);
				setFocusSel(true);
				ev.preventDefault();
			}
		}} {...props} >
		<div>{trigger}</div>
	</AppTooltip>;
}

//mounted in popover
//if it focuses too soon, then popover has not measured itself yet and we scroll to a random ass place
//what the fuck.
function LazyAutoFocusSearch({search,setSearch,onSubmit}:{
	search: string, setSearch: (x:string)=>void, onSubmit?: ()=>void
}) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(()=>{
		const t = setTimeout(()=>ref.current?.focus(), 50);
		return ()=>clearTimeout(t);
	}, []);

	return <form onSubmit={(ev)=>{
		onSubmit?.(); ev.preventDefault();
	}} >
		<Input placeholder="Search..." ref={ref}
			className="theme:border-1 py-1"
			value={search} valueChange={setSearch} />
	</form>;
}

export function Select<T>({ options, value, setValue, placeholder, className, disabled, searchable, ...props }: {
	options: { label: ComponentChildren, value?: T, key?: string|number, disabled?: boolean }[],
	value?: T, setValue?: (x: T)=>void,
	placeholder?: ComponentChildren, searchable?: boolean,
	className?: string, disabled?: boolean
}&Partial<ComponentProps<typeof Dropdown>>) {
	const [search, setSearch] = useState("");
	const curOpt = value==undefined ? undefined : options.find(x=>x.value==value);
	const parts: DropdownPart[] = useMemo(()=>{
		const s = toSearchString(search);
		return options.filter(v=>{
			if (typeof v.label=="string") return toSearchString(v.label).includes(s);
			return true;
		}).map(opt=>{
			const v=opt.value;
			return v==undefined ? {
				type: "txt", txt: opt.label, key: opt.key
			} : {
				type: "act", name: opt.label,
				active: opt.value==value,
				disabled: opt.disabled,
				act() { setValue?.(v); }, key: opt.key
			};
		})
	}, [options, search, setValue, value]);

	const ctx = useContext(PopupCountCtx);
	return <Dropdown noHover trigger={<div>
		<Button className={twMerge("pr-1 pl-1 py-0.5 min-w-0", className)} disabled={disabled} >
			<div className="basis-16 grow whitespace-nowrap overflow-hidden max-w-24" >
				{curOpt==undefined ? placeholder : curOpt.label}
			</div>
			<IconChevronDown />
		</Button>
	</div>} parts={[
		...searchable!=true ? [] : [{
			type: "txt",
			txt: <LazyAutoFocusSearch search={search} setSearch={setSearch} onSubmit={()=>{
				if (parts.length==1 && parts[0].type=="act") {
					parts[0].act(); ctx.incCount();
				}
			}} />,
			key: "search"
		} as const],
		...parts
	]} onOpenChange={()=>setSearch("")} {...props} />
}

export type Theme = "light"|"dark";
export const ThemeContext = createContext<{
	theme: Theme, setTheme:(x: Theme)=>void
}>(undefined as never)
export const useTheme = ()=>useContext(ThemeContext).theme;

export function Container({children, className, ...props}: {
	children?: ComponentChildren, className?: string
}&JSX.HTMLAttributes<HTMLDivElement>) {
	const {theme} = useContext(ThemeContext);

	const [count, setCount] = useState(0);
	const incCount = useCallback(()=>{
		let r: number;
		setCount(x=>{return r=x+1;}); // look away child
		return r!;
	}, [setCount]);

	useEffect(() => {
		const html = document.getElementsByTagName("html")[0];
		html.classList.add(theme);
		return ()=>html.classList.remove(theme);
	}, [theme, incCount]);

	return <PopupCountCtx.Provider value={{count, incCount}} >
		<div className={twMerge("font-body dark:text-gray-100 dark:bg-neutral-950 text-gray-950 bg-neutral-100 min-h-dvh", className)}
			{...props} >
			{children}
		</div>
	</PopupCountCtx.Provider>;
}
	
export const toSearchString = (x: string) => x.toLowerCase().replace(/[^a-z0-9\n]/g, "");

export function useMediaQuery(q: MediaQueryList|string|null, init: boolean=false) {
	const [x, set] = useState(init);

	useEffect(() => {
		if (q==null) return;

		const mq = typeof q=="string" ? window.matchMedia(q) : q;
		const cb = () => set(mq.matches);
		mq.addEventListener("change", cb);
		set(mq.matches);
		return ()=>mq.removeEventListener("change",cb);
	}, [q]);

	return x;
}

const queries: Record<"md"|"lg",MediaQueryList|null> = {md:null, lg:null};

export const useMd = () => {
	try {
		if (queries.md==null)
			queries.md = window.matchMedia("(min-width: 768px)");
	} catch { void null; }

	return useMediaQuery(queries.md);
};

export const useLg = () => {
	try {
		if (queries.lg==null)
			queries.lg = window.matchMedia("(min-width: 1024px)");
	} catch { void null; }

	return useMediaQuery(queries.lg);
};

export function useDebounce<T>(f: ()=>T, debounceMs: number): T {
	const [v, setV] = useState(f);
	useEffect(()=>{
		const ts = setTimeout(()=>setV(f()), debounceMs);
		return () => clearTimeout(ts);
	}, [f, debounceMs]);
	return v;
}

export function ErrorPage({error, retry}: {error?: Error, retry?: ()=>void}) {
	return <div className="flex flex-col items-center gap-10 h-full py-10 justify-center mx-5" >
		<IconInfoTriangleFilled size={70} className="fill-red-500" />
		<div className="flex flex-col gap-2 max-w-md" >
			<Text v="big" >An error occurred</Text>
			<p>
				It{"'"}s never too late to try again. {!retry && "Refresh the page."}
			</p>

			{retry && <Button onClick={()=>retry()} >Retry</Button>}

			{error?.message!=undefined && <Text v="sm" >Details: {error.message}</Text>} 
		</div>
	</div>
}

export function withTimeout<T extends unknown[], R>(f: (...args: T)=>Promise<R>, timeout: number): typeof f {
	return (...args) => Promise.race([
		new Promise<never>((_,rej) => setTimeout(()=>rej(new Error("Timed out")), timeout)),
		f(...args)
	]);
}

export const abbr = (s: string, len: number=300) =>
	s.length > len ? `${s.substring(0, len-3)}...` : s;

export function useAsync<T extends unknown[], R>(f: (...args: T)=>Promise<R>, opts?: {
	propagateError?: boolean,
}): {
	run: (...args: T)=>void,
	attempted: boolean,
	loading: boolean,
	error: Error|null,
	result: R|null,
} {
	const [state, setState] = useState<{
		loading: boolean, attempted: boolean, error: Error|null, result: R|null
	}>({
		loading: false, attempted: false, error: null, result: null
	});
	
	const propError = opts?.propagateError ?? true;
	useEffect(()=>{
		if (propError && state.error) throw state.error;
	}, [state.error, propError])

	return useMemo(()=>({
		run(...args) {
			if (!state.loading) {
				setState(s=>({...s, loading: true, attempted: true}));

				f(...args).then(res=>{
					setState(s=>({...s, result: res}));
				}, err=>{
					setState(s=>({...s, error: err instanceof Error ? err : new Error("Unknown error")}));
				}).finally(()=>{
					setState(s=>({...s, loading: false}));
				});
			}
		},
		...state
	}), [f, state]);
}

export function useAsyncEffect(f: ()=>Promise<void|(()=>void)>, deps: unknown[]) {
	const oldV = useRef<()=>void>(null);
	const x = useAsync(async ()=>{
		const v = await f();
		oldV.current?.();
		if (v) oldV.current=v;
	});

	useEffect(()=>()=>{
		oldV.current?.();
		oldV.current=null;
	}, []);

	const changed = useRef(false);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(()=>{changed.current=true;}, deps);

	useEffect(()=>{
		if (!x.loading && changed.current) {
			changed.current=false;
			x.run();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, x.loading]);
	
	return x;
}

export function listener<E extends HTMLElement, K extends keyof HTMLElementEventMap>(
	elem: E,
	handler: {type: K|K[], f: (this: Element, event: HTMLElementEventMap[K]) => void}
) {
	const typeArr = Array.isArray(handler.type) ? handler.type : [handler.type];
	for (const ty of typeArr) elem.addEventListener(ty, handler.f);
	return { [Symbol.dispose]() {
		for (const ty of typeArr) elem.removeEventListener(ty, handler.f);
	} };
}

export function debounce(ms: number) {
	let ts: number|null = null;
	return {
		call(f: ()=>void) {
			if (ts!=null) clearTimeout(ts);
			ts=setTimeout(()=>f(), ms);
		},
		[Symbol.dispose]() {
			if (ts!=null) clearTimeout(ts);
		}
	} as const;
}

export function throttle(ms: number, callOnDispose?: boolean) {
	let ts: number|null = null;
	let cur: (()=>void)|null=null;
	return {
		call(f: ()=>void) {
			if (ts==null) {
				f();
				ts=setTimeout(()=>{ cur?.(); cur=ts=null; }, ms);
			} else {
				cur=f;
			}
		},
		[Symbol.dispose]() {
			if (ts!=null) clearTimeout(ts);
			if (cur!=null && callOnDispose==true) cur?.();
		}
	} as const;
}

export type LocalStorage = Partial<{
	theme: Theme,
	storyState: Record<string, unknown>,
	storyParagraph: Record<string, number>,
	solvedPuzzles: Set<string>,
	readStory: Set<string>,

	userProcs: number[],
	// entry point is always id -1
	puzzleProcs: Map<string, Procedure>,
	stepsPerS: number,
	// timestamp of when stage last counted
	lastStageCount: Map<string, number>,
	puzzleSolve: Map<string, {token: string, id: number}>,
	username: string
}>&{
	toJSON(): unknown
};

const localStorageKeys: (Exclude<keyof LocalStorage,"toJSON">)[] = [
	"theme", "storyState",
	"puzzleProcs", "readStory",
	"solvedPuzzles", "stepsPerS",
	"userProcs", "storyParagraph",
	"lastStageCount", "puzzleSolve"
];

export const LocalStorage = {
	toJSON() {
		return Object.fromEntries(localStorageKeys.map(k=>[k, parseExtra(localStorage.getItem(k))]));
	}
} as unknown as LocalStorage;

let localLocalStorage: Omit<LocalStorage, "toJSON"> = {};

export function clearLocalStorage() {
	localLocalStorage = {};
	localStorage.clear();
}

for (const k of localStorageKeys) {
	Object.defineProperty(LocalStorage, k, {
		get() {
			if (localLocalStorage[k]!=undefined) return localLocalStorage[k];
			const vStr = localStorage.getItem(k);
			(localLocalStorage[k] as unknown) = vStr!=null ? parseExtra(vStr) : undefined;
			return localLocalStorage[k];
		},
		set(newV) {
			(localLocalStorage[k] as unknown) = newV;
			localStorage.setItem(k, stringifyExtra(newV));
		}
	});
}

export function useDisposable(effect: ()=>Disposable|undefined, deps?: unknown[]) {
	useEffect(()=>{
		const obj = effect();
		return ()=>{ obj?.[Symbol.dispose](); }
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
}

// awful time complexity lmfao
export function mapWith<K,V>(map: ReadonlyMap<K,V>|null, k: K, v?: V) {
	const newMap = new Map(map);
	if (v!==undefined) newMap.set(k, v);
	else newMap.delete(k);
	return newMap;
}

export function setWith<K>(set: ReadonlySet<K>|null, k: K) {
	const newSet = new Set(set);
	newSet.add(k);
	return newSet;
}

export type SetFn<T> = (cb: (old: T)=>T)=>void;

export function mapSetFn<T,R>(x: SetFn<T>, f: (x: R, old: T)=>T, get: (x: T)=>R): Dispatch<SetStateAction<R>> {
	return (nv)=>{
		if (typeof nv=="function") x(old=>(f((nv as (v: R)=>R)(get(old)), old)));
		else x(old=>f(nv, old));
	};
}

// idk i usually use pushstate iirc or smh i guess not today!
export function useGoto() {
	const loc = useLocation();
	return (path: string)=>loc.route(path);
}

export function useFnRef<T extends Disposable>(f: ()=>T, deps?: unknown[]) {
	const ret = useRef<T>(null);
	useEffect(()=>{
		const v = f();
		ret.current=v;
		return ()=>{
			v[Symbol.dispose]();
			ret.current=null;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	return ret;
}

export function ConfirmModal({title, actionName, msg, open, onClose, confirm, defaultYes}: {
	title?: string, msg: ComponentChildren, open: boolean, onClose: ()=>void,
	confirm: ()=>void, defaultYes?: boolean, actionName?: string
}) {
	return <Modal open={open} onClose={()=>onClose()} title={title ?? "Are you sure?"} className="flex flex-col gap-2" >
		<form onSubmit={(ev)=>{
			ev.preventDefault();
			if (defaultYes==true) confirm();
			onClose();
		}} className="contents" >
			<Text>{msg}</Text>
			<div className="flex flex-row gap-2" >
				<Button className={bgColor.red} onClick={()=>{
					onClose();
					confirm();
				}} autofocus={defaultYes} >{actionName ?? title ?? "Confirm"}</Button>
				<Button autofocus={defaultYes!=true} type="button" onClick={()=>onClose()} >Cancel</Button>
			</div>
		</form>
	</Modal>;
}

export function AlertErrorBoundary({children}: {children?: ComponentChildren}) {
	const [err, reset] = useErrorBoundary((err)=>{
		console.error("alert error boundary", err);
	}) as [unknown, ()=>void];

	if (err!=undefined) {
		return <Alert bad title="An error occurred" txt={<>
			<Text>{err instanceof Error ? `Details: ${err.message}` : "Unknown error"}</Text>
			<Button onClick={()=>reset()} >Retry</Button>
		</>} />;
	}
	
	return children;
}
