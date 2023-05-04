declare global {
  type EntriesPair<T> = T extends T
    ? {
        [K in keyof T]: K extends string | number ? [K extends string ? K : `${K}`, T[K]] : never
      }[keyof T]
    : never
  type Entries<T> = NonNullable<EntriesPair<T>>[]
  interface ObjectConstructor {
    entries<T extends {}>(o: T): Entries<T>
  }

  type KeysPair<T> = T extends T
    ? {
        [K in keyof T]: K extends string | number ? K extends string ? K : `${K}` : never
      }[keyof T]
    : never
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
  }
}

export {}
