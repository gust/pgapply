# PGApply
PGApply is a utility to make deploying your Postgres code easier.

We deploy all of our other code by deploying the source in our repository, so why not our database code?

PGApply can read your repository and database, and can ensure the code in your database is the code under version control (and help make it so).

#### Status
PGApply is currently non-functional, and getting closer to a viable proof of concept. Do not expect it to meet your needs.

## Beliefs
PGApply assumes the following about you:
- You like CI/CD
- You use Postgres
- You use Git to manage your Postgres code
- You don't trust migration scripts to always get it right

## How it works
1. PGApply reads in the sql files in the commit you want it to apply
2. It builds a new Database (in a container) using those files as source
3. It uses that build to understand how your source files work
4. It compares the desired commit to the last deployed commit
5. It reruns the files necessary to make the target database consistent with the source
6. It confirms the results by comparing with the freshly built database

## Caveats and prerequisites
Too many to list. See Status
