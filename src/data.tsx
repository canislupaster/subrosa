// arrays of paragraphs are keyed in Story
/* eslint-disable react/jsx-key */

import { ComponentChildren, ComponentType, VNode } from "preact";
import { Text } from "./ui";
import { data } from "../shared/data";
import { StoryParagraph } from "./story";
import { AsciiArt } from "./asciiart";
import { compiler } from "markdown-to-jsx";

type ExtraData = Readonly<{ [K in typeof data[number]["key"]]:
	Readonly<(((typeof data)[number]&{key: K})["type"] extends "story" ? {
		para: ()=>Promise<ComponentChildren[]>
	} : {
		extraDesc?: ComponentChildren,
		solveBlurb?: ComponentChildren
	})&{
		blurb: ComponentChildren
	}>
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

const loadFrom = (name: string) => async ()=>{
	const txt = (await import(`../content/${name}.md?raw`) as {default: string}).default;
	const vs = compiler(txt, {
		forceWrapper: true,
		wrapper: null,
		sanitizer: (value)=>value,
		overrides: {
			StoryParagraph: {component: StoryParagraph}, AsciiArt: {component: AsciiArt},
			...titleComponents
		}
	}) as ComponentChildren[];
	
	const proc = new Map<ComponentType<never>,(x: VNode<unknown>)=>ComponentChildren>([
		[StoryParagraph, x=>x],
		[AsciiArt, x=><StoryParagraph asciiArt={x} />]
	]);
	
	return vs.map(v=>{
		if (v==null || v==false || v=="" || (typeof v=="object" && "type" in v)) {
			const ty = proc.get((v as VNode).type as ComponentType<never>);
			if (ty) return ty(v as VNode<unknown>);
		}

		return <StoryParagraph>{v}</StoryParagraph>;
	})
};

export const extraData: ExtraData = {
	intro: {
		blurb: "Slowly, then all at once.",
		para: loadFrom("ch1")
	},
	// team: {
	// 	blurb: "welcome aboard"
	// },
	salad: {
		blurb: "Company cultures are weird.",
		solveBlurb: "How did Caesar, a military genius, ever believe his cipher was secure?"
	},
	elzzup: {
		blurb: "Money is important.",
		solveBlurb: "🤑"
	},
	"olive-oil": {
		blurb: `Three employees walk into a bar. They don't get drunk.`
	},
	"implementation-challenge": {
		blurb: "There's no free lunch, even in sunny California.",
	},
	keyword: {
		blurb: `The first real puzzle you're solving.`,
	},
	shell: {
		blurb: "Originally used to encrypt Hebrew...",
	},
	"rot-13": {
		blurb: "Definitely not rot-13. Don't even try!",
	},
	leaf: {
		blurb: "Puzzle invented by ChatGPT. Can you solve it!?",
	},
	vinegar: {
		blurb: "Since you love secret keywords so much, here's another...",
	},
	abcdefghijklmnopqrstuvwxyz: {
		blurb: "aeHv fnu!",
	}
} as const;

export const messages = [
	{
		key: "welcome",
		minStageKey: "intro",
		expectedMinutes: 4,
		from: "Karen", subject: "welcome to subrose",
		content: <>
			<p>just wanted to extend a warm welcome</p>
			<p>we have free employee lunches every day at noon. you're doing a great job, already on top of your work. keep it up!</p>
		</>
	},
	{
		key: "random1",
		minStageKey: "intro",
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
	}
] as const satisfies Message[];
