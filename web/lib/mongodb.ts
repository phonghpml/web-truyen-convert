import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Cấu hình thiếu: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 60000,
  connectTimeoutMS: 60000,
};

let clientPromise: Promise<MongoClient>;

// Tạo một biến global để giữ kết nối
let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (process.env.NODE_ENV === "development") {
  // Trong dev, nếu chưa có promise thì mới khởi tạo client và connect
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // Trong production, tạo mới một client và connect ngay
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
