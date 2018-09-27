import { AppBkb } from "./AppBkb"
import { AppDash } from "./exported-definitions"

export function createApplication<A, O>(Class: { new(dash: AppDash<A>, options: O): A }, options: O): A {
  let bkb = new AppBkb(Class, false, options)
  return bkb.root.getInstance() as any
}

export function registerApplication<A>(obj: A): AppDash<A> {
  let bkb = new AppBkb(obj, true)
  return bkb.root.dash as AppDash<A>
}