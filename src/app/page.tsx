import { redirect } from 'next/navigation'

// Root "/" redirects to /home (middleware will redirect to /login if not logged in)
export default function RootPage() {
  redirect('/home')
}
