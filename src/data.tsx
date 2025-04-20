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
    {
        type: "story",
        name: "Chapter 3",
        key: "team_lunch",
        blurb: "Like terminites emerging from the woodwork.",
        para: [
            <StoryParagraph noCursor={true}>
                <pre>
:.+@@@@%###**#%#*##*+----:.:::--:-*-:--....::-:---:-*=-:::::::::-=-::--++#@@         ....  <br />
:-*%@@@@@%@@@@@%@@@@@@%####*#*%@%%@ .=#=***%%#+@*++%@%*+*%##%%%%%#%%%%%@@@*  .-====+%*==+  <br />
:@%+@@@@@@@%%@@%@@@@@@@%##%%####%@@.+*%#@@@*#++#=%+@@**%@%#%%%%%@@@@@@@@:  :#%@%@@#%%#--=  <br />
:+@%%@@@@@@%@@%@@@@@@@@@@%###%#%%@*:@%%+*@@%@@+*+%+@@##%%#%@@@@@@@.      =%@@@%*######+::  <br />
:.*%@@@@@@@@@@%@@@@@@@@@@@@@@@@@@@#-#*@-.*::%#*@@@%@%#@@@@@@.     -=%@@@@@@@*===*++**++*-  <br />
:.=*#@@@@@@@@%@@@%@%%@@@@@@  + .*@@@@@@@@@%+%***+=*@@@@:    %@@@@@%@@%%#%*+#%@@@@@@@@@@@@. <br />
:.-+%@@@@@@@@@@@#%%@@@@@@@@  ..+   =-....*@@@@@@@@@@@. =#%%%.:@**%@##=*:*#%#**+++==+#%@@%. <br />
::==+@@@@@@@%%@@%@@@@@@@@@@  =++-@@###=.:       *  @@% :=:.  -@@#+%#*+*#@@@@@%#%#*+=--==*. <br />
:.+*+%@@@@@@@@@%@@@@@@@@@@- .+: *  :=..#=..:+####.%..**.*=-%@= ..:#%@@@@=   %@@%@@*@@@@@@. <br />
::%%+%@@@@@@@@@@@@@@@@@@@@@ .-=-=    *-  @= ..:.*@@@@#@@@@@@#%@@@@@@:  = .%   +@#=+*=+%%%. <br />
:.@%+%@@@@@@@@@@@@@@@@@@@@  .++ . .. +* .#@# :=       .   .@@@%%#=*#:@@@* .    .#%%%*:.:*  <br />
:.%#*@@@@@@*   .+@@@@@@@@@ .*    .    .    *.. @##########    .:#*@:.:.:+*@@@@@@@@ . .@ :  <br />
: *#%@@@@@%++%:.=@@@@@@@@-  ...@@@@%#@@-+@-#*.=@.::#%%.@@%#%.+: . :*%#*=-         %%%@%#=  <br />
:.%##%%%%@#%#*.=@@@@@@@@@  ...##=%#:-##@%%    @:.. .##.....*@#  :.  =##+:#@#@%@%:  #+@*:-  <br />
:=@%#*##@%#%@@@@@@@@@@@@@  .+ :   : .   . *+: @:#@@%%#..@@% +##%@=@-  -        -#+.. :%*#. <br />
:.*++++%%%@@#-..=@@@@@@@    . ...-:.@@ .-+.  .%.@ .*####@.%@@%#%*=  *@..=:*%%-#-..::+#:.   <br />
: %@@@%@@@@##*#*-*@@@@@@ %%=@@@#-::+   @@:*-:-@-@@-..:==%*:.@@%@.=-=-=@*====- .##=:.    +  <br />
::@=-+*#@..:--=*+. .=@@:  .:. . :.. ..   .=#::.##*@*@@:@-=@%.%#% :::.    .%#%#: =..@@@%#+# <br />
:   --..=-+%@#@@@@@*==@  ..     .++***+.  .=+#::%#%.+=-%%##@%@- ...=#=+-@.   % ...@%##*%@# <br />
:    :..@@@@@@@@@@@@@@@  ...=+***:-+==+#@@%=  .:. #=@%@@@@@-.... ...-  *=+@.   @@@@#%%%%%+ <br />
:**=-::%@@@@@@@@++%@@.   *: *.. @.  .....--#%%: .@@.:   ...:-. -......=%= =%:.%@@@@@@@@@%+ <br />
:@@@@@@@@@@@@@@@@@@@@  *%.=...=-#@%.  :    .--#% #=.-##=-    --=-=%*=-:.:%=:.@@@@%%@@@@%%* <br />
:@@@@@@@@@%=-:+==#%@:  + :   -     @@    @...-...  ...:: -=++:...#. .-=*+-...@@@%%%%@@@@@* <br />
:#@@@@@@@@@@@%@@*@@@   *- @@#=-#+.   @+.. .:..** @=-+--..:.  .::...=@:- .   @@@@%%%@@%%%%+ <br />
:@@@@@@@@@@@@@@@@@#  *#.. *-.-%*#++=. @:.. .. :..:%.:=:#--=*:@....@@+ . .. @@%@%%@%%%@@@%+ <br />
:@@@@@@@@@@@@@@@@ . %@*%#   %#*:*: -..%:+=.##=-#:#=+.-: :--=.::. @@@ @= . #@@%@%@@@@@%@%#+ <br />
:   .  ...-:-.. # #@@# +%%:-%%. . +#. .@-::..  *% .-@@    @#.@ *.@@@ @    @@%%@@@%%%%%@%%+ <br />
:.=  .%%**@@%@@@@   @## #@%*   :+%@@#  %:..+%%* -##=..@@@    . .@%@ @@ . .@@@@@@%%#%@@%%@+ <br />
:.-+%@%=.+#:  %@@ - *  .%%%#+.. +@#- #*%  .   :-..  @@@ @@. @  *@@@ @ .: @%***#%@%%@@%%%%+ <br />
: #%+# ::       # @*:@%.=:%%#-=:*##.-.-@% ##+-:. @::%@#   @@@ .@@@.@   @ @@@@@@%%#%%%@@%@+ <br />
: ..  .%@@@@@@@-:  @###-%:%%:: .. .   @*@=:-:..  @%@@@    @##  *:@ .  + .@     =@@@@@##%@* <br />
:  .@%#-%..:-.##*#. %@ @#%.%#.=   +. %#  # .:@. @@ @@  :.@@@  :@@  +. + *@@@@@@@   :@@@@@* <br />
:.-%:@%@%%@@@@%  -#*-##@%%:@%#%%%*: %#####-  .  @@ %  .:.@@@ %@@* .* %# +*    .@@@@@#---@@ <br />
:  -#.+%@# #  @@. #.   .##+@@#=.   ##.:-%* .:. @@@.. -:.  : @@@@  =..:= .@@@@%:   :::-:..  <br />
: .-  .%.*:  %%   #%% %.%%%@ :*+@@..    +  :.. *@ .--+-.-@    .  .*..:.. .%@@@@@@%.. +.++. <br />
:..#%@# .###%% - . # +@@*%@.....:..@@@@@@ .-:..@@ -.:-. #= @@@ . -=#==:. @%@.@@  ##+@@@%.  <br />
::@@  +%.:-#.   .=@@ .%@@%+.%@@%= @@@ @@ ::...  :.%:--..@ +@. :+.-. .....#@.  .-@%-=-:+.@  <br />
:   --..:.%.  @@@#  #: .....=+.  .@::.@@ .-.@..:  .. . .  ..-.+-::.-:.%+   -@@#   :-%% :.  <br />
                </pre>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                It’s your first team lunch!
                People have shown up to the office in never-before-seen droves,
                and every buzz of the entry gates drives your eyebrows further up
                as you observe strangers sitting at the previously-empty desks around you,
                like termites emerging from the woodwork after a fumigation.
                Subrose, it appears, might actually be a publicly-traded company after all.
                </p><p>
                "There's sushi, pizza, salad, and something the caterer calls
                'international fusion tacos,'" announces the receptionist, whose name
                you swear to yourself to remember this time. You forget immediately again.
                </p><p>
                Lunch chatter fills the air, but your attention drifts as you're handed another
                aesthetically hostile card.
                You can tell by the aggressively minimalist font alone that this is another puzzle.
                Subrose must have stock in a printing company—or perhaps a psychiatrist’s practice.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                    "Group puzzle time! Find your matching clue to decode the secret message and win a special prize!"
                    reads the receptionist from another slip, sounding suspiciously rehearsed.
                </p>
                <p>
                    You're paired off with people you've never met before.
                    Your group includes someone who looks suspiciously like a startup founder from LinkedIn circa 2013,
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
                    "We are a weird bunch. Glad to see you fit in."
                </p>
                <p>
                    You converse with Mikah for a while, catching him up to the latest news of Purdue,
                    his alma mater. You're reassured to finally see Mikah in person;
                    you realize how much you've missed a familiar face in the last month.
                    The conversation somehow turns towards "making impact" and "moving the needle" –
                    maybe being employed has affected your conversational skills more than you thought.
                    After small talk, you become comfortable enough to ask Mikah what it is that Subrose actually does.
                    Mikah pauses.
                </p>
                <p>
                    "I have no idea and it's bugging me. But I'm finally getting assigned to a team today."
                </p>
                <p>
                    Huh. You wish Mikah luck in his endeavor and make him promise to share his results of his quest with you.
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
	puzzleTy[2],
    {
        type: "story",
        name: "Chapter 3",
        key: "team_lunch",
        blurb: "Like terminites emerging from the woodwork.",
        para: [
            <StoryParagraph noCursor={true}>
                <pre>
***********#@%#****#############*+*####*=--==============-::::::::....:::::-*####%@@@%%##+:.:...:.  <br />
***********#@%#***#@@@@@@@@@@@@@%%%@@@%%%%%%%%%%%%%%%%%%%%#######%###############%@@@%%##+:::::::: <br />
@@@@@@@@@@@@@@#***#@%%%#####*****+---------------------======++++++****#**%%#####%@@@%%##+=---=--: <br />
%%%%%%%#######****#@%%%%%########*=------------------=======++++++*#######%%#####%@@@%%##+-==---:: <br />
####**************#@%%%%%%#########*+-----------=====++++++++++++***######%######%@@@%%##+--=---:: <br />
##*****************@%%%%%%%%%#########+=-----=======++++++++++++*****#####%%####%@@@@%%##=------:: <br />
##*****************@%%%%%%%%%%%%%%%#####*-=========+++++++++++++*****#####%%####%@@@@%%#*=-------- <br />
##*****************%%%%%%%%%%%%%%%%%%%%%%*========+++++++++++++******#####%#*###%@@@@%##*======--= <br />
##*****************%@%%%%%%%%%%%%%%%%%%%%%#======++++++++++++++******#####@%####%@@@@%##*++======= <br />
##*****************@@%%%%%%%%%%%%%%%%%%%%%%#=====+++++++++++++*******#####@%####%@@@@%##*==----==- <br />
##*****************%@%%%%%%%%%%%%%%%%%%%%%%%#====++++++++++++++******#####@#####%@@@@%##+==----==- <br />
##*****************%@%%%%%%%%%%%%%%%%%%%%%%%%#===++++++++++++++*****#####%@#*###%@@@@%##=--------- <br />
###****************%@%%%%%%%%%%%%%%%%%%%%%%%%%#==+++++++++++++++****#####%@#***#%@@@%##*========== <br />
####***************%@@@@@@@@%%%%%%%%%%%%%%%%%%%#++++++++++++++++***######%@#####%@@@%##*++======== <br />
####***************#@@@@@@@@@@@@%%%%%%%%%%%%%%%%#******+++++++++***#####%%@#####@@@@%%##+++++++++* <br />
#####**************#@@@@@@@@@@@@@@@%%%%%%%%%%%%%%##**************######%%%@#####@@@@%%#######%%%%% <br />
######*************#@@@@@@@@@@@@@@@@@@%%%%%%%%%%%%###################%%%%%@%##%%@@@@%########%%%%% <br />
#######************#@@@@@*=====+==-=======++++==========-=-+======++=*%%%%%#*##################### <br />
#########**********#@@@@@@%%%@@@@@%@@%@%%@@@@@@@@@@@@%%%%%%%%%%%%%%%%@@@@@%++********+++========== <br />
###########******###***+++++++***=======+*###**************#********+********###****************** <br />
#############***######****++++++++++++*+**************#####%###################%%%%%%%%%%%%%%%%%%% <br />
################%%%%%%%%%%%%%%%%%%%%###*##***********#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% <br />
@@@@@@@@@@%%%#******#%%%%%%%%%%%%%%%###*++++++++++++++++++++++++++++++++++++++++++++++#%%######### <br />
@@@@@@@@@%####****###%%%%%%%%%%%%%%%###+++**######**+======================================+*##### <br />
@@@@@@@%#############%#%%#%%###########+++*******++=---=---------=========================----+*## <br />
@@@@%################%%%%%%%%%%%%%%%##***######*#****+===-----------=======+++===============-:-=+ <br />
@@%#################@@@@@%@%%@@%%%%%%%###%%%%##+##%**++=+=+==-==========+++****+===============-:- <br />
%#################%@@@@@@@@@@%%@@%%%%%###%%%%%%===+=--++++++===+======+++++*****+================= <br />
#################%@%%@%%@%@@@@@@@@@%%%#%%#%%%%%*%##*#*+***++++-=+++++++++********+================ <br />
######################*******************+++++++++++++++++=======++++++++++++++++================= <br />
                </pre>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                    It's been a week or three since the eventful team lunch. You look at the office in a new light,
                    having realized that all those empty desks do have people assigned to them.
                    Mikah hasn't replied to your messages – he must be really busy with his team.
                </p>
                <p>
                    It's near the end of the workday, and yet you aren't looking forward to going back to your furniture-less apartment.
                    Maybe you should stay a bit longer. As if encouraging you, the dull glow of the Apple Studio Display® flares up.
                    You stare blankly at Karen's latest Slack message:
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                <b>"ive put u up for a promo, u just have to finish this one thing"</b>
                </p> [pause]
                <p>
                No punctuation, as usual. The message itself stirs a cocktail of excitement and vague dread in your soul.
                A promotion for an intern? Did Karen somehow forget you're only here for a few months?
                You don't question it; climbing the corporate ladder as a mere intern is exactly how you can compete
                with your ambitiously unemployed classmates in San Francisco.
                </p>
                <p>
                Karen sends you a cryptic link to an internal document ominously titled "Project Chrysalis."
                The document loads slowly, as if reluctantly participating in your career advancement.
                </p>
                <p>
                Project Chrysalis is generously seasoned with acronyms that the people who wear suits on Zoom whisper as they dream of better days.
                You recognize words like "synergy," "leverage," and not much else.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                    You glance around—it's late. The office is nearly deserted again, its daytime vibrancy evaporated into eerie silence,
                    illuminated solely by a sea of monitors left in various states of disarray.
                    Determined, you crack your knuckles and plunge into the puzzle embedded within Project Chrysalis' layers of corporate doublespeak.
                </p>
                <p>
                    Hours blur together, punctuated by occasional microwave beeps from the kitchen area.
                    You're startled awake at one point by the sound of a vending machine angrily rejecting someone's dollar bills.
                </p>
                <p>
                    Curiosity piqued, you peek around the corner.
                    Under flickering fluorescents stands a lanky man in sweatpants,
                    looking half-defeated and half-asleep near the snack dispenser that seems to deny him treasure.
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                    He senses your gaze and turns slowly, bags heavy beneath eyes that could tell stories of sleeplessness and late-night despair.
                    "This stupid thing," he mutters, accent faintly coloring his weary words, "holds my only chance at dinner hostage."
                </p>
                <p>
                    You offer him your spare change. Gratitude floods his exhausted expression as he retrieves a candy bar like he's just defused a bomb.
                    "Munir," he introduces himself, shaking your hand, "the resident insomniac. You must be new? Nobody normal stays here past 8 pm."
                </p>
                <p>
                    You laugh, introduce yourself, and in the quiet loneliness of the office, strike up an unexpectedly comfortable conversation.
                    Munir reveals he's been at Subrose for almost a year—an eternity here, apparently.
                    He jokes lightly, but a heaviness behind his eyes suggests otherwise.
                </p>
                <p>
                    "So, Munir," you venture, having successfully navigated small talk, "do you actually know what Subrose does?"
                </p>
                <p>
                    He sighs, glancing around reflexively, as though worried that even the walls might overhear.
                    "I've tried figuring it out. The deeper I go, the less sense anything makes. People vanish here," he pauses meaningfully,
                    "professionally, at least."
                </p>
            </StoryParagraph>,
            <StoryParagraph>
                <p>
                You think of Mikah's team assignment and vague curiosity settles firmly in your chest.
                Before you can ask him more, Munir glances at his watch and sighs dramatically.
                "Well, back to pretending I'm productive." He offers a tired smile and wanders off toward his dimly lit desk.
                </p>
                <p>
                You return to your screen, determined but wary.
                As dawn filters softly through the blinds, you finally crack the puzzle within Project Chrysalis.
                </p>
            </StoryParagraph>,
        ]
    },
	puzzleTy[3],
	puzzleTy[4],
	puzzleTy[5],
	puzzleTy[6],
	puzzleTy[7],
	puzzleTy[8],
];
