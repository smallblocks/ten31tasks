export declare const actions: import("@start9labs/start-sdk/base/lib/actions/setupActions").Actions<{
    "set-company-name": import("@start9labs/start-sdk/base/lib/actions/setupActions").Action<"set-company-name", {
        companyName: string;
        tagline: string | null;
    }>;
} & {
    "add-member": import("@start9labs/start-sdk/base/lib/actions/setupActions").Action<"add-member", {
        name: string;
        slug: string;
    }>;
} & {
    "remove-member": import("@start9labs/start-sdk/base/lib/actions/setupActions").Action<"remove-member", {
        slug: string;
    }>;
} & {
    "list-members": import("@start9labs/start-sdk/base/lib/actions/setupActions").Action<"list-members", {}>;
} & {
    "set-timezone": import("@start9labs/start-sdk/base/lib/actions/setupActions").Action<"set-timezone", {
        timezone: "America/Chicago" | "America/New_York" | "America/Denver" | "America/Los_Angeles" | "America/Anchorage" | "Pacific/Honolulu" | "America/Phoenix" | "America/Toronto" | "America/Winnipeg" | "America/Edmonton" | "America/Vancouver" | "America/Mexico_City" | "America/Sao_Paulo" | "America/Argentina/Buenos_Aires" | "Europe/London" | "Europe/Berlin" | "Europe/Paris" | "Europe/Amsterdam" | "Europe/Zurich" | "Europe/Madrid" | "Europe/Rome" | "Europe/Stockholm" | "Europe/Helsinki" | "Europe/Moscow" | "Asia/Dubai" | "Asia/Kolkata" | "Asia/Singapore" | "Asia/Hong_Kong" | "Asia/Tokyo" | "Asia/Seoul" | "Asia/Shanghai" | "Australia/Sydney" | "Australia/Melbourne" | "Australia/Perth" | "Pacific/Auckland" | "UTC";
    }>;
}>;
//# sourceMappingURL=index.d.ts.map