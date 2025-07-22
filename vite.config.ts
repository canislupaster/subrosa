import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { cwd } from "node:process";
import { defineConfig, loadEnv } from "vite";
import { API } from "./shared/util.ts";

const apiEndpoints = ["solve", "count", "stats", "setusername"] satisfies (keyof API)[];
const devEnv = loadEnv("development", cwd());

export default defineConfig(x => ({
	plugins: [preact({ devToolsEnabled: true }), tailwindcss()],
	server: x.mode != "development"
		? undefined
		: {
			proxy: Object.fromEntries(
				apiEndpoints.map(k => [`/${k}`, { target: devEnv["VITE_DEV_SERVER_URL"] }]),
			),
		},
}));
