declare global {
    type EntriesPair<T> = T extends T ? {
        [K in keyof T]: K extends string | number ? [K extends string ? K : `${K}`, T[K]] : never
    }[keyof T] : never
    type Entries<T> = NonNullable<EntriesPair<T>>[]
    interface ObjectConstructor {
        entries<T extends {}>(o: T): Entries<T>
    }

    type KeysPair<T> = T extends T ? {
        [K in keyof T]: K extends string | number ? K extends string ? K : `${K}` : never
    }[keyof T] : never
    type Keys<T> = NonNullable<KeysPair<T>>[]
    interface ObjectConstructor {
        keys<T extends {}>(o: T): Keys<T>
    }

    interface Navigator {
        keyboard?: {
            getLayoutMap: () => Promise<{
                get: (code: string) => string|undefined
            }>
        }
        userAgentData?: {
            readonly brands: {
                readonly brand: string
                readonly version: string
            }[]
            readonly mobile: boolean
            readonly platform: string
        }
    }

    interface Node {
        cloneNode<T extends Node = Node>(this: T, deep?: boolean): T
    }

    type GetKeysOfType<
        Type extends Record<string, any>,
        Obj extends Record<string, any>
    > = keyof {
        [Key in keyof Obj as Obj[Key] extends Type ? Key : never]: Obj[Key]
    }

     interface Error {
         name: string
         message: string
         stack?: string
         code?: number | string | undefined
     }

}

export {}
