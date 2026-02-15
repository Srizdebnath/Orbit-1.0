export declare function deployToVPS(config: {
    host: string;
    username: string;
    privateKey: string;
    projectName: string;
    domain: string;
}): Promise<{
    success: boolean;
    error?: never;
} | {
    success: boolean;
    error: unknown;
}>;
//# sourceMappingURL=engine.d.ts.map