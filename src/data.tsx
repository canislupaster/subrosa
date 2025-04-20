// arrays of paragraphs are keyed in Story
/* eslint-disable react/jsx-key */

import { defaultGen, puzzles } from "./puzzles";
import { Stage, StoryParagraph } from "./story"

const puzzleTy = puzzles.map(x=>({type: "puzzle" as const, ...x}));

export const data: Stage[] = [
   {
        type: "story",
        name: "Chapter 1",
        key: "intro",
        blurb: "Slowly, then all at once.",
        para: [
            <StoryParagraph>
                <p>
                Just like most things in life, it happened slowly, then all at once.
                It was sunny April; yet your summer prospects were chilly. Lawson Commons buzzed with Amazon, Meta, and, for the insufferably ambitious: [pause]
                “unemployment in San Francisco.”
                </p>
                <p>
                Scrolling on the latest iPhone® bought with money better spent on next semester’s tuition, you weren’t hoping for much.
                Perhaps another fifteen-second TikTok would unlock the secret to eternal happiness.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                 “Ding!” goes your inbox, a noise so unfamiliar you think it’s part of the Top Ten Skateboard Tricks Doctors Didn’t Want You To Know.
                 </p>
                 <p>
                 Mikah actually came through with his referral. “Interview Request from Subrose Systems.”
                 You don’t know what they do. Neither does their website, coincidentally.
                 The interviews pass in a haze.
                 HR gently weeps with joy as you accept an offer without negotiating once,
                    at the same time as you gently weep your own joyful tears on affording the rest of your education <i>and</i> a car.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                Sunny California is a welcome respite from bitter midwest winds.
                All the Hawaiian shirts in North America have seemingly found their home in this particular district of the Bay.
                You show up to a hair dresser’s shop instead of the sleek glass pyramid you’d expect.
                An awkward Korean exchange with the hairdresser (complicated by the fact you don’t speak Korean),
                    you climb the stairs to the second floor. You’re in the right place –
                        only a tech firm without a branding team would have lawn grass in a pot at reception.
                </p>
                [pause]
                <p>
                As you speak to the receptionist who’s name you vow to remember and immediately forget,
                    you’re taking in the little details. It feels like WeWork has risen again from the dead,
                    and this is their comeback attempt.
                There are more beanbags than office chairs and every desk has more than the correct amount of chairs (one).
                You can tell that attempts to browse r/dnd on company time will be met with a
                    swift barrage of “Ohmygosh you should join our Dungeons ‘n Dragons lunch group!”.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                Your attention snaps back just as the receptionist stops speaking about unimportant things like fire evacuation plans.
                She reaches underneath her desk, pulling out a little slip of paper whose very texture feels rich and slimy.
                The font is a mixture of neo-brutalism, constructivism, and a few other isms.
                Their design team is clearly existent and thriving (unlike their branding team). The paper reads:
                </p>
                <p>
                    "Welcome to the family! Here at…” Your inner voice blurs into TV static as your long-email comprehension neurons engage.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                You find your desk among a sea of lookalikes.
                You put up a violently colorful poster as a simultaneous protest and cry for attention.
                The sleek black void of the Apple Studio Display® on your desk gazes back into you.
                You attempt to log in, only to realize you’re entering an encrypted password. You look for more instructions on the card.
                </p>
                <p>
                "This is your first assignment. Consider it a rite of passage."
                </p>
            </StoryParagraph>,
            <StoryParagraph end={{
                type: "choice",
                key: "intro_choice",
                choices: [
                    { value: "accept", label: "Accept the challenge" },
                    { value: "decline", label: "Walk away" }
                ]
            }}>
            </StoryParagraph>
        ],
    },
    puzzleTy[0],
    {
        type: "story",
        name: "The Mysterious Kiln 2",
        key: "end",
        blurb: "what thing do what".repeat(10),
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
	puzzleTy[1],
	puzzleTy[2],
	puzzleTy[3],
	puzzleTy[4],
	puzzleTy[5],
	puzzleTy[6],
	puzzleTy[7],
	puzzleTy[8],
];
