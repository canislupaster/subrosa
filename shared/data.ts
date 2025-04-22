import { Puzzle, puzzles } from "./puzzles.ts";

export type StageData = (Puzzle&{type: "puzzle"}) | {
	type: "story",
	name: string,
	key: string,
};

export const stageUrl = (x: StageData) => `/${x.type}/${x.key}`;

export const data = [
	{
		type: "story",
		name: "Chapter 1",
		key: "intro",
	},
	{ type: "puzzle", ...puzzles[0] },
	{
		type: "story",
		name: "Chapter 2",
		key: "first_payslip",
	},
	{ type: "puzzle", ...puzzles[1] },
	{
		type: "story",
		name: "Chapter 3",
		key: "team_lunch",
	},
	{ type: "puzzle", ...puzzles[2] },
	{
		type: "story",
		name: "Chapter 4",
		key: "late_night_clarity",
	},
	{ type: "puzzle", ...puzzles[3] },
	{
		type: "story",
		name: "Chapter 5",
		key: "mushrooms",
	},
	{ type: "puzzle", ...puzzles[4] },
	{ type: "puzzle", ...puzzles[5] },
	{ type: "puzzle", ...puzzles[6] },
	{ type: "puzzle", ...puzzles[7] },
	{ type: "puzzle", ...puzzles[8] },
	{ type: "puzzle", ...puzzles[9] },
] as const satisfies StageData[];
