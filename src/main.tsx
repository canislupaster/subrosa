// hi i hope you enjoy my codebase
// i'm experimenting with a style i call "psycho"
// in which i write insane code with no comments
// have fun :)

import "disposablestack/auto";
import { Anchor, anchorHover, anchorUnderline, bgColor, Button, ConfirmModal, Container, Divider, ease, GotoContext, Input, mapWith, Modal, setWith, Text, textColor, Theme, ThemeContext, throttle, useAsyncEffect, useFnRef, useGoto, useMd, useTitle } from "./ui";
import { ComponentChildren, ComponentProps, render, JSX, Fragment, createElement } from "preact";
import { useCallback, useContext, useEffect, useErrorBoundary, useMemo, useRef, useState } from "preact/hooks";
import { Editor } from "./editor";
import { Stage, stages, Story } from "./story";
import { EditorState, makeEntryProc, Procedure } from "../shared/eval";
import { IconBookFilled, IconBrandGithubFilled, IconChevronRight, IconCircleCheckFilled, IconCircleDashedCheck, IconDeviceDesktopFilled, IconDownload, IconPuzzleFilled, IconSkull, IconTriangleFilled, IconUpload } from "@tabler/icons-preact";
import { LocationProvider, Route, Router, useLocation } from "preact-iso";
import { twMerge, twJoin } from "tailwind-merge";
import { stageUrl } from "../shared/data";
import { useStageCount } from "./api";
import { BgAnimComponent } from "./bganim";
import { LogoBack } from "./logo";
import { forwardRef } from "preact/compat";
import { exportSave, getCompleted, importSave, LocalStorage, useProcStorage } from "./storage";

export function FadeRoute({className, ...props}: JSX.IntrinsicElements["div"]&{
  className?: string
}) {
  const ctx = useContext(GotoContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const el = ref.current;
    if (!el) return;

    let anim: Animation|null=null;
    const trans = ctx!.addTransition(async ()=>{
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
  return <div className={`mt-5 ${textColor.dim} pl-3 mb-10 flex flex-col items-center gap-2`} >
    <p>
      <span className="-ml-8" />
      A game handcrafted by <Anchor href="https://thomasqm.com" target="_blank" >Thomas Marlowe</Anchor>,<br />
      {" "}<Anchor href="https://github.com/kartva" target="_blank" >Kartavya Vashishtha</Anchor>,
      {" "}and <Anchor href="https://linkedin.com/in/peterjin25/" target="_blank" >Peter Jin</Anchor>.
    </p>
    <p><Anchor href="https://github.com/canislupaster/subrose" className={twJoin("items-center", textColor.dim)}
      target="_blank" >
      <IconBrandGithubFilled /> GitHub
    </Anchor></p>
  </div>;
}

function Home() {
  const goto = useGoto();
  return <><FadeRoute className="flex flex-col items-center pt-10 gap-2 max-w-xl px-5" >
    <img src="/big.svg" />
    <Text v="big" className="text-center" >A story-based puzzle game</Text>
    <Text v="md" className="text-center -mt-2" >blending inductive reasoning, cryptography,<br /> and assembly programming.</Text>
      
    <Text className="mt-3" >
      <b>Ready to join our team?</b> Apply for a summer internship today! <i>Anyone</i> with strong problem solving skills will excel in our fast-paced growth-oriented environment.
    </Text>

    <Button onClick={()=>goto("/menu")} autofocus
      className="text-2xl px-4 py-3 border-2 my-4" >Apply now</Button>
  
    <Footer />
  </FadeRoute><BgAnimComponent /></>;
}

export const Logo = forwardRef<HTMLButtonElement, {className?: string, menu?: boolean}>(({
  className, menu
}, ref)=>{
  const goto = useGoto();
  return <button onClick={()=>goto(menu==true ? "/menu" : "/")}
    className={twMerge("w-1/2 self-end", className)}
    ref={ref} ><LogoBack /></button>;
});

function ErrorPage({errName, err, reset, children}: {
  errName?: string, err?: unknown, reset?: ()=>void, children?: ComponentChildren
}) {
  useTitle(`Subrose | Error`);

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

function Menu() {
  const [{withDone, activeStages}, setCompleted] = useState(getCompleted);
  
  const goto = useGoto();
  const [confirmReset, setConfirmReset] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState("");
  const [exporting, setExporting] = useState(false);

  const percentProgress = `${Math.round(activeStages/stages.length * 100)}%`;
  const progressBorderRadius = `${Math.round((1-Math.pow(activeStages/stages.length,3)) * 50)}px`;

  useTitle("Subrose | Menu");
  
  const nextStageRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const tm = setTimeout(()=>{
      nextStageRef.current?.scrollIntoView({block: "center", behavior: "smooth"});
    }, 100);
    return ()=>clearTimeout(tm);
  }, [withDone, activeStages]);
  const bigTextClass = "tracking-tight text-[3rem]/8 font-big font-black";
  return <><FadeRoute className="flex flex-row items-stretch gap-20 pt-10 w-3xl" >
    <div className="flex flex-row gap-5 mt-20 py-10" >
      <div className="flex flex-col gap-1 items-end" >
        <Text>progress</Text>
        <div className={twJoin("mb-10", bigTextClass, textColor.gray)} >{percentProgress}</div>
        <Text>chapters</Text>
        <div className={twJoin("mb-10", textColor.gray, bigTextClass)} >
          {activeStages}
          <span className={twJoin(bgColor.divider, "h-[120%] mb-1.5 align-middle w-2 inline-block mx-2 -skew-x-6")} />
          <span className={textColor.divider} >{stages.length}</span>
        </div>
        <Text>nodes created</Text>
        <div className={bigTextClass} >{LocalStorage.numNodesCreated ?? 0}</div>
      </div>
      <div className={twJoin(bgColor.default, "w-1 relative h-[90%]")} >
        <div className={twJoin(bgColor.divider, "absolute top-0 left-0 right-0 z-10 animate-[expand-down_2000ms_forwards] origin-top")}
          style={{height: percentProgress, borderBottomLeftRadius: progressBorderRadius, borderBottomRightRadius: progressBorderRadius}} />
      </div>
    </div>

    <div className="flex flex-col gap-4 grow" >
      <ConfirmModal confirm={()=>{
        localStorage.clear();
        setCompleted(getCompleted());
      }} msg={"Are you sure you want to clear your progress?"}
        open={confirmReset} onClose={()=>setConfirmReset(false)} />

      <Modal open={importing} onClose={()=>setImporting(false)} title="Import data" >
        <Text v="err" >This will overwrite all existing data.</Text>

        <form onSubmit={(ev)=>{
          ev.preventDefault();
          importSave(importData);
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

      {withDone.flat().map(stage=>{
        const a = stage.i<=activeStages;
        const icon = stage.type=="puzzle" ? IconPuzzleFilled : IconBookFilled;
        return <Fragment key={stageUrl(stage)} >
          {stage.type=="story" && stage.startOf!=undefined
            && <Text v="md" className="mt-1 -mb-2 flex flex-row gap-2 items-center" >
              <IconTriangleFilled size={18} />{stage.startOf} <Divider className="w-auto ml-2 grow" />
            </Text>}
          <button className={twMerge(a && anchorHover, "flex flex-col gap-0.5 p-2 pt-1 group items-start relative pr-10")} disabled={!a}
            onClick={stage.i<=activeStages ? ()=>{
              goto(stageUrl(stage));          
            } : undefined} >
            <div className="flex flex-row gap-2 items-center" >
              {stage.done ? <IconCircleCheckFilled /> : stage.i<=activeStages && <IconCircleDashedCheck />}
              <Text v="bold" className={twJoin(a ? anchorUnderline : textColor.dim)} >{stage.name}</Text>
              {createElement(icon, {
                className: "absolute -left-4 top-2 fill-white/15 -z-10", size: 50
              })}
            </div>
            {stage.i<=activeStages && <IconChevronRight size={36} className="transition-transform group-hover:translate-x-4 absolute top-2 right-4" />}
            <Text v="sm" className={twJoin(!a && textColor.dim)} >{stage.blurb}</Text>
          </button>
          {stage.i==activeStages-1 && stage.i<stages.length-1 && <div className="flex flex-row items-center gap-2 -my-2" ref={nextStageRef} >
            <div className={"border-dashed h-0 border-b-2 bg-none grow dark:border-zinc-400"} />
            <Text v="md" >Next stage</Text>
            <div className={"border-dashed h-0 border-b-2 bg-none grow dark:border-zinc-400"} />
          </div>}
        </Fragment>;
      })}

      <div className="flex flex-row w-full justify-between mt-2 -mb-5 self-start" >
        <Anchor className={twJoin(textColor.red, "items-center")} onClick={()=>setConfirmReset(true)} >
          <IconSkull /> Reset progress
        </Anchor>
        <Anchor className="items-center" onClick={()=>setImporting(true)} >
          <IconDownload /> Import data
        </Anchor>
        <Anchor className="items-center" onClick={()=>{
          void window.navigator.clipboard.writeText(exportSave());
          setExporting(true);
        }} ><IconUpload />Export data</Anchor>
      </div>
    
      <Footer />
    </div>
  </FadeRoute><BgAnimComponent /></>;
}

function PuzzleStage({stage, i}: {stage: Stage&{type: "puzzle"}, i: number}) {
  const throttleSave = useFnRef(()=>throttle(2000, true), []);
  useStageCount(stage);
  const procStorage = useProcStorage();

  const [edit, setEdit] = useState<EditorState|null>(null);

  useEffect(()=>{
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
      entryProc = makeEntryProc(stage);
    }

    setEdit({
      procs: new Map(([...userProcs, [entryProcI, entryProc]])),
      userProcList: userProcs.map(([i])=>i),
      maxProc, entryProc: entryProcI,
      stepsPerS: LocalStorage.stepsPerS ?? 5,
      solved: LocalStorage.solvedPuzzles?.has(stage.key) ?? false,
      undoHistory: [], curNumUndo: 0
    });
  }, [procStorage, stage]);
  
  const setEdit2 = useCallback((cb: (old: EditorState)=>EditorState)=>setEdit(old=>{
    const ns = cb(old!);

    throttleSave.current?.call(()=>{
      LocalStorage.stepsPerS = ns.stepsPerS;
      procStorage.setProcs(
        [...ns.procs.entries()].map(([k,v]): [number, Procedure]=>[k, v])
      );

      LocalStorage.maxProc = ns.maxProc;
      LocalStorage.userProcs = [...ns.procs.keys()].filter(x=>x!=ns.entryProc);
      LocalStorage.puzzleProcs = mapWith(LocalStorage.puzzleProcs ?? null, stage.key, ns.entryProc);
    });

    return ns;
  }), [procStorage, stage.key, throttleSave]);

  const goto = useGoto();
  useTitle(`Subrose | ${stage.name}`);

  return edit && <FadeRoute>
    <Editor edit={edit} setEdit={setEdit2} puzzle={stage} nextStage={()=>{
      goto(stageUrl(stages[i+1]));
    }} />
  </FadeRoute>;
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
  
  if (editingElsewhere==null) return <></>;
  if (editingElsewhere) return <ErrorPage errName="Don't open up multiple tabs!" >
    You might impinge on the spatial-temporal consistency of your programs! Your progress might be nuked! I didn't design for this! What kind of game syncs progress between multiple windows?!
  </ErrorPage>;
  return <PuzzleStage {...props} />;
}

function StoryStage({stage, i}: {stage: Stage&{type: "story"}, i: number}) {
  const goto = useGoto();
  useStageCount(stage);
  const logoRef = useRef<HTMLButtonElement>(null);
  
  useEffect(()=>{
    const el = logoRef.current;
    if (!el) return;
    const cb = ()=>{
      const t=Math.min(1,Math.max((250-el.offsetTop)/200, 0.0));
      el.style.opacity = (0.2 + 0.8*ease(t)).toString();
    };

    cb();
    document.addEventListener("scroll", cb);
    return ()=>document.removeEventListener("scroll", cb);
  }, []);

  useTitle(`Subrose | ${stage.name}`);

  return <FadeRoute className="w-4xl flex flex-row items-start gap-4 pb-[30dvh] pt-10" >
    <Story stage={stage} next={i+1>=stages.length ? undefined : ()=>{
      LocalStorage.readStory = setWith(LocalStorage.readStory??null, stage.key);
      goto(stageUrl(stages[i+1]));
    }} />
    <Logo className="basis-1/4 shrink-0 self-start sticky top-4 hover:opacity-100! transition-opacity duration-300" ref={logoRef} menu />
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
  const loc = useLocation();

  const [{ withDone, activeStages }, setCompleted] = useState(getCompleted());
  // update completed on route change
  useEffect(()=>setCompleted(getCompleted()), [loc.url]);

  if (err!=undefined) return <ErrorPage err={err} reset={resetErr} />;

  if (!md && loc.path!="/") {
    return <FadeRoute className="flex flex-col items-center justify-center gap-2 p-4 h-dvh" >
      <IconDeviceDesktopFilled size={128} />
      <Text v="bold" >This experience functions best on a desktop-size display.</Text>
      <Text>Please switch to a larger display or rotate your screen.</Text>
      
      <Logo className="mt-8" />
    </FadeRoute>;    
  }

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
	render(<LocationProvider><App theme={"dark"} /></LocationProvider>, document.body);
});
