import { MongoClient } from "mongodb";
import { DB } from "./constants";

if (!DB.URI) {
  throw new Error('Chưa cấu hình MONGODB_URI trong .env.local');
}

const uri = DB.URI;
const options = {
  serverSelectionTimeoutMS: 60000,
  maxPoolSize: 10, // Giới hạn kết nối để máy nhẹ hơn
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
