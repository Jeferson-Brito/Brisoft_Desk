class KeyedTaskQueue {
  constructor({ concurrency = 10, maxPending = 10000 } = {}) {
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.maxPending = Math.max(this.concurrency, Number(maxPending) || this.concurrency);
    this.queues = new Map();
    this.readyKeys = [];
    this.readySet = new Set();
    this.activeKeys = new Set();
    this.activeCount = 0;
    this.pendingCount = 0;
  }

  enqueue(key, task) {
    if (typeof task !== 'function') return Promise.reject(new TypeError('A tarefa deve ser uma função.'));
    if (this.pendingCount >= this.maxPending) {
      return Promise.reject(new Error(`Fila de mensagens cheia (${this.maxPending} pendentes).`));
    }

    const normalizedKey = String(key || 'default');
    return new Promise((resolve, reject) => {
      const queue = this.queues.get(normalizedKey) || [];
      queue.push({ task, resolve, reject });
      this.queues.set(normalizedKey, queue);
      this.pendingCount += 1;
      this.markReady(normalizedKey);
      this.drain();
    });
  }

  markReady(key) {
    if (this.activeKeys.has(key) || this.readySet.has(key)) return;
    this.readySet.add(key);
    this.readyKeys.push(key);
  }

  drain() {
    while (this.activeCount < this.concurrency && this.readyKeys.length > 0) {
      const key = this.readyKeys.shift();
      this.readySet.delete(key);
      const queue = this.queues.get(key);
      if (!queue?.length || this.activeKeys.has(key)) continue;

      const item = queue.shift();
      this.activeKeys.add(key);
      this.activeCount += 1;

      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.activeKeys.delete(key);
          this.activeCount -= 1;
          this.pendingCount -= 1;
          if (queue.length > 0) this.markReady(key);
          else this.queues.delete(key);
          this.drain();
        });
    }
  }

  stats() {
    return {
      active: this.activeCount,
      pending: this.pendingCount,
      clients: this.queues.size,
      concurrency: this.concurrency,
      maxPending: this.maxPending
    };
  }
}

module.exports = KeyedTaskQueue;
