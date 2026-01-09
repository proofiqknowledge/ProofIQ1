import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
  currentUser: null,
  bulkUploadResult: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload;
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
  setBulkUploadResult: (state, action) => {
        state.bulkUploadResult = action.payload;
      },
      clearBulkUploadResult: (state) => {
        state.bulkUploadResult = null;
      },
    },
  });
export const { setUsers, setCurrentUser, setBulkUploadResult, clearBulkUploadResult } = userSlice.actions;

export default userSlice.reducer;
