/**
 * Module Federation wrapper for the jupyterlab-publish extension
 * This allows the extension to be loaded by JupyterLite
 */
declare const container: {
    init: (sharedScope: any) => Promise<void>;
    get: (module: string) => Promise<() => Promise<any>>;
    sharedScope: any;
};
export default container;
//# sourceMappingURL=federation.d.ts.map