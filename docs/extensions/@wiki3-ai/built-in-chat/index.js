"use strict";
(() => {
  // lib/federation.js
  console.log("[built-in-chat/federation] Setting up Module Federation container");
  var scope = "@wiki3-ai/built-in-chat";
  var sharedScope = null;
  async function importShared(pkg) {
    if (!sharedScope) {
      if (window.__webpack_share_scopes__ && window.__webpack_share_scopes__.default) {
        console.warn(`[built-in-chat] Using global __webpack_share_scopes__.default for ${pkg}`);
        sharedScope = window.__webpack_share_scopes__.default;
      } else {
        throw new Error(`[built-in-chat] Shared scope not initialized when requesting ${pkg}`);
      }
    }
    const versions = sharedScope[pkg];
    if (!versions) {
      throw new Error(`[built-in-chat] Shared module ${pkg} not found in shared scope. Available: ${Object.keys(sharedScope)}`);
    }
    const versionKeys = Object.keys(versions);
    if (versionKeys.length === 0) {
      throw new Error(`[built-in-chat] No versions available for ${pkg}`);
    }
    const version = versions[versionKeys[0]];
    const factory = version?.get;
    if (typeof factory !== "function") {
      throw new Error(`[built-in-chat] Module ${pkg} has no factory function`);
    }
    let result = factory();
    if (result && typeof result.then === "function") {
      result = await result;
    }
    if (typeof result === "function") {
      result = result();
    }
    console.log(`[built-in-chat] Loaded ${pkg}:`, result);
    return result;
  }
  var container = {
    init: (scope2) => {
      console.log("[built-in-chat/federation] init() called, storing shared scope");
      sharedScope = scope2;
      return Promise.resolve();
    },
    get: async (module) => {
      console.log("[built-in-chat/federation] get() called for module:", module);
      console.log("[built-in-chat/federation] This means JupyterLite is requesting our plugin!");
      if (module === "./index" || module === "./extension") {
        return async () => {
          console.log("[built-in-chat/federation] ===== LOADING PLUGIN MODULE =====");
          console.log("[built-in-chat/federation] Loading plugins from shared scope...");
          const { BaseKernel, IKernelSpecs } = await importShared("@jupyterlite/kernel");
          console.log("[built-in-chat/federation] Got BaseKernel from shared scope:", BaseKernel);
          class ChatSession {
            constructor(_opts = {}) {
              this.session = null;
              console.log("[ChatSession] Using Chrome built-in AI");
            }
            async send(prompt, onChunk) {
              console.log("[ChatSession] Sending prompt to Chrome built-in AI:", prompt);
              if (typeof LanguageModel === "undefined") {
                throw new Error("Browser does not support Chrome built-in AI.");
              }
              const availability = await LanguageModel.availability();
              if (availability === "unavailable") {
                throw new Error("Chrome built-in AI model is not available.");
              }
              if (!this.session) {
                if (availability === "downloadable" || availability === "downloading") {
                  this.session = await LanguageModel.create({
                    monitor(m) {
                      m.addEventListener("downloadprogress", (e) => {
                        const progress = e.loaded;
                        console.log(`[ChatSession] Downloading model: ${Math.round(progress * 100)}%`);
                      });
                    }
                  });
                } else {
                  this.session = await LanguageModel.create();
                }
              }
              const stream = this.session.promptStreaming(prompt);
              let reply = "";
              const reader = stream.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done)
                    break;
                  reply += value;
                  if (onChunk && value) {
                    onChunk(value);
                  }
                }
              } finally {
                reader.releaseLock();
              }
              console.log("[ChatSession] Got reply from Chrome built-in AI:", reply);
              return reply;
            }
          }
          class BuiltInChatKernel extends BaseKernel {
            constructor(options) {
              super(options);
              const model = options.model;
              this.chat = new ChatSession({ model });
            }
            async executeRequest(content) {
              const code = String(content.code ?? "");
              try {
                await this.chat.send(code, (chunk) => {
                  this.stream(
                    { name: "stdout", text: chunk },
                    // @ts-ignore
                    this.parentHeader
                  );
                });
                return {
                  status: "ok",
                  // @ts-ignore
                  execution_count: this.executionCount,
                  payload: [],
                  user_expressions: {}
                };
              } catch (err) {
                const message = err?.message ?? String(err);
                this.publishExecuteError(
                  {
                    ename: "Error",
                    evalue: message,
                    traceback: []
                  },
                  // @ts-ignore
                  this.parentHeader
                );
                return {
                  status: "error",
                  // @ts-ignore
                  execution_count: this.executionCount,
                  ename: "Error",
                  evalue: message,
                  traceback: []
                };
              }
            }
            async kernelInfoRequest() {
              return {
                status: "ok",
                protocol_version: "5.3",
                implementation: "built-in-chat-kernel",
                implementation_version: "0.1.0",
                language_info: {
                  name: "markdown",
                  version: "0.0.0",
                  mimetype: "text/markdown",
                  file_extension: ".md"
                },
                banner: "Chrome built-in AI chat kernel",
                help_links: []
              };
            }
            async completeRequest(content) {
              return {
                status: "ok",
                matches: [],
                cursor_start: content.cursor_pos ?? 0,
                cursor_end: content.cursor_pos ?? 0,
                metadata: {}
              };
            }
            async inspectRequest(_content) {
              return { status: "ok", found: false, data: {}, metadata: {} };
            }
            async isCompleteRequest(_content) {
              return { status: "complete", indent: "" };
            }
            async commInfoRequest(_content) {
              return { status: "ok", comms: {} };
            }
            async historyRequest(_content) {
              return { status: "ok", history: [] };
            }
            async shutdownRequest(_content) {
              return { status: "ok", restart: false };
            }
            async inputReply(_content) {
            }
            async commOpen(_content) {
            }
            async commMsg(_content) {
            }
            async commClose(_content) {
            }
          }
          const builtInChatKernelPlugin = {
            id: "@wiki3-ai/built-in-chat:plugin",
            autoStart: true,
            // Match the official JupyterLite custom kernel pattern:
            // https://jupyterlite.readthedocs.io/en/latest/howto/extensions/kernel.html
            requires: [IKernelSpecs],
            activate: (app, kernelspecs) => {
              console.log("[built-in-chat] ===== ACTIVATE FUNCTION CALLED =====");
              console.log("[built-in-chat] JupyterLab app:", app);
              console.log("[built-in-chat] kernelspecs service:", kernelspecs);
              if (!kernelspecs || typeof kernelspecs.register !== "function") {
                console.error("[built-in-chat] ERROR: kernelspecs.register not available!");
                return;
              }
              try {
                kernelspecs.register({
                  spec: {
                    name: "built-in-chat",
                    display_name: "Built-in AI Chat",
                    language: "python",
                    argv: [],
                    resources: {}
                  },
                  create: async (options) => {
                    console.log("[built-in-chat] Creating BuiltInChatKernel instance", options);
                    return new BuiltInChatKernel(options);
                  }
                });
                console.log("[built-in-chat] ===== KERNEL REGISTERED SUCCESSFULLY =====");
                console.log("[built-in-chat] Kernel name: built-in-chat");
                console.log("[built-in-chat] Display name: Built-in AI Chat");
              } catch (error) {
                console.error("[built-in-chat] ===== REGISTRATION ERROR =====", error);
              }
            }
          };
          const plugins = [builtInChatKernelPlugin];
          console.log("[built-in-chat/federation] ===== PLUGIN CREATED SUCCESSFULLY =====");
          console.log("[built-in-chat/federation] Plugin ID:", builtInChatKernelPlugin.id);
          console.log("[built-in-chat/federation] Plugin autoStart:", builtInChatKernelPlugin.autoStart);
          console.log("[built-in-chat/federation] Returning plugins array:", plugins);
          const moduleExports = {
            __esModule: true,
            default: plugins
          };
          return moduleExports;
        };
      }
      throw new Error(`[built-in-chat/federation] Unknown module: ${module}`);
    }
  };
  window._JUPYTERLAB = window._JUPYTERLAB || {};
  window._JUPYTERLAB[scope] = container;
  console.log("[built-in-chat/federation] Registered Module Federation container for scope:", scope);
})();
