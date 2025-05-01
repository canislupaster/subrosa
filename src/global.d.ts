declare module "*?worker" {
	const worker: { new(): Worker };
	export = worker;
}
declare module "*?raw" {
	const txt: string;
	export = txt;
}