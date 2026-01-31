# Wiki3.ai Publish Extension

Publish JupyterLite notebooks directly to GitHub with one click.

## Features

- 🚀 **One-click publishing** - Publish notebooks to GitHub repositories
- 🔐 **Client-side authentication** - Your token stays in your browser
- 🤖 **Automatic GitHub Actions** - Uses `repo2jupyterlite-action` for deployment
- 📄 **GitHub Pages ready** - Notebooks published to `username.github.io/repo-name/`
- ✨ **Zero configuration** - Works out of the box

## Usage

1. **Open a notebook** in Wiki3.ai JupyterLite
2. **Click "Publish"** button in the toolbar
3. **Paste your GitHub token** (first time only)
   - Get token from `gh auth token` (GitHub CLI)
   - Or create Personal Access Token at https://github.com/settings/tokens
   - Needs: `repo`, `workflow` scopes
4. **Select or create** a GitHub repository
5. **Watch progress** as notebook uploads and workflow triggers
6. **View your site** at `https://username.github.io/repo-name/`

## How It Works

1. **Uploads notebook** to your repository
2. **Creates `.github/workflows/publish.yml`** with `repo2jupyterlite-action`
3. **Enables GitHub Pages** using GitHub Actions deployment
4. **GitHub Actions automatically:**
   - Builds JupyterLite site from your notebook
   - Publishes to GitHub Pages
   - Site ready in 1-2 minutes

## Security

- ✅ Token stored only in **browser session memory**
- ✅ No backend server needed
- ✅ No token transmission (direct browser → GitHub API)
- ✅ Cleared on page refresh
- ✅ Use fine-grained tokens for minimal permissions

## Token Requirements

Your GitHub token needs these scopes:

- `repo` - Read/write access to repositories
- `workflow` - Enable GitHub Actions

**Minimal fine-grained token:**
- Select repositories you want to publish to
- Permissions: Contents (R+W), Workflows (R+W), Pages (R+W)

## Development

### Setup

```bash
cd jupyterlab-publish
npm install
npm run build
```

### Build for production

This makes the labextension subdir

```bash
npm run build:prod
```

### Include in JupyterLite build

The extension is included in the wiki3-ai-site build automatically.

## License

AGPL-3.0-only
