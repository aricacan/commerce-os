import { redirect } from 'next/navigation';

export default function ModerationRedirect() {
  redirect('/monitoring/approvals');
}
