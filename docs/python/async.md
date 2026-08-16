# Async Patterns

Use `async`/`await` for I/O-bound concurrency. For CPU-bound work use
`multiprocessing` or `concurrent.futures.ProcessPoolExecutor` — async
gives you nothing there.

---

## `asyncio.gather` — fan out independent calls

```python
import asyncio

async def fetch_all(urls: list[str]) -> list[str]:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
    return [r.text for r in responses if not isinstance(r, Exception)]
```

`return_exceptions=True` keeps one failure from cancelling every sibling.
Without it the first exception cancels the remaining tasks.

## `asyncio.TaskGroup` (3.11+) — structured concurrency

```python
async with asyncio.TaskGroup() as tg:
    for url in urls:
        tg.create_task(handle(url))
# If any task raises, the rest are cancelled and the exceptions are
# collected into an ExceptionGroup.
```

Prefer `TaskGroup` over naked `gather` for new code. It guarantees no
orphaned tasks and bundles failures for unified error handling.

## `asyncio.create_task` — fire and (eventually) await

```python
task = asyncio.create_task(long_running_operation())
# ... do other work while the task runs in the background ...
await task
```

If you never `await` the task it runs silently until completion (or forever
if it loops). Enable relevant ruff or flake8-async rules to catch unawaited tasks.

## `asyncio.timeout` (3.11+) — bounded waits

```python
async with asyncio.timeout(5.0):
    response = await client.get(url)
# Raises TimeoutError if the block takes longer than 5 s.
```

This scopes the timeout to the `with` block. The older `asyncio.wait_for`
is a single-coro wrapper.

## Async context managers

```python
import aiofiles

async with aiofiles.open("data.csv") as f:
    contents = await f.read()
```

Writing one:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_session():
    session = create_session()
    try:
        yield session
    finally:
        await session.close()
```

## In libraries — never `asyncio.run()`

```python
# Bad — steals the event loop from the caller
def list_users() -> list[User]:
    return asyncio.run(_fetch_users())

# Good — expose a coroutine the caller can schedule
async def list_users_async() -> list[User]:
    return await _fetch_users()
```

To detect whether you are inside a running loop:

```python
try:
    loop = asyncio.get_running_loop()
except RuntimeError:
    loop = None   # not in an async context
```

---

## Anti-patterns

### Sync blocking inside `async def`

```python
# Bad — blocks the entire event loop
async def poll():
    while not ready():
        time.sleep(5)

# Good — yields control to the loop
async def poll():
    while not ready():
        await asyncio.sleep(5)
```

Same rule applies to `open()`, `requests.get()`, and `subprocess.run()`.
Use async-aware equivalents: `aiofiles`, `httpx.AsyncClient`,
`asyncio.create_subprocess_exec`, or `asyncio.to_thread`.

### Unawaited coroutine

```python
async def handler():
    # Bad — returns a coroutine object that is silently discarded
    save_changes()

    # Good
    await save_changes()
```

Enable flake8-async to catch these.

### `asyncio.sleep(0)` busy-loops

```python
# Bad — yields control but does nothing useful
while not ready():
    await asyncio.sleep(0)

# Good — use an Event
event = asyncio.Event()

# ... elsewhere: event.set()
await event.wait()
```

For blocking I/O that has no async counterpart, use `asyncio.to_thread`:

```python
result = await asyncio.to_thread(blocking_io_function, arg1, arg2)
```

### Bare `async` without await

Enable `ASYNC124` (`flake8-async`) to flag functions that are `async` but never
`await`. Either add the `await` or drop the `async`.
