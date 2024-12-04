export type Class = Function;
export default function* protoChain(object: object): Generator<Class> {
  let ctor = null;
  while (object && (ctor = object.constructor)) {
    yield ctor;
    object = Object.getPrototypeOf(object);
  }
}
