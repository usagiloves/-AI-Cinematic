class RequestQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
    this.completed = [];
    this.idCounter = 0;
  }

  add(task, priority = 0) {
    return new Promise((resolve, reject) => {
      const item = {
        id: ++this.idCounter,
        task,
        priority,
        status: 'pending',
        addedAt: Date.now(),
        resolve,
        reject
      };

      this.queue.push(item);
      this.queue.sort((a, b) => b.priority - a.priority);
      this._process();

      return item.id;
    });
  }

  async _process() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    item.status = 'running';
    item.startedAt = Date.now();

    try {
      const result = await item.task();
      item.status = 'completed';
      item.completedAt = Date.now();
      item.duration = item.completedAt - item.startedAt;
      this.completed.push(item);
      if (this.completed.length > 100) this.completed.shift();
      item.resolve(result);
    } catch (error) {
      item.status = 'failed';
      item.error = error.message;
      item.completedAt = Date.now();
      this.completed.push(item);
      item.reject(error);
    } finally {
      this.running--;
      this._process();
    }
  }

  getStatus() {
    return {
      pending: this.queue.length,
      running: this.running,
      completed: this.completed.length,
      items: [
        ...this.queue.map(i => ({ id: i.id, status: i.status, priority: i.priority, addedAt: i.addedAt })),
        ...Array.from({ length: this.running }, () => ({ status: 'running' }))
      ]
    };
  }

  clear() {
    this.queue.forEach(item => item.reject(new Error('Queue cleared')));
    this.queue = [];
  }
}

module.exports = new RequestQueue();
