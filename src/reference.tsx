import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { anchorStyle, bgColor, Divider, IconButton, LocalStorage, Modal, Select, Text, textColor, transparentNoHover } from "./ui";
import { IconBookFilled, IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-preact";
import clsx from "clsx";

type ReferencePage = {
	key: string,
	title: ComponentChildren,
	body: ComponentChildren
};

const referencePages = [
	{ key: "intro", title: "Introduction", body: <>
		<p>
			Welcome to Subrose Systems! You've already made it past the hardest part (the hiring process).
			This is a primer for your basic responsibilities on the job.
			Of course, feel free to ignore all this and figure it out for yourself 
			(corporate will notice).
		</p>

		<p>
			Otherwise, click on the arrow above to continue. But I'm sure you already knew that.
		</p>
	</> },
		{ key: "overview", title: "Overview", body: <>
		<p>
			Your goal is to do something. Thomas hasn't decided yet. Pending tutorial levels.
		</p>
	</> },
		{ key: "registers", title: "Commands and Registers", body: <>
		<p>
			Your main tools are commands, which interact with your registers. 
			Registers can be of three different types:
			
		</p>
		<p>
			<b>Number: </b>You can figure out numbers.
		</p>
		<p>
			<b>Text: </b>Text is the main object of interest at Subrose Systems. Internally, we store them as lists of numbers
			between 0 and 25, representing lowercase letters from a to z. Of course, text is 0-indexed.
		</p>
		<p> 
			<b>Parameter: </b>We'll cover parameters in the Procedures section. 
		</p>
		<p>
		You can use as many registers as you like. Just don't use too many. 
		</p>
		<img src="/tutorial/registers.svg" />
		</>},
		{ key: "registers2", title: "Commands and Registers (cont.)", body: <>
		<p>
		When a procedure is run, it will execute commands in order, modifying registers as specified.
		We've provided you with some basic commands to get started. You can hover over each one for more information.
		</p> 
		<p>
		These built-ins exhibit special undocumented behaviors when used in special ways.
		These proprietary quirks give us an advantage over our competitors. 
		You will discover this yourself in time.
		</p>
		<img src="/tutorial/builtins.svg" />
		</>},
		{ key: "procedures", title: "Procedures", body: <>
		<p>
		Procedures are isolated programs you write, which can be called from another running procedure. They have their own registers and commands.
		</p>
		<p>
		Information can be shared with procedures through parameter registers. 
		Parameter registers gain a value when the procedure is called. 
		You can modify this value to change the register in the calling procedure as well.
		Main does I/O through a single parameter register, which is generated for you by default.
		</p>
		<p>
		Using procedures is highly recommended to stay productive, especially as your tasks become more difficult.
		</p>
		<p>
		You should document behaviors of your procedures by editing the comment box.
		</p>
		<img src="/tutorial/procedures.svg" />
		</>},
		{ key: "rebugging", title: "Running and Debugging", body: <>
			<p>
			Before running your code, make sure you've entered some input and your Main procedure has a parameter register.
			</p>

			<p>
			You can choose between running your procedure directly, or stepping through instruction-by-instruction. 
			You should see your registers and call stack update in real time. You can also enter a procedure while it's running 
			to see its internal state.
			</p>
			<p>
			When submitting, you will be judged on a randomly generated set of test cases. Your procedure must be sufficiently general
			to handle such input.
			</p>
			<img src="/tutorial/running.svg" />
		</>},
		{ key: "outro", title: "Conclusion", body: <>
			<p>
			This concludes the tutorial. Good luck.
			</p>
			<img src="/tutorial/internal.svg" />
		</>},
] as const satisfies ReferencePage[];

export function Reference({ referenceOpen, setReferenceOpen }: {
	referenceOpen: boolean, setReferenceOpen: (x: boolean)=>void
}) {
	const [page, setPage2] = useState(()=>{
		const i = referencePages.findIndex(x=>x.key==LocalStorage.referencePage);
		return i==-1 ? 0 : i;
	});

	const setPage = (x: number)=>{
		LocalStorage.referencePage = referencePages[x].key;
		setPage2(x);
	};

	const activePage = referencePages[page];
	
	return <>
		<Modal open={referenceOpen} onClose={()=>setReferenceOpen(false)} closeButton={false} >
			<div className="flex flex-col gap-2 items-stretch" >
				<div className={clsx("flex flex-row gap-2 justify-between", textColor.default)} >
					<IconButton className={clsx("transition-transform enabled:hover:-translate-x-1", transparentNoHover)}
						disabled={page==0} onClick={()=>setPage(page-1)} 
						icon={<IconChevronLeft size={32} />} />
					<Select options={referencePages.map((page,i)=>({
						label: page.title, value: i
					}))} searchable value={page} setValue={setPage} className="text-center flex place-content-center mt-1" >
						<Text v="big" className={anchorStyle} >{activePage.title}</Text>
					</Select>
					<div className="flex flex-row gap-2" >
						<IconButton className={clsx("transition-transform enabled:hover:translate-x-1", transparentNoHover)}
							disabled={page==referencePages.length-1}
							onClick={()=>setPage(page+1)} icon={<IconChevronRight size={32} />} />
						<IconButton className={transparentNoHover} onClick={()=>setReferenceOpen(false)} icon={<IconX size={32} />} />
					</div>
				</div>
				<Divider className="my-0" />

				<div className="min-h-0 pb-5 overflow-y-auto indent-4 flex flex-col gap-4" >
					{activePage.body}
				</div>
			</div>
		</Modal>
		<IconButton icon={<IconBookFilled />} onClick={()=>setReferenceOpen(true)}
			className={clsx(referenceOpen && bgColor.highlight2)} />
	</>;
}