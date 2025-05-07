import { createHash } from "node:crypto";
import { Context, Hono } from "hono";
import z from "zod";
import { serveStatic } from "hono/deno";
import { Buffer } from "node:buffer";
import process from "node:process";
import { data, StageData, stageUrl } from "../shared/data.ts";
import { AddSolve, API, CountStage, parseExtra, ServerResponse, StageStats, stringifyExtra, validUsernameRe } from "../shared/util.ts";
import { addSolve, countPlay, getStats, setUsername } from "./db.ts";
import { getConnInfo } from 'hono/deno';
import { TestParams, Verdict } from "../shared/eval.ts";
import { StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
	constructor(public msg: string, public status: StatusCode=500) {super(msg);}
}

const app = new Hono();

export const doHash = (pass: string)=>createHash("SHA256").update(Buffer.from(pass)).digest().toString("hex");

const stageReq = z.object({
	stage: z.string(),
}) satisfies z.ZodType<CountStage>;

const statsReq = stageReq.and(z.object({
	orderBy: z.literal("time").or(z.literal("nodes")).or(z.literal("registers"))
})) satisfies z.ZodType<StageStats>;

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
	z.object({ op: z.literal("goto"), conditional: z.number().nullable(), ref: z.union([z.number(), z.literal("unset"), z.literal("end")]) }),
	z.object({ op: z.literal("call"), procRef: z.number(), params: z.array(z.number()) }),
	z.object({ op: z.enum(["add", "sub", "set", "access"]), lhs: z.number(), rhs: z.number() }),
	z.object({ op: z.literal("setIdx"), lhs: z.number(), rhs: z.number(), idx: z.number() }),
	z.object({ op: z.literal("breakpoint"), conditional: z.number().nullable() })
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
	token: z.string().nullable(),
	username: z.string().nullable()
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

type APIRoute = {
	[K in keyof API]: {
		route: K,
		validator: z.ZodType<API[K]["request"]>,
		handler: (req: API[K]["request"], c: Context) => Promise<API[K] extends {response: unknown} ? API[K]["response"] : void>
	}
};

function makeRoute<K extends keyof API>(route: APIRoute[K]) {
	app.post(`/${route.route}`, async c=>{
		const req = await parse(route.validator, c);
		const resp = await route.handler(req, c);
		return c.json({
			type: "ok", data: (resp ?? null) as unknown as (ServerResponse<K>&{type: "ok"})["data"]
		} satisfies ServerResponse<K>);
	});
}

makeRoute<"count">({
	route: "count",
	validator: stageReq,
	async handler({stage}, c) {
		const ip = c.req.raw.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim()
			?? getConnInfo(c).remote.address ?? null;

		if (!data.some(x=>stageUrl(x)==stage)) throw new AppError("stage not found", 404);

		await countPlay(ip, stage);
	}
});

function getPuzzle(puzzleKey: string) {
	const ret = data.find(x=>x.type=="puzzle" && x.key==puzzleKey) as StageData&{type: "puzzle"}|undefined;
	if (!ret) throw new AppError("stage not found", 404);
	return ret;
}

const seed = Number.parseInt(process.env["SEED"] as string);
if (isNaN(seed)) throw new Error("test seed is invalid");

makeRoute<"solve">({
	route: "solve",
	validator: addSolveReq,
	async handler(solve) {
		const stage = getPuzzle(solve.stage);

		const worker = new Worker(
			new URL("../shared/worker.ts", import.meta.url).href,
			{ type: "module" }
		);
			
		const runTest = async (seed: number|null) => {
			try {
				const delay = new Promise<null>((res)=>setTimeout(()=>res(null), 10_000));
				const recv = new Promise<Verdict|"error">((res)=>{
					worker.onmessageerror = worker.onerror = ()=>res("error");
					worker.onmessage = (e)=>res(parseExtra(e.data as string) as Verdict);
				});

				worker.postMessage(stringifyExtra({
					puzzle: stage.key, proc: solve.entry, procs: solve.procs,
					statsSeed: seed
				} satisfies TestParams));
				
				const res = await Promise.race([delay, recv]);

				if (res==null) throw new AppError("execution timed out");
				if (res=="error") throw new AppError("execution error");
				if (res.type!="AC") throw new AppError(`received verdict ${res.type} != AC`);
		
				return res;
			} finally {
				worker.terminate();
			}
		};

		await runTest(null);
		const res = await runTest(seed);

		return await addSolve({ ...res, stage: solve.stage, token: solve.token });
	}
})

makeRoute<"stats">({
	route: "stats",
	validator: statsReq,
	async handler({stage, orderBy}) {
		getPuzzle(stage); // assert exists
		return await getStats(stage, orderBy);
	}
});
	
const setUsernameReq = z.object({
	token: z.string(),
	username: z.string().regex(new RegExp(validUsernameRe)).nullable()
});

makeRoute<"setusername">({
	route: "setusername",
	validator: setUsernameReq,
	async handler({token, username}) { await setUsername(token, username); }
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