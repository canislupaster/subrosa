// arrays of paragraphs are keyed in Story
/* eslint-disable react/jsx-key */

import { cloneElement, ComponentChild, ComponentChildren, createElement, FunctionComponent, VNode } from "preact";
import { data } from "../shared/data";
import { StoryParagraph } from "./story";
import { AsciiArt } from "./asciiart";
import ch1 from "./content/ch1.md?raw";

type ExtraData = Readonly<{ [K in typeof data[number]["key"]]:
	Readonly<(((typeof data)[number]&{key: K})["type"] extends "story" ? {
		para: ComponentChildren[]
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

function parse(src: string): ComponentChildren[] {
	const componentMap = { StoryParagraph, AsciiArt };
	// i love regex (note this only works for some escapes)
	const esc = "(?<![^\\\\]\\\\\\\\\\\\|[^\\\\]\\\\)";
	const unesc = (x: string)=>x.split("\\\\").map(x=>x.replaceAll("\\","")).join("\\");
	const attrRe = `(?<attr>\\w+)(?:\\s*=\\s*(?<attrv>${esc}".+${esc}"|[\\d.]+|null))?`;
	const substitutions: [string, (match: RegExpExecArray)=>ComponentChildren][] = [
		[`${esc}<(?<tag>\\w+)(?<attrs>\\s${attrRe})*\\s*(?:\\/>|>(?<inner>.*?)${esc}<\\/\\s*\\1\\s*>)`, (match)=>{
			const tag = match.groups!["tag"];
			const props = Object.fromEntries((match.groups?.["attrs"] ?? "")
				.matchAll(new RegExp(attrRe, "g")).map(v=>{
					const name = v.groups!["attr"], val = v.groups?.["attrv"];
					return [
						name,
						val==undefined ? true
							: val.startsWith("\"") ? unesc(val.slice(1,val.length-1))
							: val=="null" ? null : Number.parseFloat(val)
					];
				}));

			return createElement(componentMap[tag as keyof typeof componentMap] as unknown as FunctionComponent<{children?: ComponentChildren}> ?? tag, {
				...props, children: match.groups?.["inner"]
			});
		}],
		[`${esc}${"`"}(.+?)${esc}${"`"}`, (match) => <code>{match[1]}</code>],
		[`(?:^|\\n)(#{1,6}) (.+)`, (match) => createElement(`h${match[1].length}`, { children: match[2] })],
		[`${esc}\\*\\*(.+?)${esc}\\*\\*`, (match)=><b>{match[1]}</b>],
		[`${esc}\\*(.+?)${esc}\\*`, (match)=><i>{match[1]}</i>]
	];

	const substitutionsRe = substitutions.map(([k,v])=>[new RegExp(k,"g"), v] as const);
	
	const replaceRec = (x: ComponentChildren): ComponentChildren => {
		if (Array.isArray(x)) return x.map(v=>replaceRec(v as ComponentChild));
		else if (x!=null && typeof x=="object" && "children" in x) {
			const y = x as VNode<unknown>;
			return cloneElement(y, { children: replaceRec(y.props.children) });
		} else if (x==null || x==false || typeof x=="object") {
			return "";
		}

		const str = x.toString();
		const out: ComponentChildren[] = [];
		let curI = 0;

		for (const [reg, sub] of substitutionsRe) {
			reg.lastIndex=curI;
			const match = reg.exec(str);

			if (match) {
				out.push(str.slice(curI, match.index), sub(match));
				curI = reg.lastIndex;
			}
		}

		out.push(str.slice(curI).split(/\n\s*\n/g).map(v=><p>{unesc(v)}</p>));

		if (out.length==1) return out;
		return replaceRec(out.filter(v=>v!=null && v!=""));
	};
	
	const ret = replaceRec(src);
	if (Array.isArray(ret)) return ret;
	return [ret];
}

export const extraData: ExtraData = {
	intro: {
		blurb: "Slowly, then all at once.",
		para: parse(ch1)
	},
	// team: {
	// 	blurb: "welcome aboard"
	// },
	salad: {
		blurb: "Company cultures are weird.",
		solveBlurb: "How did Caesar, a military genius, ever believe his cipher was secure?"
	},
	first_payslip: {
		blurb: "Karen, who?",
		para: [
			<StoryParagraph noCursor={true} asciiArt={`:          -------   -------                                      @@@@@@@%                                                 @@@@@@@@               
:          ------=- -======-                                      @@@@@@@@                                                @@@@@@@@               
:          -------- -======-                                      @@@@@@@@                                                @@@@@@@@               
:          -------- -======-                                      @@@@@@@@                                                @@@@@@@@               
:                   -======-                                      @@@@@@@@                                                @@@@@@@@               
: ----------------  -======-  ---==--             @@@@@@@@@@@@@   @@@@@@@@      @@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@     @@@@@@@@     @@@@@@@@@ 
:------------------ -======- --=====--          @@@@@@@@@@@@@@@@  @@@@@@@@    @@@@@@@@@@@@@@@@@@@@@    @@@@@@@@@@@@@@@@@  @@@@@@@@    @@@@@@@@@  
:------------------ -======- -======--         @@@@@@@@@@@@@@@@@  @@@@@@@@   @@@@@@@@@@@@@@@@@@@@@@   @@@@@@@@@@@@@@@@@@@ @@@@@@@@  @@@@@@@@@    
: ----------------   ------- --------          @@@@@@@       @@   @@@@@@@@  @@@@@@@@@@  @@@@@@@@@@@  @@@@@@@@@   @@@@@@@  @@@@@@@@@@@@@@@@@@     
:                                              @@@@@@@@@@@@       @@@@@@@@ @@@@@@@@        @@@@@@@@ @@@@@@@@              @@@@@@@@@@@@@@@@       
: *******  *******   ................           @@@@@@@@@@@@@@@   @@@@@@@@ @@@@@@@         @@@@@@@@ @@@@@@@               @@@@@@@@@@@@@@         
:********  ******** .---------------..             @@@@@@@@@@@@@@ @@@@@@@@ @@@@@@@@        @@@@@@@@ @@@@@@@               @@@@@@@@@@@@@@@%       
:******** ********* .---------------..                   @@@@@@@@ @@@@@@@@  @@@@@@@@      @@@@@@@@@  @@@@@@@@     @@@@%   @@@@@@@@@@@@@@@@@@     
: ******* *********  ...----------...           @@@@@@   @@@@@@@@ @@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@ @@@@@@@@  @@@@@@@@@@   
:         *********                            @@@@@@@@@@@@@@@@@  @@@@@@@@   @@@@@@@@@@@@@@@@@@@@@@   @@@@@@@@@@@@@@@@@@  @@@@@@@@   @@@@@@@@@%  
:         ********* ....--:                     @@@@@@@@@@@@@@@   @@@@@@@@      @@@@@@@@@@@@@@@@@@@      %@@@@@@@@@@@@    @@@@@@@@     @@@@@@@@@ 
:         ********* .------.                          @@@@                          @@@                       @@@                                
:          ******** .------.                                                                                                                     
:          *******   ......                                                                                                                      
`} />,
			<StoryParagraph>
				Three days into the puzzle, you’ve figured it out.
				As soon as the login screen resolves into a snazzy desktop, a Slack notification [pause] fouls the new-desktop smell.
				You’re impressed – they’ve already ensnared you into the corporate hive-mind without action on your part.
				It’s Karen, no last name (and no profile photo), who claims to be your mentor for the internship period.
			</StoryParagraph>,
			<StoryParagraph>
				Looking around at the sea of empty desks around you, you choose to believe this at face value.
				Karen introduces herself as a bouldering and hiking enthusiast who migrated from the Midwest
				to work on awesome and world-changing things at Subrose, giving her the unenviable distinction of
				<i>having the exact same story as one in three female software engineers in the Bay Area.</i>
			</StoryParagraph>,
			<StoryParagraph>
				<p>You’re worried that the previous thought makes you sound like an ass, and you’re probably right.
				Keeping to the stereotype, she doesnt seem to know that punctuation exists</p>
				<p>Karen sends you some more cryptography exercises and you finish off your first week of work,
				having only met the receptionist and not having mustered up the courage to talk to the indistinct figures on the far reaches of the office floor.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
				Remember how you didn’t know anything about Subrose Systems when you accepted your offer,
				and how their website didn’t either?
				</p>
				<p>
				The handful of coworkers you’ve met have been added to that list.
				The tasks are abstract puzzles, and your supervisor, Karen, is far more excited about your puzzle-solving speed than any tangible output.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
				In your most private childhood dreams, you wanted to grow up and <i>become a dinosaur</i>.
				As a teenager, you imagined yourself <i>working on rockets that went boom</i>.
				</p>
				<p>
				As a twenty year old, your lofty ambitions have been besieged by the endless buffet of free food and a paycheck
				large enough to forgive the existential guilt of abandoning all idealism.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				Speaking of guilt, you haven’t thanked Mikah yet for the referral.
				You’ve made first contact with the denizens that inhabit the far reaches of the office, and some of them do seem to recognize Mikah’s name though.
			</StoryParagraph>,
			<StoryParagraph>
				<p>
				There’s sweaty Derek, who bikes to work despite your private hopes that he would give it up,
				or at least discover deodorant. He has an office somewhere in the twisted maze of hallways at
				the far end of the open plan area.</p>
				<p>There's Egor Gagushin with a desk near the fire exits, who somehow has the vanity Slack username of <b>“eggag33”</b> –
				something you immediately envy him for.</p>
			</StoryParagraph>,
			<StoryParagraph>
				There are a few other people who come in daily,
				but you haven’t yet been able to corner them into conversation.
				Besides the receptionist, everyone seems surprised at interacting with another human being in person. You wonder when it’ll happen to you.
			</StoryParagraph>,
			<StoryParagraph>
				Another week’s gone by. You’ve joked about Karen still taking you through training to Derek,
				only to be met with a blank look as Derek asked, ‘Who’s Karen?”.
				You stop short of proving her existence by pulling up your punctuation-less Slack chats.
			</StoryParagraph>,
			<StoryParagraph noCursor={true} asciiArt={`        
:      .=-------------------------:+-                          
:       :........................  :=+.                        
:       :........................  .::-=                       
:       :........................  .:..:==                     
:       :........................  .:...::=-                   
:       :......................... :=------=*=                 
:       :.....                       .   ....:+.               
:       :..                                   .                
:       :..  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@= ..:                
:       :..  .                              ..:                
:       :..                                 ..:                
:       :..  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@* ..:                
:       :..                                 ..:                
:       :..                                 ..:                
:       :.. .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ ..:                
:       :..                                 ..:                
:       :....                             ....:                
:      .........................................               
:    #############################################@@@@*        
:   ########################################### -.:::*@@@      
:   -#########################################:-###     @@     
:   -###### ......  ###        :###: ..     #.-*##+     %@@    
:   -#######..####.  ##  #####  =###  #######--*##+      +     
:   -#######.       ###  +####   ###       -#*-*##*            
:   -#######.  -:*#####  #####  :###  #######...=#:.========:  
:   -######=. #########   #+    ####  ####*...:....:-==+==++## 
:   -######+  #########      .######  ####*.:-----....:-----=* 
:   +######################################.------.@@::-----=+ 
:    ######################################.:----:.@@.:-----=+ 
:                                         ..------....:-----=* 
:      .::::::::::::::::::::::::::::::::::=#*+++++++++++++++#+ 
:                                           ................   
`} />,
			<StoryParagraph>
				<p>
				Just before leaving for the day, you receive a locked PDF payslip.
				Surely there’s been a mistake, why would your payslip be <i>password-protected</i>?
				The email, surely flouting a dozen state laws about payslip documents, states "<b>Worthy are those who claim this prize.</b>"
				</p>[pause]
				<p>
				After a nervous laugh and email to HR, you’ve realized they’re serious.
				Your options are either fighting this in court or just solving the puzzle they want you to solve,
				which when presented like that, are no options at all. Hey, you’re doing this on company time.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
				You confide in Derek, only for him to sympathize. "It keeps our skills sharp.” And then, in an about turn, he declares, “No cheating.”
				</p>
				<p>
				You open your payslip. That car may come sooner than you imagined.
				</p>
			</StoryParagraph>,
		]
	},
	elzzup: {
		blurb: "Money is important.",
		solveBlurb: "🤑"
	},
	team_lunch: {
		blurb: "Like termites emerging from the woodwork.",
		para: [
			<StoryParagraph noCursor={true} asciiArt={`:.+@@@@%###**#%#*##*+----:.:::--:-*-:--....::-:---:-*=-:::::::::-=-::--++#@@         ....  
:-*%@@@@@%@@@@@%@@@@@@%####*#*%@%%@ .=#=***%%#+@*++%@%*+*%##%%%%%#%%%%%@@@*  .-====+%*==+  
:@%+@@@@@@@%%@@%@@@@@@@%##%%####%@@.+*%#@@@*#++#=%+@@**%@%#%%%%%@@@@@@@@:  :#%@%@@#%%#--=  
:+@%%@@@@@@%@@%@@@@@@@@@@%###%#%%@*:@%%+*@@%@@+*+%+@@##%%#%@@@@@@@.      =%@@@%*######+::  
:.*%@@@@@@@@@@%@@@@@@@@@@@@@@@@@@@#-#*@-.*::%#*@@@%@%#@@@@@@.     -=%@@@@@@@*===*++**++*-  
:.=*#@@@@@@@@%@@@%@%%@@@@@@  + .*@@@@@@@@@%+%***+=*@@@@:    %@@@@@%@@%%#%*+#%@@@@@@@@@@@@. 
:.-+%@@@@@@@@@@@#%%@@@@@@@@  ..+   =-....*@@@@@@@@@@@. =#%%%.:@**%@##=*:*#%#**+++==+#%@@%. 
::==+@@@@@@@%%@@%@@@@@@@@@@  =++-@@###=.:       *  @@% :=:.  -@@#+%#*+*#@@@@@%#%#*+=--==*. 
:.+*+%@@@@@@@@@%@@@@@@@@@@- .+: *  :=..#=..:+####.%..**.*=-%@= ..:#%@@@@=   %@@%@@*@@@@@@. 
::%%+%@@@@@@@@@@@@@@@@@@@@@ .-=-=    *-  @= ..:.*@@@@#@@@@@@#%@@@@@@:  = .%   +@#=+*=+%%%. 
:.@%+%@@@@@@@@@@@@@@@@@@@@  .++ . .. +* .#@# :=       .   .@@@%%#=*#:@@@* .    .#%%%*:.:*  
:.%#*@@@@@@*   .+@@@@@@@@@ .*    .    .    *.. @##########    .:#*@:.:.:+*@@@@@@@@ . .@ :  
: *#%@@@@@%++%:.=@@@@@@@@-  ...@@@@%#@@-+@-#*.=@.::#%%.@@%#%.+: . :*%#*=-         %%%@%#=  
:.%##%%%%@#%#*.=@@@@@@@@@  ...##=%#:-##@%%    @:.. .##.....*@#  :.  =##+:#@#@%@%:  #+@*:-  
:=@%#*##@%#%@@@@@@@@@@@@@  .+ :   : .   . *+: @:#@@%%#..@@% +##%@=@-  -        -#+.. :%*#. 
:.*++++%%%@@#-..=@@@@@@@    . ...-:.@@ .-+.  .%.@ .*####@.%@@%#%*=  *@..=:*%%-#-..::+#:.   
: %@@@%@@@@##*#*-*@@@@@@ %%=@@@#-::+   @@:*-:-@-@@-..:==%*:.@@%@.=-=-=@*====- .##=:.    +  
::@=-+*#@..:--=*+. .=@@:  .:. . :.. ..   .=#::.##*@*@@:@-=@%.%#% :::.    .%#%#: =..@@@%#+# 
:   --..=-+%@#@@@@@*==@  ..     .++***+.  .=+#::%#%.+=-%%##@%@- ...=#=+-@.   % ...@%##*%@# 
:    :..@@@@@@@@@@@@@@@  ...=+***:-+==+#@@%=  .:. #=@%@@@@@-.... ...-  *=+@.   @@@@#%%%%%+ 
:**=-::%@@@@@@@@++%@@.   *: *.. @.  .....--#%%: .@@.:   ...:-. -......=%= =%:.%@@@@@@@@@%+ 
:@@@@@@@@@@@@@@@@@@@@  *%.=...=-#@%.  :    .--#% #=.-##=-    --=-=%*=-:.:%=:.@@@@%%@@@@%%* 
:@@@@@@@@@%=-:+==#%@:  + :   -     @@    @...-...  ...:: -=++:...#. .-=*+-...@@@%%%%@@@@@* 
:#@@@@@@@@@@@%@@*@@@   *- @@#=-#+.   @+.. .:..** @=-+--..:.  .::...=@:- .   @@@@%%%@@%%%%+ 
:@@@@@@@@@@@@@@@@@#  *#.. *-.-%*#++=. @:.. .. :..:%.:=:#--=*:@....@@+ . .. @@%@%%@%%%@@@%+ 
:@@@@@@@@@@@@@@@@ . %@*%#   %#*:*: -..%:+=.##=-#:#=+.-: :--=.::. @@@ @= . #@@%@%@@@@@%@%#+ 
:   .  ...-:-.. # #@@# +%%:-%%. . +#. .@-::..  *% .-@@    @#.@ *.@@@ @    @@%%@@@%%%%%@%%+ 
:.=  .%%**@@%@@@@   @## #@%*   :+%@@#  %:..+%%* -##=..@@@    . .@%@ @@ . .@@@@@@%%#%@@%%@+ 
:.-+%@%=.+#:  %@@ - *  .%%%#+.. +@#- #*%  .   :-..  @@@ @@. @  *@@@ @ .: @%***#%@%%@@%%%%+ 
: #%+# ::       # @*:@%.=:%%#-=:*##.-.-@% ##+-:. @::%@#   @@@ .@@@.@   @ @@@@@@%%#%%%@@%@+ 
: ..  .%@@@@@@@-:  @###-%:%%:: .. .   @*@=:-:..  @%@@@    @##  *:@ .  + .@     =@@@@@##%@* 
:  .@%#-%..:-.##*#. %@ @#%.%#.=   +. %#  # .:@. @@ @@  :.@@@  :@@  +. + *@@@@@@@   :@@@@@* 
:.-%:@%@%%@@@@%  -#*-##@%%:@%#%%%*: %#####-  .  @@ %  .:.@@@ %@@* .* %# +*    .@@@@@#---@@ 
:  -#.+%@# #  @@. #.   .##+@@#=.   ##.:-%* .:. @@@.. -:.  : @@@@  =..:= .@@@@%:   :::-:..  
: .-  .%.*:  %%   #%% %.%%%@ :*+@@..    +  :.. *@ .--+-.-@    .  .*..:.. .%@@@@@@%.. +.++. 
:..#%@# .###%% - . # +@@*%@.....:..@@@@@@ .-:..@@ -.:-. #= @@@ . -=#==:. @%@.@@  ##+@@@%.  
::@@  +%.:-#.   .=@@ .%@@%+.%@@%= @@@ @@ ::...  :.%:--..@ +@. :+.-. .....#@.  .-@%-=-:+.@  
:   --..:.%.  @@@#  #: .....=+.  .@::.@@ .-.@..:  .. . .  ..-.+-::.-:.%+   -@@#   :-%% :.  
`} />,
			<StoryParagraph>
				<p>
				It’s your first team lunch!
				People have shown up to the office in never-before-seen droves,
				and every buzz of the entry gates drives your eyebrows further up
				as you observe strangers sitting at the previously-empty desks around you,
				like <b>termites [pause] emerging from the woodwork after a fumigation</b>.
				Subrose, it appears, [pause] might actually be a publicly-traded company after all.
				</p><p>
				"There's sushi, pizza, salad, and something the caterer calls
				'international fusion tacos,'" announces the receptionist, whose name
				you swear to yourself to remember this time. You forget immediately again.
				</p><p>
				Lunch chatter fills the air, but your attention drifts as you're handed another
				aesthetically <b>hostile</b> card.
				You can tell by the aggressively minimalist font alone that this is another puzzle.
				Subrose must have stock in a printing company — [pause]or perhaps a psychiatrist’s practice.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					"Group puzzle time! Find your matching clue to decode the secret message and win a special prize!"
					reads the receptionist from another slip, sounding suspiciously rehearsed.
				</p>
				<p>
					You're paired off with people you've never met before.
					Your group includes someone who looks suspiciously like a startup founder from <i>LinkedIn™</i> circa 2013,
					a fellow intern nervously clutching three different notebooks,
					and a woman whose glasses suggest she could crack Enigma codes before her morning coffee.
				</p>
				<p>
					As you trade clues, you hear excited whispers mentioning Mikah's name.
					You swivel around just as the elevator doors part dramatically—at least,
					they would if not for the guy from facilities awkwardly holding them open.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					Mikah finally emerges, somehow looking both over and under-dressed in a cashmere hoodie and tailored trousers,
					hair arranged in deliberate disarray. Everyone acts as if they're seeing royalty,
					whispering and nodding reverently. Mikah strolls over, giving you an acknowledging nod.
					"We are a <i>weird</i> bunch. Glad to see you fit in."
				</p>
				<p>
					You converse with Mikah for a while, catching him up to the latest news of Purdue,
					his alma mater. You're reassured to finally see Mikah in person;
					you realize how much you've missed a familiar face in the last month.
					The conversation somehow turns towards "making impact" and "moving the needle" –
					being employed <i>has</i> affected your conversational skills more than you thought.
					After small talk, you become comfortable enough to ask Mikah what it is that Subrose actually does.
					Mikah pauses. [pause]
				</p>
				<p>
					"I have no idea and it's bugging me. But I'm finally getting assigned to a team today."
				</p>
				<p>
					Huh. [pause] You wish Mikah luck in his endeavor and make him promise to share his results of his quest with you.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					Your new teammates are already engrossed, arguing over letter substitutions and prime numbers.
					You rejoin the huddle, puzzle in hand, but your mind off-handedly chews on the idea: <i>What are we doing here exactly?</i>
					You shake it off as the puzzle in front of you needily demands more attention, like your first boyfriend but more interesting.
				</p>
				<p>
					An hour later, with no solution in sight, LinkedIn guy declares confidently, "<i>garble</i>" (your wrong-answer neurons engage and the rest of his answer disappears in TV static).
					The intern nervously suggests using <i>garble</i>.
					Glasses woman sighs audibly.
					Finally, you spot something others missed—the answer is:
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					As the lunch crowd disperses, you attempt to catch back up to Mikah.
					There's no telling when you're going to see him, or the rest of the lunch crowd again.
					Just before you can catch him, Mikah vanishes into a meeting room marked simply "PRIVATE."
				</p>
			</StoryParagraph>
		]
	},
	"olive-oil": {
		blurb: `Three employees walk into a bar. They don't get drunk.`
	},
	late_night_clarity: {
		blurb: "People vanish here... professionally, at least.",
		para: [
			<StoryParagraph noCursor={true} asciiArt={`***********#@%#****#############*+*####*=--==============-::::::::....:::::-*####%@@@%%##+:.:...:.  
***********#@%#***#@@@@@@@@@@@@@%%%@@@%%%%%%%%%%%%%%%%%%%%#######%###############%@@@%%##+:::::::: 
@@@@@@@@@@@@@@#***#@%%%#####*****+---------------------======++++++****#**%%#####%@@@%%##+=---=--: 
%%%%%%%#######****#@%%%%%########*=------------------=======++++++*#######%%#####%@@@%%##+-==---:: 
####**************#@%%%%%%#########*+-----------=====++++++++++++***######%######%@@@%%##+--=---:: 
##*****************@%%%%%%%%%#########+=-----=======++++++++++++*****#####%%####%@@@@%%##=------:: 
##*****************@%%%%%%%%%%%%%%%#####*-=========+++++++++++++*****#####%%####%@@@@%%#*=-------- 
##*****************%%%%%%%%%%%%%%%%%%%%%%*========+++++++++++++******#####%#*###%@@@@%##*======--= 
##*****************%@%%%%%%%%%%%%%%%%%%%%%#======++++++++++++++******#####@%####%@@@@%##*++======= 
##*****************@@%%%%%%%%%%%%%%%%%%%%%%#=====+++++++++++++*******#####@%####%@@@@%##*==----==- 
##*****************%@%%%%%%%%%%%%%%%%%%%%%%%#====++++++++++++++******#####@#####%@@@@%##+==----==- 
##*****************%@%%%%%%%%%%%%%%%%%%%%%%%%#===++++++++++++++*****#####%@#*###%@@@@%##=--------- 
###****************%@%%%%%%%%%%%%%%%%%%%%%%%%%#==+++++++++++++++****#####%@#***#%@@@%##*========== 
####***************%@@@@@@@@%%%%%%%%%%%%%%%%%%%#++++++++++++++++***######%@#####%@@@%##*++======== 
####***************#@@@@@@@@@@@@%%%%%%%%%%%%%%%%#******+++++++++***#####%%@#####@@@@%%##+++++++++* 
#####**************#@@@@@@@@@@@@@@@%%%%%%%%%%%%%%##**************######%%%@#####@@@@%%#######%%%%% 
######*************#@@@@@@@@@@@@@@@@@@%%%%%%%%%%%%###################%%%%%@%##%%@@@@%########%%%%% 
#######************#@@@@@*=====+==-=======++++==========-=-+======++=*%%%%%#*##################### 
#########**********#@@@@@@%%%@@@@@%@@%@%%@@@@@@@@@@@@%%%%%%%%%%%%%%%%@@@@@%++********+++========== 
###########******###***+++++++***=======+*###**************#********+********###****************** 
#############***######****++++++++++++*+**************#####%###################%%%%%%%%%%%%%%%%%%% 
################%%%%%%%%%%%%%%%%%%%%###*##***********#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% 
@@@@@@@@@@%%%#******#%%%%%%%%%%%%%%%###*++++++++++++++++++++++++++++++++++++++++++++++#%%######### 
@@@@@@@@@%####****###%%%%%%%%%%%%%%%###+++**######**+======================================+*##### 
@@@@@@@%#############%#%%#%%###########+++*******++=---=---------=========================----+*## 
@@@@%################%%%%%%%%%%%%%%%##***######*#****+===-----------=======+++===============-:-=+ 
@@%#################@@@@@%@%%@@%%%%%%%###%%%%##+##%**++=+=+==-==========+++****+===============-:- 
%#################%@@@@@@@@@@%%@@%%%%%###%%%%%%===+=--++++++===+======+++++*****+================= 
#################%@%%@%%@%@@@@@@@@@%%%#%%#%%%%%*%##*#*+***++++-=+++++++++********+================ 
######################*******************+++++++++++++++++=======++++++++++++++++================= 
`} />,
			<StoryParagraph>
				<p>
					It's been a week or three since the eventful team lunch. You look at the office in a new light,
					having realized that all those empty desks <i>do</i> have people assigned to them.
					Mikah hasn't replied to your messages – he must be really busy with his team.
				</p>
				<p>
					It's near the end of the workday. Somehow, your furniture-less apartment is less appealling than staying longer.
					Perhaps it has to do with the fact your room is a mattress and nothing else.
					As if encouraging you, the dull glow of the Apple Studio Display® flares up.
					You stare blankly at Karen's latest Slack message:
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
				<b>"ive put u up for a promo, u just have to finish this one thing"</b>
				</p> [pause]
				<p>
				No punctuation, as usual. The message itself stirs a cocktail of excitement and vague dread in your soul.
				A promotion for <i>an intern?</i> Did Karen somehow forget you're only here for a few months?
				You don't question it; <b>climbing the corporate ladder as a mere intern is exactly how you can compete
				with your ambitiously unemployed classmates in San Francisco</b>.
				</p>
				<p>
				Karen sends you a cryptic link to an internal document ominously titled "Project Chrysalis." [pause]
				</p>
				<p>"Chrysalis."</p>
				<p>
				Roll it around on your tongue, and <i>luxuriate</i> in the corporate.[pause]
				The document loads [pause] slowly [pause], as if reluctantly [pause] participating [pause] in your career advancement.
				</p>
				<p>
				It's generously seasoned with acronyms that the people who wear suits on Zoom whisper in their wet dreams.
				You recognize words like "synergy," "leverage," and not much else.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					You glance around—it's late. The office is empty. The abyss that is your Apple Studio Display® blends with the dark all around. [pause]
					Determined, you crack your knuckles and plunge into the puzzle embedded within Project Chrysalis' layers of corporate doublespeak.
				</p>
				<p>
					Hours pass, punctuated by staccato microwave beeps from the kitchen area.
					You're startled awake at one point by the sound of a vending machine angrily rejecting someone's dollar bills.
				</p>
				<p>
					You peek around the corner. <br />
					Under flickering fluorescents stands a lanky man in sweatpants, <br />
					looking half-defeated and half-asleep near the snack dispenser that seems to deny him treasure. <br />
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					He senses your gaze and turns slowly, bags heavy beneath eyes. You're immediately worried that this man is <i>a mirror to your own sad visage.</i>
					"This stupid thing," he mutters, accent faintly coloring his weary words, "holds my only chance at dinner hostage."
				</p>
				<p>
					A fellow <b><i>hungie</i></b> man. It is most natural to offer him your spare change.
					"Munir," he introduces himself, shaking your hand, "the resident insomniac. You must be new? Nobody <i>normal</i> stays here past 8 pm."
				</p>
				<p>
					Being called weird is a compliment in <i>these</i> circles. In the quiet loneliness of the office, you strike up an unexpectedly comfortable conversation. [pause]
					Munir reveals he's been at Subrose for almost a year—an eternity here, apparently.
					He jokes lightly, but a heaviness behind his eyes suggests otherwise.
				</p>
				<p>
					"So, Munir," you venture, having successfully navigated small talk, "do you actually know what Subrose does?" [pause]
				</p>
				<p>
					He sighs, glancing around; seemingly wishing that he could offshore the answer to someone else.
					"I've tried figuring it out. The deeper I go, the less sense anything makes. People vanish here," he pauses meaningfully,
					"professionally, at least."
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
				You think of Mikah's team assignment and vague curiosity settles firmly in your chest.
				Before you can ask him more, Munir glances at his watch and sighs dramatically.
				"Well, back to pretending I'm productive." He offers a tired smile and wanders off toward his Apple Studio Display®-laden desk.
				</p>
				<p>
				You return to your screen, determined but wary. [pause]
				As dawn filters softly through the blinds, you [pause] finally [pause] crack the puzzle within Project Chrysalis.
				</p>
			</StoryParagraph>,
		]
	},
	"implementation-challenge": {
		blurb: "There's no free lunch, even in sunny California.",
	},
	mushrooms: {
		blurb: "Are mushroos vegetables?",
		para: [
			<StoryParagraph>
				<p>
					The words "PROMOTION APPROVED 🎉" blink cheerfully across your screen. You lean back, basking in triumph.
					Corporate absurdity has no effect on you. [pause] For a second. [pause] It's gone now.
				</p>
				<p>
					You want to share this with a friend – the only friend you have here.
					You impulsively Slack Karen, optimism buoying your usually cautious approach. "Hey Karen, have you heard from Mikah lately?"
				</p>
				<p>
					Dots dance briefly at the bottom of the Slack window, then pause. Finally, Karen responds.
				</p>
				<p>
					"mikahs been fired" [pause]
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					 Fingers hovering hesitantly over the keyboard, you manage a shaky reply: "Why?" [pause]
				</p>
				<p>
					"bad culture fit" Karen sends back quickly, no punctuation—her signature disregard now more irritating than quirky.
				</p><p>
					Damn them to a thousand fiery hells. [pause] Nay, a million fiery hells. "They" is a nebulous concept,
					but you know that the list starts with the person who decided to fire Mikah. You are more alone than ever.
				</p>
				<p>
					Days blur again into puzzles and cryptic meetings. You're spiraling. 
					There's only the ping of new puzzles on your desktop, a regular paycheck that you have no clue how to spend, 
					and lunch debates that strain sanity. Today, the debate circles around mushrooms.
				</p>
			</StoryParagraph>,
			<StoryParagraph noCursor={true} asciiArt={`%%%%%%%%%%%%@@@@@@@@@@@@@%%%%%%%%%@@%%%%%%%%%%%%%%%%%%%%%%%%@@%%%%%%%%%@@@@@@@@@% 
%%%%%%%%%%%%%%%%%@@@@@@@%%%%%%%%%%@@@%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% 
###%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%@%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%###%%%%%%%%%%% 
####%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%################%%% 
#####%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%##########****########### 
######%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%########***********######## 
######%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%########*************####### 
#######%%%%%%%%%%%%%%%%%%%%%%%%%@@@@%%%%%%%%%%%%%%%%#########***********######### 
#######%%%%%%%%%%%%%%%%%%%%%%%%@@@@@@%%%%%%%%%%#*+===--=---==+**################# 
###########%%%%%%%%%%%%%%%%%%%%@@@@%%%%%%%%%++*#####*****++===--=*############### 
###########%%%%%%%%%%%%%%%%%%%@@%%%%%%%%%#*##**####%%%#%%%%%##*+===#############% 
############%%%%%%%%%%%%%%%%%%@@%%%%%%%#***+**####%%###########**++=#%%%%%%%%%%%% 
#################%%%%%%%%%%%%%%%%%%%%%#**++****####*#*+++****###**++=%%%%%%%%%%%% 
######################%%%%%%%%%%%%%%%#*++++**#*####*+=--=**+******+++%%%%%%%%%%%% 
%#####################%%%%%%%%%%%%%%%#+=+**##**####+=----=***##+++++*%%%%%%%%%%%% 
%######################%%%%%%%%%%%%%%#=+*##**###*##+=--::-#%##****++#%%%%%%%%%%%% 
%%####################%%%%%%%%%%%%%%%#*=+*#########+=--::-+##*+++++*%%%%%%%%%%%%% 
%%#########%%%%%%%%%%%%%%%%%%%%%%%#*++*+=*#########*=--:::-*#*++++*%%%%%%%%%%%%%% 
%%%%######%%%%%%%%%%%%%%%%%%%%%%*=**++**#+++**#####*==-::::+**++*#%%%%%%%%%%%%%%% 
%%%%%%###%%%%%%%%%%%%%%%%%%%%%#*+++++++**##*+++*****==-::::===+#%%%%%%%%%%%%%%%%% 
%%%%%%%%%%%%%%%%%%%%%##########*****+===*##*##*++=+*+=--:::=#%%%%%@@@@%%%%%%%%%%% 
%%%%%%%%%#%%%%%%###############*+*#***+++*%########*+==----+%%%%%%%@@@@%%%%%%%%%% 
%%%%%%%%%%%%%###################*#%%%##*++#####%%%%*++==---+%%%%%%%%%%@@@%%@@@@@@ 
@%%%%%%%%%%%%##################%%%%%%%%#*++#%%%#%%*+====---*%%%%%%%%%%%%@@@@@@@@@ 
@@%%%%%%%%%%%%#########%@%@@%@%%%%##%%##*+=+##%%#*+====--==#@@@@@%%%%@@@@@@@@@@@@ 
@@%%%%%%%%%%%%%%####%%**###%%%%%#%#*+*******#%@%##=========#%%@@@@@@@@@@@@@@@@@@@ 
@@%%%%%%%%%%%%%%%#**#****##%#%###%%%#*#*#**#%@@@%#+======++%%###%%%@@@@@@@@@@@@@@ 
%##%%%####******###******#%%@%#####%######%%##%%*+======++*%@@%%%#**####*%@@@@@@@ 
###%%%%%#*########%#####****####*#####%%%%%%%%@@%%#++=+++*%%%%%%###%%**####%%%@@@ 
%%####%%#*##********#%%%%##****#####%@%@@@@@@@%@@%**++***#@%@%%##%%#%%%@@@@%%%%%@ 
%##%##%%%#+**###########*######%#%%%%@@@@@@@@@@@%%#######@@%%%%#%%###%@@@@@@@%%%@ 
`} />,
			<StoryParagraph>
				<p>
					"Are mushrooms vegetables?" Derek asks earnestly. "They're both temporary fruiting bodies solely existing to propagate their species."
				</p>
				<p>
					"I'm a temporary fruiting body solely existing to propagate my species," you blurt. [pause]
					Silence descends. You stare forlornly at your fusion taco, suddenly aware of how little fruiting you've been doing lately.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					Late one evening, while mindlessly deciphering a puzzle involving "integrated synergistic paradigms," 
					Munir's head pops into your cubicle. His eyes, tired yet mischievous, shine dimly.
				</p>
				<p>
					"The second one ducks," Munir starts.
				</p>
				<p>
					You stare blankly. Munir raises an expectant eyebrow.
				</p>[pause]
				<p>
					"Two time travelers walk into a bar," he concludes with exaggerated patience.
				</p>
				<p>
					You offer a weak chuckle, but your distracted expression doesn't fool Munir. His face softens as he asks,
					"You seemed pretty sad about Mikah being fired."
				</p>
				<p>
					"It's everything," you admit wearily. "What are we even doing here, Munir?"
				</p>
				<p>
					He sighs sympathetically. "Honestly? Maybe it's time to ask Karen directly."
				</p>
				<p>
					Summoning all remaining resolve, you type a terse Slack message: "Karen, seriously, what does Subrose actually do?"
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					An agonizing pause follows, long enough to mentally update your résumé, when Karen's response finally flashes up:
				</p>
				<p>
					"warcrimes as a service"
				</p>[pause][pause]
				<p>
					Your pulse quickens. But before panic fully sets in, another message pops up instantly:
				</p>
				<p>
					"lol kidding we re just a WaaS relax"
				</p>
				<p>
					You sink back into your chair, knowing perhaps even less than before. The weirdness has gotten to you – 
					the isolation; the pointlessness of it all; and then being told you're working on WaaS, whatever the fruit that is.
				</p>
				<p>
					You send another message to Mikah like another pancake joining an already diabetes-inducing stack. 
					Perhaps he knows what WaaS stands for.
				</p>
			</StoryParagraph>,
			<StoryParagraph>
				<p>
					Like foot fungus reappearing, it happens slowly and then all at once.
					Three dots dance on the chat window, resolving into a ping! that reads,
					"You're probably tired of puzzles by now. But this is important. Prove to me you're ready to find out the truth."
				</p>
			</StoryParagraph>,
		]
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
