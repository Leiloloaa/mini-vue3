const queue: any[] = []

// 通过一个策略 只生成一个 promise
let isFlushPending = false

const p = Promise.resolve()

// nextTick 执行的时间 就是把 fn 推到微任务
export function nextTick(fn) {
  // 传了就执行 没传就 等待到微任务执行的时候
  return fn ? p.then(fn) : p
}

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }

  queueFlush()
}

function queueFlush() {
  if (isFlushPending) return
  isFlushPending = true
  // 然后就是就是生成一个 微任务
  // 如何生成微任务？
  // p.then(() => {
  //   isFlushPending = false
  //   let job
  //   while (job = queue.shift()) {
  //     job & job()
  //   }
  // })

  nextTick(flushJob)
}

function flushJob() {
  isFlushPending = false
  let job
  while (job = queue.shift()) {
    job & job()
  }
}
