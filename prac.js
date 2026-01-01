import prisma from "./src/lib/prismaClient";

// const projects = await prisma.project.findMany({
//   include: {
//     _count: {
//       select: {
//         projectMembers: true, 
//         tasks: true,          
//       }
//     }
//   }
// });


// const projects = await prisma.project.findMany({
//   include: {
//     _count: {
//       select: {
//         projectMembers: true,
//         tasks: true
//       }
//     }
//   }
// })

// const post = await prisma.post.create({
//   data: {
//     title : "안녕하세요!",
//     author : {
//       connect : { id : 1 }
//     }
//   }
// })

// 그럼 authorId필드에 값이 1이 되는건가?
// const post = await prisma.post.create({
//   data: {
//     title: "안녕하세요",
//     author : {
//       connect : { id:1 }
//     }
//   }
// })

const post = await prisma.post.create({
  where: { id:1 },
  include: { author : true }
})

const post1 = await prisma.post.findUnique({
  where: { id:1 },
  include: {
    author: {
      select: {
        name: true
      }
    }
  }
})

const post2 = await prisma.post.findUnique({
  where: { id:1 },
  select: {
    title: true,
    author: {
      select : {
        name: true
      }
    }
  }
})

{
  "title": "안녕하세요",
  "author": {
    "name" : "김철수"
  }
}

const post3 = await prisma.post.findUnique({
  where: { id: 1 },
  include: { 
    author: {
      select: { name: true } 
    },
    categories: [{
      "id":1,
      "name": "java"
    }]
  }
})

{
  "id": 1,
  "title": "안녀하세요"
  "authorId": 3,
  "author": {
    "name": "홍길동"
  }
}

const post4 = await prisma.post.create({
  data: {
    title:"connect 공부중",
    author: {
      connect: { id:1 }
    }
  }
})

const post5 = await prisma.post.create({
  data: {
    title: "connect 공부중",
    author: {
      connect: { id:1 }
    }
  }
})


const orderitem = await prisma.orderitem.create({
  data: {
    product: {
      connect: { productCode : "abc123"}
    }
  }
})

const post7 = await prisma.post.create({
  data: {
    author: {
      connect : { email: "hello@gamil.com" }
    }
  }
})


// const post8 = await prisma.post.create({
//   data: {
//     title: "Prisma 마스터 중",
//     author: { connect: { id:1 } },
//     categories: { connect: [
//       { id:1 },
//       { id:2 },
//       { id:3 }
//     ]} 
//   }
// })

const post9 = await prisma.create({
  data: {
    title: "Prisma 마스터 중",
    author: { connect: { id:1 }},
    categories: { connect: }
  }
})

const users = await prisma.user.findMany({
  select: {
    name: true,
    _count: {
      select: { posts: true }
    }
  }
})

const postt = await prisma.post.create({
  data:{
    title: "하이",
    author: {
      connect: { id: 1}
    },
    categories : {
      connect : [{ id:1}, {id:2}]
    }
  }
})

// const user = await prisma.user.findUnique({
//   where: { id:1 },
//   include: { posts: true }
// })

const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: { 
    name: true, 
    _count: {
      select: { posts: true }
    }
  },
})

{
  "name" : "홍길동",
  "_count" : {
    "posts" : 5
  }
}

const userWithEverything = await prisma.user.findMany({
  include: {
    posts: {
      include: {
        categories: true
      }
    }
  }
})


const userCount = await prisma.user.findMany({
  include: {
    posts: {
      include: {
        categories: true
      }
    }
  }
})


const userSelectContent = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: {
        id: true,
        title: true,
        author: {
          select: { 
            id: true,
            name: true},
        },
        categories: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
  }
})

const category = await prisma.category.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: {
        id: true,
        title: true,
        author: {
          select: {
            id: true,
            name: true
          }
        },
        authorId: true
      }
    }
  }
})

// await prisma.post.create({
//   data: {
//     title:"새 글",
//     author: {
//       connect: { id: 1}
//     }
//   }
// })

await prisma.post.create({
  data: {
    title: "주제1",
    author: {
      connect: { id:1 }
    }
  }
})

const postss = await prisma.post.create({
  data: {
    title: "Prisma 공부 중",
    author: {
      connect : { id: 1 } //authorId 필드의 값에 1이 생긴다.
    },
    categories: {
      connectOrCreate: {
        where: { name: "Node.js" },
        create: { name: "Nodejs"}
      }
    }
  }
}) 

const postz = await prisma.post.create({
  data: {
    title: "하이",
    author: {
      connect: { id: 1}
    },
    categories : {
      connectOrCreate: {
        where: { name: "Node.js"},
        creat: {name: "Node.js"}
      }
    }
  }
})