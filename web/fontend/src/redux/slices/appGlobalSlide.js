import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  listSystemKey: [],
  listTabs: [],
  userInfo: {},
}

export const appGlobalSlice = createSlice({
  name: "appGlobal",
  initialState,
  reducers: {
    getListSystemKey: (state, action) => {
      state.listSystemKey = action.payload || []
    },
    setListTabs: (state, action) => {
      state.listTabs = action.payload
    },
    setUserInfo: (state, action) => {
      state.userInfo = action.payload
    },
  },
})

export const { getListSystemKey, setUserInfo, setListTabs } =
  appGlobalSlice.actions

export default appGlobalSlice.reducer
