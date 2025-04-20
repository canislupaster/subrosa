// arrays of paragraphs are keyed in Story
/* eslint-disable react/jsx-key */

import { defaultGen, puzzles } from "./puzzles";
import { Stage, StoryParagraph } from "./story"

const puzzleTy = puzzles.map(x=>({type: "puzzle" as const, ...x}));

export const data: Stage[] = [
	puzzleTy[0],
	puzzleTy[1],
	puzzleTy[2],
	puzzleTy[3],
	puzzleTy[4],
	puzzleTy[5],
	puzzleTy[6],
	puzzleTy[7],
	puzzleTy[8],
];
