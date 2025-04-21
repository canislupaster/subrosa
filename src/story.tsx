import { ComponentChild, ComponentChildren, createContext, Fragment } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { Anchor, bgColor, Button, LocalStorage, useDisposable, Text, Divider, textColor } from "./ui";
import clsx from "clsx";
import { Puzzle } from "./puzzles";

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

	step = 8;
	wait = 3;
	inPause = -1;

	constructor(private root: HTMLElement, private render: boolean) {
    if (!render) this.interval = setInterval(()=>this.update(), 50);
	}

	moveCursor() {
		if (this.cursorElem) this.cursorElem.remove();
		if (this.render || this.current>=this.msgs.length) return;

		this.cursorElem = document.createElement("span");
		this.cursorElem.textContent = "█";
		this.cursorElem.style.width="0";
		// this.cursorElem.classList.add("cursor");
		this.cursorElem.classList.add("blink");

		this.msgs[this.current].elem.appendChild(this.cursorElem);
	}
	
	onEnd?: ()=>void;

	update(step: number=this.step, wait: number=this.wait) {
		if (this.current >= this.msgs.length || --this.inPause > 0) {
			return;
		}

		if (this.current != -1 && this.msgs[this.current].ev.length > 0) {
			let eaten = 0;
			while (eaten < step && this.msgs[this.current].ev.length > 0) {
				const ev = this.msgs[this.current].ev[0];
				if (ev.type == "text") {
					const len = Math.min(step - eaten, ev.content.length);
					this.msgs[this.current].elem.append(ev.content.slice(0, len));
					ev.content = ev.content.slice(len);
					if (ev.content.length == 0) this.msgs[this.current].ev.shift();
					eaten += len;
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
				}
			}

			if (this.msgs[this.current].ev.length == 0) this.inPause = wait;
		}

		let skip=false;
		while (this.current < this.msgs.length && this.inPause <= 0 && (this.current == -1 || this.msgs[this.current].ev.length == 0)) {
			this.current++;

			skip=true;
			if (this.current < this.msgs.length) this.append(this.msgs[this.current].elem);
			else this.onEnd?.();
		}

		if (skip) this.append("\n");
		this.moveCursor();
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

export function StoryParagraph({ children, end, noCursor }: {
	children?: ComponentChildren,
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

	useDisposable(()=>{
		if (!ref.current || noCursor==true) return;

		const fx = new TerminalEffect(ref.current, !ctx.active);
		if (ctx.active) setDone(false);
		fx.onEnd = ()=>setDone(true);
		fx.addMsg({ type: "server", content: [...src.current?.childNodes ?? []] });
		if (!ctx.active) fx.renderAll();

		return fx;
	}, [ctx, setDone]);

	return <>
		{noCursor!=true && <div hidden ref={src} >{children}</div>}
		<div ref={ref} className={clsx(ctx.active ? "dark:text-green-300" : textColor.dim, "main-text w-full animate-fade-in", noCursor==true && "flex flex-col items-center main-text-center")} >
			{noCursor==true && children}
		</div>

		{done && end?.choices && <div className="flex flex-row gap-2 flex-wrap" >
			{end.choices.map(v=>
				<Button key={v.value} onClick={()=>setChoice(v.value)} className={
					v.value==choice ? clsx(bgColor.secondary, "dark:hover:border-green-400 dark:border-green-400 dark:disabled:bg-zinc-900") : `theme:bg-transparent`
				} disabled={!ctx.active} >{v.label}</Button>
			)}
		</div>}
		
		{done && (end?.type!="choice" || choice!=null) && <div className="w-full py-2 flex flex-row justify-center gap-4 items-center animate-fade-in" >
			<Divider className="w-auto grow" />
			{ctx.active && (ctx.last=="end" ? <>
				<Text v="md" >The End</Text>
			</> : <>
				<Anchor onClick={()=>{
					if (end?.type=="choice" && choice!=null) {
						LocalStorage.storyState = {
							...LocalStorage.storyState,
							[end.key]: choice
						};
					}

					ctx.next();
				}} >
					{ ctx.last=="chapter" ? "Next chapter" : "Continue" }
				</Anchor>
				<Divider className="w-auto grow" />
			</>)}
		</div>}
	</>;
}

export type Stage = Puzzle&{type: "puzzle"} | {
	type: "story",
	name: string,
	key: string,
	blurb: ComponentChildren,
	para: ComponentChild[]
};

export function Story({stage, next}: {stage: Stage&{type:"story"}, next?: ()=>void}) {
	const [index, setIndex] = useState(0);
	useEffect(()=>{
		if (index>=stage.para.length) next?.();
	}, [index, next, stage.para.length])
	
	useEffect(()=>{
		const scroll = document.scrollingElement!;
		const observer = new ResizeObserver(()=>{
			if (byBottom) scroll.scrollIntoView({ behavior: "smooth", block: "end" });
		});

		let byBottom = false;
		const cb = ()=>{
			byBottom = scroll.scrollTop > scroll.scrollHeight - scroll.clientHeight - 75;
		};

		cb();
		document.addEventListener("scroll", cb);
		observer.observe(scroll);
		return ()=>{
			observer.disconnect();
			document.removeEventListener("scroll", cb);
		};
	}, []);

	return <div className="flex flex-col gap-2 justify-start items-start max-w-2xl grow" >
		<Text v="big" className="my-4" >{stage.name}</Text>
		{stage.para.slice(0, index+1).map((v,i)=><Fragment key={i} >
			<StoryContext.Provider value={{
				active: index==i, last: next==undefined ? "end"
					: i==stage.para.length-1 ? "chapter" : "next",
				next() { setIndex(i=>i+1); }
			}} >
				{v}
			</StoryContext.Provider>
		</Fragment>)}
	</div>;
}