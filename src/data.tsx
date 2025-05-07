// arrays of paragraphs are keyed in Story
/* eslint-disable react/jsx-key */

import { ComponentChildren, ComponentType, VNode } from "preact";
import { Text } from "./ui";
import { data, StageData } from "../shared/data";
import { StoryParagraph } from "./story";
import { AsciiArt } from "./asciiart";
import { compiler, RuleType } from "markdown-to-jsx";

type ExtraPuzzle = {
	extraDesc?: ComponentChildren,
	solveBlurb?: ComponentChildren,
	blurb: ComponentChildren
};

export type ExtraData = Readonly<{ [K in typeof data[number]["key"]]:
	Readonly<(((typeof data)[number]&{key: K})["type"] extends "story" ? {
		para: StoryLoader,
		blurb: ComponentChildren,
		startOf?: string
	} : ExtraPuzzle)>
}>;

export type Message = {
	key: string,
	minStageKey: (typeof data)[number]["key"],
	expectedMinutes: number,
	from: ComponentChildren,
	to?: ComponentChildren,
	subject: ComponentChildren,
	content: ComponentChildren,
	replyTo?: string
};

export type Puzzle = StageData&ExtraPuzzle&{type: "puzzle"};

const titleComponent = (ord: number) => function Title({children}: {children: React.ReactNode}) {
	switch (ord) {
		case 1: return <Text v="big" className="dark:text-zinc-100" >{children}</Text>;
		case 2: return <Text v="md" className="dark:text-zinc-100" >{children}</Text>
		case 3: return <Text v="bold" className="dark:text-zinc-100" >{children}</Text>;
		default: return <h4 className="font-bold" >{children}</h4>;
	}
};

const titleComponents = Object.fromEntries(
	[1,2,3,4,5,6].map(x => [`h${x}`, titleComponent(x)])
);

export class StoryLoader {
	static storyModules: Record<string, ()=>Promise<{default: string}>> = import.meta.glob<false, "raw", {default: string}>("../content/*.md", {
		eager: false, query: "?raw"
	});
	constructor(public name: string) {}

	listener = new Set<(x: ComponentChildren[])=>void>();
	onload(f: (x: ComponentChildren[])=>void) {
		this.listener.add(f);
		return ()=>this.listener.delete(f);
	}
	
	loadMod(mod: {default: string}) {
		const vs = compiler(mod.default, {
			forceWrapper: true,
			wrapper: null,
			renderRule(next, node) {
				if ("children" in node && node.children!=undefined) {
					const newChild: typeof node.children = [];
					for (const x of node.children) {
						const last = newChild[newChild.length-1];
						if (last!=undefined && last.type==RuleType.text && x.type==RuleType.text) {
							last.text+=x.text;
							continue;
						}
						newChild.push(x);
					}

					node.children = newChild;
				} else if (node.type==RuleType.text) {
					return node.text.replaceAll(
						/(?<=\s|^)"([^"]+)"/g, (_all, inner)=>`“${inner}”`
					).replaceAll(
						/(?<=\s|^)'([^']+)'/g, (_all, inner)=>`‘${inner}’`
					)
						.replaceAll(/(?<=\w)'/g, "’").replaceAll(/'(?=\w)/g, "‘")
						.replaceAll("--", "—");
				}

				return next() as ComponentChildren;
			},
			sanitizer: (value)=>value,
			overrides: {
				StoryParagraph: {component: StoryParagraph},
				AsciiArt: {component: AsciiArt},
				code: { component: function Code({children}: {children?: ComponentChildren}) {
					return <Text v="code" >{children}</Text>;
				} },
				...titleComponents
			}
		}) as ComponentChildren[];
		
		const proc = new Map<ComponentType<never>,(x: VNode<unknown>)=>ComponentChildren>([
			[StoryParagraph, x=>x],
			[AsciiArt, x=><StoryParagraph asciiArt={x} />]
		]);
		
		const out = vs.map(v=>{
			if (v==null || v==false || (typeof v=="string" && v.trim()=="") || (typeof v=="object" && "type" in v)) {
				const ty = proc.get((v as VNode).type as ComponentType<never>);
				if (ty) return ty(v as VNode<unknown>);
			}

			return <StoryParagraph>{v}</StoryParagraph>;
		});
	
		this.listener.forEach(x=>x(out));
	}
	
	listening=false;
	async load() {
		const path = `../content/${this.name}.md`;
		if (!(path in StoryLoader.storyModules)) throw new Error("chapter not found");

		this.loadMod(await StoryLoader.storyModules[path]());
	}
}

export const extraData: ExtraData = {
	ch1: {
		startOf: "Act I",
		blurb: "Slowly, then all at once.",
		para: new StoryLoader("ch1")
	},
	add: {
		blurb: "Your first training assignment",
		extraDesc: "Add the inputs x and y and store their sum back into x.",
		solveBlurb: "Nice work! You're already on your way to mastering SUBTXT."
	},
	ch2: {
		blurb: "Get to know your duties.",
		para: new StoryLoader("ch2")
	},
	div: {
		blurb: "Slightly harder than the last one.",
		extraDesc: "Divide x by y, round down the quotient, and store the result back into x.",
		solveBlurb: "Don't worry — things will get much more interesting soon."
	},
	ch3: {
		blurb: "What's on your mind?",
		para: new StoryLoader("ch3")
	},
	reverse: {
		blurb: <>Let's switch things up. <img src="/img/unoreverse.png" className="h-8 inline -mt-1" /></>,
		extraDesc: "Reverse the string!",
		solveBlurb: "The new era of string operations begins."
	},
	ch4: {
		blurb: "A corporately thrilling turn of events.",
		para: new StoryLoader("ch4")
	},
	permutation: {
		blurb: "Lexicographically challenging.",
		extraDesc: "Find the next lexicographically smallest permutation of letters. For instance, abc goes to acb.",
		solveBlurb: "Congratulations! I think you're ready for the real challenges."
	}
} as const;

export const messages = [
	{
		key: "welcome",
		minStageKey: "add",
		expectedMinutes: 4,
		from: "Karen", subject: "welcome to subrose",
		content: <>
			<p>just wanted to extend a warm welcome</p>
			<p>we have free employee lunches every day at noon. you're doing a great job, already on top of things. keep it up!</p>
		</>
	},
	{
		key: "random1",
		minStageKey: "div",
		expectedMinutes: 20,
		from: "Josh Brown", subject: "Why do I deserve this?",
		content: <>
			<p>
				That's it. I'm quitting. It's been a long time coming. I think this message should shine a light on how distorted our company's values are.
			</p>
			<p>
				The first coffee machine was absolute shit. Stupid brand new top of the line Keurig that pissed literal gray water you lowlife swine call coffee. I honestly can't work with any employee who drinks this fucking... <i>instant</i> coffee without throwing up. I filed a complaint on my first day.
			</p>
			<p>
				The high of my life arrived with the next machine, a classic Gaggia. My hopes in this shithole were fully restored. Every hour I would arrive at the break room with eager anticipation of my next fix. My cold metal beauty was kept in immaculate shape by a dedicated maintenance crew. Only the finest beans were sourced at my suggestion.
			</p>
			<p>
				Until a certain top-level exec (You Know Who) came along, saw our coffee setup, and appropriated it for himself. After all my investment in my team's collective productivity, this blow was too much to take. I asked for it back, I asked for another one, I asked for the fucking Keurig machine after one too many non-late nights. Denied, probably to save money to fund <i>his</i> stolen fucking setup and spite someone who knows his coffee better. I want to hurt this asshole. I'm done.
			</p>
		</>
	}, {
		key: "karen1",
		minStageKey: "reverse",
		expectedMinutes: 5,
		from: "Karen", subject: "Take it easy!",
		content: <>
			<p>in case you don't know, there's no rush. as an intern it's wayy more important that you spend time to absorb all the details and get to know the intricacies of <b>SUBTXT</b>... don't just run thru the training</p>
		</>
	}, {
		key: "random2",
		minStageKey: "reverse",
		expectedMinutes: 40,
		from: "Brijesh Patel", subject: "Revamped lunch catering!",
		content: <>
			<p>I'm in charge of amenities here and I've been theorizing lately. After much whiteboarding, I'm proud to achieve a new standard in office lunch catering.</p>
			<p>Background: I have a cost limit, but also people to feed. If the theoretical minimum number of people -- 1 person -- comes to lunch tomorrow, I can offer you a fine dining experience. Wedding-grade. But we'll need to institute a strict limit, lest undeserving folks might wander in the door.</p>
			<p>It follows that I'll be instituting a new lottery system. Those who don't get the full experience may instead partake of my homemade potato chips -- straight from my backyard, so you know they're safe! If you're lucky, and careful when swallowing, your chip could contain a golden ticket, which admits one to the cafeteria on the printed date. I think this is pretty effective, since it simultaneously rewards those who:</p>
			<ul className="ul" >
				<li>Rely on the free lunches (so they eat more chips)</li>
				<li>Appreciate my culinary creations (and hence carefully consume chips)</li>
				<li>Haven't gone to my restaurant in a while (since they will eat more chips in the meantime)</li>
			</ul>
			<p>I think we will all benefit from this arrangement. Thank you for your support and you're welcome for the food.</p>
		</>
	}, {
		key: "random3",
		minStageKey: "reverse",
		expectedMinutes: 70,
		from: "Brijesh Patel", subject: "Birthday Party!",
		content: <>
			<p>Some of you might not remember, but tomorrow is my birthday! And as your designated food provider, that means I finally get a break. Bring a cake. If, for some reason, you don't remember my dietary preferences: no sugar. I'm diabetic.</p>
			<p>I expect to see you and your cake tomorrow! I can't wait to rerank everyone on our team.</p>
		</>
	}, {
		key: "random4",
		minStageKey: "reverse",
		expectedMinutes: 90,
		from: "Egor Gagushin", subject: "Brain damage",
		content: <>
			<p>Hi all, this is my first team-wide email! I sure hope I don't mess anything up... 🤡🤡🤡</p>
			<p>As you may have seen, I keep a hammer on my desk. Whenever my code looks too smart for future me to understand (a common issue for us developers 🤡🤡🤡), I just bring out the hammer. Problem solved!</p>
			<p>I highly recommend this approach to anyone who feels like they have a voice inside their head. I think this might be a personality disorder, so I like to shut it off with my hammer! 🤡🤡🤡</p>
			<p><i>Tip: to apply the hammer, simply aim for the scalp and let your arm drop.</i></p>
			<p>Well, I hope this helps. Goodbye~ 🤡🤡🤡</p>
		</>
	}, {
		key: "ishan",
		minStageKey: "reverse",
		expectedMinutes: 15,
		from: "Ishan Goel", subject: "Meeting notes",
		content: <>
			<p>Hey, glad I could give you a quick overview of our codebase.</p>
			<p>Based on our conversation, I came up with some pointers:</p>
			<ul className="ul" >
				<li>Remember that you can jump to the end of a procedure!</li>
				<li>Use the arrows around instructions to insert more</li>
				<li>If you paste a group of nodes between procedures, you can remap the registers they use.</li>
				<li>If you're failing the internal tests for a task, then you should randomize a bunch of test cases until you fail. The internal tests use the same generator.</li>
				<li>If you need to make many changes, possibly across procedures, the easiest way might be to edit the SUBTXT directly</li>
				<li>Pasting nodes will insert them after the current selection</li>
			</ul>
			<p>Good stuff, I'll see you around.</p>
		</>
	}, {
		key: "present",
		minStageKey: "permutation",
		expectedMinutes: 15,
		from: "Cyril Sharma", subject: "🎁 A gift for our devoted coders",
		content: <>
			<p>As a keycoder, I think our lower-level programmers deserve more love. While they might not be as skilled as us, or capable of even contributing to our operations, I enjoy everything they do for me. For instance, just last week, one of them built me a high-end coffee setup. Top-tier Gaggia, grinder, steam wand, beehive for honey, contract with a local farm for beans and milk, the works.</p>
			<p>To reward our amazing collaboration, I've been bearing down on our chemists, and we finally have results! If you look in your desk drawer, we've prepared a special brownie just for you, incorporating the latest developments from our labs. I think you will find it captivating, so make sure to perform these activities <b>outside of working hours</b>.</p>
			<p>Before we go to production, we'd love to hear your feedback. If you experience any side effects, good or bad, please message our chemistry department with your findings. To guarantee your experiment isn't for nothing, also report to us before you take your first bite. Good luck on your transcendental journey! And remember your NDA!</p>
		</>
	}
] as const satisfies Message[];
