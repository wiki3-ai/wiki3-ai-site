
import os
import json

# package.json
package_json = {
  "name": "@wiki3-ai/jupyterlab-publish",
  "version": "0.1.0",
  "description": "Publish JupyterLite notebooks directly to GitHub",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "style": "style/index.css",
  "repository": {
    "type": "git",
    "url": "https://github.com/wiki3-ai/jupyterlab-publish.git"
  },
  "keywords": [
    "jupyter",
    "jupyterlab",
    "jupyterlite",
    "github",
    "publish"
  ],
  "author": "Wiki3.ai",
  "license": "AGPL-3.0-only",
  "bugs": {
    "url": "https://github.com/wiki3-ai/jupyterlab-publish/issues"
  },
  "homepage": "https://github.com/wiki3-ai/jupyterlab-publish#readme",
  "devDependencies": {
    "@jupyterlab/application": "^4.0.0",
    "@jupyterlab/notebook": "^4.0.0",
    "@jupyterlab/apputils": "^4.0.0",
    "@jupyterlab/ui-components": "^4.0.0",
    "@lumino/widgets": "^2.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "jupyterlab": {
    "extension": True,
    "outputDir": "jupyterlab_wiki3_publish/labextension"
  },
  "files": [
    "lib",
    "style",
    "jupyterlab_wiki3_publish/labextension"
  ]
}

with open('jupyterlab-wiki3-publish/package.json', 'w') as f:
    json.dump(package_json, f, indent=2)

print("✓ Created package.json")
