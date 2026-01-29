// Redux store configuration and middleware setup
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import courseReducer from './slices/courseSlice';
import examReducer from './slices/examSlice';
import leaderboardReducer from './slices/leaderboardSlice';
import userReducer from './slices/userSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    course: courseReducer,
    exam: examReducer,
    leaderboard: leaderboardReducer,
    user: userReducer,
  },
});

export default store;
