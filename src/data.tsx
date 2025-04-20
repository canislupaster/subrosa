// arrays of paragraphs are keyed in Story
/* eslint-disable react/jsx-key */

import { defaultGen } from "./puzzles";
import { Stage, StoryParagraph } from "./story"

export const data: Stage[] = [
	{
		type: "story",
		name: "The Mysterious Kiln",
		key: "intro",
		para: [
			<StoryParagraph>
				Welcome to the world of Kiln! You awaken in a dimly lit workshop, the scent of clay and smoke in the air. [pause] A mysterious kiln stands before you, its surface warm to the touch.
			</StoryParagraph>,
			<StoryParagraph>
				An old note lies nearby: "To unlock the kiln's secret, solve the puzzle within." [pause] Will you accept the challenge?
			</StoryParagraph>,
			<StoryParagraph end={{
				type: "choice",
				key: "intro_choice",
				choices: [
					{ value: "accept", label: "Accept the challenge" },
					{ value: "decline", label: "Walk away" }
				]
			}}>
				What will you do?
			</StoryParagraph>
		],
	},
	{
		type: "puzzle",
		name: "Kiln Combination Lock",
		key: "kiln_puzzle",
		blurb: "The kiln is locked with a 3-digit code. Hints are scribbled on the wall: 'The sum is 9. The middle digit is 4. The first digit is one less than the last.'",
		generator: defaultGen,
		solve: x=>x
	}
];
