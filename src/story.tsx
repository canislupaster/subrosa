import { ComponentChild, ComponentChildren, createContext, Fragment } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { Anchor, bgColor, Button, LocalStorage, useDisposable, Text, Divider, textColor, borderColor } from "./ui";
import clsx from "clsx";
import { defaultGen, Puzzle } from "./puzzles";

function useStoryState<T>(key: string) {
	const [x, setX] = useState<T>();
	useEffect(()=>{ setX(LocalStorage.storyState?.[key] as T|undefined); }, [key]);
	return [x, useCallback((newX: T)=>{
		LocalStorage.storyState = {...LocalStorage.storyState, [key]: newX as unknown};
		setX(newX);
	}, [key])];
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
	interval: number;

	step = 8;
	wait = 3;
	inPause = -1;

	constructor(private root: HTMLElement) {
    this.interval = setInterval(()=>this.update(), 50);
	}

	moveCursor() {
		if (this.cursorElem) this.cursorElem.remove();

		this.cursorElem = document.createElement("span");
		this.cursorElem.textContent = "█";
		this.cursorElem.style.position="absolute";
		this.cursorElem.classList.add("cursor");

		if (this.current == this.msgs.length) {
			this.cursorElem.classList.add("blink");
		} else {
			this.msgs[this.current].elem.appendChild(this.cursorElem);
		}

		this.root.scrollTo(0, this.root.scrollHeight);
	}
	
	onEnd?: ()=>void;

	update() {
		if (this.current >= this.msgs.length || --this.inPause > 0) return;

		if (this.current != -1 && this.msgs[this.current].ev.length > 0) {
			let eaten = 0;
			while (eaten < this.step && this.msgs[this.current].ev.length > 0) {
				const ev = this.msgs[this.current].ev[0];
				if (ev.type == "text") {
					const len = Math.min(this.step - eaten, ev.content.length);
					this.msgs[this.current].elem.append(ev.content.slice(0, len));
					ev.content = ev.content.slice(len);
					if (ev.content.length == 0) this.msgs[this.current].ev.shift();
					eaten += len;
				} else if (ev.type == "pause") {
					this.inPause = this.wait;
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

			if (this.msgs[this.current].ev.length == 0) this.inPause = this.wait;
		}

		if (this.inPause <= 0 && (this.current == -1 || this.msgs[this.current].ev.length == 0)) {
			this.current++;

			this.append("\n");
			if (this.current < this.msgs.length) this.append(this.msgs[this.current].elem);
			else this.onEnd?.();
		}

		this.moveCursor();
	}

	addMsg(msg: Omit<TerminalMsg, "elem"|"ev">, render = false) {
		const elem = document.createElement("span");

		const ev: TerminalEvent[] = [];
		msg.content = msg.content.map(x=>x.cloneNode(true));
		elem.replaceChildren(...msg.content);

		if (render) {
			this.current = this.msgs.length;
			this.append(elem);
			this.append("\n");
			this.moveCursor();
		} else {
			const t = (elem: HTMLElement) => {
				for (const e of elem.childNodes) {
					if (e.nodeType == Node.TEXT_NODE) {
						ev.push(
							...e.textContent!.split("[pause]")
								.map(x=>({ type: "text", content: x } as const))
								.reduce((a,b): TerminalEvent[] =>
									(a.length > 0 ? [...a, { type: "pause" }, b] : [b]),
									[] satisfies TerminalEvent[]
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
		}

		this.msgs.push({ ...msg, ev, elem });
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
	active: boolean, last: boolean, next: ()=>void
});

export function StoryParagraph({ children, end }: {
	children?: ComponentChildren,
	end?: {
		type: "choice", key: string, choices: {
			value: string, label: ComponentChildren
		}[]
	}
}) {
	const ref = useRef<HTMLDivElement>(null);
	const src = useRef<HTMLDivElement>(null);
	const [done, setDone] = useState(false);
	const [choice, setChoice] = useState<string|null>(null);
	const ctx = useContext(StoryContext);

	useDisposable(()=>{
		if (!ref.current) return;

		const fx = new TerminalEffect(ref.current)
		if (ctx.active) setDone(false);
		fx.onEnd = ()=>setDone(true);
		fx.addMsg({ type: "server", content: [...src.current?.childNodes ?? []] }, !ctx.active);

		return fx;
	}, [ctx, setDone]);

	return <>
		<div hidden ref={src} >{children}</div>
		<div ref={ref} className={ctx.active ? "dark:text-green-300" : textColor.dim} />

		{done && end?.choices && <div className="flex flex-row gap-2 flex-wrap" >
			{end.choices.map(v=>
				<Button key={v.value} onClick={()=>setChoice(v.value)} className={
					v.value==choice ? clsx(bgColor.secondary, "dark:hover:border-green-400 dark:border-green-400 dark:disabled:bg-zinc-900") : `theme:bg-transparent`
				} disabled={!ctx.active} >{v.label}</Button>
			)}
		</div>}
		
		{done && (end?.type!="choice" || choice!=null) && <div className="w-full py-2 flex flex-row justify-center gap-4 items-center" >
			<Divider className="w-auto grow" />
			{ctx.active && <>
					<Anchor onClick={()=>{
					if (end?.type=="choice" && choice!=null) {
						LocalStorage.storyState = {
							...LocalStorage.storyState,
							[end.key]: choice
						};
					}

					ctx.next();
				}} >
					{ctx.last ? "Next chapter" : "Continue"}
				</Anchor>
				<Divider className="w-auto grow" />
			</>}
		</div>}
	</>;
}

export type Stage = Puzzle&{type: "puzzle"} | {
	type: "story",
	name: string,
	key: string,
	para: ComponentChild[]
};

export function Story({stage, next}: {stage: Stage&{type:"story"}, next?: ()=>void}) {
	const [index, setIndex] = useState(0);
	useEffect(()=>{
		if (index>=stage.para.length) next?.();
	}, [index, next, stage.para.length])
	
	return <div className="flex flex-col gap-2 justify-start items-start max-w-2xl grow" >
		<Text v="big" className="my-8" >{stage.name}</Text>
		{stage.para.slice(0, index+1).map((v,i)=><Fragment key={i} >
			<StoryContext.Provider value={{
				active: index==i, last: i==stage.para.length-1, next() { setIndex(i=>i+1); }
			}} >
				{v}
			</StoryContext.Provider>
		</Fragment>)}
	</div>;
}