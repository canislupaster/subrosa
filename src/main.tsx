import { Anchor, anchorStyle, bgColor, borderColor, Button, Container, IconButton, LocalStorage, Text, Theme, ThemeContext, useGoto } from "./ui";
import { render } from "preact";
import { useEffect, useErrorBoundary, useRef, useState } from "preact/hooks";
import { Editor } from "./editor";
import { Story, StoryParagraph } from "./story";
import { EditorState, Procedure, Register } from "./eval";
import { IconCircleCheckFilled, IconCircleDashedCheck, IconX } from "@tabler/icons-preact";
import { defaultGen } from "./puzzles";
import { LocationProvider, Route, Router } from "preact-iso";
import { data } from "./data";
import { twMerge } from "tailwind-merge";

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

function ErrorPage({errName, err, reset}: {errName?: string, err?: unknown, reset?: ()=>void}) {
  return <div className="max-w-md flex flex-col w-full pt-20 gap-2" >
    <img src="/logo.svg" className="w-1/2" />
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

  const maxCompleted = Math.max(...withDone.filter(x=>x.done).map(x=>x.i));

  return <div className="flex flex-col gap-2 pt-20" >
    <Text v="big" >Table of contents</Text>
    {withDone.map(stage=>{
      return <div className={twMerge(anchorStyle, "flex flex-col gap-1")}
        key={[stage.type,stage.key].join("\n")} >
        <div className="flex flex-row gap-2" >
          {stage.done ? <IconCircleCheckFilled /> : <IconCircleDashedCheck />}
          <Text v="bold" >{stage.name}</Text>
        </div>
        <Text v=""
      </div>;
    })}
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
    <Route default component={()=><ErrorPage errName="Page not found" />} />
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
