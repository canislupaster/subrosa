import { test, TestParams } from "./eval.ts";
import { parseExtra, stringifyExtra } from "./util.ts";

onmessage = (ev)=>{
	const opt = parseExtra(ev.data as string) as TestParams;
	postMessage(stringifyExtra(test(opt)));
};