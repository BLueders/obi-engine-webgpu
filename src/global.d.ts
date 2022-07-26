// for importing wgsl code as text using the import synstax
declare module "*.wgsl" {
    const content: any;
    export default content;
  }