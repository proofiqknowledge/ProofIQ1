import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
};

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    setLeaderboard: (state, action) => {
      state.users = action.payload;
    },
  },
});

export const { setLeaderboard } = leaderboardSlice.actions;
export default leaderboardSlice.reducer;
