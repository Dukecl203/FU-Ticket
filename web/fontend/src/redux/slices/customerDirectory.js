import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  listAddress: [],
  listCustomer: [],
  loading: false,
  addressSelect: {},
  condition: {
    CurrentPage: 1,
    PageSize: 20,
    SearchText: "",
    GuestType: undefined,
  },
  total: 0,
  listProvince: [],
  listWaterPrice: [],
}

export const customerDirectorySlice = createSlice({
  name: "customerDirectory",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setAddressSelect: (state, action) => {
      state.addressSelect = action.payload
    },
    setListAddress: (state, action) => {
      state.listAddress = action.payload
    },
    setListCustomer: (state, action) => {
      state.listCustomer = action.payload
    },
    setTotal: (state, action) => {
      state.total = action.payload
    },
    setListProvince: (state, action) => {
      state.listProvince = action.payload
    },
    setListWaterPrice: (state, action) => {
      state.listWaterPrice = action.payload
    },
    changCondition: (state, action) => {
      state.condition = action.payload
    },
  },
})

export const {
  setListAddress,
  setListCustomer,
  setLoading,
  setAddressSelect,
  changCondition,
  setListProvince,
  setTotal,
  setListWaterPrice,
} = customerDirectorySlice.actions

export default customerDirectorySlice.reducer
