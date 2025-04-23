import { ComponentChildren, createContext, Fragment } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { bgColor, Button, LocalStorage, Text, Divider, anchorStyle, Anchor, textColor } from "./ui";
import clsx from "clsx";
import { data } from "../shared/data";
import { extraData } from "./data";

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
	type: "pause"
};

type TerminalMsg = {
	ev: TerminalEvent[],
	type: "server",
	content: Node[],
	elem: HTMLElement
};

class TerminalEffect {
	cursorElem: HTMLElement | null = null;
	msgs: TerminalMsg[] = [];
	current: number = -1;
	interval: number|undefined;

	step = 15;
	wait = 3;
	inPause = -1;

	constructor(private root: HTMLElement, private render: boolean) {
    if (!render) this.interval = setInterval(()=>this.update(), 50);
	}

	moveCursor(show: boolean) {
		if (this.cursorElem) this.cursorElem.remove();
		if (this.render || this.current>=this.msgs.length || !show) return;

		this.cursorElem = document.createElement("span");
		this.cursorElem.classList.add("cursor");

		this.msgs[this.current].elem.appendChild(this.cursorElem);
	}
	
	onEnd?: ()=>void;

	update(step: number=this.step, wait: number=this.wait) {
		if (this.current >= this.msgs.length || --this.inPause > 0) {
			return;
		}

		let writing = false;
		if (this.current != -1 && this.msgs[this.current].ev.length > 0) {
			let eaten = 0;
			while (eaten < step && this.msgs[this.current].ev.length > 0) {
				const ev = this.msgs[this.current].ev[0];
				if (ev.type == "text") {
					const len = Math.min(step - eaten, ev.content.length);
					const subspan = document.createElement("span");
					subspan.classList.add(this.render ? "text-bit-render" : "text-bit");
					subspan.textContent = ev.content.slice(0, len);

					this.msgs[this.current].elem.append(subspan);
					ev.content = ev.content.slice(len);
					if (ev.content.length == 0) this.msgs[this.current].ev.shift();
					eaten += len;
					writing=true;
				} else if (ev.type == "pause") {
					this.inPause = wait;
					this.msgs[this.current].ev.shift();
					break;
				} else if (ev.type == "start") {
					this.msgs[this.current].elem.appendChild(ev.node);
					this.msgs[this.current].elem = ev.node;
					this.msgs[this.current].ev.shift();
				} else if (ev.type == "end") {
					this.msgs[this.current].elem = this.msgs[this.current].elem.parentElement!;
					this.msgs[this.current].ev.shift();
					writing=false;
				}
			}

			if (this.msgs[this.current].ev.length == 0) this.inPause = wait;
		}

		let skip=false;
		if (this.inPause <= 0 && (this.current == -1 || this.msgs[this.current].ev.length == 0)) {
			this.current++;

			skip=true;
			if (this.current < this.msgs.length) this.append(this.msgs[this.current].elem);
			else this.onEnd?.();
		}

		if (skip) this.append("\n");
		this.moveCursor(writing);
	}

	addMsg(msg: Omit<TerminalMsg, "elem"|"ev">) {
		const elem = document.createElement("span");

		const ev: TerminalEvent[] = [];
		msg.content = msg.content.map(x=>x.cloneNode(true));
		elem.replaceChildren(...msg.content);

		const t = (elem: HTMLElement) => {
			for (const e of elem.childNodes) {
				if (e.nodeType == Node.TEXT_NODE) {
					ev.push(
						...e.textContent!.split("[pause]")
							.map(x=>({ type: "text", content: x } as const))
							.reduce((a,b): TerminalEvent[] =>
								(a.length > 0 ? [...a, { type: "pause" }, b] : [b]),
								[] as TerminalEvent[]
							)
					);
				} else {
					ev.push({ type: "start", node: e.cloneNode(false) as HTMLElement });
					t(e as HTMLElement);
					ev.push({ type: "end" });
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

const StoryContext = createContext(undefined as unknown as {
	active: boolean, last: "end"|"chapter"|"next", next: ()=>void
});

export function StoryParagraph({ children, end, noCursor, asciiArt }: {
	children?: ComponentChildren,
	asciiArt?: string,
	noCursor?: boolean,
	end?: {
		type: "choice", key: string, choices: {
			value: string, label: ComponentChildren
		}[]
	}
}) {
	const ref = useRef<HTMLDivElement>(null);
	const src = useRef<HTMLDivElement>(null);
	const [done, setDone] = useState(noCursor==true);
	const [choice, setChoice] = useState<string|null>(null);
	const ctx = useContext(StoryContext);

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
		fx.addMsg({ type: "server", content: [...src.current?.childNodes ?? []] });
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
		buttonRef.current?.focus();
	}, [done, choice]);

	return <>
		{asciiArt!=undefined && <pre className={clsx("self-center text-[10px] text-center", !ctx.active && "dark:text-zinc-200")} >
			{asciiArt}
		</pre>}

		{noCursor!=true && children!=undefined && <div hidden ref={src} >{children}</div>}
		{children!=undefined && <div key={noCursor} ref={ref} className={clsx(!ctx.active && "dark:text-zinc-200", "main-text w-full", ctx.active && !skip && "animate-fade-in")} >
			{noCursor==true && children}
		</div>}

		{done && end?.choices && <div className="flex flex-row gap-2 flex-wrap" >
			{end.choices.map(v=>
				<Button key={v.value} onClick={()=>setChoice(v.value)} className={
					v.value==choice ? clsx(bgColor.secondary, "dark:hover:border-green-400 dark:border-green-400 dark:disabled:bg-zinc-900") : `theme:bg-transparent`
				} disabled={!ctx.active} >{v.label}</Button>
			)}
		</div>}
		
		{done && (end?.type!="choice" || choice!=null) && <div className={clsx("ignore-scroll w-full py-2 flex flex-row justify-center gap-4 items-center", ctx.active && "animate-fade-in")} >
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

export function Story({stage, next}: {stage: Stage&{type:"story"}, next?: ()=>void}) {
	const [index, setIndex] = useState(()=>{
		return LocalStorage.storyParagraph?.[stage.key] ?? 0;
	});

	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(()=>{
		if (index>=stage.para.length) next?.();
		else LocalStorage.storyParagraph = {
			...LocalStorage.storyParagraph, [stage.key]: Math.min(index)
		};
	}, [index, next, stage.key, stage.para.length]);

	useEffect(()=>{
		const container = containerRef.current!;
		const scroll = document.scrollingElement;

		let scrollLocked = true;
		let setScrollTo=-1;

		let animFrame: number;
		let lt = performance.now();
		const animateScroll = ()=>requestAnimationFrame((t: number)=>{
			const dt = t-lt;
			const lastChild = [...container.children]
				.findLast(x=>!x.classList.contains("ignore-scroll")) as HTMLElement|null;

			if (scroll && scrollLocked && lastChild) {
				const targetScrollTop = lastChild.clientHeight > scroll.clientHeight*0.8
					? scroll.scrollHeight - scroll.clientHeight
					: Math.max(0,lastChild.offsetTop + lastChild.clientHeight/2 - scroll.clientHeight/2);

				const d = targetScrollTop-scroll.scrollTop;
				scroll.scrollTop = scroll.scrollTop + (Math.abs(d)<5 ? d : d*dt*3/1000);
				setScrollTo = scroll.scrollTop;
			}

			lt=t;
			animFrame=animateScroll();
		});

		animFrame=animateScroll();

		let ignoreScrollEvent = true;
		const tm = setTimeout(()=>{ignoreScrollEvent=false;}, 250);

		const cb = ()=>{
			if (!ignoreScrollEvent && scroll!=null && scroll.scrollTop!=setScrollTo) {
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

	return <div className="flex flex-col gap-2 justify-start items-start max-w-2xl grow story-container"
		ref={containerRef} >

		<div className="flex flex-row self-stretch justify-between gap-2 items-center" >
			<Text v="big" className="my-4" >{stage.name}</Text>
			<Anchor className={textColor.dim} onClick={()=>setIndex(0)} >Reset chapter</Anchor>
		</div>

		{stage.para.slice(0, index+1).map((v,i)=><Fragment key={i} >
			<StoryContext.Provider value={{
				active: index==i, last: next==undefined ? "end"
					: i==stage.para.length-1 ? "chapter" : "next",
				next() { setIndex(i=>i+1); },
			}} >
				{v}
			</StoryContext.Provider>
		</Fragment>)}
	</div>;
}