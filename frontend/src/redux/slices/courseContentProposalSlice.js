import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPendingProposals,
  getProposalById,
  reviewProposal,
} from "../../services/courseContentProposalService";

/**
 * 🧾 Fetch all pending proposals (Admin view)
 */
export const fetchPendingProposals = createAsyncThunk(
  "courseContentProposal/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      return await getPendingProposals();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch proposals");
    }
  }
);

/**
 * 🔍 Fetch single proposal by ID (for Admin “View” modal)
 */
export const fetchProposalById = createAsyncThunk(
  "courseContentProposal/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await getProposalById(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch proposal details");
    }
  }
);

/**
 * ✅ Review a proposal (accept/reject)
 */
export const reviewCourseContentProposal = createAsyncThunk(
  "courseContentProposal/review",
  async (payload, { rejectWithValue }) => {
    try {
      return await reviewProposal(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to review proposal");
    }
  }
);

/**
 * 🧩 Slice
 */
const courseContentProposalSlice = createSlice({
  name: "courseContentProposal",
  initialState: {
    proposals: [],
    selectedProposal: null,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    clearSelectedProposal: (state) => {
      state.selectedProposal = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Pending proposals
      .addCase(fetchPendingProposals.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchPendingProposals.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.proposals = action.payload;
      })
      .addCase(fetchPendingProposals.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Single proposal
      .addCase(fetchProposalById.fulfilled, (state, action) => {
        state.selectedProposal = action.payload;
      })

      // Review (accept/reject)
      .addCase(reviewCourseContentProposal.fulfilled, (state) => {
        state.status = "reviewed";
      });
  },
});

export const { clearSelectedProposal } = courseContentProposalSlice.actions;
export default courseContentProposalSlice.reducer;
