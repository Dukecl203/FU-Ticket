import pokemonReducer from "../slices/PokemonSlice"
import appGlobalReducer from "../slices/appGlobalSlide"
import customerDirectoryReducer from "../slices/customerDirectory"

const rootReducer = {
  pokemon: pokemonReducer,
  appGlobal: appGlobalReducer,
  customerDirectory: customerDirectoryReducer,
}

export default rootReducer
