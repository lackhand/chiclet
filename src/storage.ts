import Monogatari from "./monogatari";

const monogatari = Monogatari.default;

// Persistent Storage Variable
monogatari.storage({
  player: {
    name: "",
  },
});
