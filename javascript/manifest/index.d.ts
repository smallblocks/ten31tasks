export declare const manifest: {
    id: "fold-tasks";
    title: string;
    license: string;
    wrapperRepo: string;
    upstreamRepo: string;
    supportSite: string;
    marketingSite: string;
    donationUrl: null;
    docsUrl: string;
    description: {
        short: string;
        long: string;
    };
    volumes: "main"[];
    images: {
        main: {
            source: {
                dockerTag: string;
            };
            arch: ["x86_64", "aarch64"];
        };
    };
    alerts: {
        install: null;
        update: null;
        uninstall: null;
        restore: null;
        start: null;
        stop: null;
    };
    dependencies: {};
};
//# sourceMappingURL=index.d.ts.map