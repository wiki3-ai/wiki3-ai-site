
architecture_doc = """
# Wiki3.ai Publish Extension - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          JUPYTERLAB NOTEBOOK                           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Notebook Toolbar                           │  │
│  │  [Save] [Download] [Publish] ← Added by this extension        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Click "Publish"                          │
│                              ▼                                          │
│                      ┌────────────────┐                                │
│                      │ PublishButton  │ (publish-button.ts)           │
│                      │ Orchestrator   │                                │
│                      └────────────────┘                                │
└──────────────────────────────────────────────────────────────────────┐  │
                              │                                          │  │
                              ▼                                          │  │
                    ┌──────────────────┐                                │  │
                    │  Token Dialog    │ ◄──── If first time           │  │
                    │ (token-dialog)   │       (token-dialog.tsx)      │  │
                    └──────────────────┘                                │  │
                              │                                          │  │
                    ┌─────────┴──────────┐                             │  │
                    │                    │                             │  │
              Validate with       Store in Session                    │  │
             GitHub API           (sessionStorage)                    │  │
             (github-api.ts)          │                              │  │
                    │                    │                             │  │
                    ▼                    │                             │  │
              ┌────────────┐         ┌──────────┐                    │  │
              │ Valid? Yes │    No → │ Error    │                    │  │
              └────────────┘         │ Dialog   │                    │  │
                    │                └──────────┘                    │  │
                    │                     │                          │  │
                    │                ┌────┘                          │  │
                    │                │ Retry                         │  │
                    │         ┌──────┴─────┐                         │  │
                    ▼         ▼             ▼                         │  │
            ┌──────────────────────────────────────┐                 │  │
            │   Repository Selector                │                 │  │
            │  (repo-selector.tsx)                 │                 │  │
            │                                      │                 │  │
            │  • List user repositories            │                 │  │
            │  • Show stars, description            │                 │  │
            │  • Option to create new repo         │                 │  │
            └──────────────────────────────────────┘                 │  │
                    │                                                 │  │
        ┌───────────┴────────────┐                                   │  │
        │                        │                                   │  │
    Select          Create New                                       │  │
    Existing        (POST /user/repos)                               │  │
        │                        │                                   │  │
        └───────────┬────────────┘                                   │  │
                    │                                                 │  │
                    ▼                                                 │  │
    ┌────────────────────────────────────────┐                      │  │
    │    GitHub API Operations (github-api)  │                      │  │
    │                                        │                      │  │
    │  1. Upload notebook to repo            │                      │  │
    │     PUT /repos/{owner}/{repo}/         │                      │  │
    │         contents/{path}/notebook.ipynb │                      │  │
    │                                        │                      │  │
    │  2. Create workflow file               │                      │  │
    │     .github/workflows/publish.yml      │                      │  │
    │                                        │                      │  │
    │  3. Enable GitHub Pages                │                      │  │
    │     PATCH /repos/{owner}/{repo}/pages  │                      │  │
    │                                        │                      │  │
    │  4. Trigger workflow                   │                      │  │
    │     POST /repos/{owner}/{repo}/        │                      │  │
    │          actions/workflows/publish/    │                      │  │
    │          dispatches                    │                      │  │
    └────────────────────────────────────────┘                      │  │
                    │                                                 │  │
                    │ (All with Bearer token auth)                  │  │
                    │                                                 │  │
                    ▼                                                 │  │
    ┌────────────────────────────────────────┐                      │  │
    │       Publish Status Modal              │                      │  │
    │     (publish-status.tsx)                │                      │  │
    │                                        │                      │  │
    │  Step 1: Uploading notebook...   ✓    │                      │  │
    │  Step 2: Configuring workflow... ◐    │                      │  │
    │  Step 3: Enabling Pages...             │                      │  │
    │  Step 4: Triggering action...          │                      │  │
    │                                        │                      │  │
    │  [View URL] [Done]                     │                      │  │
    └────────────────────────────────────────┘                      │  │
                    │                                                 │  │
                    ▼                                                 │  │
    ┌────────────────────────────────────────┐                      │  │
    │      GitHub Backend Services            │                      │  │
    │                                        │                      │  │
    │  • Store notebook in repository        │                      │  │
    │  • Accept workflow file                │                      │  │
    │  • Configure Pages branch              │                      │  │
    │  • Trigger GitHub Actions workflow     │                      │  │
    └────────────────────────────────────────┘                      │  │
                    │                                                 │  │
                    ▼                                                 │  │
    ┌────────────────────────────────────────┐                      │  │
    │     GitHub Actions Workflow             │                      │  │
    │   (publish.yml auto-created)            │                      │  │
    │                                        │                      │  │
    │  on: workflow_dispatch                 │                      │  │
    │  jobs:                                 │                      │  │
    │    build:                              │                      │  │
    │      uses: repo2jupyterlite-action@v2  │                      │  │
    └────────────────────────────────────────┘                      │  │
                    │                                                 │  │
                    ▼                                                 │  │
    ┌────────────────────────────────────────┐                      │  │
    │   repo2jupyterlite-action               │                      │  │
    │                                        │                      │  │
    │  • Extracts notebook from repo         │                      │  │
    │  • Builds JupyterLite site              │                      │  │
    │  • Pushes to gh-pages branch           │                      │  │
    └────────────────────────────────────────┘                      │  │
                    │                                                 │  │
                    ▼                                                 │  │
    ┌────────────────────────────────────────┐                      │  │
    │     GitHub Pages Published Site         │                      │  │
    │                                        │                      │  │
    │  https://username.github.io/repo-name/ │                      │  │
    │  • Full JupyterLite interface          │                      │  │
    │  • Notebook fully interactive          │                      │  │
    │  • Shareable public URL                │                      │  │
    └────────────────────────────────────────┘                      │  │
```

## Component Communication Flow

```
User Action Flow:
═══════════════════════════════════════════════════════════════════════════

Click "Publish" Button
    ↓
    PublishButton detects click
    ├─ Check: Is token stored in sessionStorage?
    │   ├─ NO → Show TokenDialog
    │   │        └─ User enters token
    │   │            ├─ Validate with GitHub API
    │   │            ├─ If valid: Store in sessionStorage
    │   │            └─ If invalid: Show error, retry
    │   │
    │   └─ YES → Skip to next step
    │
    ├─ Get notebook from panel
    │   └─ Extract .ipynb content
    │
    ├─ Show RepositorySelector
    │   ├─ Fetch user's repositories (authenticated)
    │   ├─ User selects OR creates new repo
    │   └─ Store repo info
    │
    ├─ Call github-api.uploadNotebook()
    │   ├─ PUT /repos/{owner}/{repo}/contents/.../notebook.ipynb
    │   └─ Response: commit SHA
    │
    ├─ Show PublishStatus modal
    │   └─ Update: "Step 1: Uploading notebook... ✓"
    │
    ├─ Call github-api.ensurePublishWorkflow()
    │   ├─ Check: Does .github/workflows/publish.yml exist?
    │   │   ├─ NO → Create it (PUT contents)
    │   │   └─ YES → Skip
    │   └─ Update: "Step 2: Configuring workflow... ✓"
    │
    ├─ Call github-api.enableGitHubPages()
    │   ├─ PATCH /repos/{owner}/{repo}/pages
    │   ├─ Set source: {branch: "gh-pages", path: "/"}
    │   └─ Update: "Step 3: Enabling Pages... ✓"
    │
    ├─ Call github-api.triggerPublishWorkflow()
    │   ├─ POST /repos/{owner}/{repo}/actions/workflows/publish/dispatches
    │   └─ Update: "Step 4: Triggering action... ✓"
    │
    └─ Show completion with URL
        └─ User can click to visit published site


Data Flow:
═══════════════════════════════════════════════════════════════════════════

Notebook Content:
  .ipynb file (JSON)
    ↓
    Extract from JupyterLab panel
    ↓
    Encode as base64
    ↓
    Send to GitHub via REST API
    ↓
    GitHub stores in repository
    ↓
    GitHub Actions picks up change
    ↓
    repo2jupyterlite-action processes
    ↓
    Converts to JupyterLite-compatible format
    ↓
    Publishes to username.github.io/repo-name/

Token Data:
  User pastes token
    ↓
    TokenDialog component
    ↓
    Validate with GitHub API (GET /user)
    ↓
    If valid: Store in sessionStorage (session only)
    ↓
    Use for Authorization header in all API calls
    ↓
    Clear on page refresh (security)


State Management:
═══════════════════════════════════════════════════════════════════════════

PublishButton maintains:
  • notebookPanel: INotebookPanel
  • token: string | null
  • currentRepo: Repository | null
  • publishStatus: "idle" | "uploading" | "configuring" | "enabling" | "triggering" | "done"

TokenDialog maintains:
  • tokenInput: string
  • isValidating: boolean
  • validationError: string | null

RepositorySelector maintains:
  • repositories: Repository[]
  • loading: boolean
  • newRepoName: string
  • creating: boolean

PublishStatus maintains:
  • steps: PublishStep[]
  • currentStep: number
  • error: string | null
  • publishedUrl: string | null
```

## Error Handling Architecture

```
Error Types & Handling:
═══════════════════════════════════════════════════════════════════════════

1. Token Errors (github-auth.ts)
   ├─ Invalid token format
   │   └─ Message: "Token appears invalid. Check format and try again."
   │
   ├─ Token expired
   │   └─ Message: "Token expired. Please generate a new one with: gh auth token"
   │
   └─ Insufficient permissions
       └─ Message: "Token missing 'repo' or 'workflow' scopes. Check token settings."

2. GitHub API Errors (github-api.ts)
   ├─ 404 Not Found
   │   └─ Message: "Repository not found. Verify repo name and permissions."
   │
   ├─ 403 Forbidden
   │   └─ Message: "Permission denied. Check token scopes and repository access."
   │
   ├─ 422 Unprocessable Entity
   │   └─ Message: "Invalid notebook format or repository configuration."
   │
   └─ Network error
       └─ Message: "Network error. Check internet connection and try again."

3. Repository Errors
   ├─ Repo not found
   │   └─ Message: "Repository not found on GitHub."
   │
   ├─ Repo creation failed
   │   └─ Message: "Failed to create repository. Check permissions."
   │
   └─ Access denied
       └─ Message: "No write access to repository."

4. Notebook Errors
   ├─ Invalid .ipynb format
   │   └─ Message: "Notebook format invalid. Re-save in JupyterLab."
   │
   ├─ Upload failed
   │   └─ Message: "Failed to upload notebook. Try again."
   │
   └─ Size limit exceeded
       └─ Message: "Notebook too large. GitHub limit is 100MB."

5. Workflow Errors
   ├─ Workflow creation failed
   │   └─ Message: "Failed to create publish workflow."
   │
   └─ Workflow dispatch failed
       └─ Message: "Failed to trigger workflow. Check GitHub Actions."

All errors show:
  ✓ User-friendly message
  ✓ Suggested action (retry, check settings, etc.)
  ✓ Technical details in console (console.error)
  ✓ Option to contact support
```

## Security Architecture

```
Authentication Flow:
═══════════════════════════════════════════════════════════════════════════

1. Token Input
   ├─ User pastes GitHub token in dialog
   └─ No logging or display of full token (masked after verification)

2. Validation
   ├─ Make API call: GET /user (using token as Bearer)
   ├─ If 200 OK: Token is valid
   └─ If 401: Token invalid

3. Storage
   ├─ Token stored in sessionStorage (NOT localStorage)
   ├─ sessionStorage is cleared on tab close
   ├─ sessionStorage is isolated per origin
   └─ NOT persisted across sessions

4. Usage
   ├─ Every GitHub API call includes:
   │   └─ Authorization: Bearer {token}
   │
   └─ Token transmitted directly browser → GitHub
       └─ NOT through any proxy

5. Cleanup
   ├─ On page unload: sessionStorage cleared
   ├─ On page refresh: User must re-enter token
   └─ Manual clear: User can delete token from sessionStorage


Data Security:
═══════════════════════════════════════════════════════════════════════════

Notebook Upload:
  ├─ Uploaded only to user's own repositories
  ├─ Public repository = public notebook (expected)
  ├─ Private repository = private notebook (protected)
  └─ GitHub's security model applies

No Backend Storage:
  ├─ No wiki3.ai server sees token
  ├─ No wiki3.ai server sees notebook content
  ├─ All communication: browser ↔ GitHub directly
  └─ CORS-enabled for browser compatibility

Token Recommendations:
  ├─ Use: GitHub CLI → gh auth token (auto-expiring)
  ├─ Or: Fine-grained Personal Access Token (limited scope)
  └─ Avoid: Classic token with full access
```

## Deployment Architecture

```
Distribution Model:
═══════════════════════════════════════════════════════════════════════════

PyPI Package:
  ├─ Package: jupyterlab-wiki3-publish
  ├─ Version: 0.1.0 (semantic versioning)
  │
  ├─ Installation:
  │   └─ pip install jupyterlab-wiki3-publish
  │
  ├─ JupyterLab integration:
  │   ├─ Auto-discovered via entry points
  │   ├─ Loaded on JupyterLab startup
  │   └─ "Publish" button appears in toolbar
  │
  └─ No additional configuration needed


Build System:
═══════════════════════════════════════════════════════════════════════════

Development:
  npm install → TypeScript compilation → Tests

Production:
  npm run build → Python build → PyPI upload

Directory structure:
  src/
    ├─ TypeScript/TSX source files
    └─ Compiled → lib/ (by webpack)
  
  lib/
    ├─ JavaScript output
    └─ Included in wheel distribution
  
  package.json
    └─ Lists dependencies and build scripts


Version Updates:
═══════════════════════════════════════════════════════════════════════════

0.1.0 (Current):
  ✓ One-click publish
  ✓ GitHub token management
  ✓ Repository selection/creation
  ✓ Automatic workflow setup
  ✓ Progress tracking

0.2.0 (Planned):
  • Notebook versioning
  • Batch publish
  • Custom domains
  • Metadata editor
  • Template selection

1.0.0 (Stable):
  • Production-tested
  • Full documentation
  • Community feedback integrated
```

## Testing Architecture

```
Unit Tests:
  ├─ Token validation (github-auth.ts)
  ├─ API methods (github-api.ts)
  └─ UI components (React components)

Integration Tests:
  ├─ Full publish workflow
  ├─ Error handling
  ├─ Token refresh
  └─ Repository operations

E2E Tests (browser):
  ├─ Click publish button
  ├─ Enter token
  ├─ Select repository
  ├─ Watch upload complete
  └─ Verify published URL

Manual Testing Checklist:
  [ ] Token dialog appears on first publish
  [ ] Token validation works (valid and invalid cases)
  [ ] Repository list loads correctly
  [ ] Can create new repository
  [ ] Notebook uploads successfully
  [ ] Workflow file created
  [ ] GitHub Pages enabled
  [ ] Published site is accessible
  [ ] Error messages are clear
  [ ] Token clears on page refresh
```

## Future Architecture (v2+)

```
Potential Enhancements:
═══════════════════════════════════════════════════════════════════════════

ACL Integration:
  ├─ Check: Is user authorized to publish?
  ├─ Read ACLs from wiki3.ai backend
  └─ Restrict publishing to allowed repos

Notebook Versioning:
  ├─ Auto-version filenames: notebook-v1.0.0.ipynb
  ├─ Track history in repository
  └─ Allow rollback to previous versions

Batch Publishing:
  ├─ Publish multiple notebooks at once
  ├─ Create collection/index
  └─ Single shared site for all notebooks

Metadata Management:
  ├─ Title, description, tags
  ├─ Author information
  └─ Published metadata in YAML front-matter

Template System:
  ├─ Different site layouts
  ├─ Theme customization
  └─ Custom CSS injection

Analytics Integration:
  ├─ Track published notebook views
  ├─ GitHub pages stats
  └─ Usage analytics

API for Automation:
  ├─ CLI tool for publishing
  ├─ GitHub workflow integration
  └─ CI/CD pipeline integration
```

---

For implementation details, see the individual source files in `src/`.
For user documentation, see README.md.
For quick start, see wiki3-publish-quickstart.md.
"""

with open('ARCHITECTURE.md', 'w') as f:
    f.write(architecture_doc)

print("✅ Architecture documentation created: ARCHITECTURE.md")
print("\nKey diagrams generated:")
print("  • System Architecture Diagram")
print("  • Component Communication Flow")
print("  • Data Flow Diagram")
print("  • State Management")
print("  • Error Handling Architecture")
print("  • Security Architecture")
print("  • Deployment Architecture")
print("  • Testing Architecture")
print("  • Future Architecture (v2+)")
