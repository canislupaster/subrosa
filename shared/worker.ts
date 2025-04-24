import { test, TestParams } from "./eval.ts";
import { parseExtra, stringifyExtra } from "./util.ts";

onmessage = (ev)=>{
	const opt = parseExtra(ev.data as string) as TestParams;
	test(opt).then(out=>postMessage(stringifyExtra(out)), err=>reportError(err));
};