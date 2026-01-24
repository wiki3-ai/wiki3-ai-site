/**
 * Module Federation wrapper for the jupyterlab-publish extension
 * This allows the extension to be loaded by JupyterLite
 */
declare const container: {
    init: (sharedScope: any) => Promise<void>;
    get: (module: string) => Promise<() => Promise<{
        __esModule: boolean;
        default: any[];
    }>>;
    sharedScope: any;
};
export default container;
//# sourceMappingURL=federation.d.ts.map