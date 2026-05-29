# wiki3.ai publish redesign

## Summary

This redesign removes PAT entry, removes the heavy GitHub Action build, and publishes a notebook by:

1. signing the user in with a GitHub App user token,
2. creating a repo from a prebuilt template repo,
3. exporting the current `.ipynb` to `.html` in the browser,
4. generating a small manifest and landing page,
5. committing the changed files in a single Git commit via the Git blobs / trees / commits API,
6. enabling GitHub Pages from `main` + `/`.

## Why this design

- The current extension explicitly asks the user to paste a GitHub token and recommends `gh auth token` or a PAT, stores the token in browser session storage, creates a workflow, and waits for GitHub Actions to build and publish the site. See the current README and source. 
- GitHub recommends GitHub Apps over OAuth apps because GitHub Apps have fine-grained permissions and short-lived tokens.
- GitHub's REST docs show GitHub App user access tokens can create repos from templates, update repository contents, and manage GitHub Pages.
- GitHub's Git trees docs are better than repeatedly calling the contents API when many files must be committed in one publish.
- JupyterLite merged support for custom export plugins in November 2025, and the JupyterLite docs now describe a built-in export system. That makes browser-side HTML export a good fit.

## High-level changes to wiki3-ai-site

### Remove or deprecate

- `jupyterlab-publish/src/github-auth.ts`
- PAT input dialog UX
- automatic creation of `.github/workflows/publish.yml`
- the assumption that GitHub Actions must build the site

### Add

- `jupyterlab-publish/src/github-app-auth.ts`
- `jupyterlab-publish/src/github-api-v2.ts`
- `jupyterlab-publish/src/notebook-exporter.ts`
- `jupyterlab-publish/src/site-manifest.ts`
- `jupyterlab-publish/src/publish-workflow-v2.ts`
- `worker/github-app-oauth-worker.ts`

## Repo split

### 1. `wiki3-ai/wiki3-site-template` (GPL)
Contains only reusable site shell code and assets:

- `index.html`
- `pages/` directory
- `notebooks/` directory
- `assets/wiki3-manifest-schema.json`
- CSS / JS for listing pages

This repo should be marked `is_template = true`.

### 2. `wiki3-ai/wiki3-ai-site` (AGPL)
Keeps your own site content, plus the editor / app code.

The publish extension should generate user repos from `wiki3-site-template`, not from your content repo.

## Publish data layout in user repo

```
/pages/<slug>.html
/notebooks/<slug>.ipynb
/wiki3/manifest.json
/wiki3/index.html
```

Optionally later:

```
/wiki3/search-index.json
/wiki3/graph.jsonld
```

## GitHub App permissions

Request only what the publish feature needs:

Repository permissions:
- Contents: Read & Write
- Administration: Read & Write
- Pages: Read & Write
- Metadata: Read-only

User authorization flow:
- GitHub App user authorization, not PAT
- short-lived user token

## Worker responsibilities

The static Pages site cannot safely hold the app private key or client secret, so a tiny Worker should:

- redirect to GitHub authorization
- exchange `code` for a user token
- refresh the user token if needed
- return only the access token JSON to the browser
- set strict CORS to your Pages origin

No repository data needs to transit the worker.

## Browser responsibilities

- save current notebook
- read notebook model JSON
- export notebook HTML using JupyterLite/Pyodide
- create or choose destination repo
- generate/update manifest
- create one git commit with all changed files
- enable GitHub Pages on `main` and `/`
- show final site URL

## Why not the device flow

GitHub's device flow would avoid a backend, but it is documented for headless apps such as CLI tools. It also requires the user to copy a code to `github.com/login/device`, which is more friction than a redirect-based browser flow.

## Why not the current contents API loop

The contents API is fine for a small number of files, but GitHub's docs explicitly point people to the Git Trees API when many files are involved. A single tree+commit publish is also easier to reason about and makes publish atomic.
