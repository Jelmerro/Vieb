declare interface ObjectConstructor {
    keys<O extends any[]>(obj: O): Array<keyof O>;
    keys<O extends Record<Readonly<string>, any>>(obj: O): Array<keyof O>;
    keys(obj: object): string[];
    entries<T extends { [K: Readonly<string>]: any }>(obj: T): Array<[keyof T, T[keyof T]]>
    entries<T extends object>(obj: { [s: string]: T } | ArrayLike<T>): [string, T[keyof T]][];
    entries<T>(obj: { [s: string]: T } | ArrayLike<T>): [string, T][];
    entries(obj: {}): [string, any][];
}

declare var Object: ObjectConstructor;
