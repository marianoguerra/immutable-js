// TypeScript 6.0 no longer implicitly resolves `.mdx` imports to `any`, so
// declare them. `.mdx` files compile (via @next/mdx) to a React component whose
// default export takes no required props.
declare module '*.mdx' {
  import type { FC } from 'react';
  const MDXComponent: FC;
  export default MDXComponent;
}
