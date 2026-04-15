export declare const sdk: {
    setDataVersion: typeof import("@start9labs/start-sdk").setDataVersion;
    getDataVersion: typeof import("@start9labs/start-sdk").getDataVersion;
    action: {
        run: <Input extends Record<string, unknown>>(options: {
            effects: import("@start9labs/start-sdk/base/lib/Effects").Effects;
            actionId: import("@start9labs/start-sdk/base/lib/osBindings").ActionId;
            input?: import("@start9labs/start-sdk/base/lib/actions").RunActionInput<Input>;
        }) => Promise<import("@start9labs/start-sdk/base/lib/osBindings").ActionResult | null>;
        createTask: <T extends import("@start9labs/start-sdk/base/lib/actions/setupActions").ActionInfo<import("@start9labs/start-sdk/base/lib/osBindings").ActionId, any>>(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, packageId: import("@start9labs/start-sdk/base/lib/types").PackageId, action: T, severity: import("@start9labs/start-sdk/base/lib/osBindings").TaskSeverity, options?: import("@start9labs/start-sdk/base/lib/actions").TaskOptions<T>) => Promise<null>;
        createOwnTask: <T extends import("@start9labs/start-sdk/base/lib/actions/setupActions").ActionInfo<import("@start9labs/start-sdk/base/lib/osBindings").ActionId, any>>(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, action: T, severity: import("@start9labs/start-sdk/base/lib/osBindings").TaskSeverity, options?: import("@start9labs/start-sdk/base/lib/actions").TaskOptions<T>) => Promise<null>;
        clearTask: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, ...replayIds: string[]) => Promise<null>;
    };
    checkDependencies: <DependencyId extends never = never>(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, packageIds?: DependencyId[] | undefined) => Promise<import("@start9labs/start-sdk/base/lib/dependencies/dependencies").CheckDependencies<DependencyId>>;
    serviceInterface: {
        getOwn: typeof import("@start9labs/start-sdk/base/lib/util/getServiceInterface").getOwnServiceInterface;
        get: typeof import("@start9labs/start-sdk/base/lib/util").getServiceInterface;
        getAllOwn: typeof import("@start9labs/start-sdk/base/lib/util/getServiceInterfaces").getOwnServiceInterfaces;
        getAll: typeof import("@start9labs/start-sdk/base/lib/util").getServiceInterfaces;
    };
    getContainerIp: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options?: Omit<Parameters<import("@start9labs/start-sdk/base/lib/Effects").Effects["getContainerIp"]>[0], "callback">) => {
        const: () => Promise<string>;
        once: () => Promise<string>;
        watch: (abort?: AbortSignal) => import("@start9labs/start-sdk/base/lib/util/Drop").DropGenerator<string, void, unknown>;
        onChange: (callback: (value: string | null, error?: Error) => {
            cancel: boolean;
        } | Promise<{
            cancel: boolean;
        }>) => void;
        waitFor: (pred: (value: string | null) => boolean) => Promise<string | null>;
    };
    MultiHost: {
        of: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, id: string) => import("@start9labs/start-sdk/base/lib/interfaces/Host").MultiHost;
    };
    nullIfEmpty: typeof import("@start9labs/start-sdk/base/lib/util").nullIfEmpty;
    useEntrypoint: (overrideCmd?: string[]) => import("@start9labs/start-sdk/base/lib/types").UseEntrypoint;
    Action: {
        withInput: typeof import("@start9labs/start-sdk/base/lib/actions/setupActions").Action.withInput;
        withoutInput: <Id extends import("@start9labs/start-sdk/base/lib/osBindings").ActionId>(id: Id, metadata: import("@start9labs/start-sdk/base/lib/actions/setupActions").MaybeFn<Omit<import("@start9labs/start-sdk/base/lib/osBindings").ActionMetadata, "hasInput">>, run: import("@start9labs/start-sdk/base/lib/actions/setupActions").Run<{}>) => import("@start9labs/start-sdk/base/lib/actions/setupActions").Action<Id, {}>;
    };
    inputSpecConstants: {
        smtpInputSpec: import("@start9labs/start-sdk/base/lib/actions/input/builder").Value<import("@start9labs/start-sdk/base/lib/actions/input/builder/variants").UnionRes<{
            disabled: {
                name: string;
                spec: import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<{}, {}>;
            };
            system: {
                name: string;
                spec: import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<{
                    customFrom: string | null;
                }, {
                    customFrom: string | null;
                }>;
            };
            custom: {
                name: string;
                spec: import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<import("@start9labs/start-sdk/base/lib/types").SmtpValue, import("@start9labs/start-sdk/base/lib/types").SmtpValue>;
            };
        }>, import("@start9labs/start-sdk/base/lib/actions/input/builder/variants").UnionResStaticValidatedAs<{
            disabled: {
                name: string;
                spec: import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<{}, {}>;
            };
            system: {
                name: string;
                spec: import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<{
                    customFrom: string | null;
                }, {
                    customFrom: string | null;
                }>;
            };
            custom: {
                name: string;
                spec: import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<import("@start9labs/start-sdk/base/lib/types").SmtpValue, import("@start9labs/start-sdk/base/lib/types").SmtpValue>;
            };
        }>>;
    };
    createInterface: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: {
        name: string;
        id: string;
        description: string;
        type: import("@start9labs/start-sdk/base/lib/types").ServiceInterfaceType;
        username: null | string;
        path: string;
        query: Record<string, string>;
        schemeOverride: {
            ssl: import("@start9labs/start-sdk/base/lib/interfaces/Host").Scheme;
            noSsl: import("@start9labs/start-sdk/base/lib/interfaces/Host").Scheme;
        } | null;
        masked: boolean;
    }) => import("@start9labs/start-sdk/base/lib/interfaces/ServiceInterfaceBuilder").ServiceInterfaceBuilder;
    getSystemSmtp: <E extends import("@start9labs/start-sdk/base/lib/Effects").Effects>(effects: E) => import("@start9labs/start-sdk/base/lib/util").GetSystemSmtp;
    getSslCertificate: <E extends import("@start9labs/start-sdk/base/lib/Effects").Effects>(effects: E, hostnames: string[], algorithm?: import("@start9labs/start-sdk/base/lib/osBindings").Algorithm) => import("@start9labs/start-sdk/package/lib/util").GetSslCertificate;
    getServiceManifest: typeof import("@start9labs/start-sdk/package/lib/util").getServiceManifest;
    healthCheck: {
        checkPortListening: typeof import("@start9labs/start-sdk/package/lib/health/checkFns").checkPortListening;
        checkWebUrl: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, url: string, { timeout, successMessage, errorMessage, }?: {
            timeout?: number | undefined;
            successMessage?: string | undefined;
            errorMessage?: string | undefined;
        }) => Promise<import("@start9labs/start-sdk/package/lib/health/checkFns").HealthCheckResult>;
        runHealthScript: <Manifest_1 extends import("@start9labs/start-sdk/base/lib/types").SDKManifest>(runCommand: string[], subcontainer: import("@start9labs/start-sdk").SubContainer<Manifest_1>, { timeout, errorMessage, message, }?: {
            timeout?: number | undefined;
            errorMessage?: string | undefined;
            message?: ((res: string) => string) | undefined;
        }) => Promise<import("@start9labs/start-sdk/package/lib/health/checkFns").HealthCheckResult>;
    };
    patterns: typeof import("@start9labs/start-sdk/base/lib/util/patterns");
    Actions: {
        new (actions: {}): import("@start9labs/start-sdk/base/lib/actions/setupActions").Actions<{}>;
        of(): import("@start9labs/start-sdk/base/lib/actions/setupActions").Actions<{}>;
    };
    setupBackups: (options: import("@start9labs/start-sdk/package/lib/backup/setupBackups").SetupBackupsParams<{
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
    }>) => {
        createBackup: import("@start9labs/start-sdk/base/lib/types").ExpectedExports.createBackup;
        restoreInit: import("@start9labs/start-sdk/base/lib/inits").InitScript;
    };
    setupDependencies: (fn: (options: {
        effects: import("@start9labs/start-sdk/base/lib/Effects").Effects;
    }) => Promise<import("@start9labs/start-sdk/base/lib/types").CurrentDependenciesResult<{
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
    }>>) => (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects) => Promise<null>;
    setupOnInit: typeof import("@start9labs/start-sdk/base/lib/inits").setupOnInit;
    setupOnUninit: typeof import("@start9labs/start-sdk/base/lib/inits").setupOnUninit;
    setupInit: typeof import("@start9labs/start-sdk/base/lib/inits").setupInit;
    setupUninit: typeof import("@start9labs/start-sdk/base/lib/inits").setupUninit;
    setupInterfaces: import("@start9labs/start-sdk/base/lib/interfaces/setupInterfaces").SetupServiceInterfaces;
    setupMain: (fn: (o: {
        effects: import("@start9labs/start-sdk/base/lib/Effects").Effects;
    }) => Promise<import("@start9labs/start-sdk").Daemons<{
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
    }, any>>) => import("@start9labs/start-sdk/base/lib/types").ExpectedExports.main;
    trigger: {
        defaultTrigger: import("@start9labs/start-sdk/package/lib/trigger").Trigger;
        cooldownTrigger: typeof import("@start9labs/start-sdk/package/lib/trigger").cooldownTrigger;
        changeOnFirstSuccess: typeof import("@start9labs/start-sdk/package/lib/trigger").changeOnFirstSuccess;
        successFailure: (o: {
            duringSuccess: import("@start9labs/start-sdk/package/lib/trigger").Trigger;
            duringError: import("@start9labs/start-sdk/package/lib/trigger").Trigger;
        }) => import("@start9labs/start-sdk/package/lib/trigger").Trigger;
    };
    Mounts: {
        of: () => import("@start9labs/start-sdk/package/lib/mainFn/Mounts").Mounts<{
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
        }, never>;
    };
    Backups: {
        ofVolumes: (...volumeNames: "main"[]) => import("@start9labs/start-sdk/package/lib/backup/Backups").Backups<{
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
        }>;
        ofSyncs: (...syncs: import("@start9labs/start-sdk/package/lib/backup/Backups").BackupSync<"main">[]) => import("@start9labs/start-sdk/package/lib/backup/Backups").Backups<{
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
        }>;
        withOptions: (options?: Partial<import("@start9labs/start-sdk/base/lib/types").SyncOptions>) => import("@start9labs/start-sdk/package/lib/backup/Backups").Backups<{
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
        }>;
    };
    InputSpec: {
        of: <Spec extends Record<string, import("@start9labs/start-sdk/base/lib/actions/input/builder").Value<any>>>(spec: Spec) => import("@start9labs/start-sdk/base/lib/actions/input/builder").InputSpec<{ [K in keyof Spec]: Spec[K] extends import("@start9labs/start-sdk/base/lib/actions/input/builder").Value<infer T extends any, any> ? T : never; }, { [K_1 in keyof Spec]: Spec[K_1] extends import("@start9labs/start-sdk/base/lib/actions/input/builder").Value<any, infer T_1> ? T_1 : never; }>;
    };
    Daemon: {
        readonly of: <C extends import("@start9labs/start-sdk").SubContainer<{
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
        }, import("@start9labs/start-sdk/base/lib/Effects").Effects> | null>(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, subcontainer: C, exec: import("@start9labs/start-sdk/package/lib/mainFn/Daemons").DaemonCommandType<{
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
        }, C>) => import("@start9labs/start-sdk/package/lib/mainFn/Daemon").Daemon<{
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
        }, import("@start9labs/start-sdk").SubContainer<{
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
        }, import("@start9labs/start-sdk/base/lib/Effects").Effects> | null>;
    };
    Daemons: {
        of(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects): import("@start9labs/start-sdk").Daemons<{
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
        }, never>;
    };
    SubContainer: {
        of(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, image: {
            imageId: "main";
            sharedRun?: boolean;
        }, mounts: import("@start9labs/start-sdk/package/lib/mainFn/Mounts").Mounts<{
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
        }, never> | null, name: string): Promise<import("@start9labs/start-sdk/package/lib/util/SubContainer").SubContainerRc<{
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
        }, import("@start9labs/start-sdk/base/lib/Effects").Effects>>;
        withTemp<T>(effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, image: {
            imageId: "main";
            sharedRun?: boolean;
        }, mounts: import("@start9labs/start-sdk/package/lib/mainFn/Mounts").Mounts<{
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
        }, never> | null, name: string, fn: (subContainer: import("@start9labs/start-sdk").SubContainer<{
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
        }, import("@start9labs/start-sdk/base/lib/Effects").Effects>) => Promise<T>): Promise<T>;
    };
    List: typeof import("@start9labs/start-sdk/base/lib/actions/input/builder").List;
    Value: typeof import("@start9labs/start-sdk/base/lib/actions/input/builder").Value;
    Variants: typeof import("@start9labs/start-sdk/base/lib/actions/input/builder").Variants;
    restart: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects) => Promise<null>;
    shutdown: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects) => Promise<null>;
    getStatus: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: {
        packageId?: import("@start9labs/start-sdk/base/lib/types").PackageId;
        callback?: () => void;
    }) => Promise<import("@start9labs/start-sdk/base/lib/osBindings").StatusInfo>;
    setDependencies: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: {
        dependencies: import("@start9labs/start-sdk/base/lib/types").Dependencies;
    }) => Promise<null>;
    getDependencies: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects) => Promise<import("@start9labs/start-sdk/base/lib/osBindings").DependencyRequirement[]>;
    mount: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: import("@start9labs/start-sdk/base/lib/osBindings").MountParams) => Promise<string>;
    getInstalledPackages: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects) => Promise<string[]>;
    setHealth: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, o: import("@start9labs/start-sdk/base/lib/osBindings").SetHealth) => Promise<null>;
    getServicePortForward: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: {
        packageId?: import("@start9labs/start-sdk/base/lib/types").PackageId;
        hostId: import("@start9labs/start-sdk/base/lib/osBindings").HostId;
        internalPort: number;
    }) => Promise<import("@start9labs/start-sdk/base/lib/osBindings").NetInfo>;
    clearBindings: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: {
        except: {
            id: import("@start9labs/start-sdk/base/lib/osBindings").HostId;
            internalPort: number;
        }[];
    }) => Promise<null>;
    getOsIp: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects) => Promise<string>;
    getSslKey: (effects: import("@start9labs/start-sdk/base/lib/Effects").Effects, options: {
        hostnames: string[];
        algorithm?: "ecdsa" | "ed25519";
    }) => Promise<string>;
    manifest: {
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
    volumes: import("@start9labs/start-sdk/package/lib/util").Volumes<{
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
    }>;
};
