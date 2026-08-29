# Branch workflow

- `main` and `stage` are both protected on GitHub (no direct or force pushes, PR required, not even bypassable by the repo owner).
- New work merges into **`stage`** by default, not `main`. Only open a PR against `main` from `stage` itself, once `stage` is verified (e.g. deployed/tested there).
- When starting new feature branches, branch off `stage`, not `main`.
