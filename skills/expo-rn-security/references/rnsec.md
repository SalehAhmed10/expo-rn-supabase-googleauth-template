# rnsec usage

Use rnsec to generate a baseline security report for React Native apps done by [@adnansahinovich](https://x.com/adnansahinovich)

Repo: https://github.com/adnxy/rnsec

## Minimal flow

1) From the app root, run:

```bash
npx rnsec --help
```

2) Use the help output to pick the right command/flags for your desired report format.
3) Run rnsec and capture the output in the report.

## Notes

- Prefer `npx rnsec` to avoid global installs.
- If rnsec supports JSON or SARIF output in your environment, use it to make findings easier to parse.
- If rnsec cannot run (missing Node, restricted environment), still provide a report based on code review and clearly state the limitation.
