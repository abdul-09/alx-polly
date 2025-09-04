import { getPollById } from '@/app/lib/actions/poll-actions';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
// Import the client component
import EditPollForm from './EditPollForm';

export default async function EditPollPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  const { poll, error } = await getPollById(params.id);

  if (error || !poll) {
    notFound();
  }

  // Check if user owns this poll
  if (poll.user_id !== user.id) {
    notFound(); // Don't reveal that the poll exists if user doesn't own it
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} />
    </div>
  );
}