declare module "linkedom" {
    export function parseHTML(html: any): Window & typeof globalThis;
}
