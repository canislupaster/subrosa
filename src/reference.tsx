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
			(highly recommended for masochistic or similar individuals)!
		</p>

		<p>
			Otherwise, click on the arrow above to continue. But I'm sure you already knew that.
		</p>
	</> },
		{ key: "overview", title: "Overview", body: <>
		<p>
			Your goal is to do something. Thomas hasn't decided yet.
		</p>
	</> },
		{ key: "registers", title: "Registers", body: <>
		woof
		</>},
		{ key: "builtins", title: "Built-Ins", body: <>
		meow
		</>},
		{ key: "procedures", title: "Procedures", body: <>
		woof
		</>},
		{ key: "rebugging", title: "Running and Debugging", body: <>
			meow
		</>},
] as const satisfies ReferencePage[];

export function Reference() {
	const [page, setPage] = useState(()=>{
		const i = referencePages.findIndex(x=>x.key==LocalStorage.referencePage);
		return i==-1 ? 0 : i;
	});

	const [seen, setSeen] = useState(()=>LocalStorage.seenReference ?? false);
	const [referenceOpen, setReferenceOpen] = useState(false);

	const activePage = referencePages[page];
	
	return <>
		<Modal open={referenceOpen} onClose={()=>setReferenceOpen(false)} closeButton={false} >
			<div className="flex flex-col gap-2 items-stretch" >
				<div className={clsx("flex flex-row gap-2 justify-between items-center", textColor.default)} >
					<IconButton className={clsx("transition-transform enabled:hover:-translate-x-1", transparentNoHover)}
						disabled={page==0} onClick={()=>setPage(page-1)} 
						icon={<IconChevronLeft size={32} />} />
					<Select options={referencePages.map((page,i)=>({
						label: page.title, value: i
					}))} searchable value={page} >
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
		<IconButton icon={<IconBookFilled />} onClick={()=>{
			setReferenceOpen(true);
			setSeen(true);
			LocalStorage.seenReference = true;
		}} className={clsx(!seen && "relative scale-150 translate-y-2 -translate-x-2", "transition-transform")} >
			{!seen && <div className={clsx("animate-ping w-full h-full absolute rounded-md opacity-50", bgColor.highlight)} />}
		</IconButton>
	</>;
}