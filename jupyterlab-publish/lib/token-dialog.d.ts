/**
 * Token input dialog using native DOM (no React dependency)
 * Works in JupyterLite environment
 */
export declare class TokenDialog {
    private dialog;
    private resolvePromise;
    /**
     * Show the token dialog and return a promise that resolves with the token
     */
    show(): Promise<string | null>;
    private createDialog;
    private handleSubmit;
    private handleCancel;
    private close;
}
//# sourceMappingURL=token-dialog.d.ts.map