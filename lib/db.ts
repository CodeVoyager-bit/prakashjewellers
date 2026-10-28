import { MongoClient } from "mongodb";

// One client per server instance, kept across dev hot reloads.
const g = globalThis as unknown as { mongo?: MongoClient };
const client = (g.mongo ??= new MongoClient(process.env.MONGODB_URI!));

export const db = client.db("prakashjewellers");
