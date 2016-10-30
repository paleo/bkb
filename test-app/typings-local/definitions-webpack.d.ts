declare function require(resource: string): any


declare module "html!*" {
  let html: any;
  export default html;
}

declare module "*.monk" {
  let template: () => void
  export = template
}

declare module "monkberry" {
  let obj: any;
  export = obj;
}

declare module "monkberry-directives" {
  let obj: any;
  export default obj;
}

declare module "monkberry-events" {
}
