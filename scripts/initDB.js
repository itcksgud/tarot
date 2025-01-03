const mongoose = require('mongoose');

// MongoDB 연결
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// 데이터베이스 초기화
const initDB = async () => {
  await connectDB();

  // 여기에서 필요한 데이터베이스나 컬렉션을 설정하거나 초기화할 수 있습니다.
  const exampleCollection = mongoose.connection.db.collection('exampleCollection');
  if (!exampleCollection) {
    console.log('Creating new collection: exampleCollection');
    await mongoose.connection.db.createCollection('exampleCollection');
  }

  console.log('MongoDB Database initialized!');
};

initDB().catch((err) => console.error(err));
