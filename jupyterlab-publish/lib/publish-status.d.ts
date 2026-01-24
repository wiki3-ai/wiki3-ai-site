/**
 * Publish status dialog showing progress
 */
export declare class PublishStatus {
    private dialog;
    private steps;
    private publishUrl;
    constructor(stepLabels: string[], publishUrl: string);
    /**
     * Show the status dialog
     */
    show(): void;
    private createDialog;
    private updateDialogContent;
    /**
     * Mark a step as running
     */
    markStepRunning(index: number): void;
    /**
     * Mark a step as complete
     */
    markStepComplete(index: number): void;
    /**
     * Mark a step as error
     */
    markStepError(index: number, error: string): void;
    /**
     * Close the dialog
     */
    close(): void;
}
//# sourceMappingURL=publish-status.d.ts.map