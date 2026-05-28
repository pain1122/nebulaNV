declare module "@yaireo/tagify/dist/tagify.esm.js" {
  // Tagify's ESM build is not typed here; keep this escape hatch isolated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tagify: any
  export default Tagify
}