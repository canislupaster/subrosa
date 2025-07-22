import { PuzzleData, puzzles } from "./puzzles.ts";

export type StageData = (PuzzleData & { type: "puzzle" }) | {
	type: "story";
	name: string;
	key: string;
};

export const stageUrl = (x: StageData) => `/${x.type}/${x.key}`;

export const data = [
	{ type: "story", name: "Definition", key: "definition" },
	{ type: "puzzle", ...puzzles[0] },
	{ type: "story", name: "Dependencies", key: "dependencies" },
	{ type: "puzzle", ...puzzles[1] },
	{ type: "story", name: "Optimization", key: "optimization" },
	{ type: "puzzle", ...puzzles[2] },
	{ type: "story", name: "Dot Env", key: "dotenv" },
	{ type: "puzzle", ...puzzles[3] },
	{ type: "story", name: "Mutability", key: "mutability" },
	{ type: "puzzle", ...puzzles[4] },
	{ type: "story", name: "Casting", key: "casting" },
	{ type: "puzzle", ...puzzles[5] },
	{ type: "puzzle", ...puzzles[6] },
	{ type: "puzzle", ...puzzles[7] },
	{ type: "puzzle", ...puzzles[8] },
	{ type: "puzzle", ...puzzles[9] },
] as const satisfies StageData[];
