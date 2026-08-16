# Python Security Rules

**Forbidden:**

- Hardcoded secrets
- `eval()` / `exec()` with user input
- Unsanitized SQL (use parameterized queries)
- `pickle` from untrusted sources
- Shell‑injection vectors in `subprocess` calls

**Required:**

- Environment variables for secrets
- Parameterized SQL queries
- Input validation
- bcrypt / Argon2 for passwords
- `secrets` module for cryptographic operations
- `subprocess.run([...], shell=False)`

## Additional Scans

```bash
uv run bandit -r src/         # Static security analysis
uv run safety check           # Dependency vulnerabilities
uv run uv-secure scan         # Project dependency security
```
