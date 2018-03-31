import { ApplicationDash } from "./exported-definitions";
import { ApplicationContainer } from "./ApplicationContainer";

export function createApplication<A>(Class: { new(dash: ApplicationDash<A>, ...args: any[]): A }, ...args: any[]): A {
  let container = new ApplicationContainer(Class, false, args)
  return container.root.getInstance() as any
}

export function asApplication<A>(obj: A) {
  let container = new ApplicationContainer(obj, true)
  return container.root.dash as ApplicationDash<A>
}