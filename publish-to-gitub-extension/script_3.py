
# tsconfig.json
tsconfig = {
  "compilerOptions": {
    "declaration": True,
    "declarationMap": True,
    "lib": ["es2015", "dom"],
    "module": "es2015",
    "moduleResolution": "node",
    "outDir": "./lib",
    "rootDir": "./src",
    "strict": True,
    "target": "es2015",
    "jsx": "react",
    "jsxFactory": "React.createElement",
    "jsxFragmentFactory": "React.Fragment"
  },
  "include": ["src/**/*"]
}

import json
with open('jupyterlab-wiki3-publish/tsconfig.json', 'w') as f:
    json.dump(tsconfig, f, indent=2)

print("✓ Created tsconfig.json")
