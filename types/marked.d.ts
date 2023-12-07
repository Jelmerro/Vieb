// Apparently the marked modules have types in the repo, but not in the module,
// for some reason this seemed like a great idea to them,
// especially after splitting up core functionality into a gazillion packages.
// As such, these types are modified copies from the source repos, license:
//
// MIT License
//
// Copyright (c) 2023 Jelmer van Arnhem
// Copyright (c) 2021 @markedjs
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

declare module 'marked-base-url' {
    import {MarkedExtension} from 'marked'
    export function baseUrl(
        baseurl: string
    ): MarkedExtension
}

declare module 'marked-highlight' {
  interface SynchronousOptions {
    highlight: SyncHighlightFunction;
    async?: boolean;
    langPrefix?: string;
  }
  interface AsynchronousOptions {
    highlight: AsyncHighlightFunction;
    async: true;
    langPrefix?: string;
  }
  export function markedHighlight(options: SynchronousOptions): import('marked').MarkedExtension;
  export function markedHighlight(options: AsynchronousOptions): import('marked').MarkedExtension;
  export function markedHighlight(
    highlightFunction: SyncHighlightFunction
  ): import('marked').MarkedExtension;
}
