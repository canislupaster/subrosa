import { test } from "./eval.ts";
import { parseExtra, stringifyExtra } from "./util.ts";

onmessage = (ev)=>{
	const opt = parseExtra(ev.data as string) as Parameters<typeof test>[0];
	postMessage(stringifyExtra(test(opt)));
};