import { PuzzleData, puzzles } from "./puzzles.ts";

export type StageData = (PuzzleData&{type: "puzzle"}) | {
	type: "story",
	name: string,
	key: string
};

export const stageUrl = (x: StageData) => `/${x.type}/${x.key}`;

export const data = [
	{
		type: "story",
		name: "You're hired!",
		key: "ch1",
	},
	// { type: "puzzle", ...puzzles[0] },
	{ type: "puzzle", ...puzzles[0] },
	{
		type: "story",
		name: "Onboarding",
		key: "ch2",
	},
	{ type: "puzzle", ...puzzles[1] },
	{
		type: "story",
		name: "Pala",
		key: "ch3",
	},
	{ type: "puzzle", ...puzzles[2] },
	{
		type: "story",
		name: "Breakthrough",
		key: "ch4"
	},
	{ type: "puzzle", ...puzzles[3] },
] as const satisfies StageData[];
