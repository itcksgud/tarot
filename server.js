//express
const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');

//html에서 사용할 파일들 경로 설정정
app.use(express.static(__dirname+'/public'))
//.ejs 사용
app.set('view engine', 'ejs')
//.body 사용
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// 세션 설정
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

app.use(bodyParser.json());

require('dotenv').config();

//mongodb
const {MongoClient, ObjectId} = require('mongodb');

let db
const url = process.env.DATABASE_URL;
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db();
}).catch((err)=>{
  console.log(err)
})

app.listen(8000, () => {
    console.log('http://localhost:8000 에서 서버 실행중')
})

app.get('/list/:page', async (req, res) => {
    try {
        let count = await db.collection('post').countDocuments(); // 문서 개수 반환
        let totalPages = Math.floor((count+9) / 10); // 총 페이지 수 계산
        let currentPage = parseInt(req.params.page, 10); // 요청된 페이지 번호

        // 페이지 범위 초과 시 오류 페이지 렌더링
        if (currentPage < 1 || currentPage > totalPages) {
            return res.redirect('/list/1');
        }

        // 요청된 페이지에 해당하는 문서 가져오기
        let result = await db.collection('post')
            .find()
            .sort({ order: -1 })
            .skip((currentPage - 1) * 10)
            .limit(10)
            .toArray();

        res.render('list.ejs', { post: result, count: totalPages, currentPage: currentPage });
    } catch (e) {
        console.error('DB 조회 중 오류:', e);
        res.status(500).send('DB 조회 중 오류 발생');
    }
}) 

app.get('/submit', async (req, res) => {
    res.render('submit.ejs')
}) 

let isProcessing = false; // 중복 제출 방지를 위한 잠금 플래그

app.post('/submit', async (req, res) => {
    if (isProcessing) {
        return res.status(429).json({ message: '요청을 처리 중입니다. 잠시 후 다시 시도해주세요.' });
    }

    isProcessing = true; // 요청 처리 시작

    try {
        const { title, nickname, password, content, numbers, lock } = req.body; // 클라이언트에서 보낸 데이터
        const currentTime = new Date(); // 현재 시간 저장
        let seed = currentTime.getTime(); // 난수 생성을 위한 시드로 현재 시간의 타임스탬프 사용

        const array = Array.from({ length: 78 }, (_, index) => index);

        function seededRandom() {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        }

        let numbersArray = numbers.split(',').map(Number);

        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1)); // 시드 기반 난수
            [array[i], array[j]] = [array[j], array[i]];   // Swap
        }

        for (let i = 0; i < 10; i++) {
            numbersArray[i] = array[numbersArray[i] - 1];
        }

        // 가장 큰 order 값을 가진 데이터 찾기
        let lastPost = await db.collection('post').find().sort({ order: -1 }).limit(1).toArray(); 
        let nextOrder = 1;

        // 가장 큰 order 값이 있으면 그 값 + 1로 설정
        if (lastPost.length > 0) {
            nextOrder = lastPost[0].order + 1;
        }

        const post = {
            order: nextOrder,
            time: currentTime,
            title,
            nickname,
            lock,
            password,
            content,
            numbers: numbersArray,
            answer: null,
            review: null
        };

        // 새 포스트 삽입
        await db.collection('post').insertOne(post);
        res.json({ message: '글이 성공적으로 작성되었습니다.', redirect: '/list/1' });

    } catch (err) {
        console.error('DB 저장 중 오류:', err);
        res.status(500).json({ message: 'DB 저장 중 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
        isProcessing = false; // 요청 처리 완료 후 잠금 해제
    }
});



// 상세 페이지 라우트
app.get('/detail/:postId', async (req, res) => {
    const postId = req.params.postId;
    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });
    res.render('detail', { post });
});

app.post('/access-unlock-post', async (req, res) => {
    const { postOrder } = req.body;

    // `postOrder`를 이용해 DB에서 해당 게시물을 찾고 처리
    const post = await db.collection('post').findOne({ order: Number(postOrder) });

    if (!post) {
        console.log(1);
        return res.status(404).send('Post not found');
    }

    return res.json({ redirectTo: `/detail/${post._id}` });
});

app.post('/access-lock-post', async (req, res) => {
    const { postOrder, postPassword } = req.body;

    // `postOrder`를 이용해 DB에서 해당 게시물을 찾고 처리
    const post = await db.collection('post').findOne({ order: Number(postOrder) });

    if (!post) {
        return res.status(404).send('Post not found');
    }

    if (post.password === postPassword) {
        return res.json({ redirectTo: `/detail/${post._id}` });
    } else {
        // 비밀번호가 틀리면 null을 반환
        return res.json({ redirectTo: null });
    }
});

app.get('/a/:postId', async (req, res) => {
    const postId = req.params.postId;
    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });
    res.render('answer', { post });
});

app.put('/update-answer', async (req, res) => {
    const { postId, newAnswer } = req.body;

    // postId를 ObjectId로 변환
    const updatedPost = await db.collection('post').updateOne(
        { _id: new ObjectId(postId) },  // ObjectId로 변환
        { $set: { answer: newAnswer } }  // 'answer' 필드를 수정하도록 변경
    );

    console.log(updatedPost);
    if (updatedPost.matchedCount > 0) {
        res.status(200).send('Post updated successfully');
    } else {
        res.status(404).send('Post not found');
    }
});

app.put('/update-review', async (req, res) => {
    const { postId, newReview } = req.body;

    // postId를 ObjectId로 변환
    const updatedPost = await db.collection('post').updateOne(
        { _id: new ObjectId(postId) },  // ObjectId로 변환
        { $set: { review: newReview } }  // 'answer' 필드를 수정하도록 변경
    );

    console.log(updatedPost);
    if (updatedPost.matchedCount > 0) {
        res.status(200).send('Post updated successfully');
    } else {
        res.status(404).send('Post not found');
    }
});

app.get('/', async (req, res) => {
    res.redirect('/list/1');
});
//nodemon server.js