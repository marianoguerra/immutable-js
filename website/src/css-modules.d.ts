// TypeScript 6.0 checks side-effect imports for type declarations.
// `@docsearch/css` ships plain CSS via its package "main" and has no types,
// so declare it as an untyped module. Relative `*.css` imports are already
// covered by Next.js's ambient declarations (see next-env.d.ts).
declare module '@docsearch/css';
