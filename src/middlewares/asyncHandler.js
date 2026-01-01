export function asyncHandler(handler) {
  return async function (req, res, next) {
    try {
      console.log('asyncHandler까지 정상 작동')
      await handler(req, res, next);
    } catch (e) {
      // asyncHandler의 catch(e)가 에러를 잡아 errorHandler에게 넘긴다.
      next(e); // next()안에 인자가 있네? err핸들러 찾아
    }
  };
}
