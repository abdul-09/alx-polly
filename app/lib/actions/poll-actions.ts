"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// CREATE POLL
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  // Input validation and sanitization
  if (!question || question.trim().length === 0) {
    return { error: "Question is required." };
  }

  if (question.length > 500) {
    return { error: "Question must be 500 characters or less." };
  }

  if (options.length < 2) {
    return { error: "At least two options are required." };
  }

  if (options.length > 10) {
    return { error: "Maximum 10 options allowed." };
  }

  // Validate each option
  for (const option of options) {
    if (!option || option.trim().length === 0) {
      return { error: "All options must have content." };
    }
    if (option.length > 200) {
      return { error: "Each option must be 200 characters or less." };
    }
  }

  // Sanitize inputs
  const sanitizedQuestion = question.trim();
  const sanitizedOptions = options.map(opt => opt.trim());

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: sanitizedQuestion,
      options: sanitizedOptions,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
  const supabase = await createClient();
  
  // Get current user for authorization
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { poll: null, error: error.message };
  
  // If user is not authenticated, only allow public polls (if you implement public/private polls)
  // For now, we'll allow all polls to be viewed, but this should be enhanced based on business requirements
  // if (!user && !data.is_public) {
  //   return { poll: null, error: "Poll not found." };
  // }
  
  return { poll: data, error: null };
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate inputs
  if (!pollId || typeof pollId !== 'string' || pollId.trim().length === 0) {
    return { error: 'Invalid poll ID.' };
  }

  if (typeof optionIndex !== 'number' || optionIndex < 0 || !Number.isInteger(optionIndex)) {
    return { error: 'Invalid option index.' };
  }

  // First, verify the poll exists and get its options
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: 'Poll not found.' };
  }

  // Validate option index is within bounds
  if (optionIndex >= poll.options.length) {
    return { error: 'Invalid option selected.' };
  }

  // Check if user has already voted (if user is authenticated)
  if (user) {
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      return { error: 'You have already voted on this poll.' };
    }
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}

// DELETE POLL
export async function deletePoll(id: string) {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError) {
    return { error: userError.message };
  }
  
  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // First verify ownership before deletion
  const { data: poll, error: fetchError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError) {
    return { error: "Poll not found." };
  }

  if (poll.user_id !== user.id) {
    return { error: "You can only delete your own polls." };
  }

  // Now safely delete the poll
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // Double-check ownership in delete query

  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  // Input validation and sanitization (same as createPoll)
  if (!question || question.trim().length === 0) {
    return { error: "Question is required." };
  }

  if (question.length > 500) {
    return { error: "Question must be 500 characters or less." };
  }

  if (options.length < 2) {
    return { error: "At least two options are required." };
  }

  if (options.length > 10) {
    return { error: "Maximum 10 options allowed." };
  }

  // Validate each option
  for (const option of options) {
    if (!option || option.trim().length === 0) {
      return { error: "All options must have content." };
    }
    if (option.length > 200) {
      return { error: "Each option must be 200 characters or less." };
    }
  }

  // Sanitize inputs
  const sanitizedQuestion = question.trim();
  const sanitizedOptions = options.map(opt => opt.trim());

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question: sanitizedQuestion, options: sanitizedOptions })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
