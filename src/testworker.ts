import { test } from "./eval";
import { parseExtra, stringifyExtra } from "./ui";

onmessage = (ev)=>{
	const opt = parseExtra(ev.data as string) as Parameters<typeof test>[0];
	postMessage(stringifyExtra(test(opt)));
};