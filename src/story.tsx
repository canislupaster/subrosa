import { ComponentChildren, createContext, Fragment } from "preact";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { bgColor, Button, LocalStorage, Text, Divider, anchorStyle, Anchor, textColor, IconButton, borderColor, mapWith, Modal } from "./ui";
import { data } from "../shared/data";
import { extraData, Message, messages } from "./data";
import { IconMailFilled, IconUserCircle } from "@tabler/icons-preact";
import { twJoin } from "tailwind-merge";

export function useStoryState<T=string>(key: string) {
	const [x, setX] = useState<T>();
	useEffect(()=>{ setX(LocalStorage.storyState?.[key] as T|undefined); }, [key]);
	return [x, useCallback((newX: T)=>{
		LocalStorage.storyState = {...LocalStorage.storyState, [key]: newX as unknown};
		setX(newX);
	}, [key])] as const;
}

type TerminalEvent = {
	type: "end"
} | {
	type: "start", node: HTMLElement
} | {
	type: "text", content: string
} | {
	type: "reverse"
} | {
	type: "pause"
} | {
	type: "step", mul: number
};

type TerminalMsg = {
	ev: TerminalEvent[],
	type: "server",
	content: Node[],
	elem: HTMLElement,
	stepMul: number,
	rev: boolean
};

class TerminalEffect {
	cursorElem: HTMLElement | null = null;
	msgs: TerminalMsg[] = [];
	current: number = -1;
	interval: number|undefined;

	step = 15;
	wait = 30;
	inPause = -1;

	constructor(private root: HTMLElement, private render: boolean) {
    if (!render) this.interval = setInterval(()=>this.update(), 50);
	}

	onEnd?: ()=>void;

	update(step: number=this.step, wait: number=this.wait) {
		if (this.current >= this.msgs.length || --this.inPause > 0) {
			return;
		}

		if (this.cursorElem) this.cursorElem.remove();

		const c = this.current>=this.msgs.length ? null : this.msgs[this.current];
		let writing=false;
		if (this.current != -1 && c && c.ev.length > 0) {
			let eaten = 0;
			const step2 = Math.ceil(Math.max(0.01,c.stepMul)*step);
			while (eaten < step2 && c.ev.length > 0) {
				const ev = c.ev[0];
				if (ev.type == "text") {
					writing=true;
					const len = Math.min(step2 - eaten, ev.content.length);
					if (c.rev) {
						for (let i=0; i<len; ) {
							const el = c.elem.lastElementChild!;
							const l = el.textContent!.length;
							const d = len-i;
							if (d>=l) el.remove();
							else el.textContent = el.textContent!.slice(0, l-d);
							i+=Math.min(d,l);
						}
					} else {
						const subspan = document.createElement("span");
						subspan.classList.add(this.render ? "text-bit-render" : "text-bit");
						subspan.textContent = ev.content.slice(0, len);

						c.elem.append(subspan);
					}

					ev.content = ev.content.slice(len);
					if (ev.content.length == 0) c.ev.shift();
					eaten += len;
				} else if (ev.type == "pause") {
					c.ev.shift();
					if (!c.rev) {
						this.inPause = wait;
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
					writing=false;
				} else if (ev.type=="reverse") {
					c.rev=!c.rev;
					c.ev.shift();
				} else if (ev.type=="step") {
					c.stepMul = ev.mul;
					c.ev.shift();
				}
			}

			if (c.ev.length == 0) this.inPause = wait;
		}

		let skip=false;
		if (this.inPause <= 0 && (this.current == -1 || (c && c.ev.length == 0))) {
			this.current++;

			skip=true;
			if (this.current < this.msgs.length) this.append(this.msgs[this.current].elem);
			else this.onEnd?.();
		}

		if (skip) this.append("\n");

		if (this.render || this.current>=this.msgs.length || !c || !writing) return;

		this.cursorElem = document.createElement("span");
		this.cursorElem.classList.add("cursor");

		c.elem.appendChild(this.cursorElem);
	}

	addMsg(msg: Omit<TerminalMsg, "elem"|"ev">) {
		const elem = document.createElement("span");

		const ev: TerminalEvent[] = [];
		msg.content = msg.content.map(x=>x.cloneNode(true));
		elem.replaceChildren(...msg.content);

		const t = (elem: HTMLElement) => {
			for (const e of elem.childNodes) {
				if (e.nodeType == Node.TEXT_NODE) {
					const subs: [RegExp, (match: RegExpMatchArray)=>TerminalEvent[]][] = [
						[/\[pause\]/, ()=>[{ type: "pause" }]],
						[/\[step ([\d\\.]+)\]/, (match)=>[{ type: "step", mul: Number.parseFloat(match[1]) }]]
					];

					let txt: TerminalEvent[] = [ {type: "text", content: e.textContent ?? ""} ];
					for (const [a,b] of subs) txt=txt.flatMap(v=>{
						if (v.type!="text") return [v];

						const out: TerminalEvent[] = [];
						for (;;) {
							const m = v.content.match(a);
							const i = m?.index ?? v.content.length;
							if (i > 0) {
								out.push({type: "text", content: v.content.slice(0,i)});
								v.content=v.content.slice(i+(m?.[0].length ?? 0));
							}

							if (m) out.push(...b(m));
							else break;
						}
						
						return out;
					});
					
					ev.push(...txt);
				} else {
					const start = ev.length;
					ev.push({ type: "start", node: e.cloneNode(false) as HTMLElement });
					t(e as HTMLElement);
					ev.push({ type: "end" });
					if ("delete" in (e as HTMLElement).dataset) {
						const end = ev.length;
						ev.push({ type: "reverse" });
						ev.push(...ev.slice(start,end).map(x=>({...x})).reverse());
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
		if (this.interval!=undefined) clearInterval(this.interval);
		while (this.current<this.msgs.length) {
			this.update(Number.MAX_VALUE, 0);
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

const StoryContext = createContext(undefined as {
	active: boolean, last: "end"|"chapter"|"next", next: ()=>void
}|undefined);

export const useDisableStoryAnimation = ()=>useContext(StoryContext)?.active==false;

export function StoryParagraph({ children, end, noCursor, asciiArt }: {
	children?: ComponentChildren,
	asciiArt?: ComponentChildren,
	noCursor?: boolean,
	end?: {
		type: "choice", key: string, choices: {
			value: string, label: ComponentChildren
		}[]
	}
}) {
	console.log(children);
	const ref = useRef<HTMLDivElement>(null);
	const src = useRef<HTMLDivElement>(null);
	const [done, setDone] = useState(noCursor==true);
	const [choice, setChoice] = useState<string|null>(()=>{
		if (end?.key==null) return null;
		return LocalStorage.storyState?.[end?.key] as string|undefined ?? null;
	});

	const ctx = useContext(StoryContext)!;

	const [skip, setSkip] = useState(false);
	const isActive = ctx.active && !skip;

	const noTxtFx = children==undefined || noCursor==true;
	useEffect(()=>{
		if (!ref.current || noTxtFx) {
			setDone(true);
			return;
		}

		const fx = new TerminalEffect(ref.current, !isActive);
		setDone(!isActive);
		fx.onEnd = ()=>setDone(true);
		fx.addMsg({ type: "server", content: [...src.current?.childNodes ?? []], rev: false, stepMul: 1 });
		if (!isActive) fx.renderAll();
		
		const cb = ()=>setSkip(true);
		document.addEventListener("keypress", cb);
		return ()=>{
			document.removeEventListener("keypress", cb);
			fx[Symbol.dispose]();
		};
	}, [ctx, setDone, noTxtFx, isActive]);
	
	const buttonRef = useRef<HTMLButtonElement>(null);
	useEffect(()=>{
		buttonRef.current?.focus({preventScroll: true});
	}, [done, choice]);

	return <>
		{asciiArt!=undefined && <pre className={twJoin("self-center text-[10px] text-center", !ctx.active && "dark:text-zinc-200")} >
			{asciiArt}
		</pre>}

		{noCursor!=true && children!=undefined && <div hidden ref={src} >{children}</div>}
		{children!=undefined && <div key={noCursor} ref={ref} className={twJoin(!ctx.active && "dark:text-zinc-200", "main-text w-full", ctx.active && !skip && "animate-fade-in")} >
			{noCursor==true && children}
		</div>}

		{done && end?.choices && <div className="flex flex-row gap-2 flex-wrap -mb-2" >
			{end.choices.map(v=>
				<Button key={v.value} onClick={()=>setChoice(v.value)} className={
					v.value==choice ? twJoin(
						bgColor.md, "dark:hover:border-green-400 dark:border-green-400 theme:disabled:text-inherit"
					) : `bg-transparent!`
				} disabled={!ctx.active} >{v.label}</Button>
			)}
		</div>}
		
		{done && (end?.type!="choice" || choice!=null) && <div className={twJoin("ignore-scroll w-full py-2 flex flex-row justify-center gap-4 items-center", ctx.active && "animate-fade-in")} >
			<Divider className="w-auto grow" />
			{ctx.active && (ctx.last=="end" ? <>
				<Text v="md" >The End</Text>
			</> : <>
				<button onClick={()=>{
					if (end?.type=="choice" && choice!=null) {
						LocalStorage.storyState = {
							...LocalStorage.storyState,
							[end.key]: choice
						};
					}

					ctx.next();
				}} ref={buttonRef} className={anchorStyle} >
					{ ctx.last=="chapter" ? "Next chapter" : "Continue" }
				</button>
				<Divider className="w-auto grow" />
			</>)}
		</div>}
	</>;
}

export type Stage = {
	[K in typeof data[number]["key"]]: (typeof data[number])&{key: K}&(typeof extraData)[K]
}[typeof data[number]["key"]];

export const stages: ReadonlyArray<Stage> = data.map(d=>({
	...d, ...extraData[d.key]
} as Stage));

const keyMessages = new Map<string, Message>(messages.map(x=>[x.key, x]));
const today = new Date();

const formatTime = (x: Date)=>
	x.getDate()==today.getDate() && x.getMonth()==today.getMonth()
		? x.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })
		: x.toLocaleString(undefined, { hour: "numeric", minute: "numeric", day: "numeric", month: "numeric" });
		
type MessageProps = {
	message: Message, read: boolean, time: Date,
	reply: MessageProps|null
};

function MessageView({ message, time, reply, inReply }: MessageProps&{inReply?: boolean}) {
	return <div className={twJoin(inReply!=true && "py-3 pb-10 grow overflow-y-auto")} >
		<div className="flex flex-col gap-2 items-stretch px-3" >
			<div className="flex flex-row justify-between" >
				<Text v="md" > {message.subject} </Text>
				<Text v="dim" >{formatTime(time)}</Text>
			</div>
			<Text v="sm" className="flex flex-row gap-1 items-center -ml-0.5" >
				{message.to!=undefined && <Text v="dim" >From:</Text>}
				<IconUserCircle /> {message.from}
				{message.to!=undefined && <>
					<Text v="dim" >To:</Text>
					<IconUserCircle /> {message.to}
				</>}
			</Text>
		</div>
		<Divider />
		<div className="px-3 flex flex-col gap-2" >
			{message.content}
			{reply && <div className={twJoin("pl-1 border-l-2", borderColor.blue)} >
				<MessageView {...reply} inReply={true} />
			</div>}
		</div>
	</div>;
}

const getMessage = (x: string): MessageProps|null=>{
	const v = keyMessages.get(x);
	const t = LocalStorage.seenMessages?.get(x);
	const rep = v?.replyTo==undefined ? null : getMessage(v.replyTo);
	if (!v || t==undefined) return null;
	return {
		message: v, read: true, time: new Date(t), reply: rep
	};
};

export function Messages({ stage }: { stage: Stage }) {
	const [messageList, setMessages] = useState<MessageProps[]>(()=>{
		return [...LocalStorage.seenMessages?.keys() ?? []].map(getMessage)
			.filter((x): x is MessageProps=>x!=null);
	});

	const initCheck = useRef(false);
	const [activeMessage, setActiveMessage] = useState<(typeof messageList)[number]|null>(null);
	const numUnread = useMemo(()=>messageList.reduce((a,b)=>a+(b.read ? 0 : 1),0), [messageList]);
	
	useEffect(()=>{
		const keyToStageI = new Map(data.map((x,i)=>[x.key, i]));
		const curI = keyToStageI.get(stage.key)!;
		const curMessages = new Set(messageList.map(x=>x.message.key));
		const available: Message[] = messages.filter(msg=>{
			const si = keyToStageI.get(msg.minStageKey);
			return si!=null && curI>=si && !curMessages.has(msg.key);
		});
		
		const check = ()=>{
			const t = new Date();
			for (const msg of available) {
				const p = msg.expectedMinutes<=1e-4 ? 1 : 1-Math.exp(-1/msg.expectedMinutes);
				if (Math.random()<p) {
					LocalStorage.seenMessages = mapWith(LocalStorage.seenMessages??null, msg.key, t.getTime());
					const msgProps = getMessage(msg.key);
					if (msgProps) setMessages(msgs=>[msgProps, ...msgs]);
				} else {
					break; // messages arrive in order
				}
			}
		};

		if (!initCheck.current) { check(); initCheck.current=true; }
		const int = setInterval(check, 60*1000);
		return ()=>clearInterval(int);
	}, [messageList, stage.key]);

	const [open, setOpen] = useState(false);
	
	return <>
		<Modal open={open} onClose={()=>setOpen(false)} title="Mail" className="pb-0" >
			<div className="flex flex-row items-stretch -mt-2 -mx-6 min-h-0" >
				<div className="flex flex-col basis-1/3 min-h-20 overflow-y-auto shrink-0 items-stretch pb-5" >
					{messageList.map((msg,i)=><button key={msg.message.key} className={twJoin("flex flex-row gap-3 border-b-1 p-4 items-start justify-stretch", borderColor.default, msg==activeMessage ? bgColor.secondary : bgColor.hover)} disabled={msg==activeMessage} onClick={()=>{
						const nmsg = {...msg, read: true};
						setMessages(messageList.toSpliced(i, 1, nmsg));
						setActiveMessage(nmsg);
					}} >
						{!msg.read && <div className={twJoin("animate-pulse rounded-full mt-2 h-4 w-4 aspect-square", bgColor.sky)} />}
						<div className="flex flex-col gap-1 text-left grow items-stretch" >
							<Text v="lg" >{msg.message.subject}</Text>
							<Text v="sm" className="flex flex-row gap-1 items-center mt-1 ml-1" >
								<IconUserCircle /> {msg.message.from}
								<Text v="dim" className="pt-1 ml-auto" >{formatTime(msg.time)}</Text>
							</Text>
						</div>
					</button>)}
				</div>

				<Divider className="w-px h-auto my-0" />
				
				{activeMessage ? <MessageView {...activeMessage} />
					: <div className="flex place-content-center p-4 grow" >
						<Text v="dim" >No message selected</Text>
					</div>}
			</div>
		</Modal>

		<IconButton icon={<IconMailFilled />} className={twJoin("relative", open && bgColor.highlight2)} onClick={()=>{
			setOpen(true);
		}} >
			{numUnread>0 && <Text v="sm" className={twJoin("absolute -top-1 -right-4 place-content-center rounded-full h-6 w-6 animate-bounce", bgColor.red)} >{numUnread}</Text>}
		</IconButton>
	</>;
}

export function Story({stage, next, para}: {
	stage: Stage&{type:"story"}, next?: ()=>void,
	para: ComponentChildren[]
}) {
	const [index, setIndex] = useState(()=>{
		return LocalStorage.storyParagraph?.[stage.key] ?? 0;
	});

	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(()=>{
		if (index>=para.length) next?.();
		else LocalStorage.storyParagraph = {
			...LocalStorage.storyParagraph, [stage.key]: Math.min(index)
		};
	}, [index, next, stage.key, para.length]);

	useEffect(()=>{
		const container = containerRef.current!;
		const scroll = document.scrollingElement;

		let scrollLocked = true;
		let setScrollTo=-1;

		let animFrame: number;
		let lt = performance.now();
		const animateScroll = ()=>requestAnimationFrame((t: number)=>{
			const dt = Math.min(t-lt, 50);
			const lastChild = [...container.children]
				.findLast(x=>!x.classList.contains("ignore-scroll")) as HTMLElement|null;

			if (scroll && scrollLocked && lastChild) {
				const targetScrollTop = lastChild.clientHeight > scroll.clientHeight*0.8
					? scroll.scrollHeight - scroll.clientHeight
					: Math.max(0,lastChild.offsetTop + lastChild.clientHeight/2 - scroll.clientHeight/2);

				const d = targetScrollTop-scroll.scrollTop;
				const ntop = Math.max(1,scroll.scrollTop + (Math.abs(d)<2 ? d : d*dt*3/1000));
				scroll.scrollTo({top: ntop, behavior: "instant"});
				setScrollTo = scroll.scrollTop;
			}

			lt=t;
			animFrame=animateScroll();
		});

		animFrame=animateScroll();

		let ignoreScrollEvent = true;
		const tm = setTimeout(()=>{ignoreScrollEvent=false;}, 250);

		const cb = ()=>{
			if (!ignoreScrollEvent && scroll!=null && Math.abs(scroll.scrollTop-setScrollTo)>2) {
				scrollLocked = scroll.scrollTop > scroll.scrollHeight - scroll.clientHeight - 75;
			}
		};

		cb();
		document.addEventListener("scroll", cb);
		return ()=>{
			clearTimeout(tm);
			cancelAnimationFrame(animFrame);
			document.removeEventListener("scroll", cb);
		};
	}, []);

	return <div className="mt-5 flex flex-col gap-2 justify-start items-start max-w-2xl grow story-container"
		ref={containerRef} >

		<div className="flex flex-row self-stretch justify-between gap-2 items-center" >
			<Text v="big" className="my-4" >{stage.name}</Text>
			<div className="flex flex-row gap-2 items-end" >
				<Anchor className={textColor.dim} onClick={()=>setIndex(para.length)} >Skip chapter</Anchor>
				{index>0 && <>
					<Divider vert />
					<Anchor className={textColor.dim} onClick={()=>setIndex(0)} >Reset chapter</Anchor>
				</>}
			</div>
		</div>

		{para.slice(0, index+1).map((v,i)=><Fragment key={i} >
			<StoryContext.Provider value={{
				active: index==i, last: next==undefined ? "end"
					: i==para.length-1 ? "chapter" : "next",
				next() { setIndex(i=>i+1); },
			}} >
				{v}
			</StoryContext.Provider>
		</Fragment>)}
	</div>;
}