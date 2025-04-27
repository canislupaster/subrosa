import { useEffect, useState } from "preact/hooks";
import { Procedure, ProgramStats, test, Verdict } from "../shared/eval";
import { Stage } from "./story";
import { API, COUNT_PLAY_INTERVAL_SECONDS, parseExtra, ServerResponse, StageStatsResponse, stringifyExtra, toPrecStat, validUsernameRe } from "../shared/util";
import Tester from "../shared/worker?worker";
import { Alert, bgColor, Button, LocalStorage, mapWith, setWith, useAsync, useAsyncEffect, Text, Input, AlertErrorBoundary, Loading, borderColor, ThemeSpinner } from "./ui";
import { StageData, stageUrl } from "../shared/data";
import { blankStyle } from "./editor";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown } from "@tabler/icons-preact";
import { Fragment } from "preact";

export type Submission = { active: number, procs: ReadonlyMap<number,Procedure> };

export type APIRequest = ({
	[K in keyof API]: [K, API[K]["request"]]|[K, API[K]["request"], (resp: ServerResponse<K>) => void]
});

const apiBaseUrlEnv = (import.meta as unknown as {env: {VITE_API_BASE_URL: string}}).env.VITE_API_BASE_URL;
const apiBaseUrl = apiBaseUrlEnv=="" ? new URL("/", window.location.href).href : apiBaseUrlEnv;
console.log(`api base url: ${apiBaseUrl}`);

async function makeReq<T extends keyof API>(...args: APIRequest[T]) {
	const resp = await fetch(new URL(args[0], apiBaseUrl), {
		headers: { "Content-Type": "application/json" },
		body: stringifyExtra(args[1]),
		method: "POST"
	});
	
	const data = parseExtra(await resp.text()) as ServerResponse<T>;
	if (args.length==3) args[2](data);
	if (data.type=="error") throw new Error(data.message);
	return data.data;
}

export function useAPI<T extends keyof API>({propagateError}: {
	propagateError?: boolean
}={}) {
	return useAsync(makeReq<T>, {propagateError});
}

export function useStageCount(stage: StageData) {
	const api = useAPI<"count">({propagateError: false});
	const url = stageUrl(stage);
	useEffect(()=>{
		// ignore errors, low priority and should function offline
		if (api.loading || api.error) return;

		const lastCount = LocalStorage.lastStageCount?.get(url);
		const now = Date.now();
		if (lastCount!=undefined && now < lastCount + COUNT_PLAY_INTERVAL_SECONDS*1000) {
			return;
		}
		
		api.run("count", { stage: url }, ()=>{
			LocalStorage.lastStageCount = mapWith(LocalStorage.lastStageCount??null, url, Date.now());
		});
	}, [api, url]);
}

type SubmissionStatus = {
	type: "judging"
}|{
	type: "done", verdict: Verdict
}|null;

function Leaderboard({submission: s, puzzle}: {
	submission: Submission|null, puzzle: Stage&{type: "puzzle"}
}) {
	const [sort, setSort] = useState<keyof ProgramStats>("time");
	const [input, setInput] = useState(()=>LocalStorage.username ?? "");

	const [data, setData] = useState<{
		type: "data", tokenId: {token: string, id: number}
	}|{ type: "nosolve" }|null>(null);
	const [stats, setStats] = useState<StageStatsResponse|null>(null);

	const refresh = useAsyncEffect(async ()=>{
		setData(null);
		let tokenId = LocalStorage.puzzleSolve?.get(puzzle.key) ?? null;

		if (s) {
			const solve = await makeReq<"solve">("solve", {
				stage: puzzle.key, procs: s.procs, entry: s.active,
				token: tokenId?.token ?? null, username: LocalStorage.username ?? null
			});

			tokenId={ token: solve.token, id: solve.id };
			LocalStorage.puzzleSolve = mapWith(LocalStorage.puzzleSolve??null, puzzle.key, tokenId);
		}
		
		if (tokenId) {
			setData({type: "data", tokenId});
		} else {
			setData({type: "nosolve"});
		}
	}, [s]);
	
	useAsyncEffect(async ()=>{
		setStats(null);
		if (data?.type!="data") return;
		setStats(await makeReq<"stats">("stats", { stage: puzzle.key, orderBy: sort }));
	}, [data, sort]);
	
	const api = useAPI<"setusername">();
	
	if (data?.type=="nosolve") return <></>;
	if (!data || !stats) return <Loading />;

	const upName = (s:string|null)=>{
		api.run("setusername", { token: data.tokenId.token, username: s }, ()=>{
			refresh.run();
		});				
		LocalStorage.username = s ?? undefined;
	};
	
	return <div className={twMerge(blankStyle, "items-start px-5")} >
		<Text v="md" className="self-center" >Leaderboard</Text>

		{api.loading ? <Loading /> : <form className="flex flex-row gap-2 items-center justify-start mb-4"
			onSubmit={(ev)=>{
				if (input=="") upName(null);
				else if (ev.currentTarget.reportValidity()) upName(input);
			}} >
			<Text v="smbold" >Username</Text>
			<Input value={input} valueChange={setInput} pattern={validUsernameRe} className="py-1" />
			<Button className={bgColor.sky} >Submit</Button>
		</form>}

		<div className="max-h-60 overflow-y-auto self-stretch grid grid-cols-[auto_auto_1fr_1fr_1fr] items-stretch justify-stretch border-collapse gap-0" >
			<div className="contents" >
				<Text v="smbold" className={clsx(borderColor.default, "p-2 border-1")} >{"#"}</Text>
				<Text v="smbold" className={clsx(borderColor.default, "p-2 border-1")} >Username</Text>
				{(["time", "nodes", "registers"] as const).map(x=>
					<Button key={x} onClick={()=>{
						setSort(x);
					}} iconRight={sort==x && <IconChevronDown size={16} />} >
						{x[0].toUpperCase()}{x.slice(1)}
					</Button>
				)}
			</div>
			{stats.map((v,i)=><Fragment key={v.id} >
				{[
					i+1,
					v.username ?? "(none)",
					toPrecStat(v.time),
					toPrecStat(v.nodes),
					toPrecStat(v.registers)
				].map((cell,j)=>{
					return <span key={j} className={clsx(
						data.tokenId.id==v.id ? bgColor.highlight : (i%2==0 ? bgColor.secondary : bgColor.md),
						"p-2", borderColor.default, "border-1"
					)} >{cell}</span>
				})}
			</Fragment>)}
		</div>
	</div>;
}

export function Submission({
	submission, setSolved, nextStage, puzzle
}: { 
	submission: Submission,
	puzzle: Stage&{type: "puzzle"},
	setSolved: ()=>void, nextStage: ()=>void
}) {
	const [alreadySolved, setAlreadySolved] = useState(false);
	useEffect(()=>{
		setAlreadySolved(LocalStorage.solvedPuzzles?.has(puzzle.key)??false);
	}, [puzzle.key]);

	const [s, setS] = useState<Submission|null>(null);
	const [loading, setLoading] = useState(false);

	const [status, setStatus] = useState<SubmissionStatus>(null);

	useEffect(()=>{
		setLoading(status?.type=="judging");
	}, [setLoading, status]);

	useAsyncEffect(async ()=>{
		if (!s) return;

		const stack = new DisposableStack();
		try {
			setStatus({type: "judging"});
			const worker = new Tester();
			stack.defer(()=>worker.terminate());

			worker.postMessage(stringifyExtra({
				puzzle: puzzle.key,
				proc: s.active, procs: s.procs
			} satisfies Parameters<typeof test>[0]))
			
			const verdictProm = new Promise<Verdict>((res,rej)=>{
				worker.onmessage = (msg)=>{
					res(parseExtra(msg.data as string) as Verdict);
				};

				worker.onerror = (err)=>{
					console.error("worker error", err);
					rej(new Error(`error in worker: ${err.message}`));
				};
			});
			
			const verdict = await verdictProm;
			if (verdict.type=="AC") {
				LocalStorage.solvedPuzzles = setWith(LocalStorage.solvedPuzzles ?? null, puzzle.key);
				setSolved();
			}
			
			setStatus({ type: "done", verdict });
		} finally {
			stack.dispose();
		}
	}, [s]);

	let inner = <></>;
	if ((status?.type=="done" && status.verdict.type=="AC") || (!status && alreadySolved)) {
		inner=<>
			<Alert className={bgColor.green} title="You passed" txt={<>
				{puzzle.solveBlurb ?? "Congratulations. Onwards!"}
				<Button onClick={()=>nextStage()} >Continue</Button>
			</>} />
		</>;
	} else if (status?.type=="done" && status.verdict.type!="AC") {
		inner=<Alert bad title="Test failed" txt={
			`Verdict: ${({
				WA: "wrong answer",
				RE: "runtime error",
				TLE: "time limit exceeded"
			} as const)[status.verdict.type]}`
		} />;
	}

	return <>
		<Button onClick={()=>{
			setS(submission);
		}} disabled={loading} icon={ loading && <ThemeSpinner size="sm" /> } >
			{s!=null || alreadySolved ? "Res" : "S"}ubmit solution
		</Button>

		{inner}
		<AlertErrorBoundary>
			<Leaderboard
				submission={status?.type=="done" && status.verdict.type=="AC" ? s : null}
				puzzle={puzzle} />
		</AlertErrorBoundary>
	</>;
}