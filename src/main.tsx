import { Anchor, anchorStyle, Button, clearLocalStorage, ConfirmModal, Container, LocalStorage, mapWith, parseExtra, setWith, stringifyExtra, Text, textColor, Theme, ThemeContext, throttle, useFnRef, useGoto } from "./ui";
import { render } from "preact";
import { useCallback, useErrorBoundary, useState } from "preact/hooks";
import { Editor, makeProc } from "./editor";
import { Stage, Story } from "./story";
import { EditorState, Procedure, Register } from "./eval";
import { IconChevronRight, IconCircleCheckFilled, IconCircleDashedCheck } from "@tabler/icons-preact";
import { LocationProvider, Route, Router } from "preact-iso";
import { data } from "./data";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

function Footer() {
  return <div className={`mt-20 ${textColor.dim} mb-10`} >
    <p>
      A game by <Anchor href="https://thomasqm.com" >Thomas Marlowe</Anchor>,
      {" "}<Anchor href="https://github.com/kartva" >Kartavya Vashishtha</Anchor>,
      {" "}and <Anchor href="https://linkedin.com/in/peterjin25/" >Peter Jin</Anchor>
      {" "}for <Anchor href="https://puhack.horse/kiln" >Kiln</Anchor>
    </p>
  </div>;
}

function Home() {
  const goto = useGoto();
  return <div className="flex flex-col items-center pt-10 gap-2 max-w-lg" >
    <img src="/big.svg" />
    <Text v="md" className="italic" >Leading the world in cryptography for centuries</Text>
      
    <Text className="mt-3" >
      <b>Ready to join our team?</b> Apply for a summer internship today! <i>Anyone</i> with strong problem solving skills will excel in our fast-paced growth-oriented environment.
    </Text>
    <Button onClick={()=>goto("/menu")} >Apply now</Button>
  
    <Footer />
  </div>;
}

export function Logo({className}: {className?: string}) {
  const goto = useGoto();
  return <button onClick={()=>goto("/")} className={twMerge("w-1/2 self-end hover:scale-105 transition-transform", className)} ><img src="/logo.svg" /></button>;
}

function ErrorPage({errName, err, reset}: {errName?: string, err?: unknown, reset?: ()=>void}) {
  return <div className="max-w-md flex flex-col w-full pt-20 gap-2" >
    <Logo />
    <Text v="big" >{errName ?? "An error occurred"}</Text>
    {reset && <Text>Try refreshing, or click <Anchor onClick={()=>reset()} >here</Anchor> to retry.</Text>}
    {err!=undefined && <Text v="dim" >Details: {err instanceof Error ? err.message : err}</Text>}

    <Footer />
  </div>;
}

const stageUrl = (x: Stage) => `${x.type}/${x.key}`;

function Menu() {
  const [completed, setCompleted] = useState(()=>{
    return {
      story: LocalStorage.readStory ?? new Set(),
      puzzle: LocalStorage.solvedPuzzles ?? new Set()
    };
  });
  
  const withDone = data.map((stage,i)=>({
    ...stage, i,
    done: stage.type=="puzzle" ? completed.puzzle.has(stage.key) : completed.story.has(stage.key)
  }));

  const activeStages = Math.max(-1, ...withDone.filter(x=>x.done).map(x=>x.i))+1;
  const goto = useGoto();
  const [confirmReset, setConfirmReset] = useState(false);

  return <div className="flex flex-col gap-4 pt-20 max-w-xl" >
    <ConfirmModal confirm={()=>{
      clearLocalStorage();
      setCompleted({ story: new Set(), puzzle: new Set() });
    }} msg={"Are you sure you want to clear your progress?"}
      open={confirmReset} onClose={()=>setConfirmReset(false)} />

    <Logo />
    <Text v="big" >Table of contents ({activeStages}/{data.length})</Text>

    {withDone.flat().map(stage=>{
      const dimmed = stage.i>activeStages ? textColor.dim : "";
      return <div className={twMerge(stage.i<=activeStages && anchorStyle, "flex flex-col gap-0.5 p-2 pt-1 group items-stretch relative pr-10")}
        key={stageUrl(stage)}
        onClick={stage.i<=activeStages ? ()=>{
          goto(stageUrl(stage));          
        } : undefined} >
        <div className="flex flex-row gap-2 items-center" >
          {stage.done ? <IconCircleCheckFilled /> : stage.i<=activeStages && <IconCircleDashedCheck />}
          <Text v="bold" className={dimmed} >{stage.name}</Text>
        </div>
        {stage.i<=activeStages && <IconChevronRight size={36} className="transition-transform group-hover:translate-x-4 absolute top-2 right-4" />}
        <Text v="sm" className={dimmed} >{stage.blurb}</Text>
      </div>
    })}

    <Anchor className={clsx(textColor.red, "mt-2 -mb-5 self-start")}
      onClick={()=>setConfirmReset(true)} >Reset progress</Anchor>
    <Footer />
  </div>;
}

const procStorage = {
  savedProcs: new Map<number, Procedure>(),
  changedProcs: new Map<number, Procedure>(),
  throttleSave: throttle(5000),

  getUserProc(i: number): Procedure|null {
    const s = localStorage.getItem(`proc${i}`);
    return s==null ? null : parseExtra(s) as Procedure;
  },
  
  getProcs() {
    return (LocalStorage.userProcs ?? [])
      .map((i): [number,Procedure]=>[i, this.getUserProc(i)!]);
  },

  setUserProc(i: number, proc: Procedure) {
    if (this.savedProcs.get(i)==proc) return;

    this.savedProcs.set(i, proc);
    this.changedProcs.set(i, proc);

    this.throttleSave.call(()=>{
      for (const [k,v] of this.changedProcs.entries()) {
        localStorage.setItem(`proc${k}`, stringifyExtra(v));
      }

      this.changedProcs.clear();
    });
  },

  setProcs(procs: [number, Procedure][]) {
    for (const [i,x] of procs) this.setUserProc(i,x);
  }
};

function PuzzleStage({stage, i}: {stage: Stage&{type: "puzzle"}, i: number}) {
  const throttleSave = useFnRef(()=>throttle(2000), []);

  const [edit, setEdit] = useState<EditorState>(()=>{
    const userProcs = procStorage.getProcs();
    const entryProc = LocalStorage.puzzleProcs?.get(stage.key) ?? {
      ...makeProc("Solution"),
      registerList: [0], registers: new Map([
        [0, {
          name: "Input and output", type: "param"
        } satisfies Register]
      ]),
      maxRegister: 1
    };

    const maxProc = Math.max(0, ...userProcs.map(([i])=>i+1));

    return {
      procs: new Map([...userProcs, [-1, entryProc]]),
      userProcList: userProcs.map(([i])=>i),
      maxProc, entryProc: -1, active: -1,
      input: "", stepsPerS: LocalStorage.stepsPerS ?? 5, puzzle: stage,
      solved: LocalStorage.solvedPuzzles?.has(stage.key) ?? false
    };
  });
  
  const setEdit2 = useCallback((cb: (old: EditorState)=>EditorState)=>setEdit(old=>{
    const ns = cb(old);

    throttleSave.current?.call(()=>{
      LocalStorage.puzzleProcs = mapWith(
        LocalStorage.puzzleProcs ?? null,
        stage.key, ns.procs.get(ns.entryProc)
      );

      LocalStorage.stepsPerS = ns.stepsPerS;
      procStorage.setProcs(
        [...ns.procs.entries()]
          .map(([k,v]): [number, Procedure]=>[k,v])
          .filter(([k])=>k!=ns.entryProc)
      );
    });

    return ns;
  }), [stage.key, throttleSave]);

  const goto = useGoto();
  return <Editor edit={edit} setEdit={setEdit2} nextStage={()=>{
    goto(stageUrl(data[i+1]));
  }} />;
}

function StoryStage({stage, i}: {stage: Stage&{type: "story"}, i: number}) {
  const goto = useGoto();
  return <div className="md:w-2xl w-md flex flex-col pb-[50dvh] pt-10" >
    <Logo className="w-1/3" />
    <Story stage={stage} next={i+1>=data.length ? undefined : ()=>{
      LocalStorage.readStory = setWith(LocalStorage.readStory??null, stage.key);
      goto(stageUrl(data[i+1]));
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
      const path = stageUrl(stage);
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
