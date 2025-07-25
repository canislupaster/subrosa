import { IconChevronDown, IconChevronUp, IconInfoCircleFilled, IconInfoTriangleFilled, IconLoader2,
	IconX } from "@tabler/icons-preact";
import { cloneElement, ComponentChild, ComponentChildren, ComponentProps, createContext, JSX, Ref,
	RefObject, VNode } from "preact";
import { createPortal, forwardRef, SetStateAction } from "preact/compat";
import { Dispatch, useCallback, useContext, useEffect, useErrorBoundary, useMemo, useRef,
	useState } from "preact/hooks";
import { ArrowContainer, Popover, PopoverState } from "react-tiny-popover";
import { twJoin, twMerge } from "tailwind-merge";
import { fill } from "../shared/util";

// dump of a bunch of UI & utility stuff ive written...

export const textColor = {
	contrast: "dark:text-white text-black",
	sky: "dark:text-sky-400 text-sky-700",
	green: "dark:text-green-500 text-green-700",
	red: "dark:text-red-500 text-red-700",
	default: "dark:text-zinc-100 text-zinc-800 dark:disabled:text-gray-400 disabled:text-gray-500",
	link:
		"text-gray-700 dark:text-gray-200 underline-offset-2 transition-all hover:text-black dark:hover:text-gray-50 hover:bg-cyan-800/5 dark:hover:bg-cyan-100/5 cursor-pointer underline decoration-dashed decoration-1",
	blueLink: "dark:text-blue-200 text-sky-800",
	star: "dark:text-amber-400 text-amber-600",
	gray: "dark:text-gray-200 text-gray-700",
	dim: "dark:text-gray-400 text-gray-500",
	divider: "dark:text-gray-600 text-zinc-300",
	dimmer: "dark:text-gray-700 text-gray-300",
};

export const bgColor = {
	default: "dark:bg-zinc-800 bg-zinc-200 dark:disabled:bg-zinc-600",
	md: "dark:bg-zinc-850 bg-zinc-150 dark:disabled:bg-zinc-600",
	hover: "dark:hover:bg-zinc-700 hover:bg-zinc-150",
	secondary: "dark:bg-zinc-900 bg-zinc-150",
	green: "dark:enabled:bg-green-800 enabled:bg-green-400",
	sky: "dark:enabled:bg-sky-900 enabled:bg-sky-300",
	red: "dark:enabled:bg-red-800 enabled:bg-red-300",
	rose: "dark:enabled:bg-rose-900 enabled:bg-rose-300",
	highlight: "dark:bg-yellow-800 bg-amber-200",
	highlight2: "dark:bg-teal-900 bg-cyan-200",
	restriction: "dark:bg-amber-900 bg-amber-100",
	divider: "dark:bg-gray-600 bg-zinc-300",
	contrast: "dark:bg-white bg-black",
	border: "bg-zinc-300 dark:bg-zinc-700",
};

export const borderColor = {
	default:
		"border-zinc-300 dark:border-zinc-600 disabled:bg-zinc-300 aria-expanded:border-blue-500 data-[selected=true]:border-blue-500",
	divider: "dark:border-gray-600 border-zinc-300",
	red: "border-red-400 dark:border-red-600",
	defaultInteractive:
		"border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500 disabled:bg-zinc-300 aria-expanded:border-blue-500 active:border-blue-500 dark:active:border-blue-500 data-[selected=true]:border-blue-500",
	blue: `hover:border-blue-500 dark:hover:border-blue-500 border-blue-500 dark:border-blue-500`,
	focus: `focus:border-blue-500 dark:focus:border-blue-500`,
};

export const outlineColor = {
	default:
		"active:outline focus:outline focus:theme:outline-blue-500 active:theme:outline-blue-500 outline-offset-[-1px]",
};

export const containerDefault =
	`${textColor.default} ${bgColor.default} ${borderColor.default} border-1`;
export const invalidInputStyle =
	`invalid:dark:bg-rose-900 invalid:bg-rose-400 invalid:dark:border-red-500 invalid:theme:border-red-700`;
export const interactiveContainerDefault =
	`${textColor.default} ${bgColor.default} ${borderColor.defaultInteractive} ${outlineColor.default} ${invalidInputStyle} border-1`;

export type InputProps = {
	icon?: ComponentChildren;
	className?: string;
	valueChange?: (x: string) => void;
} & JSX.InputHTMLAttributes<HTMLInputElement>;
export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, icon, onInput, valueChange, ...props }, ref) => {
		const input = <input type="text"
			className={twMerge(
				"w-full p-2 border-2 transition duration-300 rounded-none",
				icon != undefined && "pl-11",
				interactiveContainerDefault,
				borderColor.focus,
				className,
			)} onInput={onInput ?? (valueChange != undefined
				? (ev: InputEvent) => {
					valueChange((ev.currentTarget as HTMLInputElement).value);
				}
				: undefined)} ref={ref} {...props} />;

		if (icon != undefined) {
			return <div className="relative">
				{input}
				{icon != undefined
					&& <div className="absolute left-0 my-auto pl-3 top-0 bottom-0 flex flex-row items-center">
						{icon}
					</div>}
			</div>;
		}

		return input;
	},
);

export function HiddenInput(
	{ className, ...props }: JSX.InputHTMLAttributes<HTMLInputElement> & { className?: string },
) {
	return <input
		className={twMerge(
			"bg-transparent border-0 outline-none border-b-2 focus:outline-none focus:theme:border-blue-500 transition duration-300 px-1 py-px pb-0.5 h-fit",
			borderColor.default,
			className,
		)}
		{...props} />;
}

export function Textarea(
	{ className, children, ...props }: JSX.IntrinsicElements["textarea"] & { className?: string },
) {
	return <textarea
		className={twMerge(
			interactiveContainerDefault,
			borderColor.focus,
			"w-full p-2 border-2 transition duration-300 rounded-none resize-y max-h-60 min-h-24",
			className,
		)}
		rows={6}
		tabIndex={100}
		{...props}>
		{children}
	</textarea>;
}

type ShortcutsProps = {
	onClick?: () => void;
	shortcut?: string;
	shortcuts?: string[];
	disabled?: boolean;
};

const ShortcutContext = createContext(
	undefined as unknown as React.MutableRefObject<Map<string, Set<() => void>>>,
);

export function useShortcuts({ shortcuts, shortcut, onClick, disabled }: ShortcutsProps) {
	const ctx = useContext(ShortcutContext);
	useEffect(() => {
		if (onClick && disabled != true) {
			const remove: (() => void)[] = [];
			for (const str of [...shortcuts ?? [], ...shortcut != undefined ? [shortcut] : []]) {
				const set = ctx.current.get(str) ?? new Set();
				set.add(onClick);
				ctx.current.set(str, set);
				remove.push(() => set.delete(onClick));
			}
			return () => remove.forEach(cb => cb());
		}
	}, [ctx, disabled, onClick, shortcut, shortcuts]);
}

export type ButtonProps = JSX.IntrinsicElements["button"] & {
	icon?: ComponentChildren;
	iconRight?: ComponentChildren;
	disabled?: boolean;
	className?: string;
} & ShortcutsProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, icon, iconRight, ...props }, ref) => {
		useShortcuts(props);
		return <button ref={ref}
			className={twMerge(
				twJoin(
					"flex flex-row justify-center gap-1 px-2 py-1.5 items-center group",
					interactiveContainerDefault,
				),
				className,
			)} {...props}>
			{icon}
			{props.children}
			{iconRight}
		</button>;
	},
);

export const IconButton = (
	{ className, children, icon, ...props }: { icon?: ComponentChildren; className?: string }
		& ShortcutsProps & JSX.IntrinsicElements["button"],
) => {
	useShortcuts(props);
	return <button
		className={twMerge(
			"rounded-sm p-1.5 flex items-center justify-center h-fit aspect-square",
			interactiveContainerDefault,
			className,
		)}
		{...props}>
		{icon}
		{children}
	</button>;
};

type AnchorProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & ShortcutsProps & {
	className?: string;
};
export const anchorHover =
	"transition-all hover:text-black dark:hover:text-gray-50 hover:bg-cyan-100/5 enabled:cursor-pointer";
export const anchorUnderline =
	"text-gray-600 dark:text-gray-300 inline-flex flex-row align-baseline items-baseline gap-1 underline decoration-dashed decoration-1 underline-offset-2";
export const anchorStyle = twJoin(anchorHover, anchorUnderline);

export const Anchor = forwardRef<HTMLAnchorElement, AnchorProps>(
	({ className, children, ...props }: AnchorProps, ref) => {
		useShortcuts(props);
		const classN = twMerge(anchorStyle, className);
		return <a ref={ref} className={classN} {...props}>{children}</a>;
	},
);

export const LinkButton = (
	{ className, icon, ...props }: JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
		icon?: ComponentChildren;
		className?: string;
	},
) =>
	<a
		className={twMerge(
			"flex flex-row gap-2 px-3 py-1.5 items-center rounded-xl text-sm",
			interactiveContainerDefault,
			className,
		)}
		rel="noopener noreferrer"
		{...props}>
		{icon != undefined && <span className="inline-block h-4 w-auto">{icon}</span>}
		{props.children}
	</a>;

export const ThemeSpinner = (
	{ className, size }: { className?: string; size?: "sm" | "md" | "lg" },
) =>
	<IconLoader2 size={{ sm: 24, md: 36, lg: 72 }[size ?? "md"]}
		className={twMerge(
			`animate-spin stroke-${
				{ sm: 1, md: 2, lg: 3 }[size ?? "md"]
			} dark:stroke-white stroke-blue-600`,
			className,
		)} />;

export const Loading = (props: ComponentProps<typeof ThemeSpinner>) =>
	<div className="h-full w-full flex item-center justify-center py-16 px-20">
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

export const Chip = (
	{ className, color, ...props }: JSX.HTMLAttributes<HTMLSpanElement> & {
		color?: keyof typeof chipColors;
		className?: string;
	},
) =>
	<span
		className={twMerge(
			"inline-block text-xs px-2 py-1 rounded-lg border-solid border whitespace-nowrap",
			chipColors[color ?? "gray"],
			className,
		)}
		{...props}>
		{props.children}
	</span>;

export function capitalize(s: string) {
	const noCap = ["of", "a", "an", "the", "in"];
	return s.split(/\s+/g).filter(x => x.length > 0).map((x, i) => {
		if (i > 0 && noCap.includes(x)) return x;
		return `${x[0].toUpperCase()}${x.slice(1)}`;
	}).join(" ");
}

export const Alert = (
	{ title, txt, bad, className }: {
		title?: ComponentChildren;
		txt: ComponentChildren;
		bad?: boolean;
		className?: string;
	},
) =>
	<div
		className={twMerge(
			"border",
			bad ?? false
				? `${bgColor.red} ${borderColor.red}`
				: `${bgColor.default} ${borderColor.default}`,
			"p-2 px-4 rounded-sm flex flex-row gap-2",
			className,
		)}>
		<div className={twJoin("flex-shrink-0", title != undefined && "mt-1")}>
			{bad ?? false ? <IconInfoTriangleFilled /> : <IconInfoCircleFilled />}
		</div>
		<div>
			{title != undefined && <h2 className="font-bold font-big text-lg">{title}</h2>}
			<div className="flex flex-col gap-2">{txt}</div>
		</div>
	</div>;

export const Divider = (
	{ className, contrast, vert }: { className?: string; contrast?: boolean; vert?: boolean },
) =>
	<span
		className={twMerge(
			"shrink-0 block",
			vert == true ? "w-px h-5 self-center pb-1" : "w-full h-px my-2",
			contrast ?? false ? "dark:bg-gray-400 bg-gray-500" : bgColor.divider,
			className,
		)} />;

export const Card = (
	{ className, children, ...props }: JSX.HTMLAttributes<HTMLDivElement> & { className?: string },
) =>
	<div
		className={twMerge(
			"flex flex-col gap-1 rounded-md p-2 border-1 dark:border-zinc-600 shadow-md dark:shadow-black shadow-white/20 border-zinc-300",
			bgColor.md,
			className,
		)}
		{...props}>
		{children}
	</div>;

export function MoreButton(
	{ children, className, act: hide, down }: {
		act: () => void;
		children?: ComponentChildren;
		className?: string;
		down?: boolean;
	},
) {
	return <div className={twMerge("flex flex-col w-full items-center", className)}>
		<button onClick={hide}
			className={twJoin(
				"flex flex-col items-center cursor-pointer transition",
				down ?? false ? "hover:translate-y-1" : "hover:-translate-y-1",
			)}>
			{down ?? false
				? <>
					{children}
					<IconChevronDown />
				</>
				: <>
					<IconChevronUp />
					{children}
				</>}
		</button>
	</div>;
}

export const fadeGradient = {
	default: "from-transparent dark:to-neutral-950 to-zinc-100",
	primary: "from-transparent dark:to-zinc-800 to-zinc-200",
	secondary: "from-transparent dark:to-zinc-900 to-zinc-150",
};

export const GotoContext = createContext(
	undefined as {
		goto: (this: void, path: string) => void;
		addTransition(f: () => Promise<void>): Disposable;
	} | undefined,
);

export const TitleContext = createContext(
	undefined as { setTitle: (title: string) => () => void } | undefined,
);

export function useTitle(value: string) {
	const ctx = useContext(TitleContext)!.setTitle;
	useEffect(() => {
		return ctx(value);
	}, [ctx, value]);
}

// idk i usually use pushstate iirc or smh i guess not today!
export function useGoto() {
	return useContext(GotoContext)!.goto;
}
type ShowTransitionProps = {
	children: ComponentChild;
	open: boolean;
	openClassName?: string;
	closedClassName?: string;
	update?: (show: boolean, element: HTMLElement) => void;
};

export const ShowTransition = forwardRef<HTMLElement, ShowTransitionProps>(
	({ children, open, openClassName, closedClassName, update }, ref) => {
		const myRef = useRef<HTMLElement>(null);
		const [show2, setShow] = useState(false);
		const show = show2 || open;

		const cls = (open ? openClassName : closedClassName)?.split(" ") ?? [];
		const removeCls = (open ? closedClassName : openClassName)?.split(" ") ?? [];

		const goto = useContext(GotoContext);
		useEffect(() => {
			const el = myRef.current;
			if (!show) return;
			if (!el) {
				console.warn("transition element not mounted despite shown");
				return;
			}

			let enabled = true;
			const wait = async () => {
				for (;;) {
					await new Promise<void>(res => setTimeout(res, 100));
					if (!enabled) break;

					const anims = el.getAnimations({ subtree: true }).filter(anim =>
						anim.playState != "finished"
					);
					if (anims.length == 0) {
						update?.(open, el);
						setShow(open);
						return true;
					}

					await Promise.allSettled(anims.map(x => x.finished));
				}

				return false;
			};

			if (open) setShow(true);
			else void wait();

			el.classList.remove(...removeCls);
			el.classList.add(...cls);

			const t = !open ? null : goto?.addTransition(async () => {
				el.classList.remove(...cls);
				el.classList.add(...removeCls);
				await wait();
			});

			return () => {
				enabled = false;
				t?.[Symbol.dispose]();
			};
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [open, show]);

		const cloneRef = useCloneRef(ref, myRef);
		if (children == undefined || !show) return <></>;
		return cloneElement(children as VNode, { ref: cloneRef });
	},
);

// init=true -> dont animate expanding initially
export const Collapse = forwardRef<
	HTMLDivElement,
	JSX.IntrinsicElements["div"] & {
		open?: boolean;
		init?: boolean;
		speed?: number;
		update?: (show: boolean) => void;
	}
>(({ children, open, className, style, init, speed, update, ...props }, ref) => {
	const myRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const initCollapse = useRef(init != true);

	const [showInner, setShowInner] = useState(open != false);
	useEffect(() => update?.(showInner), [showInner, update]);

	useEffect(() => {
		const main = myRef.current, inner = innerRef.current;
		if (!main || !inner) return;

		let frame: number | null;
		setShowInner(main.clientHeight > 0 || open != false);

		let lt: number | null = null;
		const cb = () =>
			requestAnimationFrame(t => {
				const dt = Math.min(t-(lt ?? t), 50);
				const style = getComputedStyle(main);
				const mainInnerHeight =
					main.clientHeight-parseFloat(style.paddingBottom)-parseFloat(style.paddingTop);
				const d = (open == false ? 0 : inner.clientHeight)-mainInnerHeight;
				const done = !initCollapse.current || Math.abs(d) < 1;
				initCollapse.current = true;
				let newH = (done ? d : d*dt*(speed ?? 1)/100)+parseFloat(style.height);
				if (d < 0) newH = Math.floor(newH);
				else newH = Math.ceil(newH);

				main.style.height = px(newH);

				lt = t;
				if (done) frame = lt = null;
				else frame = cb();
				if (done && open == false) setShowInner(false);
			});

		let tm: number | null = null;
		const observer = new ResizeObserver(() => {
			if (frame == null) {
				if (tm != null) clearTimeout(tm);
				tm = setTimeout(() => frame = cb(), 100);
			}
		});

		observer.observe(inner);

		frame = cb();

		return () => {
			observer.disconnect();
			if (tm != null) clearTimeout(tm);
			if (frame != null) cancelAnimationFrame(frame);
		};
	}, [open, speed]);

	return <div ref={useCloneRef(ref, myRef)}
		className={twMerge("overflow-hidden", className as string)}
		style={{ ...style as JSX.CSSProperties, height: "1px" }} {...props}>
		<div ref={innerRef}>{showInner && children}</div>
	</div>;
});

export function ShowMore(
	{ children, className, maxh, forceShowMore, inContainer }: {
		children: ComponentChildren;
		className?: string;
		maxh?: string;
		forceShowMore?: boolean;
		inContainer?: "primary" | "secondary";
	},
) {
	const [showMore, setShowMore] = useState<boolean | null>(false);
	const inner = useRef<HTMLDivElement>(null), ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const a = inner.current!, b = ref.current!;
		const check = () => {
			const disableShowMore = forceShowMore != true && a.scrollHeight <= b.clientHeight+100;
			setShowMore(showMore => disableShowMore ? null : (showMore ?? false));
		};

		const observer = new ResizeObserver(check);
		observer.observe(a);
		observer.observe(b);
		return () => observer.disconnect();
	}, [forceShowMore]);

	const expanded = showMore == null || showMore == true || forceShowMore == true;

	return <Collapse init>
		<div className={className}>
			<div ref={ref} className={`relative ${expanded ? "" : "max-h-52 overflow-y-hidden"}`}
				style={{ maxHeight: expanded ? undefined : maxh }}>
				<div ref={inner} className={expanded ? "overflow-y-auto max-h-dvh" : ""}>{children}</div>

				{!expanded && <div className="absolute bottom-0 left-0 right-0 z-40">
					<MoreButton act={() => setShowMore(true)} down>Show more</MoreButton>
				</div>}

				{!expanded
					&& <div
						className={`absolute bottom-0 h-14 max-h-full bg-gradient-to-b z-20 left-0 right-0 ${
							fadeGradient[inContainer ?? "default"]
						}`} />}
			</div>

			{showMore == true && <MoreButton act={() => {
				ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
				setShowMore(false);
			}} className="pt-2">
				Show less
			</MoreButton>}
		</div>
	</Collapse>;
}

type TextVariants = "big" | "lg" | "md" | "dim" | "bold" | "normal" | "err" | "sm" | "smbold"
	| "code";
export function Text(
	{ className, children, v, ...props }: JSX.HTMLAttributes<HTMLSpanElement> & JSX.HTMLAttributes<
		HTMLHeadingElement
	> & JSX.HTMLAttributes<HTMLParagraphElement> & { v?: TextVariants; className?: string },
) {
	switch (v) {
		case "big":
			return <h1
				className={twMerge(
					"md:text-3xl text-2xl font-big font-black",
					textColor.contrast,
					className,
				)}
				{...props}>
				{children}
			</h1>;
		case "bold":
			return <b className={twMerge("text-lg font-bold", textColor.contrast, className)} {...props}>
				{children}
			</b>;
		case "smbold":
			return <b
				className={twMerge("text-sm font-semibold text-gray-700 dark:text-gray-300", className)}
				{...props}>
				{children}
			</b>;
		case "md":
			return <h3 className={twMerge("text-xl font-big font-bold", textColor.contrast, className)}
				{...props}>
				{children}
			</h3>;
		case "lg":
			return <h3
				className={twMerge("text-xl font-big font-extrabold", textColor.contrast, className)}
				{...props}>
				{children}
			</h3>;
		case "dim":
			return <span className={twMerge("text-sm text-gray-500 dark:text-gray-400", className)}
				{...props}>
				{children}
			</span>;
		case "sm":
			return <p className={twMerge("text-sm text-gray-800 dark:text-gray-200", className)}
				{...props}>
				{children}
			</p>;
		case "code":
			return <code
				className={twMerge(
					"break-all text-gray-800 dark:text-gray-200 font-semibold rounded-sm p-0.5 whitespace-pre-wrap",
					bgColor.md,
					className,
				)}
				{...props}>
				{children}
			</code>;
		case "err":
			return <span className={twMerge("text-red-500", className)} {...props}>{children}</span>;
		default:
			return <p className={className} {...props}>{children}</p>;
	}
}

const ModalContext = createContext<null | RefObject<HTMLDialogElement>>(null);
const px = (x: number | undefined) => x != undefined ? `${x}px` : "";

function ModalBackground({ className, bgClassName }: { className?: string; bgClassName?: string }) {
	const [dims, setDims] = useState<
		null | {
			nx: number;
			ny: number;
			side: number;
			offY: number;
			iy: number;
			offX: number;
			ix: number;
			top: number;
			left: number;
			height: number;
			width: number;
		}
	>(null);
	const modalCtx = useContext(ModalContext);
	useEffect(() => {
		const el = modalCtx?.current;
		if (!el) return;
		const cb = () => {
			const nx = Math.ceil(10*el.clientWidth/window.innerWidth)+1;
			const side = Math.ceil(el.clientWidth/nx);
			const ny = Math.ceil(el.clientHeight/side)+1;
			const rect = el.getBoundingClientRect();
			setDims({
				nx,
				ny,
				side,
				offX: el.scrollLeft%side,
				offY: el.scrollTop%side,
				ix: Math.floor(el.scrollLeft/side),
				iy: Math.floor(el.scrollTop/side),
				height: rect.height,
				width: rect.width,
				left: rect.left,
				top: rect.top,
			});
		};

		const observer = new ResizeObserver(cb);
		observer.observe(el);
		el.addEventListener("scroll", cb);
		window.addEventListener("resize", cb);
		return () => {
			observer.disconnect();
			el.removeEventListener("scroll", cb);
			window.removeEventListener("resize", cb);
			setDims(null);
		};
	}, [modalCtx]);

	return <div className={twMerge("-z-10 rounded-md fixed overflow-clip border", className)}
		style={{
			width: px(dims?.width),
			height: px(dims?.height),
			top: px(dims?.top),
			left: px(dims?.left),
		}}>
		{dims && fill(dims.nx, i =>
			fill(dims.ny, j => {
				return <div key={(j+dims.iy)*dims.nx+i+dims.ix}
					className={twMerge(
						"in-[.show]:animate-[fade-in_200ms_forwards] opacity-0 in-[.not-show]:animate-[fade-out_10ms_forwards] absolute",
						bgClassName,
					)}
					style={{
						animationFillMode: "both",
						animationDelay: `${20*(j*dims.nx*0.5+i)}ms`,
						top: px(j*dims.side-dims.offY),
						left: px(i*dims.side-dims.offX),
						width: px(dims.side),
						height: px(dims.side),
					}} />;
			})).flat()}
	</div>;
}

export const transparentNoHover =
	"[:not(:hover)]:theme:bg-transparent [:not(:hover)]:border-transparent";
// not very accessible 🤡
export function Modal(
	{ bad, open, onClose, closeButton, title, children, className, ...props }: {
		bad?: boolean;
		open: boolean;
		onClose?: () => void;
		closeButton?: boolean;
		title?: ComponentChildren;
		children?: ComponentChildren;
		className?: string;
	} & JSX.HTMLAttributes<HTMLDialogElement>,
) {
	const modalRef = useRef<HTMLDialogElement>(null);
	const [show, setShow] = useState(false);
	const setToastRoot = useContext(ToastContext)?.setToastRoot;
	useEffect(() => {
		if (!show) return;
		const el = modalRef.current!;
		const disp = setToastRoot?.(el);
		// showmodal is not needed and ruins transition (what the hell)
		el.showModal();
		return () => {
			disp?.();
			el.close();
		};
	}, [setToastRoot, show]);

	useEffect(() => {
		modalRef.current?.showModal();
	}, [open]);

	return <ShowTransition open={open} openClassName="show" closedClassName="not-show"
		update={setShow} ref={modalRef}>
		<dialog
			className={twMerge(
				"bg-transparent opacity-0 [:not(.show)]:pointer-events-none transition-opacity duration-500 mx-auto md:mt-[15dvh] mt-10 text-inherit outline-none rounded-md z-50 p-5 pt-4 container flex items-stretch flex-col max-h-[calc(min(50rem,70dvh))] overflow-auto fixed left-0 top-0 md:max-w-2xl right-0 gap-2 group [.show]:opacity-100 [.show]:pointer-events-auto",
				className,
			)}
			onClose={ev => {
				ev.preventDefault();
				onClose?.();
			}}
			{...props}>
			<ModalContext.Provider value={modalRef}>
				{onClose && closeButton != false
					&& <IconButton icon={<IconX />}
						className={twJoin("absolute top-3 right-2 z-30", transparentNoHover)} onClick={() =>
						onClose()} />}

				{title != undefined && <>
					<Text v="big" className="pr-8">{title}</Text>
					<div className="my-0">
						<Divider
							className={twJoin("absolute left-0 right-0 my-auto", bad != true && bgColor.border)}
							contrast={bad} />
					</div>
				</>}

				{children}

				<ModalBackground className={bad ?? false ? borderColor.red : borderColor.default}
					bgClassName={bad ?? false ? bgColor.red : bgColor.md} />
				<div className="fixed bg-black/30 left-0 right-0 top-0 bottom-0 -z-20"
					onClick={() => onClose?.()} />
			</ModalContext.Provider>
		</dialog>
	</ShowTransition>;
}

const PopupCountCtx = createContext({
	count: 0,
	incCount(this: void): number {
		return 0;
	},
});

// number of args shouldn't change
export function useCloneRef<T>(...refs: (Ref<T> | undefined)[]): (x: T | null) => void {
	return useCallback(x => {
		for (const r of refs) {
			if (typeof r == "function") r(x);
			else if (r != null) r.current = x;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...refs]);
}

// opens in modal if already in tooltip...
export const AppTooltip = forwardRef(
	(
		{ content, children, placement, className, onOpenChange, noClick, noHover, disabled, ...props }:
			& {
				content: ComponentChild;
				placement?: ComponentProps<typeof Popover>["positions"];
				onOpenChange?: (x: boolean) => void;
				noClick?: boolean;
				noHover?: boolean;
				disabled?: boolean;
				className?: string;
			}
			& Omit<JSX.HTMLAttributes<HTMLDivElement>, "content">,
		ref,
	) => {
		const [open, setOpen] = useState<number>(0);
		const [reallyOpen, setReallyOpen] = useState<number | null>(null);
		const { count, incCount } = useContext(PopupCountCtx);

		const unInteract = useCallback((p: PointerEvent) => {
			if (p.pointerType == "mouse") setOpen(0);
		}, [setOpen]);

		const isOpen = disabled != true && reallyOpen == count;

		const interact = useCallback((p: PointerEvent) => {
			if (p.pointerType == "mouse") setOpen(i => i+1);
		}, [setOpen]);

		useEffect(() => {
			let tm: number;
			if (open > 0) tm = setTimeout(() => setReallyOpen(incCount()), 200);
			else tm = setTimeout(() => setReallyOpen(null), 500);
			return () => clearTimeout(tm);
		}, [incCount, open]);

		useEffect(() => {
			onOpenChange?.(isOpen);
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [isOpen, setOpen]);

		const targetRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			const noCb = () => {};
			const cbs = [["pointerenter", noHover ?? false ? noCb : interact], [
				"pointerleave",
				noHover ?? false ? noCb : unInteract,
			], [
				"click",
				noClick ?? false ? noCb : (ev: PointerEvent) => {
					if (!isOpen) {
						setOpen(i => i+1);
						setReallyOpen(incCount());
					} else {
						setOpen(0);
						setReallyOpen(null);
					}
					ev.stopPropagation();
				},
			]] as const;

			const elem = targetRef.current!;
			for (const [k, v] of cbs) elem.addEventListener(k, v as () => void);
			return () => {
				for (const [k, v] of cbs) elem.removeEventListener(k, v as () => void);
			};
		}, [incCount, interact, isOpen, noClick, noHover, reallyOpen, unInteract]);

		const [uncollapsed, setUncollapsed] = useState(false);

		return <Popover ref={useCloneRef(targetRef, ref)} onClickOutside={() => incCount()}
			positions={placement ?? ["top", "right", "left", "bottom"]}
			containerStyle={{ zIndex: "100000" }} padding={5}
			parentElement={useContext(ModalContext)?.current ?? undefined}
			content={({ position, childRect, popoverRect }: PopoverState) => {
				if (!position) return <></>;
				const c = position[0];
				const borderClass =
					{
						r: "border-r-zinc-300! dark:border-r-zinc-600!",
						l: "border-l-zinc-300! dark:border-l-zinc-600!",
						t: "border-t-zinc-300! dark:border-t-zinc-600!",
						b: "border-b-zinc-300! dark:border-b-zinc-600!",
					}[c];

				return <ArrowContainer position={position} childRect={childRect} popoverRect={popoverRect}
					arrowClassName={borderClass} arrowSize={7} arrowColor="">
					<Collapse className={twMerge(containerDefault, "p-2 py-1", className)}
						update={setUncollapsed} onPointerEnter={interact} onPointerLeave={unInteract}
						open={isOpen} tabIndex={0} {...props}>
						{content}
					</Collapse>
				</ArrowContainer>;
			}} containerClassName="max-w-96" isOpen={isOpen || uncollapsed}>
			{children}
		</Popover>;
	},
);

export type DropdownPart =
	& ({ type: "txt"; txt?: ComponentChildren } | { type: "big"; txt?: ComponentChildren } | {
		type: "act";
		name?: ComponentChildren;
		act: () => void;
		disabled?: boolean;
		active?: boolean;
	})
	& { key?: string | number };

export function Dropdown(
	{ parts, trigger, className, onOpenChange, ...props }: {
		trigger?: ComponentChildren;
		parts: DropdownPart[];
	} & Partial<ComponentProps<typeof AppTooltip>>,
) {
	const [keySel, setKeySel] = useState<string | number | null>(null);
	const [focusSel, setFocusSel] = useState<boolean>(false);

	const acts = parts.map((v, i) => ({ key: v.key ?? i, type: v.type })).filter(v =>
		v.type == "act"
	);
	const idx = keySel != null ? acts.findIndex(p => p.key == keySel) : -1;

	const [open, setOpen] = useState(false);
	const ctx = useContext(PopupCountCtx);

	const keyCb = (ev: KeyboardEvent) => {
		if (!open) return;

		if (ev.key == "ArrowDown" && acts.length) {
			const nidx = idx == -1 ? 0 : (idx+1)%acts.length;
			setKeySel(acts[nidx].key);
			setFocusSel(true);
		} else if (ev.key == "ArrowUp" && acts.length) {
			const pidx = idx == -1 ? acts.length-1 : (idx+acts.length-1)%acts.length;
			setKeySel(acts[pidx].key);
			setFocusSel(true);
		} else if (ev.key == "Escape") {
			ctx.incCount();
		} else {
			return;
		}

		ev.preventDefault();
	};

	return <AppTooltip placement={["bottom", "top"]} onOpenChange={v => {
		setOpen(v);
		onOpenChange?.(v);
	}} className="px-0 py-0 max-w-60 overflow-y-auto justify-start max-h-[min(80dvh,20rem)]"
		content={parts.map((x, i) => {
			if (x.type == "act") {
				return <Button key={x.key ?? i} disabled={x.disabled}
					className={`m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t dark:hover:bg-zinc-700 hover:bg-zinc-300 w-full hover:outline hover:theme:border-b-transparent [&:not(:focus)]:hover:dark:outline-zinc-600 [&:not(:focus)]:hover:outline-zinc-400 ${
						x.active == true ? "dark:bg-zinc-950 bg-zinc-200" : ""
					} ${outlineColor.default}`} onBlur={(x.key ?? i) == keySel
					? () => setFocusSel(false)
					: undefined} ref={(el: HTMLButtonElement | null) => {
					if ((x.key ?? i) == keySel && el != null && focusSel) {
						el.focus();
					}
				}} onClick={() => {
					x.act();
					ctx.incCount();
				}}>
					{x.name}
				</Button>;
			} else if (x.type == "txt") {
				return <div key={x.key ?? i}
					className="flex flex-row justify-center gap-4 dark:bg-zinc-900 bg-zinc-100 items-center border m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t rounded-none w-full">
					{x.txt}
				</div>;
			}

			return <div key={x.key ?? i}
				className="flex flex-row justify-start gap-4 p-2 dark:bg-zinc-900 bg-zinc-100 items-center border m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t rounded-none w-full">
				{x.txt}
			</div>;
		})} onKeyDown={keyCb} {...props}>
		<div className={className}>{trigger}</div>
	</AppTooltip>;
}

function LazyAutoFocusSearch(
	{ search, setSearch, onSubmit }: {
		search: string;
		setSearch: (x: string) => void;
		onSubmit?: () => void;
	},
) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const t = setTimeout(() => ref.current?.focus(), 50);
		return () => clearTimeout(t);
	}, []);

	return <form className="w-full" onSubmit={ev => {
		onSubmit?.();
		ev.preventDefault();
	}}>
		<Input placeholder="Search..." ref={ref} className="theme:border-1 py-1" value={search}
			valueChange={setSearch} />
	</form>;
}

export function Select<T>(
	{ children, options, value, setValue, placeholder, className, disabled, searchable, ...props }: {
		options: {
			label: ComponentChildren;
			search?: string;
			value?: T;
			key?: string | number;
			disabled?: boolean;
		}[];
		value?: T;
		setValue?: (x: T) => void;
		placeholder?: ComponentChildren;
		searchable?: boolean;
		className?: string;
		disabled?: boolean;
	} & Partial<ComponentProps<typeof Dropdown>>,
) {
	const [search, setSearch] = useState("");
	const curOpt = value == undefined ? undefined : options.find(x => x.value == value);
	const parts: DropdownPart[] = useMemo(() => {
		const s = toSearchString(search);
		return options.filter(v => {
			const l = typeof v.label == "string" ? v.label : v.search;
			if (l != undefined) return toSearchString(l).includes(s);
			return true;
		}).map(opt => {
			const v = opt.value;
			return v == undefined
				? { type: "txt", txt: opt.label, key: opt.key }
				: {
					type: "act",
					name: opt.label,
					active: opt.value == value,
					disabled: opt.disabled,
					act() {
						setValue?.(v);
					},
					key: opt.key,
				};
		});
	}, [options, search, setValue, value]);

	const ctx = useContext(PopupCountCtx);
	return <Dropdown noHover trigger={children != undefined ? children : <div>
		<Button className={twMerge("pr-1 pl-1 py-0.5 min-w-0", className)} disabled={disabled}>
			<div className="basis-16 grow whitespace-nowrap overflow-hidden max-w-24">
				{curOpt == undefined ? placeholder : curOpt.label}
			</div>
			<IconChevronDown />
		</Button>
	</div>}
		parts={[
			...searchable != true
				? []
				: [
					{
						type: "txt",
						txt: <LazyAutoFocusSearch search={search} setSearch={setSearch} onSubmit={() => {
							if (parts.length > 0 && parts[0].type == "act") {
								parts[0].act();
								ctx.incCount();
							}
						}} />,
						key: "search",
					} as const,
				],
			...parts,
		]} onOpenChange={() => setSearch("")} className={children != undefined ? className : undefined}
		{...props} />;
}

export type Theme = "light" | "dark";
export const ThemeContext = createContext<{ theme: Theme; setTheme: (x: Theme) => void }>(
	undefined as never,
);
export const useTheme = () => useContext(ThemeContext).theme;

const ToastContext = createContext(
	undefined as {
		pushToast: (this: void, x: string) => void;
		setToastRoot: (root: HTMLElement) => () => void;
	} | undefined,
);

export function useToast() {
	return useContext(ToastContext)!.pushToast;
}

export function Container(
	{ children, className, ...props }: { children?: ComponentChildren; className?: string }
		& JSX.HTMLAttributes<HTMLDivElement>,
) {
	const { theme } = useContext(ThemeContext);

	const [count, setCount] = useState(0);
	const incCount = useCallback(() => {
		let r: number;
		setCount(x => {
			return r = x+1;
		}); // look away child
		return r!;
	}, [setCount]);

	useEffect(() => {
		const html = document.getElementsByTagName("html")[0];
		html.classList.add(theme);
		return () => html.classList.remove(theme);
	}, [theme, incCount]);

	const toastKey = useRef(1);
	const [toasts, setToasts] = useState<[number, string][]>([[0, ""]]);
	useEffect(() => {
		if (toasts.length <= 1) return;
		const tm = setTimeout(() => {
			setToasts(toasts.toSpliced(0, 1));
		}, 2000);
		return () => clearTimeout(tm);
	}, [toasts]);

	const titlesRef = useRef<string[]>([document.title]);
	const [toastRoot, setToastRoot] = useState<HTMLElement | null>(null);

	const shortcutsRef = useRef(new Map<string, Set<() => void>>());
	useEffect(() => {
		const shortcuts = shortcutsRef.current;
		const listener = (ev: KeyboardEvent) => {
			if (
				ev.target instanceof HTMLElement
				&& (["INPUT", "TEXTAREA", "SELECT", "DIALOG", "BUTTON"].includes(ev.target.tagName)
					|| ev.target.contentEditable == "true")
			) return;

			const keyStr: string[] = [];
			if (ev.metaKey) keyStr.push("cmd");
			if (ev.ctrlKey) keyStr.push("ctrl");
			if (ev.shiftKey) keyStr.push("shift");
			if (ev.altKey) keyStr.push("alt");

			keyStr.push((ev.key.startsWith("Key") ? ev.key.slice("Key".length) : ev.key).toLowerCase());

			const set = shortcuts.get(keyStr.join("-")) ?? new Set();
			if (set.size > 0) {
				set.forEach(cb => cb());
				ev.preventDefault();
			}
		};

		document.addEventListener("keydown", listener);
		return () => document.removeEventListener("keydown", listener);
	}, [shortcutsRef]);

	const inner = <>
		{createPortal(
			<div className="fixed bottom-5 left-2 px-10 z-[12000] flex flex-col items-start gap-3">
				{toasts.map((x, i) =>
					<ShowTransition key={x[0]} open={i != 0} openClassName="opacity-100"
						closedClassName="opacity-0">
						<div
							className={twMerge(
								containerDefault,
								bgColor.sky,
								"p-2 pl-5 gap-5 flex flex-row items-center transition-opacity duration-1000",
							)}>
							{x[1]}
							<button className="ml-auto" onClick={() => {
								setToasts(xs => xs.filter(y => y[0] != x[0]));
							}}>
								<IconX />
							</button>
						</div>
					</ShowTransition>
				)}
			</div>,
			toastRoot ?? document.body,
		)}

		<div
			className={twMerge(
				"font-body dark:text-gray-100 text-gray-950 min-h-dvh relative",
				className,
			)}
			{...props}>
			{children}
			<div className="bg-neutral-100 dark:bg-neutral-950 absolute left-0 top-0 bottom-0 right-0 -z-50" />
		</div>
	</>;

	return <ShortcutContext.Provider value={shortcutsRef}>
		<TitleContext.Provider value={useMemo(() => ({
			setTitle(title) {
				const arr = titlesRef.current;
				const i = arr.length;
				arr.push(document.title = title);

				return () => {
					while (i < arr.length) arr.pop();
					document.title = arr[arr.length-1];
				};
			},
		}), [])}>
			<PopupCountCtx.Provider value={{ count, incCount }}>
				<ToastContext.Provider value={{
					pushToast: useCallback((toast: string) => {
						setToasts(xs => [...xs.slice(0, 3), [toastKey.current++, toast]]);
					}, []),
					setToastRoot: useCallback((el: HTMLElement) => {
						setToastRoot(el);
						return () => setToastRoot(old => el == old ? null : old);
					}, []),
				}}>
					<DragProvider>{inner}</DragProvider>
				</ToastContext.Provider>
			</PopupCountCtx.Provider>
		</TitleContext.Provider>
	</ShortcutContext.Provider>;
}

export const toSearchString = (x: string) => x.toLowerCase().replace(/[^a-z0-9\n]/g, "");

export function useMediaQuery(q: MediaQueryList | string | null, init: boolean = false) {
	const [x, set] = useState(init);

	useEffect(() => {
		if (q == null) return;

		const mq = typeof q == "string" ? window.matchMedia(q) : q;
		const cb = () => set(mq.matches);
		mq.addEventListener("change", cb);
		set(mq.matches);
		return () => mq.removeEventListener("change", cb);
	}, [q]);

	return x;
}

const queries: Record<"md" | "lg", MediaQueryList | null> = {
	md: window.matchMedia("(min-width: 768px)"),
	lg: window.matchMedia("(min-width: 1024px)"),
};

export const useMd = () => {
	return useMediaQuery(queries.md, true);
};

export const useLg = () => {
	return useMediaQuery(queries.lg, true);
};

export function useDebounce<T>(f: () => T, debounceMs: number): T {
	const [v, setV] = useState(f);
	useEffect(() => {
		const ts = setTimeout(() => setV(f()), debounceMs);
		return () => clearTimeout(ts);
	}, [f, debounceMs]);
	return v;
}

export function ErrorPage({ error, retry }: { error?: Error; retry?: () => void }) {
	return <div className="flex flex-col items-center gap-10 h-full py-10 justify-center mx-5">
		<IconInfoTriangleFilled size={70} className="fill-red-500" />
		<div className="flex flex-col gap-2 max-w-md">
			<Text v="big">An error occurred</Text>
			<p>It{"'"}s never too late to try again. {!retry && "Refresh the page."}</p>

			{retry && <Button onClick={() => retry()}>Retry</Button>}

			{error?.message != undefined && <Text v="sm">Details: {error.message}</Text>}
		</div>
	</div>;
}

export function withTimeout<T extends unknown[], R>(
	f: (...args: T) => Promise<R>,
	timeout: number,
): typeof f {
	return (...args) =>
		Promise.race([
			new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timed out")), timeout)),
			f(...args),
		]);
}

export const abbr = (s: string, len: number = 300) =>
	s.length > len ? `${s.substring(0, len-3)}...` : s;

export function useAsync<T extends unknown[], R>(
	f: (...args: T) => Promise<R>,
	opts?: { propagateError?: boolean },
): {
	run: (...args: T) => void;
	attempted: boolean;
	loading: boolean;
	error: Error | null;
	result: R | null;
} {
	const [state, setState] = useState<
		{ loading: boolean; attempted: boolean; error: Error | null; result: R | null }
	>({ loading: false, attempted: false, error: null, result: null });

	const propError = opts?.propagateError ?? true;
	useEffect(() => {
		if (propError && state.error) throw state.error;
	}, [state.error, propError]);

	return useMemo(() => ({
		run(...args) {
			if (!state.loading) {
				setState(s => ({ ...s, loading: true, attempted: true }));

				f(...args).then(res => {
					setState(s => ({ ...s, result: res }));
				}, err => {
					setState(s => ({ ...s, error: err instanceof Error ? err : new Error("Unknown error") }));
				}).finally(() => {
					setState(s => ({ ...s, loading: false }));
				});
			}
		},
		...state,
	}), [f, state]);
}

// if T is disposable, will dispose before rerunning and on unmount
export function useAsyncEffect<T>(f: () => Promise<T>, deps: unknown[]) {
	const oldV = useRef<() => void>(null);
	const x = useAsync(async () => {
		const v = await f();
		oldV.current?.();
		if (typeof v == "object" && v && Symbol.dispose in v) {
			oldV.current = v[Symbol.dispose] as () => void;
		}

		return v;
	});

	useEffect(() => () => {
		oldV.current?.();
		oldV.current = null;
	}, []);

	const changed = useRef(false);

	useEffect(() => {
		changed.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	useEffect(() => {
		if (!x.loading && changed.current) {
			changed.current = false;
			x.run();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, x.loading]);

	return x;
}

export function listener<E extends HTMLElement, K extends keyof HTMLElementEventMap>(
	elem: E,
	handler: { type: K | K[]; f: (this: Element, event: HTMLElementEventMap[K]) => void },
) {
	const typeArr = Array.isArray(handler.type) ? handler.type : [handler.type];
	for (const ty of typeArr) elem.addEventListener(ty, handler.f);
	return {
		[Symbol.dispose]() {
			for (const ty of typeArr) elem.removeEventListener(ty, handler.f);
		},
	};
}

export function debounce(ms: number) {
	let ts: number | null = null;
	return {
		call(f: () => void) {
			if (ts != null) clearTimeout(ts);
			ts = setTimeout(() => f(), ms);
		},
		cancel() {
			if (ts != null) {
				clearTimeout(ts);
				ts = null;
			}
		},
		[Symbol.dispose]() {
			this.cancel();
		},
	} as const;
}

export function throttle(ms: number, callOnDispose?: boolean) {
	let ts: number | null = null;
	let cur: (() => void) | null = null;
	return {
		call(f: () => void) {
			if (ts == null) {
				f();
				ts = setTimeout(() => {
					cur?.();
					cur = ts = null;
				}, ms);
			} else {
				cur = f;
			}
		},
		[Symbol.dispose]() {
			if (ts != null) clearTimeout(ts);
			if (cur != null && callOnDispose == true) cur?.();
		},
	} as const;
}

export function useDisposable(effect: () => Disposable | undefined, deps?: unknown[]) {
	useEffect(() => {
		const obj = effect();
		return () => {
			obj?.[Symbol.dispose]();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
}

// awful time complexity lmfao
export function mapWith<K, V>(map: ReadonlyMap<K, V> | null, k: K, v?: V) {
	const newMap = new Map(map);
	if (v !== undefined) newMap.set(k, v);
	else newMap.delete(k);
	return newMap;
}

export function setWith<K>(set: ReadonlySet<K> | null, k: K, del?: boolean) {
	const newSet = new Set(set);
	if (del == true) newSet.delete(k);
	else newSet.add(k);
	return newSet;
}

export type SetFn<T> = (cb: (old: T) => T) => void;

export function mapSetFn<T, R>(
	x: SetFn<T>,
	f: (x: R, old: T) => T,
	get: (x: T) => R,
): Dispatch<SetStateAction<R>> {
	return nv => {
		if (typeof nv == "function") x(old => (f((nv as (v: R) => R)(get(old)), old)));
		else x(old => f(nv, old));
	};
}

export function useFnRef<T extends Disposable>(f: () => T, deps?: unknown[]) {
	const ret = useRef<T>(null);
	useEffect(() => {
		const v = f();
		ret.current = v;
		return () => {
			v[Symbol.dispose]();
			ret.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	return ret;
}

export function ConfirmModal(
	{ title, actionName, msg, open, onClose, confirm, defaultYes }: {
		title?: string;
		msg: ComponentChildren;
		open: boolean;
		onClose: () => void;
		confirm: () => void;
		defaultYes?: boolean;
		actionName?: string;
	},
) {
	return <Modal open={open} onClose={() => onClose()} title={title ?? "Are you sure?"}
		className="flex flex-col gap-2">
		<form onSubmit={ev => {
			ev.preventDefault();
			if (defaultYes == true) confirm();
			onClose();
		}} className="contents">
			<Text>{msg}</Text>
			<div className="flex flex-row gap-2">
				<Button className={bgColor.red} onClick={() => {
					onClose();
					confirm();
				}} autofocus={defaultYes}>
					{actionName ?? title ?? "Confirm"}
				</Button>
				<Button autofocus={defaultYes != true} type="button" onClick={() => onClose()}>
					Cancel
				</Button>
			</div>
		</form>
	</Modal>;
}

export function AlertErrorBoundary({ children }: { children?: ComponentChildren }) {
	const [err, reset] = useErrorBoundary(err => {
		console.error("alert error boundary", err);
	}) as [unknown, () => void];

	if (err != undefined) {
		return <Alert bad title="An error occurred" txt={
			<>
				<Text>{err instanceof Error ? `Details: ${err.message}` : "Unknown error"}</Text>
				<Button onClick={() => reset()} className="self-start">Retry</Button>
			</>
		} />;
	}

	return children;
}

export function ease(t: number) {
	const a = t*t*(3-2*t);
	return a*a/2+0.5-(1-a)*(1-a)/2;
}

export const dragOpts = {
	pad: 5,
	ghostOpacity: "0.5",
	dragHandle: ".draghandle",
	scrollThreshold: 100,
	scrollVelocity: 0.01,
	delay: 300,
	delta: 25,
	easing: "ease-out",
} as const;

type DragKey = string | number;
type DragState = {
	lists: Map<
		HTMLElement,
		{
			update: (ev: MouseEvent, drag: boolean, vs: { key: DragKey; data?: unknown }[]) => void;
			accept: (vs: unknown[]) => { data: unknown; key: DragKey }[] | null;
		}
	>;
	groups: Map<string, HTMLElement[]>;
	drag: {
		active: boolean;
		timeout: number;
		firstMouseEvent: MouseEvent;
		lastMouseEvent: MouseEvent;
		group?: string;
		currentList: HTMLElement | null;
		items: unknown[];
		perListItems: Map<HTMLElement, { data: unknown; key: DragKey }[]>;
		ghost: { readonly el: HTMLElement; readonly offset: readonly [number, number] }[];
		onActivate?: () => void;
		onCancel?: () => void;
	} | null;
	numTransitions: number;
	scrollAnimation?: number;
};

const mouseInside = (ev: MouseEvent, el: HTMLElement, pad: number) => {
	let { top, left, width, height } = el.getBoundingClientRect();
	top -= pad;
	left -= pad;
	width += pad;
	height += pad;
	return ev.clientY >= top && ev.clientY <= top+height && ev.clientX >= left
		&& ev.clientX <= left+width;
};

function stopDrag(ev: MouseEvent | null, drag: DragState) {
	if (!drag.drag) return;
	if (!drag.drag.active) {
		clearTimeout(drag.drag.timeout);
		drag.drag.onCancel?.();
	}

	if (drag.drag.currentList) {
		drag.lists.get(drag.drag.currentList)!.update(
			ev ?? drag.drag.lastMouseEvent,
			false,
			drag.drag.perListItems.get(drag.drag.currentList)!,
		);
	}

	if (drag.scrollAnimation != undefined) {
		cancelAnimationFrame(drag.scrollAnimation);
		delete drag.scrollAnimation;
	}

	drag.drag.ghost.forEach(x => {
		x.el.animate([{ opacity: dragOpts.ghostOpacity }, { opacity: 0 }], {
			duration: 400,
			easing: dragOpts.easing,
		}).onfinish = () => x.el.remove();
	});
	drag.drag = null;
}

function updateDragState(ev: MouseEvent, drag: DragState) {
	if (!drag.drag) return;

	drag.drag.lastMouseEvent = ev;
	if (!drag.drag.active) {
		const first = drag.drag.firstMouseEvent;
		if (Math.hypot(ev.clientX-first.clientX, ev.clientY-first.clientY) >= dragOpts.delta) {
			drag.drag.active = true;
			drag.drag.onActivate?.();
		} else {
			return;
		}
	}

	for (const g of drag.drag.ghost) {
		g.el.style.left = px(ev.clientX+g.offset[0]);
		g.el.style.top = px(ev.clientY+g.offset[1]);
	}

	if (drag.numTransitions > 0) return;

	if (drag.drag.currentList && !mouseInside(ev, drag.drag.currentList, dragOpts.pad)) {
		drag.lists.get(drag.drag.currentList)!.update(
			ev,
			false,
			drag.drag.perListItems.get(drag.drag.currentList)!.map(v => ({ key: v.key })),
		);
		drag.drag.currentList = null;
	}

	if (!drag.drag.currentList) {
		const otherLists = new Set([
			...drag.drag.group != undefined ? drag.groups.get(drag.drag.group) ?? [] : [],
			...drag.drag.perListItems.keys(),
		]);

		for (const other of otherLists) {
			if (mouseInside(ev, other, dragOpts.pad)) {
				const listData = drag.lists.get(other)!;
				const listItems = drag.drag.perListItems.get(other);
				if (listItems) {
					drag.drag.currentList = other;
					break;
				}

				const res = listData.accept(drag.drag.items);
				if (res) {
					drag.drag.currentList = other;
					drag.drag.perListItems.set(other, res);
					break;
				}
			}
		}
	}

	if (drag.drag.currentList) {
		const l = drag.drag.currentList;
		const rect = l.getBoundingClientRect();
		const a = (rect.top+2*rect.bottom)/3, b = (2*rect.top+rect.bottom)/3;

		if (drag.scrollAnimation != undefined) {
			cancelAnimationFrame(drag.scrollAnimation);
			delete drag.scrollAnimation;
		}

		let lt = performance.now();
		const scroll = (y: number, down: boolean) => {
			const d = down ? ev.clientY-y : y-ev.clientY;
			const space = down ? l.scrollHeight-l.scrollTop-l.offsetHeight : l.scrollTop;
			if (d > 0 && space > 0) {
				drag.scrollAnimation = requestAnimationFrame(t => {
					l.scrollBy({ top: (ev.clientY-y)*(t-lt)*dragOpts.scrollVelocity });

					lt = t;
					scroll(y, down);
				});
			} else {
				delete drag.scrollAnimation;
			}
		};

		scroll(Math.max(a, rect.bottom-dragOpts.scrollThreshold), true);
		scroll(Math.min(b, rect.top+dragOpts.scrollThreshold), false);

		drag.lists.get(l)!.update(ev, true, drag.drag.perListItems.get(l)!);
	}
}

const DragContext = createContext(undefined as unknown as React.MutableRefObject<DragState>);

export function DragProvider({ children }: { children: ComponentChildren }) {
	const state = useRef<DragState>({
		lists: new Map(),
		groups: new Map(),
		drag: null,
		numTransitions: 0,
	});

	useEffect(() => {
		const move = (ev: MouseEvent) => {
			updateDragState(ev, state.current);
		};

		const up = (ev: MouseEvent) => {
			if (state.current.drag != null) {
				stopDrag(ev, state.current);
				ev.preventDefault();
			}
		};

		document.addEventListener("mousemove", move);
		document.addEventListener("mouseup", up);
		document.addEventListener("mouseleave", up);
		return () => {
			document.removeEventListener("mousemove", move);
			document.removeEventListener("mouseup", up);
			document.removeEventListener("mouseleave", up);
		};
	}, [state]);

	return <DragContext.Provider value={state}>{children}</DragContext.Provider>;
}

export function useDragList<X, T extends HTMLElement>(
	{ group, ...props }: {
		values: readonly X[];
		setValues?: (x: X[]) => void;
		dataKey: (x: X) => DragKey;
		group?: string;
		acceptData?: (data: unknown) => X | null;
		selection?: ReadonlySet<DragKey>;
	},
): { ref: Ref<T>; draggingKeys: ReadonlySet<DragKey>; clearAnims: () => void } {
	const ref = useRef<T>(null);
	const state = useContext(DragContext).current;
	const listState = useRef<(typeof props) & { keyToValue: ReadonlyMap<string, [DragKey, X]> }>({
		keyToValue: new Map(),
		...props,
	});
	const [draggingKeys, setDraggingKeys] = useState<ReadonlySet<DragKey>>(() => new Set());

	useEffect(() => {
		Object.assign(listState.current, props);
		listState.current.keyToValue = new Map(props.values.map(v => {
			const k = props.dataKey(v);
			return [k.toString(), [k, v]];
		}));
	});

	const heightAnimsRef = useRef(new Set<Animation>());
	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const added = new Set<Element>(el.children);
		const skip = new Set<Element>();
		const toRemoveFromSkip = new Set<Element>();

		const heightAnims = heightAnimsRef.current;
		const animateHeightProps = [
			"height",
			"paddingTop",
			"paddingBottom",
			"borderTop",
			"borderBottom",
			"marginTop",
			"marginBottom",
		] as const;

		const animateHeight = (node: HTMLElement, collapse: boolean) => {
			const style = getComputedStyle(node);
			const frames: Keyframe[] = [{ opacity: "0", overflow: "clip" }, { opacity: style.opacity }];

			for (const k of animateHeightProps) {
				frames[0][k] = "1px";
				frames[1][k] = style[k];
			}

			if (collapse) frames.reverse();

			const anim = node.animate(frames, { duration: 200, fill: "none", easing: dragOpts.easing });
			heightAnims.add(anim);
			anim.onfinish = () => {
				heightAnims.delete(anim);
				if (collapse) {
					node.remove();
					toRemoveFromSkip.add(node);
				} else {
					offsets.set(node, node.offsetTop);
					transitionOrder();
				}
			};
		};

		const cleanDatasetAnim = (child: HTMLElement) => {
			for (const k in child.dataset) delete child.dataset[k];
			child.getAnimations().forEach(x => x.pause());
		};

		const offsets = new Map<HTMLElement, number>(
			([...el.children] as HTMLElement[]).map(el => [el, el.offsetTop]),
		);
		const getOrder = () =>
			([...el.children] as HTMLElement[]).filter(el => offsets.has(el)).map((child, i) =>
				[child, i] as const
			);

		const transitionAnims = new Map<HTMLElement, Animation>();

		const upOffsets = () => {
			for (const child of offsets.keys()) {
				if (transitionAnims.has(child)) continue;
				offsets.set(child, child.offsetTop);
			}
		};

		let order = getOrder();
		upOffsets();

		const transitionOrder = () => {
			const newOrder = getOrder();
			const newMap = new Map(newOrder);
			let lastIndex = 0;
			if (
				!order.some(([el]) => {
					const i = newMap.get(el);
					if (i != undefined) {
						if (i < lastIndex) return true;
						lastIndex = i;
					}
					return false;
				})
			) {
				order = newOrder;
				upOffsets();
				return;
			}

			for (const [child] of order) {
				const transition = transitionAnims.get(child);

				let oldTop = offsets.get(child), newTop = child.offsetTop;
				if (oldTop == undefined) continue;

				if (transition) {
					oldTop += child.offsetTop;
					const oldTime = transition.currentTime;
					transition.finish();
					oldTop -= child.offsetTop;
					newTop = child.offsetTop;
					transition.currentTime = oldTime;
				}

				if (Math.abs(newTop-oldTop) < 10) continue;

				if (transition) {
					transitionAnims.delete(child);
					transition.cancel();
				} else {
					state.numTransitions++;
				}

				const { width, height } = child.getBoundingClientRect();
				const common = { position: "relative", width: px(width), height: px(height) };

				offsets.set(child, newTop);
				const anim = child.animate([{ top: px(oldTop-newTop), ...common }, {
					top: "0px",
					...common,
				}], { duration: 200, fill: "backwards", easing: dragOpts.easing });

				transitionAnims.set(child, anim);
				anim.onfinish = anim.oncancel = () => {
					if (transitionAnims.get(child) != anim) return;
					transitionAnims.delete(child);
					offsets.set(child, child.offsetTop);

					if (--state.numTransitions == 0 && state.drag?.lastMouseEvent) {
						updateDragState(state.drag.lastMouseEvent, state);
					}
				};
			}

			order = newOrder;
			upOffsets();
		};

		const observer = new MutationObserver(mut => {
			for (const record of mut) {
				const anim = (node: globalThis.Node, add: boolean) => {
					if (!(node instanceof HTMLElement)) return;
					if (skip.has(node)) {
						if (!add && toRemoveFromSkip.has(node)) {
							toRemoveFromSkip.delete(node);
							skip.delete(node);
							added.delete(node);
						}

						return;
					}

					if (add) {
						if (added.has(node)) return;
						added.add(node);
						animateHeight(node, false);
					} else {
						offsets.delete(node);

						const node2 = node.cloneNode(true) as HTMLElement;
						node2.inert = true;
						cleanDatasetAnim(node2);

						skip.add(node2);
						if (record.nextSibling?.parentNode != null) {
							el.insertBefore(node2, record.nextSibling);
						} else if (
							record.previousSibling instanceof HTMLElement && record.previousSibling?.parentNode
						) {
							record.previousSibling.after(node2);
						}

						animateHeight(node2, true);
					}
				};

				for (const node of record.removedNodes) {
					if (!document.contains(node)) void anim(node, false);
				}
				for (const node of record.addedNodes) void anim(node, true);
			}

			transitionOrder();
		});

		const getKv = (child: Node | null | undefined) => {
			if (!(child instanceof HTMLElement)) return null;
			const strK = child.dataset.key;
			if (strK == undefined) return null;
			const v = listState.current.keyToValue.get(strK);
			if (v == undefined) return null;
			return { k: v[0], v: v[1], el: child };
		};

		let draggingKeysCmp = new Set();
		state.lists.set(el, {
			update(ev, drag, vs) {
				if (!listState.current.setValues) return;

				const vsKeys = new Set(vs.map(v => v.key));
				if (!drag && draggingKeysCmp.size) {
					draggingKeysCmp.clear();
					setDraggingKeys(new Set());
				} else if (drag && vs.some(v => !draggingKeysCmp.has(v))) {
					draggingKeysCmp = vsKeys;
					setDraggingKeys(vsKeys);
				}

				const notVs = listState.current.values.filter(v =>
					!vsKeys.has(listState.current.dataKey(v))
				);

				const kvs = [...el.children].map(getKv).filter(x => x != null);

				let topEdge = false;
				const insertBefore = kvs.find(child => {
					if (vsKeys.has(child.k)) {
						topEdge = true;
						return false;
					}
					const rect = child.el.getBoundingClientRect();
					return (topEdge ? rect.top : rect.bottom) > ev.clientY;
				});

				let i = notVs.length;
				if (insertBefore) i = notVs.findIndex(x => x == insertBefore.v);

				const insertion = vs.filter(v => v.data != undefined);
				if (
					insertion.length > 0
					&& (listState.current.values.length <= i
						|| listState.current.values[i] != insertion[0].data)
				) {
					notVs.splice(i, 0, ...insertion.map(v => v.data as X));
					listState.current.setValues(notVs);
				}
			},
			accept: vs => {
				const cb = listState.current.acceptData;
				if (!cb) return null;
				return vs.map(cb).filter(v => v != null).map(v => ({
					key: listState.current.dataKey(v),
					data: v,
				}));
			},
		});

		if (group != undefined) {
			state.groups.set(group, [...state.groups.get(group) ?? [], el]);
		}

		const ignoreEvents = new Set<Event>();
		const down = (ev: MouseEvent) => {
			if (ignoreEvents.has(ev)) {
				ignoreEvents.delete(ev);
				return;
			}

			const target = ev.target as HTMLElement;
			const child = [...el.children].find(x => x.contains(target)) ?? null;
			const kv = getKv(child);
			if (!kv) return;

			let items = [{ data: kv.v, key: kv.k }];
			if (listState.current.selection != undefined) {
				const ks = listState.current.selection;
				if (ks.has(kv.k)) {
					items = listState.current.values.map(x => ({
						data: x,
						key: listState.current.dataKey(x),
					})).filter(x => ks.has(x.key));
				}
			}

			stopDrag(ev, state);

			const { left, top, width, height } = child!.getBoundingClientRect();
			const makeGhost = (ev: MouseEvent) => {
				const ghost = child!.cloneNode(true) as HTMLElement;
				cleanDatasetAnim(ghost);
				ghost.style.position = "fixed";
				ghost.style.width = px(width);
				ghost.style.height = px(height);
				ghost.style.opacity = dragOpts.ghostOpacity;
				ghost.style.zIndex = "100";
				ghost.inert = true;
				document.body.appendChild(ghost);
				return { offset: [left-ev.clientX, top-ev.clientY], el: ghost } as const;
			};

			const newDragState: NonNullable<DragState["drag"]> = {
				lastMouseEvent: ev,
				group,
				currentList: el,
				items: items.map(x => x.data),
				active: false,
				perListItems: new Map([[el, items]]),
				ghost: [],
				firstMouseEvent: ev,
				timeout: setTimeout(() => {
					if (newDragState.active) return;
					newDragState.active = true;
					newDragState.onActivate?.();
					updateDragState(ev, state);
				}, dragOpts.delay),
				onActivate: () =>
					setTimeout(() => {
						window.getSelection()?.empty();
						if (state.drag == newDragState) {
							newDragState.ghost.push(makeGhost(ev));
						}
					}, 50),
				onCancel() {
					setTimeout(() => {
						if (!target.dispatchEvent(ev)) window.getSelection()?.empty();
					}, 0);
					ignoreEvents.add(ev);
				},
			};

			if ([...el.querySelectorAll(dragOpts.dragHandle)].some(x => x.contains(target))) {
				ev.preventDefault();
			}

			state.drag = newDragState;
			updateDragState(ev, state);
			ev.stopPropagation();
		};

		el.addEventListener("mousedown", down);
		observer.observe(el, { childList: true });
		return () => {
			stopDrag(null, state);
			observer.disconnect();
			transitionAnims.values().forEach(a => a.cancel());
			heightAnims.forEach(a => a.finish());
			el.removeEventListener("mousedown", down);
		};
	}, [ref, group, state]);

	const clearAnims = useCallback(() => {
		heightAnimsRef.current.forEach(a => a.finish());
	}, [heightAnimsRef]);

	return useMemo(() => ({ ref, draggingKeys, clearAnims }), [draggingKeys, clearAnims]);
}
