# Python Performance Patterns

Performance is rarely the bottleneck. Profile first with `cProfile` or `py-spy`.
These patterns cover the 80% case where the right stdlib function or data
structure avoids a quadratic loop or a needless allocation.

---

## Generators for large data

```python
# Bad — materialises the whole file into memory
total = sum(int(line) for line in open("data.log").readlines())

# Good — streams from disk, one line at a time
total = sum(int(line) for line in open("data.log"))
```

Use a generator expression `(x for x in it)` when you only need to iterate
once. Reserve list comprehensions `[x for x in it]` for when you actually
need random access or the list outlives the loop.

## `itertools` — efficient iteration

```python
from itertools import chain, batched, islice

# Flatten nested lists without nested loops
flat = list(chain.from_iterable(nested))

# Take the first N without materialising the iterator
head = list(islice(large_iterator, 1000))

# 3.12+: process items in fixed-size batches
for batch in batched(stream, 256):
    process(batch)
```

## `functools.lru_cache` — memoize expensive calls

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def compute_checksum(data: bytes) -> str:
    ...
```

Caveats:

- Arguments must be hashable.
- Don't cache I/O, mutation, or results that change over time.
- `maxsize=None` is safe only for small, fixed input domains.

## `collections.defaultdict` — no manual key checks

```python
from collections import defaultdict

# Bad — setdefault is awkward and re-reads the list
groups: dict[str, list[str]] = {}
for word in words:
    groups.setdefault(word[0], []).append(word)

# Good
groups: defaultdict[str, list[str]] = defaultdict(list)
for word in words:
    groups[word[0]].append(word)
```

## `str.join` — avoid quadratic string concatenation

```python
# Bad — creates a new string on every iteration
result = ""
for piece in pieces:
    result += piece

# Good — single allocation
result = "".join(pieces)
```

## `set` for membership testing

```python
valid = {"GET", "POST", "PUT", "DELETE"}   # O(1) per lookup
if method in valid: ...

# vs O(n) list scan
if method in ["GET", "POST", "PUT", "DELETE"]: ...
```

## `heapq` for priority queries

```python
import heapq

# Top-10 without a full sort
top_ten = heapq.nsmallest(10, scores, key=lambda x: x.score)

# vs
top_ten = sorted(scores, key=lambda x: x.score)[:10]
```

`heapq.nsmallest(n, ...)` is O(n log k) vs `sorted(...)[:n]` O(n log n).

## `Counter` — count hashable objects

```python
from collections import Counter

frequencies: Counter[str] = Counter(words)
five_most_common = frequencies.most_common(5)
```

---

## Before you optimise

1. **Measure.** `uv run python -m cProfile -o profile.pstats script.py`
   then `uv run snakeviz profile.pstats`.
2. **Know your bottleneck.** Most Python perf problems are I/O-bound;
   `asyncio` or batching usually beats a faster inner loop.
3. **These are local fixes.** The real wins often come from architecture:
   a cache layer, a better index, a denormalised read model.
