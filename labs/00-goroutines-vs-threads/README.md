# Lab 00 — Goroutines vs OS threads

**Question:** if you start 100,000 goroutines, how many OS threads does your
program actually use, and why?

## Your task (you write the code)

Create `main.go` in this folder that:

1. Prints the number of CPUs and `GOMAXPROCS` at start.
2. Starts 100,000 goroutines that each block (sleep, or wait on a channel)
   so they stay alive at the same time.
3. Waits until all are running, then prints the goroutine count and pauses
   (for example waits for Enter) so you can inspect the process.
4. Releases them all and waits for them to finish cleanly.

Run it with `go run .` from this folder.

## Hints

- `runtime.NumCPU()`, `runtime.GOMAXPROCS(0)`, `runtime.NumGoroutine()`
- `sync.WaitGroup` to wait for goroutines; a closed channel to release
  them all at once
- See the OS thread count on Windows, while it is paused:
  `(Get-Process -Name <name>).Threads.Count` in PowerShell, or
  Task Manager → Details → right-click a column header → add **Threads**
- Compare memory: Task Manager's memory column, or `runtime.ReadMemStats`

## Experiments

1. Change the count: 1k, 10k, 100k, 1M. How do the thread count and memory change?
2. Instead of sleeping, make each goroutine do a blocking **syscall**
   (for example reading a file). Does the thread count change? Why?
3. Run with `GOMAXPROCS=1`. What changes, and what does not?

## Write down

- How much memory does one goroutine cost, roughly? One OS thread?
- What are the **M**, **P** and **G** in the Go scheduler?
- Why can Go run 100k goroutines when 100k OS threads would crash most machines?

Put your answers in `docs/phases/phase-00.md` under CS fundamentals.
