export interface CheckboxData {
    index: number;
    checked: boolean;
}
export interface ErrorData {
    data: CheckboxData;
    message: string;
}
export interface ServerToClientEvents {
    "server:checkbox:status": (checkboxes: (boolean | null)[]) => void;
    "server:checkbox:change": (data: CheckboxData) => void;
    "server:error": (error: ErrorData) => void;
}
export interface ClientToServerEvents {
    "client:checkbox:change": (data: CheckboxData) => void;
}
//# sourceMappingURL=server.d.ts.map