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
            <StoryParagraph noCursor={true}>
                <pre>
+=============================================================================================++==-=++++*++++***  <br />
===============================================================================================-++++*+++#**++**# <br />
==========================================================================================+====+*+==*****#+*#%%# <br />
=======================================:=================================================--=+++*=++*#***###%%%%% <br />
=======================================%*%=================================================--=*+==+******#%#%%%% <br />
=====================================++*%##+====================================================-+#*#**###%%%%## <br />
======================================@*%#%**=============================================+==-:+##*%#*###%%%%### <br />
=====================================#*%%##%%*==========================================-====+=*=+**#%%%**#*#%%# <br />
===================================---=====+*%#+=========================================---=++===**###*##***### <br />
+====+=++========================:.::=+==++====-========================================-=*+=+*####**+##%%##*++# <br />
=+===++++======================-.:-..---#%*======================================+=+======*-=###%##%%**#+%%###%# <br />
=+====+=++==+===================-.==-=-=*#++=++==================================+#%**#+==+*######%+#**+%#%#+*#% <br />
========+===+====================-=+.-:-=++=-=================================***#*+**##*######*##%##++#%#**+#%# <br />
++++=++=+=====++=+=+=============-:=:=:-+===-+==============================++**#+###%%##**########%%###%%#####* <br />
=++****++==*++==+=====+==========-==:-:-%#+=-=================================+*+**##*#%%%#%%%#%##%%%###%%####*% <br />
+*+++=*+====+==+=+===============-=-:=:-@@%+-===================================+====**##%%%%%%##%*##%%%%%%@%#+# <br />
**==*+++++++=++====++++==========-=-:=:=====--===================================+*++*+*####%%%####%#*#%%%%%***# <br />
**+****+++*=+++=+++==============--.:===---==-================================**++*%##****#*#%%%%%%%@%##*%%#%%*+ <br />
++*++**+**+++++===+====+========-...:====#+==-=================================*+=*#****###***###**%*=+*+=**#### <br />
+==+=++++++=++++*++=+===========:...:==*=--==--================================++#*++*++*########+#%#**#++*==*## <br />
*+**++***+*++=+**=+++===========:.-.:===+=++=--================================+==****++*#++#%%%%%%%###*+####### <br />
**+*+++*+*****#*#**==*+====+====:.:.:===-------=================================+#*********+#%#*##%%%###@%%%%@%# <br />
*#+*****+=+*=++***##*++==++=====:...:=---=-----==========================*#*+===+******#******######*##*%%##%%%% <br />
++++**=****+=*=+####=+=+=======-:+=-+*+++*##*===========================++++#*****##**###*##%##%%%%%###*#*#%%#*% <br />
*=*+*****+*+***++*+==+==========----+*#*###*####====================+=+##*+=*##**#+###*#%##%##%%*+#%%++*%%%%%@%% <br />
*+*+*******##**+===+=======+==+==+==**#########*======================#####**##*+*#=*###%##%%%#*##*#*########%%% <br />
#*+**+*****+++=+*++==+====++*++=====*######*###*=======================*%#*##%#**#+=#+#*###%######%%%%##%##%#%#% <br />
+%**+#**+****###**#*#*****+**#*====-*####%#####*=======================+=+*###***#*+*++*+#%#*#%%%#%##%####%%#%#% <br />
#*+++**#********+*#***#*****+==++=--*###%%#***#*=========================+#+=+***++****#+=+*#%%%#*###%##%%%#*### <br />
+++****+***+*#*####*+*##***##**====-*#*####*##**=======================+==*#*#####++***###**#**####**#*##%%%##%% <br />
**+#**####******+*+*#++*+#####++++==*######**##*=====================+*##++%%##*###*####****###=**#%*++*%%%%%### <br />
+*#+*++##+*+**++****#***#*###**++===*#########**-==================+###*#*##+++++##***#**+*#####%##*+#*####%%%%* <br />
#*+*++++********++##*****#*+**+=====*##*###*##**---=====---------=**#%%%##%####%%#######++###*+*+-*#*##***##**#* <br />
###**+-=++****#***##+**#***+*##+--:=####********=------------------====***#%%%%%#######*+*#**=*##*+*###+#***+#%# <br />
                </pre>
        </StoryParagraph>,
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
            <StoryParagraph noCursor={true}>
                <pre>
:---------------------------------------- <br />
::*#+##     *##*+++==#+:---=++++++++++++- <br />
:.+=:  =####*=---:  #%#:===--=++++*++*++- <br />
:::**+=:=+++==@%@@@- -%@@%%@#==+     =+=- <br />
::=+ :+++ .:-:-:.#@@*@#@@-------+*****++- <br />
:.:.:==+=--@@@@@@.@@:@*@----*#*=--=+=++=- <br />
::+++==--:**+  --@@%##@@-.@%@@@%---===++- <br />
:.=====-#%@@@@@%*+:@+#@+@@**@=#%##-===+=- <br />
:.=====:@#=::.-=##-%@@@#++--.----*======: <br />
:.====::-- @@%%-==--:+@#+@@@@@----:--===: <br />
: ------:#%%%%@@@@--.+*@%@@@%%###*=----=: <br />
: ==---####= :::--@@@@@.-:.=##########--: <br />
: ---%@*-------=%#%@+@-+@@@-------==###:  <br />
:   #.       #%#*=@  @  :#@@%#---------=  <br />
: -        #@@+   .. @ .. *##=:::::-----: <br />
:   :---=:@%@@.:-  ..@.. .-+@--:---:..::  <br />
: =- .    -%@:  ::   +..=.   .:-:-.-----. <br />
: -=+****+-@.:..:. ..@@.:--::-:::-::::::  <br />
: ..::::.    :===+*+ %% =-----::::::::--  <br />
: ::...::::....::.:::#*.:--::-:--:::-:::  <br />
: ..:.::...::....::-.%@.:::::::::::--..:  <br />
: ---..:-::::--:::.::#%.:-------====:::=  <br />
:                    +=              @    <br />
:-@@@@@@@@@@@@@@@@@@+*@#%%%%@@%@@@@@#@%@- <br />
::====-==-=-==-::.--.#*::-*-.--::.......  <br />
:    ::::-:--:---==- @*:-:.   .....       <br />
: %%%#*+==:...::... .@........:::::::---  <br />
:   .......::::..:..-@+  .@@@...:::-....  <br />
: +-+===---::.......%@@%*@ ..=    .....:  <br />
: :.....:.--.@@@@@@@@. .+=#%@@@@@@=#**=:  <br />
: .-::::-...:. .-%@#@@@@@@#@*--++::...--  <br />
: -:.::-:::::...                  ......  <br />
:   ..                                    <br />
:@@+ - @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ <br />
:@@@@@@ @@@@@@@@@@@@@@@@@@@@@@@@#*#*#**@@ <br />    
                </pre>
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
            <StoryParagraph noCursor={true}>
                <pre>
::.::::---------:::::::::----------------------------: <br />
:::--------------------------------------------------- <br />
:-:--------------------------------------------------- <br />
:----------------------------------------------------- <br />
:-------:--------------------------:------------------ <br />
:---------:=-----:-----------------.------------------ <br />
:-:---------:---=-:----:----------=:------------------ <br />
:--:::-----:-:--+-.--:-.----::---.---.----::---------- <br />
:---:--..-.-:-=:%-.-=-.=:---:.--:-=--=---=.----------- <br />
::------::-=---:#-:-.-+@:--=-.=----==.-.:--:---------- <br />
::---------:+:--%-:@.-:=---.+:=-.==:--*#-------------- <br />
:::..:::---=:-+--@.-@@.+=.==-+%*.+..#%-+--=:---------- <br />
::---+:+-=:+--:-:*@.:#-#%.:@:*.*+#=-*+-.=-:=::--::---- <br />
::::----+:==:@:@+.++%*..@-:@:%#@=+-@-.::=::-=-=------- <br />
:----.+:--=%.@-=%*+@-@%.*@-@.@.@*=*.=-%-%--:..:------- <br />
:-::--:-+#=@:@@@@@@--@-@.@#@-@.@=.*-@#.:-:=----------- <br />
:------:.-:::*+-..*=:@@@:@@.*.@++%+=.-:*=------------- <br />
:--::-----------%@@=@*%-@:@.#+@*-%+#*----------------- <br />
:----------------@@:@-*@#@@.-@:-#@+----::------------- <br />
:---------------- @@@@@@@@@@@+@@% -------------------- <br />
:----------------#                -------------------- <br />
:--:-------------#:.......   .   .-------------------- <br />
:::::::----------#-  ...     .   --------------------- <br />
:----------------%-....      .   --------------------- <br />
: +++==+++++++**=*+.....         *=+==---===+=-------- <br />
: :.............: #.  .....  .   =............:....... <br />
: :.:::---------=:#:.......     ==--::::::::.........: <br />
: .:............::*-......      =......     . .        <br />
: =====++*****###*@@-::.....   .-..........:::--:----: <br />
: .:..::::......:::=*##*=-::::.........::-:.   .       <br />
: =--==---===+++-:..  ::---::. .....       ....:-.==++ <br />
:.---::----==--=::::-:........::::------==-:...  ..... <br />
:   .             ::::::.:----.::....     .:---=-:...  <br />
:...     .      .. ..........                 .                                                      
                </pre>
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
            // <StoryParagraph end={{
            //     type: "choice",
            //     key: "intro_choice",
            //     choices: [
            //         { value: "accept", label: "Accept the challenge" },
            //         { value: "decline", label: "Walk away" }
            //     ]
            // }}>
            // </StoryParagraph>
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
    {
        type: "story",
        name: "Chapter 2",
        key: "first_payslip",
        blurb: "Karen, who?",
        para: [
            <StoryParagraph noCursor={true}>
                <pre>
:          -------   -------                                      @@@@@@@%                                                 @@@@@@@               <br />
:          ------=- -======-                                      @@@@@@@@                                                @@@@@@@@               <br />
:          -------- -======-                                      @@@@@@@@                                                @@@@@@@@               <br />
:          -------- -======-                                      @@@@@@@@                                                @@@@@@@@               <br />
:                   -======-                                      @@@@@@@@                                                @@@@@@@@               <br />
: ----------------  -======-  ---==--             @@@@@@@@@@@@@   @@@@@@@@      @@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@     @@@@@@@@     @@@@@@@@@ <br />
:------------------ -======- --=====--          @@@@@@@@@@@@@@@@  @@@@@@@@    @@@@@@@@@@@@@@@@@@@@@    @@@@@@@@@@@@@@@@@  @@@@@@@@    @@@@@@@@@  <br />
:------------------ -======- -======--         @@@@@@@@@@@@@@@@@  @@@@@@@@   @@@@@@@@@@@@@@@@@@@@@@   @@@@@@@@@@@@@@@@@@@ @@@@@@@@  @@@@@@@@@    <br />
: ----------------   ------- --------          @@@@@@@       @@   @@@@@@@@  @@@@@@@@@@  @@@@@@@@@@@  @@@@@@@@@   @@@@@@@  @@@@@@@@@@@@@@@@@@     <br />
:                                              @@@@@@@@@@@@       @@@@@@@@ @@@@@@@@        @@@@@@@@ @@@@@@@@              @@@@@@@@@@@@@@@@       <br />
: *******  *******   ................           @@@@@@@@@@@@@@@   @@@@@@@@ @@@@@@@         @@@@@@@@ @@@@@@@               @@@@@@@@@@@@@@         <br />
:********  ******** .---------------..             @@@@@@@@@@@@@@ @@@@@@@@ @@@@@@@@        @@@@@@@@ @@@@@@@               @@@@@@@@@@@@@@@%       <br />
:******** ********* .---------------..                   @@@@@@@@ @@@@@@@@  @@@@@@@@      @@@@@@@@@  @@@@@@@@     @@@@%   @@@@@@@@@@@@@@@@@@     <br />
: ******* *********  ...----------...           @@@@@@   @@@@@@@@ @@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@ @@@@@@@@  @@@@@@@@@@   <br />
:         *********                            @@@@@@@@@@@@@@@@@  @@@@@@@@   @@@@@@@@@@@@@@@@@@@@@@   @@@@@@@@@@@@@@@@@@  @@@@@@@@   @@@@@@@@@%  <br />
:         ********* ....--:                     @@@@@@@@@@@@@@@   @@@@@@@@      @@@@@@@@@@@@@@@@@@@      %@@@@@@@@@@@@    @@@@@@@@     @@@@@@@@@ <br />
:         ********* .------.                          @@@@                          @@@                       @@@                                <br />
:          ******** .------.                                                                                                                     <br />
:          *******   ......                                                                                                                      <br />
                </pre>
            </StoryParagraph>,
            <StoryParagraph>
                Three days into the puzzle, you’ve figured it out.
                As soon as the login screen resolves into a snazzy desktop, a Slack notification fouls the new-desktop smell.
                You’re impressed – they’ve already ensnared you into the corporate hive-mind without action on your part.
                It’s Karen, no last name (and no profile photo), who claims to be your mentor for the internship period.
            </StoryParagraph>,
            <StoryParagraph>
                Looking around at the sea of empty desks around you, you choose to believe this at face value. Karen introduces herself as a bouldering and hiking enthusiast who migrated from the Midwest to work on awesome and world-changing things at Subrose, giving her the unenviable distinction of having the exact same story as one in three female software engineers in the Bay Area.
            </StoryParagraph>,
            <StoryParagraph>
                <p>You’re worried that the previous thought makes you sound like an ass, and you’re probably right.
                Keeping to the stereotype, she doesnt seem to know that punctuation exists</p>
                Karen sends you some more cryptography exercises and you finish off your first week of work,
                having only met the receptionist and not having mustered up the courage to talk to the indistinct figures on the far reaches of the office floor.
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
                As a twenty year old, your lofty ambitions have been besieged by the endless buffet of free food and a paycheck
                large enough to forgive the existential guilt of abandoning all idealism.
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
                <p>There's Egor Gagushin with a desk near the fire exits, who somehow has the vanity Slack username of <b>“eggag33”</b> – something you immediately envy him for.</p>
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
            <StoryParagraph>
                <pre>        
:      .=-------------------------:+-                          <br />
:       :........................  :=+.                        <br />
:       :........................  .::-=                       <br />
:       :........................  .:..:==                     <br />
:       :........................  .:...::=-                   <br />
:       :......................... :=------=*=                 <br />
:       :.....                       .   ....:+.               <br />
:       :..                                   .                <br />
:       :..  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@= ..:                <br />
:       :..  .                              ..:                <br />
:       :..                                 ..:                <br />
:       :..  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@* ..:                <br />
:       :..                                 ..:                <br />
:       :..                                 ..:                <br />
:       :.. .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ ..:                <br />
:       :..                                 ..:                <br />
:       :....                             ....:                <br />
:      .........................................               <br />
:    #############################################@@@@*        <br />
:   ########################################### -.:::*@@@      <br />
:   -#########################################:-###     @@     <br />
:   -###### ......  ###        :###: ..     #.-*##+     %@@    <br />
:   -#######..####.  ##  #####  =###  #######--*##+      +     <br />
:   -#######.       ###  +####   ###       -#*-*##*            <br />
:   -#######.  -:*#####  #####  :###  #######...=#:.========:  <br />
:   -######=. #########   #+    ####  ####*...:....:-==+==++## <br />
:   -######+  #########      .######  ####*.:-----....:-----=* <br />
:   +######################################.------.@@::-----=+ <br />
:    ######################################.:----:.@@.:-----=+ <br />
:                                         ..------....:-----=* <br />
:      .::::::::::::::::::::::::::::::::::=#*+++++++++++++++#+ <br />
:                                           ................   <br />
                </pre>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                Just before leaving for the day, you receive a locked PDF payslip.
                Surely there’s been a mistake, why would your payslip be <i>password-protected</i>?
                The email, surely flouting a dozen state laws about payslip documents, states "<b>Worthy are those who claim this prize.</b>"
                </p>
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
	puzzleTy[1],
	puzzleTy[2],
	puzzleTy[3],
	puzzleTy[4],
	puzzleTy[5],
	puzzleTy[6],
	puzzleTy[7],
	puzzleTy[8],
];
