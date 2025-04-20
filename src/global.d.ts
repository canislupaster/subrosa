declare module "*?worker" {
	const worker: { new(): Worker };
	export = worker;
}