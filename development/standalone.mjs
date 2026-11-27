import { defaultBooks } from "./roller.mjs";
import { developmentView } from "./view.mjs";

const storageKey = "scifi-rpg-tools.development";

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      books: Array.isArray(saved?.books) ? saved.books : [...defaultBooks],
      log: Array.isArray(saved?.log) ? saved.log : [],
    };
  } catch {
    return { books: [...defaultBooks], log: [] };
  }
}

let state = load();
function save(next) {
  localStorage.setItem(storageKey, JSON.stringify(next));
  state = next;
}

document.querySelector("#development-generator").append(developmentView({
  selectedBooks: () => state.books,
  setBooks: books => save({ ...state, books }),
  entries: () => state.log,
  saveEntry: entry => save({ ...state, log: [...state.log, entry] }),
}));
