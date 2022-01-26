const queue: any[] = []

// 通过一个策略 只生成一个 promise
let isFlushPending = false

const p = Promise.resolve()

export function nextTick(fn) {
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

  nextTick(flushJob)
}

function flushJob() {
  isFlushPending = false
  let job
  while (job = queue.shift()) {
    job & job()
  }
}