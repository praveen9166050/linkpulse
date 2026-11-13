# Lab 00 — The event loop vs threads

**Question:** your JavaScript runs on one thread, yet a Node server handles
thousands of connections at once. How, and when does that break?

You know Node already; this lab is about what happens **underneath it**:
the event loop, libuv's thread pool, and the OS.

## Part 1 — Block the loop (you write the code)

Create `server.ts` in this folder: an HTTP server (`node:http`, no
framework) with two routes:

- `GET /fast`: replies `ok` immediately.
- `GET /slow`: runs a CPU-heavy loop for about 3 seconds (for example a
  naive `fib(42)`), then replies.

Run it with `node labs/00-event-loop-vs-threads/server.ts`. In a second
terminal, request `/slow`, and while it runs, request `/fast`:

```powershell
curl.exe http://localhost:3000/slow
curl.exe http://localhost:3000/fast   # in another terminal, at the same time
```

**Observe:** does `/fast` answer straight away?

## Part 2 — Measure it

Add an event-loop lag monitor using `monitorEventLoopDelay` from
`node:perf_hooks`. Print the p50 and p99 delay every second. Watch the
numbers while `/slow` runs.

## Part 3 — Fix it with a worker thread

Move the CPU-heavy work into a worker (`node:worker_threads`) so `/slow`
no longer blocks `/fast`. Repeat Part 1 and compare the lag numbers.

## Part 4 — The hidden thread pool

Node already uses threads you didn't create. Write `pool.ts` that starts
8 `crypto.pbkdf2` calls at once (async version, 500,000 iterations each)
and prints when each finishes, with timestamps.

Run it twice:

```powershell
node labs/00-event-loop-vs-threads/pool.ts
$env:UV_THREADPOOL_SIZE=8; node labs/00-event-loop-vs-threads/pool.ts; Remove-Item Env:UV_THREADPOOL_SIZE
```

**Observe:** with the default pool size, do all 8 finish together, or in
batches? Why?

## Part 5 — Count the threads

While the server is running, check how many OS threads the `node` process has:

```powershell
(Get-Process -Name node).Threads.Count
```

Task Manager also works: Details → right-click a column header → add **Threads**.

## Write down

- Why does `/slow` freeze `/fast`? What exactly is the event loop busy doing?
- What runs on libuv's thread pool (file system, `dns.lookup`, `crypto`,
  `zlib`), and what does **not** need it (network sockets)? Why the difference?
- How does the OS tell Node a socket has data? (epoll on Linux, kqueue on
  macOS, IOCP on Windows.) Why does that let one thread serve 10k connections?
- Your Part 4 results: what is the default thread pool size, and what did
  changing it do?
- Why does a "single-threaded" `node` process show 10+ OS threads in Part 5?
- When would you choose worker threads, the cluster module, or more Lambda
  instances to use more CPU cores?

Put your answers in `docs/phases/phase-00.md` under CS fundamentals.
