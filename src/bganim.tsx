import { useContext, useEffect, useRef, useState } from "preact/hooks"
import { alpha, RNG } from "../shared/puzzles";
import { GotoContext } from "./main";
import clsx from "clsx";

class BgAnim extends DisposableStack {
	frame: number|null=null;
	stop=false;
	rng: RNG = new RNG();
	pt: number|null=null;
	maxChild = 2000;
	rewriteSpeed = 1;
	initWriting = true;

	constructor(public root: HTMLPreElement) {
		super();
		const cb = ()=>{
			this.root.classList.add("bg-anim");
			this.frame = requestAnimationFrame(()=>this.update(performance.now()));
		};

		if (document.readyState=="complete") {
			cb();
		} else {
			const loadCb = ()=>{
				const tm = setTimeout(cb, 500);
				this.defer(()=>clearTimeout(tm));
			}

			window.addEventListener("load", loadCb);
			this.defer(()=>window.removeEventListener("load", loadCb));
		}
	}
	
	toWrite = new Set<HTMLSpanElement>();
	makeSpan(instant: boolean) {
		const span = document.createElement("span");
		span.innerText = this.rng.nextString(alpha, this.rng.nextRange(1,8));
		if (!instant) {
			span.classList.add("adding");
			span.style.width="1px";
			this.toWrite.add(span);
		} else {
			span.animate([ {opacity: 0}, {opacity: 1} ], 50);
		}
		return span;
	}
	
	toRemove = new Set<HTMLSpanElement>();
	delSpan(span: HTMLSpanElement) {
		span.classList.add("removing");
		span.style.width = `${span.clientWidth}px`;
		this.toWrite.delete(span);
		this.toRemove.add(span);
	}
	
	sinceWrite=0;
	writeDur = 0.001;
	cursor: HTMLSpanElement|null = null;

	addCursor() {
		this.cursor = document.createElement("span");
		this.cursor.classList.add("cursor");
		this.root.appendChild(this.cursor);
	}

	update(t: number) {
		if (this.stop) { this.frame=null; return; }
		if (this.cursor!=null) { this.cursor.remove(); this.cursor=null; }
		const dt = (t-(this.pt??t))/1000;
		this.pt=t;

		for (const x of this.toWrite) {
			if (document.contains(x) && x.clientWidth < x.scrollWidth-1) {
				x.style.width = `${Math.ceil(x.clientWidth+5*dt)}px`;
			} else {
				this.toWrite.delete(x);
			}
		}

		for (const x of this.toRemove) {
			if (document.contains(x) && x.clientWidth >= 1) {
				x.style.width = `${Math.floor(Math.max(x.clientWidth-5*dt, 0))}px`;
			} else {
				x.remove();
				this.toRemove.delete(x);
			}
		}
		
		const rndOp = (f: (el: HTMLSpanElement)=>void)=>{
			if (Math.random() < this.rewriteSpeed * dt && this.root.children.length>0) {
				const insI = Math.floor((1-Math.random()*(Math.random() + 1)/2)*this.root.children.length);
				f(this.root.children.item(insI) as HTMLSpanElement);
			}
		};

		if (this.root.childElementCount<this.maxChild)
			rndOp((el)=>this.root.insertBefore(this.makeSpan(false), el.nextElementSibling));
		rndOp((el)=>this.delSpan(el));
		
		while (this.root.scrollHeight > this.root.clientHeight + 20) {
			const el = this.root.lastElementChild as HTMLSpanElement|null;
			if (!el) break;
			this.toRemove.delete(el);
			this.toWrite.delete(el);
			el.remove();
		}

		this.sinceWrite += dt;
		let bad=false;
		while (!this.initWriting || this.sinceWrite>this.writeDur) {
			this.sinceWrite-=this.writeDur;

			bad = this.root.scrollHeight <= this.root.clientHeight + 20
				&& this.root.childElementCount<this.maxChild;

			if (!bad) {
				this.initWriting=false;
				break;
			}

			this.root.appendChild(this.makeSpan(true));
		}

		if (this.initWriting) this.addCursor();

		this.frame = requestAnimationFrame((t)=>this.update(t));
	}
	
	async unwrite() {
		this.stop=true;
		if (this.cursor) this.cursor.remove();

		const step=1;
		let delay = this.root.childElementCount*step;
		const proms: Promise<void>[] = [];
		for (const c of this.root.children) {
			proms.push(c.animate([ {opacity: 1}, {opacity: 0} ], {
				duration: 50, delay
			}).finished.then(()=>c.remove()));

			delay-=step;
		}
		
		this.addCursor();
		await Promise.all(proms);
	}
	
	[Symbol.dispose](){
		if (this.frame!=null) cancelAnimationFrame(this.frame);
		this.root.replaceChildren();
		this.root.classList.remove("bg-anim");
	}
}

export function BgAnimComponent() {
	const ref = useRef<HTMLPreElement>(null);
	const gotoCtx = useContext(GotoContext);
	const [unwriting, setUnwriting] = useState(false);
	useEffect(()=>{
		if (!ref.current) return;

		const bg = new BgAnim(ref.current);
		const transition = gotoCtx.addTransition(()=>{
			setUnwriting(true);
			return bg.unwrite();
		});

		return ()=>{
			setUnwriting(false);
			transition[Symbol.dispose]();
			bg[Symbol.dispose]();
		};
	}, [gotoCtx]);

	return <pre ref={ref} className={clsx("overflow-hidden flex flex-row flex-wrap items-start fixed left-0 right-0 top-0 max-h-dvh w-[calc(100%+5rem)] transition-colors text-xl -z-10 duration-1000", unwriting ? "text-zinc-300" : "text-gray-600/10")} />;
}
