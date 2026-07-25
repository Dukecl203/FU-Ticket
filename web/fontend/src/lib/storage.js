import { decode_data, encode_data } from "./encoder"

const STORAGE = {
  TOKEN: "token-qlhv_hd",
  USER_INFO: "user-info-qlhv_hd",
  BROADCAST: "broadcast-qlhv",
  BROADCAST_POPUP: "broadcast-popup-qlhv",
  REMEMBER_LOGIN: "remember-login",
  KEY_MENU_ACTIVE: "key-active",
  TABS_PAGE_ACTIVE: "tabs-page-active",
  ERROR_EXTENSION: "error-extension",
  DEV_MODE: "dev-mode",
}

export const getStorage = name => {
  if (typeof window === "undefined") return
  const remember = localStorage.getItem(STORAGE.REMEMBER_LOGIN)
  let data
  if (remember) {
    data =
      typeof window !== "undefined" && name !== undefined
        ? localStorage.getItem(name)
        : ""
  } else {
    data =
      typeof window !== "undefined" && name !== undefined
        ? sessionStorage.getItem(name)
        : ""
  }

  try {
    // if (data) return JSON.parse(data)
    if (data) return decode_data(data)
  } catch (err) {
    console.log("err", err)

    return data
  }
}

export const setStorage = (name, value) => {
  if (typeof window === "undefined") return
  const remember = localStorage.getItem(STORAGE.REMEMBER_LOGIN)
  // const stringify = typeof value !== "string" ? JSON.stringify(value) : value
  const data_hash = encode_data(value)
  if (remember) {
    return localStorage.setItem(name, data_hash)
  } else {
    return sessionStorage.setItem(name, data_hash)
  }
}

export const deleteStorage = name => {
  if (typeof window === "undefined") return
  const remember = localStorage.getItem(STORAGE.REMEMBER_LOGIN)
  if (remember) {
    return localStorage.removeItem(name)
  } else {
    return sessionStorage.removeItem(name)
  }
}

export const clearStorage = () => {
  if (typeof window === "undefined") return
  const remember = localStorage.getItem(STORAGE.REMEMBER_LOGIN)
  if (remember) {
    return localStorage.clear()
  } else {
    return sessionStorage.clear()
  }
}

export default STORAGE
