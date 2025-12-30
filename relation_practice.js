
// [문제 1]

import prisma from "./src/lib/prisma"

// 목표: 5번 유저 정보와 그 유저가 쓴 글 목록 가져오기.
// const user = await prisma.user.findUnique({
//   where: { id:5 },
//   include : {
//     posts: true
//   }
// })

// {
//   "id": 5,
//   "name": "영수",
//   "posts": [
//     {
//     "id": 1,
//     "title": "주제1",
//     "authorId": 1
//     }
//   ]
// }

// posts의 필드를 보면 Post[] Post테이블과 관계가 있다. 
// Post테이블에 가니 writerId가 User테이블의 id를 참조하므로 
// 해당 User의 id와 일치하는 writerId의 row를 모두 가져와 posts의 value에 넣는다.




// [문제 2: 응용] "게시글 상세보기와 댓글"
// 상황: 게시글 ID가 10번인 글을 클릭했습니다. 
// 화면에는 글 제목, 작성자 이름, 그리고 그 글에 달린 모든 댓글 목록이 나와야 합니다.

// const post = await prisma.post.findUnique({
//   where: { id:10 },
//   include: {
//     author: { select: {name: true} },
//     comments: true
//   }
// })

// {
//   "id":10,
//   "title":"주제10",
//   "authorId":3
//   "author": { "name": "진호" },
//   "comments": [
//     {
//     "id":7,
//     "writerId":2,
//     "postId": 10
//   }
//   ]
// }
// 여기서 author에서 select를 하니까 User테이블로 간건가?

// [문제 3: 심화] "내가 쓴 댓글과 원문 찾기"
// 상황: 유저 ID가 7번인 사람이 **"내가 쓴 댓글 목록"**을 확인하려고 합니다. 
// 그런데 단순히 댓글 내용만 보는 게 아니라, 
// **"그 댓글이 달린 게시글의 제목"**이 무엇인지도 알고 싶습니다.

// const user = await prisma.user.findUnique({
//   where: { id:7 },
//   include: {
//     comments: {
//       include: {
//         post: { select : { title: true } }
//       }
//     }
//   }
// })

// {
//   "id":7,
//   "name":"종국",
//   "comments": [
//     {
//       "id":1,
//       "writerId":3,
//       "postId": 10,
//       "post": {
//         "title":"제목2"
//       }
//     }
//   ]
// }

// [문제 4] "유저의 활동 내역 종합 세트"
// 상황: 관리자 페이지에서 1번 유저의 모든 활동을 한눈에 보려고 합니다.
// 미션:
// 1번 유저(id: 1)를 찾는데, 다음 정보들을 한 번에 가져오세요.
// 이 유저가 쓴 모든 게시글(Post) 목록.
// 이 유저가 쓴 모든 댓글(Comment) 목록.
// (중요!) 댓글 목록을 가져올 때, 그 댓글이 어느 게시글(post)에 달린 건지 그 게시글의 제목(title)도 포함하세요.

// const user = await prisma.user.findUnique({
//   where: { id:1 },
//   include: {
//     posts: true,
//     comments: {
//       include : {
//         post : {
//           select : {
//             title: true
//           }
//         }
//       }
//     },
//   }
// })

// {
//   "id":1,
//   "name": "민주",
//   "posts": [
//     {
//       "id":3,
//       "title":"주제3",
//       "authorId":1
//     }
//   ],
//   "comments": [
//     {
//       "id":5,
//       "writerId":7,
//       "postId":9,
//       "post": {
//         "title": "주제9"
//       }
//     }
//   ]
// }


// 문제 5] "알림 센터: 댓글의 원천을 찾아서"
// 상황: 누군가 내 글에 댓글을 달았다는 알림이 떴습니다. 시스템은 **특정 댓글(ID: 100번)**의 정보를 분석해야 합니다.
// 미션:
// 댓글 ID가 100번인 것을 찾고, 다음을 모두 포함하세요.
// 이 댓글을 쓴 작성자(writer)의 이름.
// 이 댓글이 달린 게시글(post)의 제목.
// (심화) 그 게시글을 쓴 원래 글쓴이(author)의 이름.
// 힌트: Comment 모델에서 출발합니다. writer를 가져오고, 동시에 post를 가져오는데, 그 post 안에서 다시 author를 가져와야 합니다.

// const comment = await prisma.comment.findUnique({
//   where: { id:100 },
//   include : {
//     writer: { select : {name : true }},
//     post: {
//       include : {
//         author : { select : { name: true } } 
//       }
//     }
//   }
// })

// {
//   "id" : 100,
//   "writerId": 10,
//   "postId": 20,
//   "writer": { "name": "진수" }
//   "post": {
//     "id":20,
//     "title":"주제20",
//     "authorId":15,
//     "author": {"name":"시연" }
//   }
// }


// post에서도 select를 쓸 경우 select로 통일 해라. 그리고 한번 안으로 더 들어가면
// 그때는 다시 select를 써야한다.
// const comment = await prisma.comment.findUnique({
//   where: { id:100 },
//   include : {
//     writer: { select: { name: true }},
//     post: {
//       select : {
//         title: true, 
//         author : {
//           select : {
//             name: true
//           }
//         }
//       }
//     }
//   }
// })

// 👑 [마지막 문제] "인기 게시글의 작성자와 댓글 분석"
// 상황: 우리 서비스에서 가장 핫한 게시글인 50번 게시글의 상세 정보를 가져오려 합니다. 
// 그런데 단순히 댓글만 보는 게 아니라, **"댓글을 단 사람들이 예전에 썼던 다른 글들의 제목"**까지 궁금해졌습니다.

// 미션: Post ID가 50번인 것을 찾고, 다음 정보만 딱 골라서(Select) 가져오세요.
// 게시글의 title.
// 게시글 작성자(author)의 name.
// 게시글에 달린 comments 목록.
// 각 댓글에서 가져올 것:
// 댓글의 id.
// 댓글 작성자(writer)의 name.
// (가장 어려움!) 그 댓글 작성자가 과거에 썼던 모든 게시글(posts)의 title 목록.

// const post = await prisma.post.findUnique({
//   where: { id: 50 },
//   select : {
//     title: true,
//     author: {
//       select: { name : true } 
//     },
//     comments: {
//       select: {
//         id : true,
//         writer : {
//           select : {
//             name: true,
//             posts : {
//               select : { title: true }
//             }
//           }
//         }
//       }
//     }
//   }
// })

// {
//   "title": "제목3",
//   "author": {
//     "name": "정숙"
//   },
//   "comments": [{
//     "id":10,
//     "writer": {
//       "name" : "답글맨",
//       "posts": [{
//         "title": "제목10"
//       }]
//     }
//   }]
// }
