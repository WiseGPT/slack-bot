// these global definitions are only needed to make Typescript work: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924#issuecomment-1246622957
// the `fetch` is already available as part of the Node.js Runtime >= 18.x which we use
declare global {
  export const {
    fetch,
    FormData,
    Headers,
    Request,
    Response,
  }: typeof import("undici");
}
export {};
