// arrays of paragraphs are keyed in Story

import { ComponentChildren } from "preact";
import { data, StageData } from "../shared/data";

type ExtraPuzzle = {
	extraDesc?: ComponentChildren,
	solveBlurb?: ComponentChildren,
	blurb: ComponentChildren
};

export type ExtraData = Readonly<{ [K in typeof data[number]["key"]]:
	Readonly<(((typeof data)[number]&{key: K})["type"] extends "story" ? {
		src: string,
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
	src: string,
	replyTo?: string,
	sequelTo?: string
};

export type Puzzle = StageData&ExtraPuzzle&{type: "puzzle"};

export const extraData: ExtraData = {
	definition: {
		startOf: "Act I",
		blurb: "Our story begins where language takes shape.",
		src: "ch1"
	},
	add: {
		blurb: "Your first training assignment.",
		extraDesc: "Add the inputs x and y and store their sum back into x.",
		solveBlurb: "Nice work! You're already on your way to mastering SUBTXT."
	},
	dependencies: {
		blurb: "Laying the groundwork for things to come.",
		src: "ch2"
	},
	div: {
		blurb: "Slightly harder than the last one.",
		extraDesc: "Divide x by y, round down the quotient, and store the result back into x.",
		solveBlurb: "Don't worry — things will get much more interesting soon."
	},
	optimization: {
		blurb: "In pursuit of higher standards.",
		src: "ch3"
	},
	reverse: {
		blurb: <>Let's switch things up.</>,
		extraDesc: "Reverse the string!",
		solveBlurb: "The new era of string operations begins."
	},
	dotenv: {
		blurb: "A hidden file reveals many secrets.",
		src: "ch4"
	},
	permutation: {
		blurb: "Lexicographically challenging.",
		extraDesc: "Find the next lexicographically smallest permutation of letters. For instance, abc goes to acb.",
		solveBlurb: "Congratulations! I think you're ready for the real challenges."
	},
	mutability: {
		blurb: "Everything can change.",
		src: "ch5"
	},
	classic: {
		blurb: "A good old fashioned puzzle.",
		extraDesc: <>Crack your first <b>SUBKEY</b>.</>,
		solveBlurb: "Access granted."
	},
	casting: {
		blurb: "A new perspective offers clarity.",
		src: "ch6"
	},
	"leapfrog": {
		blurb: "",
	},
	abc: {
		blurb: "An alphabetic exercise in decreasing entropy.",
	},
	arithmetic: {
		blurb: "Put two and two together."
	},
	"rot-13": {
		blurb: "(This puzzle has almost nothing to do with ROT-13.)",
		extraDesc: "But try ROT-13 anyways! Who knows, maybe it'll work.",
	},
	"taylor-series": {
		blurb: "A most elementary expansion."
	}
} as const;

export const messages = [
	{
		key: "welcome",
		minStageKey: "add",
		expectedMinutes: 4,
		from: "Karen", subject: "welcome to subrose",
		src: "welcome"
	}, {
		key: "coffee",
		minStageKey: "div",
		expectedMinutes: 15,
		from: "Josh Brown", subject: "Why do I deserve this?",
		src: "coffee"
	}, {
		key: "present",
		minStageKey: "div",
		expectedMinutes: 15,
		sequelTo: "coffee",
		from: "Cyril Sharma", subject: "🎁 A gift for our devoted coders",
		src: "present"
	}, {
		key: "karen1",
		minStageKey: "reverse",
		expectedMinutes: 5,
		from: "Karen", subject: "Take it easy!",
		src: "norush"
	}, {
		key: "brijesh1",
		minStageKey: "reverse",
		expectedMinutes: 40,
		from: "Brijesh Patel", subject: "Revamped lunch catering!",
		src: "brijesh1"
	}, {
		key: "ishan",
		minStageKey: "reverse",
		expectedMinutes: 60,
		from: "Ishan Goel", subject: "Meeting notes",
		src: "ishan"
	}, {
		key: "brijesh2",
		minStageKey: "permutation",
		expectedMinutes: 30,
		sequelTo: "brijesh1",
		from: "Brijesh Patel", subject: "Birthday Party!",
		src: "brijesh2"
	}, {
		key: "random4",
		minStageKey: "permutation",
		expectedMinutes: 60,
		from: "Egor Gagushin", subject: "Brain damage",
		src: "braindamage"
	}, {
		key: "random5",
		minStageKey: "classic",
		expectedMinutes: 90,
		from: "Egor Gagushin", subject: "Advisory on register naming",
		src: "naming"
	}, {
		key: "interns",
		minStageKey: "leapfrog",
		expectedMinutes: 120,
		from: "Cyril Sharma", subject: "Tips for interns",
		src: "interns"
	}
] as const satisfies Message[];
