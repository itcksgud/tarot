const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.post.create({
    data: {
      order: 1,
      title: "문의:https://open.kakao.com/o/sPG7wv8g",
      nickname: "타로못함ㅋㅋ",
      lock: "lock",
      password: "1234",
      content: "This is a seeded post.",
      numbers: [1, 2, 3, 4,5,6,7,8,9,10], // 배열 형태
      answer: null // null 가능
    }
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
