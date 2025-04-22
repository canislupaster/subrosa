import { createHash } from "node:crypto";
import { Context, Hono } from "hono";
import z from "zod";
import { serveStatic } from "hono/deno";
import { Buffer } from "node:buffer";
import process from "node:process";
import { data, StageData, stageUrl } from "../shared/data.ts";
import { AddSolve, AddSolveResponse, CountStage, parseExtra, SetUsername, StageStats, StageStatsResponse, stringifyExtra, validUsernameRe } from "../shared/util.ts";
import { addSolve, countPlay, getStats, setUsername } from "./db.ts";
import { getConnInfo } from 'hono/deno';
import { ProgramStats, Verdict } from "../shared/eval.ts";
import { StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
	constructor(public msg: string, public status: StatusCode=500) {super(msg);}
}

const app = new Hono();

export const doHash = (pass: string)=>createHash("SHA256").update(Buffer.from(pass)).digest().toString("hex");

const stageReq = z.object({
	stage: z.string()
}) satisfies z.ZodType<CountStage>;

const register = z.object({
	type: z.literal("value"),
	value: z.union([z.number(), z.string()]),
	name: z.string().nullable(),
}).or(z.object({
	type: z.literal("param"),
	name: z.string().nullable()
}));

const node = z.union([
	z.object({ op: z.enum(["inc", "dec"]), lhs: z.number() }),
	z.object({ op: z.literal("goto"), conditional: z.number().nullable(), ref: z.union([z.number(), z.literal("unset"), z.null()]) }),
	z.object({ op: z.literal("call"), procRef: z.number(), params: z.array(z.number()) }),
	z.object({ op: z.enum(["add", "sub", "set", "access"]), lhs: z.number(), rhs: z.number() }),
	z.object({ op: z.literal("setIdx"), lhs: z.number(), rhs: z.number(), idx: z.number() }),
]);

const procedure = z.object({
	name: z.string(),
	nodeList: z.array(z.number()),
	maxNode: z.number(),
	registerList: z.array(z.number()),
	maxRegister: z.number(),
	registers: z.map(z.number(), register),
	nodes: z.map(z.number(), node),
});

const addSolveReq = z.object({
	stage: z.string(),
	procs: z.map(z.number(), procedure),
	entry: z.number(),
}) satisfies z.ZodType<AddSolve>;

async function parse<R>(t: z.ZodType<R>, c: Context): Promise<R> {
	if (c.req.header("Content-Type")!="application/json")
		throw new AppError("non-json content type");
	let res: z.SafeParseReturnType<R,R>;
	try {
		res = t.safeParse(parseExtra(await c.req.raw.text()));
	} catch {
		throw new AppError("could not parse body");
	}
	if (res.error) {
		throw new AppError(`invalid body: ${res.error.toString()}`);
	}
	return res.data;
}

app.post("/count", async c=>{
	const { stage } = await parse<CountStage>(stageReq, c);
	const ip = [...c.req.raw.headers].find(x=>x[0]=="X-Forwarded-For")?.[1]?.split(",")?.[0]?.trim()
		?? getConnInfo(c).remote.address ?? null;

	if (!data.some(x=>stageUrl(x)==stage)) throw new AppError("stage not found", 404);

	await countPlay(ip, stage);
});

function getStage(stage: string) {
	const ret = data.find(x=>x.type=="puzzle" && x.key==stage) as StageData&{type: "puzzle"}|undefined;
	if (!ret) throw new AppError("stage not found", 404);
	return ret;
}

app.post("/solve", async c=>{
	const solve = await parse<AddSolve>(addSolveReq, c);
	const stage = getStage(solve.stage);
	const accumStats: ProgramStats = { nodes: 0, time: 0, registers: 0 };

	for (let testI=0; testI<10; testI++) {
		const input = stage.generator();
		const output = stage.solve(input);

		const worker = new Worker(
			new URL("../shared/worker.ts", import.meta.url).href,
			{ type: "module" }
		);
			
		try {
			const delay = new Promise<null>((res)=>setTimeout(()=>res(null), 10_000));
			const recv = new Promise<Verdict|"error">((res)=>{
				worker.onmessageerror = worker.onerror = ()=>res("error");
				worker.onmessage = (e)=>res(parseExtra(e.data as string) as Verdict);
			});

			worker.postMessage(stringifyExtra({
				input, output, proc: solve.entry, procs: solve.procs
			}));
			
			const res = await Promise.race([delay, recv]);
			if (res==null) throw new AppError("execution timed out");
			if (res=="error") throw new AppError("execution error");
			if (res.type!="AC") throw new AppError(`received verdict ${res.type} != AC (tc ${testI+1})`);
			
			for (const k of ["nodes", "time", "registers"] as const)
				accumStats[k]=Math.max(accumStats[k], res[k]);
		} finally {
			worker.terminate();
		}
	}
	
	return c.json(await addSolve({...accumStats, stage: solve.stage}) satisfies AddSolveResponse);
});

app.post("/stats", async c=>{
	const v = await parse<StageStats>(stageReq, c);
	getStage(v.stage); // assert exists
	return c.json(await getStats(v.stage) satisfies StageStatsResponse);
});
	
const setUsernameReq = z.object({
	token: z.string(), username: z.string().regex(validUsernameRe)
});

app.post("/setusername", async c=>{
	const v = await parse<SetUsername>(setUsernameReq, c);
	await setUsername(v.token, v.username);
});

app.use("*", serveStatic({
	root: "../dist"
}));

app.get("*", async c=>c.body((await Deno.open("../dist/index.html")).readable, 200));

app.onError((err,c)=>{
	console.error("request error", err);
	if (err instanceof AppError) return c.json({type: "error", message: err.msg}, err.status);
	return c.json({type: "error", message: "unknown error"}, 500);
});

console.log("starting server");
Deno.serve({port: Number.parseInt(process.env["PORT"] ?? "8421")}, app.fetch)
console.log("server started");