// scripts/initDB.js
const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://kingcrown20200:qwer1234@cluster0.rwn2f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'tarot';

async function initializeDB() {
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    // 예시: 초기 데이터 삽입
    const collection = db.collection('post');
    const post = {
      title: 'Sample Post',
      nickname: 'Admin',
      password: '1234',
      content: 'This is a sample post content',
      numbers: [],
      lock: false,
    };

    await collection.insertOne(post);
    console.log('Initial data inserted');
  } catch (err) {
    console.error('Error initializing DB:', err);
  } finally {
    await client.close();
  }
}

initializeDB();
