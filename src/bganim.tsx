import { useContext, useEffect, useRef, useState } from "preact/hooks"
import { alpha, RNG } from "../shared/puzzles";
import { GotoContext } from "./main";
import clsx from "clsx";

class BgAnim {
	frame: number|null;
	stop=false;
	rng: RNG = new RNG();
	pt: number=performance.now();
	maxChild = 2000;
	rewriteSpeed = 1;
	initWriting = true;

	constructor(public root: HTMLPreElement) {
		this.update(this.pt);
		this.frame = requestAnimationFrame(()=>this.update(this.pt));
	}
	
	toWrite = new Set<HTMLSpanElement>();
	makeSpan(instant: boolean) {
		const span = document.createElement("span");
		span.innerText = this.rng.nextString(alpha, this.rng.nextRange(1,8));
		if (!instant) {
			span.classList.add("adding");
			span.style.width="1px";
			this.toWrite.add(span);
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
	
	unwriting=false;
	doneUnwriting?: ()=>void;
	sinceWrite=0;
	writeDur = 0.001;

	update(t: number) {
		const dt = (t-this.pt)/1000;
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
		
		this.sinceWrite+=dt;
		while ((this.root.scrollHeight > this.root.clientHeight + 20)
			|| (this.unwriting && this.sinceWrite>this.writeDur)) {
			this.sinceWrite-=this.writeDur;

			const el = this.root.lastElementChild as HTMLSpanElement|null;
			if (!el) {
				this.doneUnwriting?.();
				this.stop=true;
				break;
			}

			this.toRemove.delete(el);
			this.toWrite.delete(el);
			el.remove();
		}

		let bad=false;
		while (!this.unwriting && (!this.initWriting || this.sinceWrite>this.writeDur)) {
			this.sinceWrite-=this.writeDur;

			bad = this.root.scrollHeight <= this.root.clientHeight + 20
				&& this.root.childElementCount<this.maxChild;

			if (!bad) {
				this.initWriting=false;
				break;
			}

			this.root.appendChild(this.makeSpan(true));
		}

		this.frame = this.stop ? null : requestAnimationFrame((t)=>this.update(t));
	}
	
	unwrite() {
		this.unwriting=true;
		this.sinceWrite=0;
		return new Promise<void>(res=>{ this.doneUnwriting=res });
	}
	
	[Symbol.dispose](){
		this.root.replaceChildren();
		if (this.frame!=null) cancelAnimationFrame(this.frame);
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

	return <pre ref={ref} className={clsx("overflow-hidden flex flex-row flex-wrap items-start bg-anim fixed left-0 right-0 top-0 max-h-dvh w-[calc(100%+5rem)] transition-colors text-xl -z-10 duration-1000", unwriting ? "text-zinc-300" : "text-gray-600/10")} />;
}
