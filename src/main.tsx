import "disposablestack/auto";
import { Anchor, anchorHover, anchorUnderline, bgColor, Button, ConfirmModal, Container, Input, Loading, LocalStorage, mapWith, Modal, setWith, Text, textColor, Theme, ThemeContext, throttle, useAsyncEffect, useFnRef, useMd } from "./ui";
import { ComponentChildren, ComponentProps, createContext, render, JSX } from "preact";
import { useCallback, useContext, useEffect, useErrorBoundary, useMemo, useRef, useState } from "preact/hooks";
import { Editor, makeProc } from "./editor";
import { Stage, stages, Story } from "./story";
import { EditorState, Procedure, Register } from "../shared/eval";
import { IconBrandGithubFilled, IconChevronRight, IconCircleCheckFilled, IconCircleDashedCheck, IconDeviceDesktopFilled, IconPuzzleFilled } from "@tabler/icons-preact";
import { LocationProvider, Route, Router, useLocation, useRoute } from "preact-iso";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { parseExtra, stringifyExtra } from "../shared/util";
import { stageUrl } from "../shared/data";
import { useStageCount } from "./api";
import { BgAnimComponent } from "./bganim";

export const GotoContext = createContext(undefined as unknown as {
  goto: (this: void, path: string)=>void,
  addTransition(f: ()=>Promise<void>): Disposable
});

// idk i usually use pushstate iirc or smh i guess not today!
export function useGoto() { return useContext(GotoContext).goto; }
export function FadeRoute({className, ...props}: JSX.IntrinsicElements["div"]&{
  className?: string
}) {
  const ctx = useContext(GotoContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const el = ref.current;
    if (!el) return;

    let anim: Animation|null=null;
    const trans = ctx.addTransition(async ()=>{
      anim?.cancel();
      anim = await el.animate([ { opacity: 1 }, { opacity: 0 } ], {
        duration: 500, fill: "forwards", iterations: 1
      }).finished;
    });

    return ()=>{
      trans[Symbol.dispose]();
      anim?.cancel();
    };
  }, [ctx]);

  return <div {...props} className={twMerge("animate-fade-in w-full", className)} ref={ref} />;
}

function Footer() {
  return <div className={`mt-20 ${textColor.dim} mb-10 flex flex-col items-center gap-2`} >
    <p>
      A game by <Anchor href="https://thomasqm.com" target="_blank" >Thomas Marlowe</Anchor>,
      {" "}<Anchor href="https://github.com/kartva" target="_blank" >Kartavya Vashishtha</Anchor>,
      {" "}and <Anchor href="https://linkedin.com/in/peterjin25/" target="_blank" >Peter Jin</Anchor>.
    </p>
    <p><Anchor href="https://github.com/canislupaster/subrose" className={clsx("items-center", textColor.dim)}
      target="_blank" >
      <IconBrandGithubFilled /> GitHub
    </Anchor></p>
  </div>;
}

function Home() {
  const goto = useGoto();
  return <><FadeRoute className="flex flex-col items-center pt-10 gap-2 max-w-lg px-5" >
    <img src="/big.svg" />
    <Text v="md" className="italic" >Leading the world in cryptography</Text>
      
    <Text className="mt-3" >
      <b>Ready to join our team?</b> Apply for a summer internship today! <i>Anyone</i> with strong problem solving skills will excel in our fast-paced growth-oriented environment.
    </Text>

    <Button onClick={()=>goto("/menu")} autofocus
      className="text-2xl px-4 py-3 border-2 my-4" >Apply now</Button>
  
    <Footer />
    
  </FadeRoute><BgAnimComponent /></>;
}

export function Logo({className}: {className?: string}) {
  const goto = useGoto();
  return <button onClick={()=>goto("/")} className={twMerge("w-1/2 self-end hover:scale-105 transition-transform", className)} ><img src="/logo.svg" /></button>;
}

function ErrorPage({errName, err, reset, children}: {
  errName?: string, err?: unknown, reset?: ()=>void, children?: ComponentChildren
}) {
  return <div className="max-w-md flex flex-col w-full pt-20 gap-2" >
    <Logo />
    <Text v="big" >{errName ?? "An error occurred"}</Text>
    {reset && <Text>Try refreshing, or click <Anchor onClick={()=>reset()} >here</Anchor> to retry.</Text>}
    {err!=undefined && <Text v="dim" >Details: {err instanceof Error ? err.message : err}</Text>}
    <div>
      {children}
    </div>
    <Footer />
  </div>;
}

type Save = {
  localStorage: LocalStorage,
  procs: [number, Procedure][]
};

function getCompleted() {
  const story =  LocalStorage.readStory ?? new Set();
  const puzzle =  LocalStorage.solvedPuzzles ?? new Set();
  const withDone = stages.map((stage,i)=>({
    ...stage, i,
    done: stage.type=="puzzle" ? puzzle.has(stage.key) : story.has(stage.key)
  }));
  const activeStages = Math.max(-1, ...withDone.filter(x=>x.done).map(x=>x.i))+1;

  return { story, puzzle, withDone, activeStages } as const;
}

function Menu() {
  const [{withDone, activeStages}, setCompleted] = useState(getCompleted);
  
  const goto = useGoto();
  const [confirmReset, setConfirmReset] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState("");
  const [exporting, setExporting] = useState(false);

  const percentProgress = `${Math.round(activeStages/stages.length * 100)}%`;

  return <><FadeRoute className="flex flex-col gap-4 pt-20 max-w-xl" >
    <ConfirmModal confirm={()=>{
      localStorage.clear();
      setCompleted(getCompleted());
    }} msg={"Are you sure you want to clear your progress?"}
      open={confirmReset} onClose={()=>setConfirmReset(false)} />

    <Modal open={importing} onClose={()=>setImporting(false)} title="Import data" >
      <Text v="err" >This will overwrite all existing data.</Text>

      <form onSubmit={(ev)=>{
        ev.preventDefault();

        const save = parseExtra(importData) as Save;
        for (const k in save.localStorage) {
          // casting hell
          (LocalStorage[k as keyof LocalStorage] as unknown) = save.localStorage[k as keyof LocalStorage] as unknown;
        }
        
        procStorage.setProcs(save.procs);
        setCompleted(getCompleted());
        setImporting(false);
      }} className="flex flex-col gap-2" >
        <Text>Paste an export below:</Text>
        <Input value={importData} valueChange={setImportData} autofocus />
        <Button>Import data</Button>
      </form>
    </Modal>

    <Modal open={exporting} onClose={()=>setExporting(false)} title="Exported data" >
      <Text>Your export has been copied to your clipboard. It might be big.</Text>
    </Modal>

    <Logo />
    <Text v="big" >Table of contents</Text>

    <div className={clsx(bgColor.default, "w-full py-2 px-2 relative -my-2 overflow-hidden")} >
      <Text v="md" className="relative z-20" >{activeStages}/{stages.length} ({percentProgress})</Text>
      <div className={clsx(bgColor.green, "absolute rounded-r-md top-0 bottom-0 left-0 z-10")} style={{width: percentProgress}} />
    </div>

    {withDone.flat().map(stage=>{
      const a = stage.i<=activeStages;
      return <div className={twMerge(a && anchorHover, "flex flex-col gap-0.5 p-2 pt-1 group items-stretch relative pr-10")}
        key={stageUrl(stage)}
        onClick={stage.i<=activeStages ? ()=>{
          goto(stageUrl(stage));          
        } : undefined} >
        <div className="flex flex-row gap-2 items-center" >
          {stage.done ? <IconCircleCheckFilled /> : stage.i<=activeStages && <IconCircleDashedCheck />}
          <Text v="bold" className={clsx(a ? anchorUnderline : textColor.dim)} >{stage.name}</Text>
          {stage.type=="puzzle" && <IconPuzzleFilled />}
        </div>
        {stage.i<=activeStages && <IconChevronRight size={36} className="transition-transform group-hover:translate-x-4 absolute top-2 right-4" />}
        <Text v="sm" className={clsx(!a && textColor.dim)} >{stage.blurb}</Text>
      </div>
    })}

    <div className="flex flex-row w-full justify-between mt-2 -mb-5 self-start" >
      <Anchor className={textColor.red}
        onClick={()=>setConfirmReset(true)} >Reset progress</Anchor>
      <Anchor onClick={()=>setImporting(true)} >Import data</Anchor>
      <Anchor onClick={()=>{
        const txt = stringifyExtra({
          localStorage: LocalStorage,
          procs: procStorage.getAllProcs()
        } satisfies Save);

        void window.navigator.clipboard.writeText(txt);

        setExporting(true);
      }} >Export data</Anchor>
    </div>
    
    <Footer />
  </FadeRoute><BgAnimComponent /></>;
}

const procStorage = {
  savedProcs: new Map<number, Procedure>(),
  getProc(i: number): Procedure|null {
    return parseExtra(localStorage.getItem(`proc${i}`)) as Procedure|null;
  },
  getUserProcs() {
    return (LocalStorage.userProcs ?? [])
      .map((i): [number,Procedure]=>[i, this.getProc(i)!]);
  },
  getAllProcs() {
    return [
      ...LocalStorage.userProcs ?? [],
      ...[...LocalStorage.puzzleProcs?.values() ?? []]
        .filter((x: unknown): x is number => typeof x=="number")
    ].map((i): [number,Procedure]=>[i, this.getProc(i)!]);
  },
  setProc(i: number, proc: Procedure) {
    if (this.savedProcs.get(i)==proc) return;
    this.savedProcs.set(i, proc);
    localStorage.setItem(`proc${i}`, stringifyExtra(proc));
  },
  setProcs(procs: [number, Procedure][]) {
    for (const [i,x] of procs) this.setProc(i,x);
  }
};

function PuzzleStage({stage, i}: {stage: Stage&{type: "puzzle"}, i: number}) {
  const throttleSave = useFnRef(()=>throttle(2000, true), []);
  useStageCount(stage);

  const [edit, setEdit] = useState<EditorState>(()=>{
    const userProcs = procStorage.getUserProcs();
    // backwards compat for like 2 people
    let maxProc = LocalStorage.maxProc ?? Math.max(0, ...userProcs.map(([i])=>i+1));
    let entryProcI = LocalStorage.puzzleProcs?.get(stage.key);
    let entryProc: Procedure;
    if (typeof entryProcI=="number") {
      entryProc = procStorage.getProc(entryProcI)!;
    } else if (entryProcI && typeof entryProcI=="object") {
      entryProc = entryProcI;
      entryProcI = maxProc++;
    } else {
      entryProcI = maxProc++;
      entryProc = {
        ...makeProc("Main"),
        registerList: [0], registers: new Map([
          [0, {
            name: "Input and output", type: "param"
          } satisfies Register]
        ]),
        maxRegister: 1
      };
    }
    
    return {
      procs: new Map([...userProcs, [entryProcI, entryProc]]),
      userProcList: userProcs.map(([i])=>i),
      maxProc, entryProc: entryProcI, active: entryProcI,
      decoded: "", stepsPerS: LocalStorage.stepsPerS ?? 5,
      solved: LocalStorage.solvedPuzzles?.has(stage.key) ?? false,
      undoHistory: [], procHistory: [], curNumUndo: 0
    };
  });
  
  const setEdit2 = useCallback((cb: (old: EditorState)=>EditorState)=>setEdit(old=>{
    const ns = cb(old);

    throttleSave.current?.call(()=>{
      LocalStorage.stepsPerS = ns.stepsPerS;
      procStorage.setProcs(
        [...ns.procs.entries()].map(([k,v]): [number, Procedure]=>[k,v])
      );

      LocalStorage.maxProc = ns.maxProc;
      LocalStorage.userProcs = [...ns.procs.keys()].filter(x=>x!=ns.entryProc);
      LocalStorage.puzzleProcs = mapWith(LocalStorage.puzzleProcs ?? null, stage.key, ns.entryProc);
    });

    return ns;
  }), [stage.key, throttleSave]);

  const goto = useGoto();
  return <FadeRoute><Editor edit={edit} setEdit={setEdit2} puzzle={stage} nextStage={()=>{
    goto(stageUrl(stages[i+1]));
  }} /></FadeRoute>;
}

function PuzzleStageWrap(props: ComponentProps<typeof PuzzleStage>) {
  const [editingElsewhere, setEditingElsewhere] = useState<boolean|null>(null);
  useEffect(()=>{
    const newEditingElsewhere = LocalStorage.currentlyEditing!=undefined
      && LocalStorage.currentlyEditing >= Date.now()-5000
    setEditingElsewhere(newEditingElsewhere);
    if (newEditingElsewhere) return;

    LocalStorage.currentlyEditing=Date.now();
    const int = setInterval(()=>LocalStorage.currentlyEditing=Date.now(), 1000);

    const unload = ()=>{ LocalStorage.currentlyEditing = undefined; };
    window.addEventListener("unload", unload);

    return ()=>{
      clearInterval(int);
      window.removeEventListener("unload", unload);
      LocalStorage.currentlyEditing = undefined;
    };
  }, []);
  
  if (editingElsewhere==null) return <Loading />;
  if (editingElsewhere) return <ErrorPage errName="Don't open up multiple tabs!" >
    You might impinge on the spatial-temporal consistency of your programs! Your progress might be nuked! I didn't design for this! What kind of game syncs progress between multiple windows?!
  </ErrorPage>;
  return <PuzzleStage {...props} />;
}

function StoryStage({stage, i}: {stage: Stage&{type: "story"}, i: number}) {
  const goto = useGoto();
  useStageCount(stage);
  return <FadeRoute className="md:w-2xl w-md flex flex-col pb-[30dvh] pt-10" >
    <Logo className="w-1/3" />
    <Story stage={stage} next={i+1>=stages.length ? undefined : ()=>{
      LocalStorage.readStory = setWith(LocalStorage.readStory??null, stage.key);
      goto(stageUrl(stages[i+1]));
    }} />
  </FadeRoute>;
}

function LockedStage() {
  return <ErrorPage errName="You can't access that yet." >
    Go back to <Anchor href="/menu" >the menu</Anchor>.
  </ErrorPage>;
}

function InnerApp() {
  const [err, resetErr] = useErrorBoundary((err)=>{
    console.error("app error boundary", err);
  }) as [unknown, ()=>void];
  const md = useMd();
  const route = useRoute();

  if (err!=undefined) return <ErrorPage err={err} reset={resetErr} />;

  if (!md && route.path!="/") {
    return <FadeRoute className="flex flex-col items-center justify-center gap-2 p-4 h-dvh" >
      <IconDeviceDesktopFilled size={128} />
      <Text v="bold" >This experience functions best on a desktop-size display.</Text>
      <Text>Please switch to a larger display or rotate your screen.</Text>
      
      <Logo className="mt-8" />
    </FadeRoute>;    
  }

  const { withDone, activeStages } = getCompleted();

  return <Router>
    <Route path="/" component={Home} />
    <Route path="/menu" component={Menu} />
    { withDone.map((stage)=>{
      const path = stageUrl(stage);
      return <Route key={path} path={path} component={
        ()=>stage.i>activeStages ? <LockedStage />
          : stage.type=="story" ? <StoryStage i={stage.i} stage={stage} />
          : <PuzzleStageWrap i={stage.i} stage={stage} />
      } />;
    }) }
    <Route default component={()=><ErrorPage errName="Page not found" >
      Go back <Anchor href="/" >home</Anchor>.
    </ErrorPage>} />
  </Router>;
}

function App({theme: initialTheme}: {theme: Theme}) {
  const [theme, setTheme] = useState(initialTheme);

  const route = useLocation();
  const [nextRoute, setNextRoute] = useState<string|null>(null);
  const routeTransitions = useRef<Set<()=>Promise<void>>>(new Set());
  const gotoCtx = useMemo(()=>({
    goto: (x: string)=>setNextRoute(x),
    addTransition: (t: ()=>Promise<void>)=>{
      routeTransitions.current.add(t);
      return { [Symbol.dispose]: ()=>routeTransitions.current.delete(t) };
    }
  }), []);

  useAsyncEffect(async ()=>{
    if (nextRoute==null) return;
    await Promise.all([...routeTransitions.current.values()].map(x=>x()));
    route.route(nextRoute);
    setNextRoute(null);
  }, [nextRoute, route.url, route.route]);

  return <GotoContext.Provider value={gotoCtx} >
    <ThemeContext.Provider value={{theme, setTheme}} >
      <Container className="flex flex-col items-center" >
        <InnerApp />
      </Container>
    </ThemeContext.Provider>
  </GotoContext.Provider>;
}

document.addEventListener("DOMContentLoaded", ()=>{
	const initialTheme = LocalStorage.theme
		?? "dark";//(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	render(<LocationProvider><App theme={initialTheme} /></LocationProvider>, document.body);
});
