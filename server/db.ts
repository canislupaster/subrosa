import {Migrator, Kysely, MigrationProvider, Migration, GeneratedAlways} from "kysely";
import {DenoSqlite3Dialect} from "@soapbox/kysely-deno-sqlite";
import { Database as Sqlite } from "@db/sqlite";

import { AppError, doHash } from "./main.ts";
import { COUNT_PLAY_INTERVAL_SECONDS } from "../shared/util.ts";
import { randomBytes } from "node:crypto";
import { ProgramStats } from "../shared/eval.ts";

type PlayStage = {
	id: GeneratedAlways<number>,
	ip: string|null,
	timestamp: number,
	stage: string,
};

type SolvePuzzle = {
	id: GeneratedAlways<number>,
	stage: string,
	key: string,
	time: number,
	registers: number,
	nodes: number,
	timestamp: number
	username: string|null
};

type Database = { play: PlayStage, solve: SolvePuzzle };

const db = new Kysely<Database>({
	dialect: new DenoSqlite3Dialect({
		database: new Sqlite("./db.sqlite")
	})
});

const migrator = new Migrator({
	db,
	provider: {
		async getMigrations() {
			return {
				"1_init": {
					async up(db) {
						await db.schema.createTable("play")
							.addColumn("id", "integer", col => col.primaryKey().autoIncrement())
							.addColumn("timestamp", "timestamp", col => col.notNull())
							.addColumn("ip", "text", col => col.notNull())
							.addColumn("stage", "text", col => col.notNull())
							.execute();

						await db.schema.createTable("solve")
							.addColumn("id", "integer", col => col.primaryKey().autoIncrement())
							.addColumn("key", "text", col=>col.notNull().unique())
							.addColumn("stage", "text", col=>col.notNull())
							.addColumn("time", "integer", col => col.notNull())
							.addColumn("timestamp", "timestamp", col => col.notNull())
							.addColumn("registers", "integer", col => col.notNull())
							.addColumn("nodes", "integer", col => col.notNull())
							.addColumn("username", "text")
							.execute();

						await db.schema.createIndex("play_index")
							.on("play")
							.columns(["ip", "stage", "timestamp"])
							.execute();
					},
					async down(db) {
						await db.schema.dropTable("solve").execute();
						await db.schema.dropIndex("play_index").execute();
						await db.schema.dropTable("play").execute();
					}
				} satisfies Migration
			};
		}
	} satisfies MigrationProvider
});

console.log("migrating database...");

const res = await migrator.migrateToLatest();
if (res.error!=undefined) {
	console.error("migration failed", res.error);
}

console.log("database ready");

export async function countPlay(ip: string|null, stage: string) {
	const curTime = Date.now();
	await db.transaction().execute(async trx=>{
		if (ip!=null) {
			const x = await trx.selectFrom("play")
				.select("timestamp")
				.where("ip", "=", ip).where("stage", "=", stage)
				.orderBy("timestamp desc").executeTakeFirst();
			
			if (x && curTime < x?.timestamp + COUNT_PLAY_INTERVAL_SECONDS*1000) {
				throw new AppError("counting too soon");
			}
		}
		
		await trx.insertInto("play").values({
			timestamp: curTime, ip, stage
		}).execute();
	});
}

export async function addSolve({
	time, registers, nodes, stage, token
}: { stage: string, token: string|null }&ProgramStats) {
	token ??= randomBytes(16).toString("base64");
	
	const vs = { stage, time, registers, nodes, timestamp: Date.now() } as const;
	const ret = await db.insertInto("solve").values({
		key: doHash(token), ...vs
	}).returning(["id", "username"]).onConflict(conflict=>
		conflict.column("key").doUpdateSet(vs)
	).executeTakeFirstOrThrow();
	
	return { token, id: ret.id, username: ret.username };
}

export async function setUsername(key: string, username: string|null) {
	if (!await db.updateTable("solve").where("key", "=", doHash(key))
		.set("username", username).executeTakeFirst())
		throw new AppError("no such entry to set name for");
}

export function getStats(stage: string) {
	return db.selectFrom("solve").where("stage", "=", stage)
		.select(["registers", "nodes", "time", "username", "id"])
		.limit(1e4).execute();
}
