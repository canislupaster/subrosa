import { bgColor, borderColor, Container, IconButton, LocalStorage, Text, Theme, ThemeContext } from "./ui";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Editor } from "./editor";
import { Story, StoryParagraph } from "./story";
import { EditorState, Procedure, Register } from "./eval";
import { IconX } from "@tabler/icons-preact";



function App({theme: initialTheme}: {theme: Theme}) {
  const [theme, setTheme] = useState(initialTheme);

	const [test, setTest] = useState<EditorState>({
    entryProc: 0,
    procs: new Map<number, Procedure>([
      [0, {
        name: "hello",
        nodeList: [],
        nodes: new Map(),
        registerList: [0],
        maxNode: 0, maxRegister: 1,
        registers: new Map([
          [0, { name: "hi", type: "value", value: "a" } satisfies Register]
        ])
      }]
    ]),
    maxProc: 1,
    userProcList: [],
    active: 0,
    stepsPerS: 1,
    input: ""
	});
  
  const [sidebar, setSidebar] = useState(false);
  const sidebarRef = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if (sidebar) sidebarRef.current?.showModal();
    else sidebarRef.current?.close();
  }, [sidebar]);
	
  return <ThemeContext.Provider value={{theme, setTheme}} ><Container>
    <dialog className={`block opacity-0 transition-opacity duration-500 fixed left-0 top-0 h-dvh max-h-none bottom-0 min-w-sm z-50 overflow-visible`} ref={sidebarRef}
      style={{opacity: sidebar ? 1 : 0.001, pointerEvents: sidebar ? undefined : "none"}} >
      <div className={`fixed left-0 flex flex-col gap-2 h-full p-5 ${bgColor.secondary} ${borderColor.default} border-r-1 overflow-auto`} >
        <div className="flex flex-row justify-between gap-8" >
          <Text v="big" >Table of Contents</Text>
          <IconButton icon={<IconX />} onClick={()=>setSidebar(false)} />
        </div>
      </div>

      <div className="bg-black/20 opacity-0 transition-opacity -z-10 fixed left-0 bottom-0 right-0 top-0 min-w-dvw min-h-dvh delay-300 duration-500"
        style={{opacity: sidebar ? "1" : "0"}}
        onClick={()=>setSidebar(false)} />
    </dialog>
   
    <Editor edit={test} setEdit={setTest} openSidebar={()=>setSidebar(true)} />
    {/* <Story stage={{
      type: "story",
      name: "abc",
      para: [
        <StoryParagraph key={0} end={{
          type: "choice",
          key: "mychoice",
          choices: [
            { value: "hi", label: "bc" }
          ]
        }} >
          {"hi there abc".repeat(5)}
        </StoryParagraph>,
        <StoryParagraph key={0} >
          hi there abc def
        </StoryParagraph>
      ]
    }} /> */}
  </Container></ThemeContext.Provider>;
}

document.addEventListener("DOMContentLoaded", ()=>{
	const initialTheme = LocalStorage.theme
		?? "dark";//(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	render(<App theme={initialTheme} />, document.body);
});
