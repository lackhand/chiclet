export default class RingBuffer<T> {
  private _capacity: number;
  private _buffer: T[];
  private _head: number;
  private _size: number;
  get size() {
    return this._size;
  }
  private get _tail() {
    return (this._head + this._size - 1 + this._capacity) % this._capacity;
  }

  constructor(capacity: number) {
    this._capacity = capacity;
    this._buffer = new Array(capacity);
    this._head = 0;
    this._size = 0;
  }

  clear() {
    this._buffer = new Array(this._capacity);
    this._head = 0;
    this._size = 0;
  }

  isFull() {
    return this._size === this._capacity;
  }

  isEmpty() {
    return this._size === 0;
  }

  pushTail(t: T): undefined | T {
    this._size++;
    let peek;
    if (this._size > this._capacity) {
      peek = this.head;
      this._head = (this._head + 1) % this._capacity;
      this._size = this._capacity;
    }
    this._buffer[this._tail] = t;
    return peek;
  }
  pushTailAll(...ts: T[]) {
    for (let t of ts) {
      this.pushTail(t);
    }
  }
  pushHeadAll(...ts: T[]) {
    for (let t of ts) {
      this.pushHead(t);
    }
  }

  pushHead(t: T): undefined | T {
    this._size++;
    let peek;
    if (this._size > this._capacity) {
      peek = this.tail;
      this._size = this._capacity;
    }
    this._buffer[this._head] = t;
    this._head = (this._head - 1 + this._capacity) % this._capacity;
    return peek;
  }

  get head(): undefined | T {
    if (this.isEmpty()) {
      return undefined;
    }
    return this._buffer[this._head];
  }
  get tail(): undefined | T {
    if (this.isEmpty()) {
      return undefined;
    }
    return this._buffer[this._tail];
  }
  popHead(): undefined | T {
    const item = this.head;
    if (item === undefined) {
      return undefined;
    }
    this._head = (this._head + 1) % this._capacity;
    this._size--;
    return item;
  }
  popTail(): undefined | T {
    const item = this.tail;
    if (item === undefined) {
      return undefined;
    }
    this._size--;
    return item;
  }

  normalize(newSize?: number) {
    if (newSize === undefined) {
      newSize = this._capacity;
    }
    if (this.isEmpty()) {
      this._buffer = new Array(newSize);
      this._capacity = newSize;
      this._head = 0;
      return;
    }
    const newBuffer = this._buffer.slice(this._head);
    if (this._head + this._size > this._capacity) {
      newBuffer.push(...this._buffer.slice(0, this._tail));
    }
    newBuffer.length = newSize;
    this._capacity = newSize;
    this._buffer = newBuffer;
    this._head = 0;
    return;
  }

  toArray(): T[] {
    this.normalize();
    return this._buffer.slice(this._size);
  }

  get(index: number): undefined | T {
    if (index >= this.size) {
      return undefined;
    }
    if (index < 0) {
      index = (index + this._size) % this._size;
    }
    return this._buffer[(this._head + index) % this._capacity];
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this._size; ++i) {
      yield this.get(i);
    }
  }
}
