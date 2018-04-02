import { AppDash } from "./exported-definitions";
import { AppBkb } from "./AppBkb";

export function createApplication<A>(Class: { new(dash: AppDash<A>, ...args: any[]): A }, ...args: any[]): A {
  let bkb = new AppBkb(Class, false, args)
  return bkb.root.getInstance() as any
}

export function toApplication<A>(obj: A): AppDash<A> {
  let bkb = new AppBkb(obj, true)
  return bkb.root.dash as AppDash<A>
}