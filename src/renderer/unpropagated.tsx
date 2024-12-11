type E = React.BaseSyntheticEvent<any>;
type CBT = (e: E) => void;
export default function unpropagated<T extends CBT>(cb: T): CBT {
  return (e: E) => {
    e.stopPropagation();
    cb(e);
  };
}
