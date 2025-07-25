import { IconMailFilled, IconUserCircle } from "@tabler/icons-preact";
import { compiler, MarkdownToJSX, RuleType } from "markdown-to-jsx";
import { ComponentChildren, ComponentType, createContext, Fragment, JSX, VNode } from "preact";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { twJoin, twMerge } from "tailwind-merge";
import { data, StageData } from "../shared/data";
import { AsciiArt } from "./asciiart";
import { extraData, Message, messages } from "./data";
import { LocalStorage } from "./storage";
import { Anchor, anchorStyle, bgColor, borderColor, Button, Divider, IconButton, mapWith, Modal,
	Text, textColor, useAsyncEffect } from "./ui";

export function useStoryState<T = string>(key: string) {
	const [x, setX] = useState<T>();
	useEffect(() => {
		setX(LocalStorage.storyState?.[key] as T | undefined);
	}, [key]);
	return [
		x,
		useCallback((newX: T) => {
			LocalStorage.storyState = { ...LocalStorage.storyState, [key]: newX as unknown };
			setX(newX);
		}, [key]),
	] as const;
}

const titleComponent = (ord: number) =>
	function Title({ children }: { children: React.ReactNode }) {
		return { // avoid key linting
			0: <Text v="big" className="dark:text-zinc-100">{children}</Text>,
			1: <Text v="md" className="dark:text-zinc-100">{children}</Text>,
		}[ord] ?? <Text v="bold" className="dark:text-zinc-100">{children}</Text>;
	};

const titleComponents = Object.fromEntries(
	[1, 2, 3, 4, 5, 6].map(x => [`h${x}`, titleComponent(x)]),
);

export class StoryLoader {
	static storyModules: Record<string, () => Promise<{ default: string }>> = import.meta.glob<
		false,
		"raw",
		{ default: string }
	>("../content/**/*.md", { eager: false, query: "?raw" });

	constructor(public name: string, public paragraph: boolean) {}

	loadMod(mod: { default: string }) {
		const visited = new Set<MarkdownToJSX.ParserResult>();
		const getStrings = (x: MarkdownToJSX.ParserResult, fst = true): { text: string }[] => {
			if (x.type == RuleType.paragraph && !fst) return [];

			visited.add(x);
			if ("children" in x && x.children != undefined) {
				return x.children.flatMap(v => getStrings(v, false));
			} else if (x.type == RuleType.text) {
				return [x];
			}

			return [];
		};

		const vs = compiler(mod.default, {
			forceWrapper: true,
			wrapper: null,
			renderRule(next, node) {
				if ("children" in node && node.children != undefined) {
					const newChild: typeof node.children = [];
					for (const x of node.children) {
						const last = newChild[newChild.length-1];
						if (last != undefined && last.type == RuleType.text && x.type == RuleType.text) {
							last.text += x.text;
							continue;
						}
						newChild.push(x);
					}

					node.children = newChild;
				} else if (node.type == RuleType.text) {
					return node.text.replaceAll(/(?<=\w)'/g, "’").replaceAll(/'(?=\w)/g, "‘").replaceAll(
						"--",
						"—",
					);
				}

				if (!visited.has(node)) {
					const str = getStrings(node);
					const lastQuote: Record<string, [{ text: string }, number] | null> = {
						"\"": null,
						"'": null,
					};
					const map: Record<string, [string, string]> = { "\"": ["“", "”"], "'": ["‘", "’"] };

					for (const s of str) {
						for (let i = 0; i < s.text.length; i++) {
							const c = s.text[i];
							if (c in map) {
								if (lastQuote[c] != null) {
									s.text = [...s.text].toSpliced(i, 1, map[c][1]).join("");
									lastQuote[c][0].text = [...lastQuote[c][0].text].toSpliced(
										lastQuote[c][1],
										1,
										map[c][0],
									).join("");
									lastQuote[c] = null;
								} else if (i == 0 || s.text[i-1].trim() == "") {
									lastQuote[c] = [s, i];
								}
							}
						}
					}
				}

				return next() as ComponentChildren;
			},
			sanitizer: value => value,
			overrides: {
				StoryParagraph: { component: StoryParagraph },
				AsciiArt: { component: AsciiArt },
				RainbowText: { component: RainbowText },
				code: {
					component: function Code({ children }: { children?: ComponentChildren }) {
						return <Text v="code">{children}</Text>;
					},
				},
				ul: {
					component: function UL(
						{ className, ...attr }: JSX.IntrinsicElements["ul"] & { className?: string },
					) {
						return <ul {...attr} className={twMerge("ml-4 list-disc", className)} />;
					},
				},
				...titleComponents,
			},
		}) as ComponentChildren[];

		const proc = new Map<ComponentType<never>, (x: VNode) => ComponentChildren>(
			this.paragraph
				? [[StoryParagraph, (x: VNode) => x], [AsciiArt, (x: VNode) =>
					<StoryParagraph asciiArt={x} />]] as const
				: [],
		);

		return vs.map((v, i) => {
			if (
				v == null || v == false || (typeof v == "string" && v.trim() == "")
				|| (typeof v == "object" && "type" in v)
			) {
				const ty = proc.get((v as VNode).type as ComponentType<never>);
				if (ty) return <Fragment key={i}>{ty(v as VNode)}</Fragment>;
			}

			return this.paragraph ? <StoryParagraph key={i}>{v}</StoryParagraph> : <div key={i}>{v}</div>;
		});
	}

	listening = false;
	async load() {
		const path = `../content/${this.name}.md`;
		if (!(path in StoryLoader.storyModules)) throw new Error("chapter not found");

		return this.loadMod(await StoryLoader.storyModules[path]());
	}
}

type TerminalEvent = { type: "end" } | { type: "start"; node: HTMLElement } | {
	type: "text";
	content: string;
} | { type: "reverse" } | { type: "pause" } | { type: "speed"; mul: number };

type TerminalMsg = {
	ev: TerminalEvent[];
	type: "server";
	content: Node[];
	elem: HTMLElement;
	stepMul: number;
	rev: boolean;
};

class TerminalEffect {
	cursorElem: HTMLElement | null = null;
	msgs: TerminalMsg[] = [];
	current: number = -1;
	interval: number | undefined;

	step = 8;
	minWait = 10;
	maxWait = 25;
	inPause = -1;

	constructor(private root: HTMLElement) {
	}

	start() {
		if (this.interval != undefined) return;
		this.inPause = 5;
		this.interval = setInterval(() => this.update(this.step, true), 50);
	}

	onEnd?: () => void;

	wait = () => Math.random()*(this.maxWait-this.minWait)+this.minWait;

	update(step: number, wait: boolean) {
		const render = step == Number.MAX_VALUE;
		if (this.current >= this.msgs.length || --this.inPause > 0) {
			return;
		}

		if (this.cursorElem) this.cursorElem.remove();

		const c = this.current >= this.msgs.length ? null : this.msgs[this.current];
		let writing = false;
		if (this.current != -1 && c && c.ev.length > 0) {
			let eaten = 0;
			while (c.ev.length > 0) {
				const step2 = Math.ceil(Math.max(0.01, c.stepMul)*step);
				if (eaten >= step2) break;

				const ev = c.ev[0];

				if (ev.type == "text") {
					writing = true;
					const len = Math.min(step2-eaten, ev.content.length);
					if (c.rev) {
						for (let i = 0; i < len;) {
							const el = c.elem.lastElementChild!;
							const l = el.textContent!.length;
							const d = len-i;
							if (d >= l) el.remove();
							else el.textContent = el.textContent!.slice(0, l-d);
							i += Math.min(d, l);
						}
					} else {
						const subspan = document.createElement("span");
						subspan.classList.add(render ? "text-bit-render" : "text-bit");
						subspan.textContent = ev.content.slice(0, len);

						c.elem.append(subspan);
					}

					ev.content = ev.content.slice(len);
					if (ev.content.length == 0) c.ev.shift();
					eaten += len;
				} else if (ev.type == "pause") {
					c.ev.shift();
					if (!c.rev && wait) {
						this.inPause = this.wait();
						break;
					}
				} else if (ev.type == "start") {
					if (c.rev) {
						const p = c.elem.parentElement!;
						c.elem.remove();
						c.elem = p;
					} else {
						c.elem.appendChild(ev.node);
						c.elem = ev.node;
					}

					c.ev.shift();
				} else if (ev.type == "end") {
					if (c.rev) {
						c.elem = c.elem.lastElementChild as HTMLElement;
					} else {
						c.elem = c.elem.parentElement!;
					}

					c.ev.shift();
					writing = false;
				} else if (ev.type == "reverse") {
					c.rev = !c.rev;
					c.ev.shift();
				} else if (ev.type == "speed") {
					c.stepMul = ev.mul;
					c.ev.shift();
				}
			}

			if (c.ev.length == 0 && wait) {
				this.inPause = 0.2*this.wait();
			}
		}

		let skip = false;
		if (this.inPause <= 0 && (this.current == -1 || (c && c.ev.length == 0))) {
			this.current++;

			skip = true;
			if (this.current < this.msgs.length) this.append(this.msgs[this.current].elem);
			else this.onEnd?.();
		}

		if (skip) this.append("\n");

		if (render || this.current >= this.msgs.length || !c || !writing) return;

		this.cursorElem = document.createElement("span");
		this.cursorElem.classList.add("cursor", "cursor-blink");

		c.elem.appendChild(this.cursorElem);
	}

	addMsg(msg: Omit<TerminalMsg, "elem" | "ev">) {
		const elem = document.createElement("span");

		const ev: TerminalEvent[] = [];
		msg.content = msg.content.map(x => x.cloneNode(true));
		elem.replaceChildren(...msg.content);

		const t = (elem: HTMLElement) => {
			for (const e of elem.childNodes) {
				if (e.nodeType == Node.TEXT_NODE) {
					const subs: [RegExp, (match: RegExpMatchArray) => TerminalEvent[]][] = [[
						/\[pause\]/,
						() => [{ type: "pause" }],
					], [
						/\[speed ([\d\\.]+)\]/,
						match => [{ type: "speed", mul: Number.parseFloat(match[1]) }],
					]];

					let txt: TerminalEvent[] = [{ type: "text", content: e.textContent ?? "" }];
					for (const [a, b] of subs) {
						txt = txt.flatMap(v => {
							if (v.type != "text") return [v];

							const out: TerminalEvent[] = [];
							for (;;) {
								const m = v.content.match(a);
								const i = m?.index ?? v.content.length;

								if (i > 0) out.push({ type: "text", content: v.content.slice(0, i) });

								v.content = v.content.slice(i+(m?.[0].length ?? 0));
								if (m) out.push(...b(m));
								else break;
							}

							return out;
						});
					}

					ev.push(...txt);
				} else {
					const start = ev.length;
					ev.push({ type: "start", node: e.cloneNode(false) as HTMLElement });
					t(e as HTMLElement);
					ev.push({ type: "end" });
					if ("delete" in (e as HTMLElement).dataset) {
						const end = ev.length;
						ev.push({ type: "reverse" });
						ev.push(...ev.slice(start, end).map(x => ({ ...x })).reverse());
						ev.push({ type: "reverse" });
					}
				}
			}
		};

		t(elem);
		elem.replaceChildren();

		this.msgs.push({ ...msg, ev, elem });
	}

	renderAll() {
		if (this.interval != undefined) clearInterval(this.interval);
		while (this.current < this.msgs.length) {
			this.update(Number.MAX_VALUE, false);
		}
	}

	private append(content: string | HTMLElement) {
		if (typeof content == "string") {
			this.root.append(document.createTextNode(content));
		} else {
			this.root.append(content);
		}
	}

	[Symbol.dispose]() {
		clearInterval(this.interval);
		this.root.replaceChildren();
	}
}

const StoryContext = createContext(
	undefined as { active: boolean; last: "end" | "chapter" | "next"; next: () => void } | undefined,
);

export const useDisableStoryAnimation = () => useContext(StoryContext)?.active == false;

export function StoryParagraph(
	{ children, end, noCursor, asciiArt }: {
		children?: ComponentChildren;
		asciiArt?: ComponentChildren;
		noCursor?: boolean;
		end?: { type: "choice"; key: string; choices: { value: string; label: ComponentChildren }[] };
	},
) {
	const ref = useRef<HTMLDivElement>(null);
	const src = useRef<HTMLDivElement>(null);

	const noTxtFx = children == undefined || noCursor == true;
	const [done, setDone] = useState(noTxtFx);

	const [choice, setChoice] = useState<string | null>(() => {
		if (end?.key == null) return null;
		return LocalStorage.storyState?.[end?.key] as string | undefined ?? null;
	});

	const [fx, setFx] = useState<TerminalEffect | null>(null);
	useEffect(() => {
		if (!ref.current) return;

		const nfx = new TerminalEffect(ref.current);
		nfx.addMsg({
			type: "server",
			content: [...src.current?.childNodes ?? []],
			rev: false,
			stepMul: 1,
		});

		setFx(nfx);

		return () => nfx[Symbol.dispose]();
	}, []);

	const ctx = useContext(StoryContext)!;

	const [skip, setSkip] = useState(false);
	const isActive = ctx.active && !skip;

	useEffect(() => {
		if (!fx || noTxtFx) return;

		setDone(!isActive);
		fx.onEnd = () => setDone(true);
		if (isActive) fx.start();
		else fx.renderAll();

		const cb = () => setSkip(true);
		document.addEventListener("keypress", cb);
		return () => {
			document.removeEventListener("keypress", cb);
		};
	}, [ctx, setDone, noTxtFx, isActive, fx]);

	const buttonRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		buttonRef.current?.focus({ preventScroll: true });
	}, [done, choice]);

	const skipper = useRef<HTMLDivElement>(null);
	const skipPosition = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		const el = skipper.current, el2 = skipPosition.current;
		if (!el) return;
		if (done || !el2) {
			el.hidden = true;
			return;
		}

		el.hidden = false;
		let pt = performance.now();
		let curTop = el2.offsetTop;
		const frame = () =>
			requestAnimationFrame(t => {
				const c = Math.min(t-pt, 50)/1000*4;
				pt = t;
				curTop = Math.abs(curTop-el2.offsetTop) > 100
					? el2.offsetTop
					: curTop*(1-c)+el2.offsetTop*c;
				el.style.left = `${el2.offsetLeft}px`;
				el.style.width = `${el2.offsetWidth}px`;
				el.style.top = `${curTop}px`;
				f = frame();
			});

		let f = frame();
		return () => cancelAnimationFrame(f);
	}, [done]);

	return <>
		{asciiArt != undefined
			&& <div
				className={twJoin(
					"self-center text-[10px] text-center",
					!isActive && "dark:text-zinc-200",
				)}>
				{asciiArt}
			</div>}

		{noCursor != true && children != undefined && <div hidden ref={src}>{children}</div>}
		{children != undefined
			&& <div key={noCursor} ref={ref}
				className={twJoin(
					!ctx.active && "dark:text-zinc-200",
					"main-text w-full",
					ctx.active && "story-active",
					isActive && "animate-fade-in",
				)}>
				{noCursor == true && children}
			</div>}

		{done && end?.choices
			&& <div className="flex flex-row gap-2 flex-wrap -mb-2">
				{end.choices.map(v =>
					<Button key={v.value} onClick={() => setChoice(v.value)} className={v.value == choice
						? twJoin(
							bgColor.md,
							"dark:hover:border-green-400 dark:border-green-400 theme:disabled:text-inherit",
						)
						: `bg-transparent!`} disabled={!ctx.active}>
						{v.label}
					</Button>
				)}
			</div>}

		{done && (end?.type != "choice" || choice != null)
			&& <div
				className={twJoin(
					"ignore-scroll w-full py-2 flex flex-row justify-center gap-4 items-center",
					ctx.active && "animate-fade-in",
				)}>
				<Divider className="w-auto grow" />
				{ctx.active && (ctx.last == "end"
					? <>
						<Text v="md">The End</Text>
					</>
					: <>
						<button onClick={() => {
							if (end?.type == "choice" && choice != null) {
								LocalStorage.storyState = { ...LocalStorage.storyState, [end.key]: choice };
							}

							ctx.next();
						}} ref={buttonRef} className={anchorStyle}>
							{ctx.last == "chapter" ? "Next chapter" : "Continue"}
						</button>
						<Divider className="w-auto grow" />
					</>)}
			</div>}

		<span className="ignore-scroll w-full" ref={skipPosition} />
		<div className={twJoin(textColor.dimmer, "pt-8 absolute text-center ignore-scroll")} hidden
			ref={skipper}>
			(press any key to skip)
		</div>
	</>;
}

export function RainbowText({ children }: { children: string | string[] }) {
	children = [...Array.isArray(children) ? children.join("") : children];
	return <span className={"rainbow contents"}>
		{children.map((x, i) =>
			<span key={i}
				style={{
					animationDelay: `${i/children.length*7000}ms`,
					color: `hsl(${i/children.length*360}, 100%, 80%)`,
				}}>
				{x}
			</span>
		)}
	</span>;
}

export type Stage = {
	[K in typeof data[number]["key"]]: (typeof data[number]) & { key: K } & (typeof extraData)[K];
}[typeof data[number]["key"]];

export const stages: ReadonlyArray<Stage> = data.map(d => ({ ...d, ...extraData[d.key] } as Stage));

const keyMessages = new Map<string, Message & { i: number }>(
	messages.map((x, i) => [x.key, { ...x, i }]),
);
const today = new Date();

const formatTime = (x: Date) =>
	x.getDate() == today.getDate() && x.getMonth() == today.getMonth()
		? x.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })
		: x.toLocaleString(undefined, {
			hour: "numeric",
			minute: "numeric",
			day: "numeric",
			month: "numeric",
		});

type MessageProps = {
	message: Message & { i: number };
	read: boolean;
	time: Date;
	reply: MessageProps | null;
};

function MessageView({ message, time, reply, inReply }: MessageProps & { inReply?: boolean }) {
	const data = useAsyncEffect<JSX.Element[]>(async () => {
		return new StoryLoader(`message/${message.src}`, false).load();
	}, [message.src]);

	return <div className={twJoin(inReply != true && "py-3 pb-10 grow overflow-y-auto")}>
		<div className="flex flex-col gap-2 items-stretch px-3">
			<div className="flex flex-row justify-between">
				<Text v="md">{message.subject}</Text>
				<Text v="dim">{formatTime(time)}</Text>
			</div>
			<Text v="sm" className="flex flex-row gap-1 items-center -ml-0.5">
				{message.to != undefined && <Text v="dim">From:</Text>}
				<IconUserCircle /> {message.from}
				{message.to != undefined && <>
					<Text v="dim">To:</Text>
					<IconUserCircle /> {message.to}
				</>}
			</Text>
		</div>
		<Divider />
		<div className="px-3 flex flex-col gap-2">
			{data.result}
			{reply && <div className={twJoin("pl-1 border-l-2", borderColor.blue)}>
				<MessageView {...reply} inReply={true} />
			</div>}
		</div>
	</div>;
}

const getMessage = (x: string, read: boolean): MessageProps | null => {
	const v = keyMessages.get(x);
	const t = LocalStorage.seenMessages?.get(x);
	const rep = v?.replyTo == undefined ? null : getMessage(v.replyTo, true);
	if (!v || t == undefined) return null;
	return { message: v, read, time: new Date(t), reply: rep };
};

export function Messages({ stage }: { stage: StageData }) {
	const [messageList, setMessages] = useState<MessageProps[]>(() => {
		return [...LocalStorage.seenMessages?.keys() ?? []].map(x => getMessage(x, true)).filter((
			x,
		): x is MessageProps => x != null).sort((a, b) => b.message.i-a.message.i);
	});

	const initCheck = useRef(false);
	const [activeMessage, setActiveMessage] = useState<(typeof messageList)[number] | null>(null);
	const numUnread = useMemo(() => messageList.reduce((a, b) => a+(b.read ? 0 : 1), 0), [
		messageList,
	]);

	useEffect(() => {
		const keyToStageI = new Map<string, number>(data.map((x, i) => [x.key, i]));
		const curI = keyToStageI.get(stage.key)!;
		const curMessages = new Set(messageList.map(x => x.message.key));
		const available: Message[] = messages.filter(msg => {
			const si = keyToStageI.get(msg.minStageKey);
			return si != null && curI >= si && !curMessages.has(msg.key);
		});

		const check = () => {
			const t = new Date();
			let seen = LocalStorage.seenMessages ?? new Map();
			for (const msg of available) {
				if (msg.sequelTo != undefined && !seen.has(msg.sequelTo)) continue;

				const p = msg.expectedMinutes <= 1e-4 || import.meta.env["VITE_ALL_COMPLETED"] == "1"
					? 1
					: -Math.expm1(-1/msg.expectedMinutes);
				if (Math.random() < p) {
					seen = LocalStorage.seenMessages = mapWith(seen, msg.key, t.getTime());
					const msgProps = getMessage(msg.key, false);
					if (msgProps) setMessages(msgs => [msgProps, ...msgs]);
				}
			}
		};

		if (!initCheck.current) {
			check();
			initCheck.current = true;
		}
		const int = setInterval(check, 60*1000);
		return () => clearInterval(int);
	}, [messageList, stage.key]);

	const [open, setOpen] = useState(false);

	return <>
		<Modal open={open} onClose={() => setOpen(false)} title="Mail" className="pb-0 theme:max-w-3xl">
			<div className="flex flex-row items-stretch -mt-2 -mx-5 min-h-0">
				<div className="flex flex-col basis-1/3 min-h-20 overflow-y-auto shrink-0 items-stretch pb-5">
					{messageList.map((msg, i) =>
						<button key={msg.message.key}
							className={twJoin(
								"flex flex-row gap-3 border-b-1 p-4 items-start justify-stretch",
								borderColor.divider,
								msg == activeMessage ? bgColor.secondary : bgColor.hover,
							)} disabled={msg == activeMessage} onClick={() => {
							const nmsg = { ...msg, read: true };
							setMessages(messageList.toSpliced(i, 1, nmsg));
							setActiveMessage(nmsg);
						}}>
							{!msg.read
								&& <div
									className={twJoin(
										"animate-pulse rounded-full mt-2 h-4 w-4 aspect-square",
										bgColor.sky,
									)} />}
							<div className="flex flex-col gap-1 text-left grow items-stretch">
								<Text v="lg">{msg.message.subject}</Text>
								<Text v="sm" className="flex flex-row gap-1 items-center mt-1">
									<IconUserCircle /> {msg.message.from}
									<Text v="dim" className="pt-1 text-xs ml-auto flex flex-col shrink-0">
										{formatTime(msg.time).split(", ").map((x, i) => <span key={i}>{x}</span>)}
									</Text>
								</Text>
							</div>
						</button>
					)}
				</div>

				<Divider className="w-px h-auto my-0" />

				{activeMessage
					? <MessageView {...activeMessage} />
					: <div className="flex place-content-center p-4 grow">
						<Text v="dim">No message selected</Text>
					</div>}
			</div>
		</Modal>

		<IconButton icon={<IconMailFilled />} className={twJoin("relative", open && bgColor.highlight2)}
			onClick={() => {
				setOpen(true);
			}}>
			{numUnread > 0
				&& <Text v="sm"
					className={twJoin(
						"absolute -top-1 -right-4 place-content-center rounded-full h-6 w-6 animate-bounce",
						bgColor.red,
					)}>
					{numUnread}
				</Text>}
		</IconButton>
	</>;
}

export function Story({ stage, next }: { stage: Stage & { type: "story" }; next?: () => void }) {
	const para = useAsyncEffect<JSX.Element[]>(() => {
		return new StoryLoader(stage.src, true).load();
	}, [stage.src]).result;

	const [index, setIndex] = useState<number | null>(null);
	useEffect(() => {
		if (para != null) {
			setIndex(Math.min(LocalStorage.storyParagraph?.[stage.key] ?? 0, para.length-1));
		}
	}, [para, stage.key]);

	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (index == null || para == null) return;
		if (index >= para.length) next?.();
		else LocalStorage.storyParagraph = { ...LocalStorage.storyParagraph, [stage.key]: index };
	}, [index, next, stage.key, para]);

	const mounted = para != null && index != null;
	useEffect(() => {
		if (!mounted) return;

		const container = containerRef.current!;
		const scroll = document.scrollingElement;

		let scrollLocked = true;
		let setScrollTo = -1;

		let animFrame: number;
		let lt = performance.now();

		let prevChild: HTMLElement | null = null;
		let curDelay = 0;
		const childChangeDelay = 100;

		let ignoreScrollEvent = true;
		const animateScroll = () =>
			requestAnimationFrame((t: number) => {
				const dt = Math.min(t-lt, 50);
				let doScroll = true;
				if ((curDelay -= dt) > 0) doScroll = false;

				const lastChild = [...container.children].findLast(x =>
					!x.classList.contains("ignore-scroll")
				) as HTMLElement | null;

				if (prevChild != lastChild) {
					curDelay = childChangeDelay;
					prevChild = lastChild;
					doScroll = false;
				}

				if (scroll && scrollLocked && lastChild && doScroll) {
					const targetScrollTop = lastChild.clientHeight > scroll.clientHeight*0.8
						? scroll.scrollHeight-scroll.clientHeight
						: Math.max(0, lastChild.offsetTop+lastChild.clientHeight/2-scroll.clientHeight/2);

					const d = targetScrollTop-scroll.scrollTop;
					const ntop = Math.max(
						1,
						scroll.scrollTop+(Math.abs(d) < 2
							? d
							: dt*(ignoreScrollEvent ? d*20 : Math.sqrt(Math.abs(d))*Math.sign(d)*20)/1000),
					);
					scroll.scrollTo({ top: ntop, behavior: "instant" });
					setScrollTo = scroll.scrollTop;
				}

				lt = t;
				animFrame = animateScroll();
			});

		animFrame = animateScroll();

		const tm = setTimeout(() => {
			ignoreScrollEvent = false;
		}, 500);

		const cb = () => {
			if (!ignoreScrollEvent && scroll != null && Math.abs(scroll.scrollTop-setScrollTo) > 2) {
				scrollLocked = scroll.scrollTop > scroll.scrollHeight-scroll.clientHeight-75;
			}
		};

		cb();
		document.addEventListener("scroll", cb);
		return () => {
			clearTimeout(tm);
			cancelAnimationFrame(animFrame);
			document.removeEventListener("scroll", cb);
		};
	}, [mounted]);

	const paraNext = useCallback(() => setIndex(i => i!+1), []);

	if (index == null || para == null) return <></>;
	return <div
		className="mt-5 flex flex-col gap-2 justify-start items-start max-w-2xl grow story-container"
		ref={containerRef}>
		<div className="flex flex-row self-stretch justify-between gap-2 items-center">
			<div className="flex flex-col gap-1 mb-4">
				<Text v="big">{stage.name}</Text>
				<i>{stage.blurb}</i>
			</div>
			<div className="flex flex-row gap-2 items-end shrink-0">
				<Anchor className={textColor.dim} onClick={() => setIndex(para.length)}>
					Skip chapter
				</Anchor>
				{index > 0 && <>
					<Divider vert />
					<Anchor className={textColor.dim} onClick={() => setIndex(0)}>Reset chapter</Anchor>
				</>}
			</div>
		</div>

		{para.slice(0, index+1).map((v, i) =>
			<Fragment key={i}>
				<StoryContext.Provider
					value={{
						active: index == i,
						last: i == para.length-1 ? (next == undefined ? "end" : "chapter") : "next",
						next: paraNext,
					}}>
					{v}
				</StoryContext.Provider>
			</Fragment>
		)}
	</div>;
}
