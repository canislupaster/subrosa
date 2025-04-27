import { ComponentChildren } from "preact";
import { useCallback, useState } from "preact/hooks";
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

	</> }
] as const satisfies ReferencePage[];

export function Reference() {
	const [page, setPage2] = useState(()=>{
		const i = referencePages.findIndex(x=>x.key==LocalStorage.referencePage);
		return i==-1 ? 0 : i;
	});

	const setPage = (x: number)=>{
		LocalStorage.referencePage = referencePages[x].key;
		setPage2(x);
	};

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
					}))} searchable value={page} setValue={setPage} >
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

				<div className="min-h-0 pb-5 overflow-y-auto indent-4" >
					{activePage.body}
				</div>
			</div>
		</Modal>
		<IconButton icon={<IconBookFilled />} onClick={()=>{
			setReferenceOpen(true);
			setSeen(true);
			LocalStorage.seenReference = true;
		}} className={clsx("transition-transform relative", !seen && "scale-140 -translate-x-1 translate-y-1")} >
			{!seen && <div className={clsx("animate-ping w-full h-full absolute rounded-md opacity-50", bgColor.highlight)} />}
		</IconButton>
	</>;
}