import { Anchor, anchorStyle, bgColor, borderColor, Button, Container, IconButton, LocalStorage, setWith, Text, textColor, Theme, ThemeContext, useGoto } from "./ui";
import { render } from "preact";
import { useEffect, useErrorBoundary, useRef, useState } from "preact/hooks";
import { Editor } from "./editor";
import { Stage, Story, StoryParagraph } from "./story";
import { EditorState, Procedure, Register } from "./eval";
import { IconChevronRight, IconCircleCheckFilled, IconCircleDashedCheck, IconX } from "@tabler/icons-preact";
import { defaultGen } from "./puzzles";
import { LocationProvider, Route, Router } from "preact-iso";
import { data } from "./data";
import { twMerge } from "tailwind-merge";
import { act } from "preact/test-utils";

function Home() {
  const goto = useGoto();
  return <div className="flex flex-col items-center pt-20 gap-2 max-w-lg" >
    <img src="/big.svg" />
    <Text v="md" >Leading the world in cryptography for centuries</Text>
      
    <Text className="mt-3" >
      <b>Ready to join our team?</b> Apply for a summer internship today! <i>Anyone</i> with strong problem solving skills will excel in our fast-paced growth-oriented environment.
    </Text>
    <Button onClick={()=>goto("/menu")} >Apply now</Button>
  </div>;
}

function Logo() {
  const goto = useGoto();
  return <button onClick={()=>goto("/")} className="w-1/2 self-end hover:scale-105 transition-transform" ><img src="/logo.svg" /></button>;
}

function ErrorPage({errName, err, reset}: {errName?: string, err?: unknown, reset?: ()=>void}) {
  return <div className="max-w-md flex flex-col w-full pt-20 gap-2" >
    <Logo />
    <Text v="big" >{errName ?? "An error occurred"}</Text>
    {reset && <Text>Try refreshing, or click <Anchor onClick={()=>reset()} >here</Anchor> to retry.</Text>}
    {err!=undefined && <Text v="dim" >Details: {err instanceof Error ? err.message : err}</Text>}
  </div>;
}

function Menu() {
  const [completed, setCompleted] = useState({
    story: new Set<string>(), puzzle: new Set<string>()
  });
  
  useEffect(()=>{
    setCompleted({
      story: LocalStorage.readStory ?? new Set(),
      puzzle: LocalStorage.solvedPuzzles ?? new Set()
    });
  }, []);

  const withDone = data.map((stage,i)=>({
    ...stage, i,
    done: stage.type=="puzzle" ? completed.puzzle.has(stage.key) : completed.story.has(stage.key)
  }));

  const activeStages = Math.max(-1, ...withDone.filter(x=>x.done).map(x=>x.i))+1;
  const goto = useGoto();

  return <div className="flex flex-col gap-4 pt-20 max-w-xl" >
    <Logo />
    <Text v="big" >Table of contents ({activeStages}/{data.length})</Text>
    {withDone.map(stage=>{
      const dimmed = stage.i>activeStages ? textColor.dim : "";
      return <div className={twMerge(stage.i<=activeStages && anchorStyle, "flex flex-col gap-0.5 p-2 pt-1 group items-stretch relative pr-10")}
        key={[stage.type,stage.key].join("\n")}
        onClick={stage.i<=activeStages ? ()=>{
          goto(`/${stage.type}/${stage.key}`);          
        } : undefined} >
        <div className="flex flex-row gap-2 items-center" >
          {stage.done ? <IconCircleCheckFilled /> : stage.i<=activeStages && <IconCircleDashedCheck />}
          <Text v="bold" className={dimmed} >{stage.name}</Text>
        </div>
        {stage.i<=activeStages && <IconChevronRight size={36} className="transition-transform group-hover:translate-x-4 absolute top-2 right-4" />}
        <Text v="sm" className={dimmed} >{stage.blurb}</Text>
      </div>
    })}
  </div>;
}

function PuzzleStage({stage, i}: {stage: Stage&{type: "puzzle"}, i: number}) {
  return "hi";
}

function StoryStage({stage, i}: {stage: Stage&{type: "story"}, i: number}) {
  return <div className="pt-10 md:w-2xl w-md" >
    <Story stage={stage} next={()=>{
      LocalStorage.readStory = setWith(LocalStorage.readStory??null, stage.key);
      data
    }} />
  </div>;
}

function App({theme: initialTheme}: {theme: Theme}) {
  const [theme, setTheme] = useState(initialTheme);
  const [err, resetErr] = useErrorBoundary((err)=>{
    console.error("app error boundary", err);
  }) as [unknown, ()=>void];

  let inner = <Router>
    <Route path="/" component={Home} />
    <Route path="/menu" component={Menu} />
    { data.map((stage,i)=>{
      const path = `${stage.type}/${stage.key}`;
      return <Route key={path} path={path} component={
        ()=>stage.type=="story" ? <StoryStage i={i} stage={stage} />
          : <PuzzleStage i={i} stage={stage} />
      } />;
    }) }
    <Route default component={()=><ErrorPage errName="Page not found" err={<>
      Go back <Anchor href="/" >home</Anchor>.
    </>} />} />
  </Router>;
  
  if (err!=undefined) inner=<ErrorPage err={err} reset={resetErr} />;

  return <LocationProvider>
    <ThemeContext.Provider value={{theme, setTheme}} >
      <Container className="flex flex-col items-center" >
        {inner}
      </Container>
    </ThemeContext.Provider>
  </LocationProvider>;
}

document.addEventListener("DOMContentLoaded", ()=>{
	const initialTheme = LocalStorage.theme
		?? "dark";//(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	render(<App theme={initialTheme} />, document.body);
});
